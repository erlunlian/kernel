from openai import AsyncOpenAI
import httpx
import os

class AIService:
    def __init__(self):
        # Default to local Ollama if no API key/base provided
        self.client = AsyncOpenAI(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            api_key=os.getenv("OLLAMA_API_KEY", "ollama"),  # required but ignored by ollama
        )
        self.model = os.getenv("OLLAMA_MODEL", "gpt-4o") # User aliased model
        self.ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    async def list_models(self):
        # Fetch from Ollama
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{self.ollama_base}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    # Ensure our default 'gpt-4o' alias is there if it maps to something, 
                    # but for now let's just return what Ollama has + 'gpt-4o' if distinct.
                    return models
        except Exception as e:
            print(f"Failed to fetch ollama models: {e}")
            return []
        return []

    async def _resolve_model(self, requested_model: str = None) -> str:
        # Dynamic resolution logic - ensure models are loaded first
        if not hasattr(self, "_available_models") or not self._available_models:
            self._available_models = await self.list_models()

        if requested_model:
            # If we have a list of models, and the requested one isn't in it, ignore request and resolve best.
            # This prevents crashing on 'gpt-4o' requests when only local models exist.
            if self._available_models and requested_model in self._available_models:
                return requested_model
            
            # If we have no models list (e.g. models fetch failed), we have to trust the request
            if not self._available_models:
                return requested_model
            
        # If the user explicitly set OLLAMA_MODEL env var, trust it
        if os.getenv("OLLAMA_MODEL"):
            return os.getenv("OLLAMA_MODEL")
            
        default_model = "gpt-4o"
        if not self._available_models:
            return default_model
            
        if default_model in self._available_models:
            return default_model
            
        # Prefer coder models
        coder_models = [m for m in self._available_models if "coder" in m.lower() or "code" in m.lower()]
        if coder_models:
            # Sort by likely capability (larger is usually better, but names vary. Just pick first for now)
            return coder_models[0]
            
        # Fallback to any model
        return self._available_models[0]

    async def refine_code(self, code: str, instruction: str, model: str = None):
        resolved_model = await self._resolve_model(model)
        
        prompt = f"""You are an expert Python coding assistant.
User Instruction: {instruction}

Current Code:
```python
{code}
```

Please rewrite the code to satisfy the instruction. 
IMPORTANT: Return ONLY the python code. No markdown formatting (```python), no explanations. Just the raw code.
"""
        stream = await self.client.chat.completions.create(
            model=resolved_model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def chat(self, messages: list, model: str = None):
        from app.services.agent_service import agent_service
        from app.core.database import engine
        from sqlmodel import Session
        import json

        resolved_model = await self._resolve_model(model)
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "create_agent",
                    "description": "Create a new AI agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Name of the agent"},
                            "description": {"type": "string", "description": "Description of the agent's purpose"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_agent_code",
                    "description": "Update the python code for a specific agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {"type": "integer", "description": "ID of the agent"},
                            "code": {"type": "string", "description": "The new python code"}
                        },
                        "required": ["agent_id", "code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_agent",
                    "description": "Delete an agent by ID",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {"type": "integer", "description": "ID of the agent to delete"}
                        },
                        "required": ["agent_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_agents",
                    "description": "List all available agents to get their IDs and names",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_agent_code",
                    "description": "Get the current code of an agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {"type": "integer"}
                        },
                        "required": ["agent_id"]
                    }
                }
            }
        ]

        # Clone messages to avoid modifying input
        history = list(messages)

        while True:
            # Call Model
            stream = await self.client.chat.completions.create(
                model=resolved_model,
                messages=history,
                tools=tools,
                stream=True,
            )

            tool_calls = []
            current_tool_call = None
            
            async for chunk in stream:
                delta = chunk.choices[0].delta
                
                # Check for tool calls
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        if tc.index is not None: 
                            # If new index, simplify logic: assume one tool call at a time for streaming simplicity 
                            # or handle reconstruction.
                            # OpenAI streams tool calls by index.
                            if len(tool_calls) <= tc.index:
                                tool_calls.append({"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                            
                            t = tool_calls[tc.index]
                            if tc.id: t["id"] += tc.id
                            if tc.function.name: t["function"]["name"] += tc.function.name
                            if tc.function.arguments: t["function"]["arguments"] += tc.function.arguments

                # Check for content
                if delta.content:
                    yield f"event: text\ndata: {json.dumps(delta.content)}\n\n"

            # If no tool calls, we are done
            if not tool_calls:
                yield "event: finish\ndata: {}\n\n"
                break
            
            # Process Tool Calls
            # Append assistant message with tool calls to history
            history.append({
                "role": "assistant",
                "content": None,
                "tool_calls": tool_calls
            })

            # Execute each tool
            for tc in tool_calls:
                func_name = tc["function"]["name"]
                try:
                    args = json.loads(tc["function"]["arguments"])
                except:
                    args = {}
                
                # Emit tool start event
                yield f"event: tool_start\ndata: {json.dumps(tc)}\n\n"
                
                result = None
                with Session(engine) as session:
                    try:
                        if func_name == "create_agent":
                            agent = agent_service.create_agent(session, args["name"], args.get("description"))
                            result = {"id": agent.id, "name": agent.name, "status": "created"}
                        elif func_name == "update_agent_code":
                            agent_service.update_agent_code(session, args["agent_id"], args["code"])
                            result = {"status": "updated"}
                        elif func_name == "delete_agent":
                            ok = agent_service.delete_agent(session, args["agent_id"])
                            result = {"status": "deleted" if ok else "not found"}
                        elif func_name == "list_agents":
                            agents = agent_service.list_agents(session)
                            result = [{"id": a.id, "name": a.name, "description": a.description} for a in agents]
                        elif func_name == "get_agent_code":
                            code = agent_service.get_agent_code(session, args["agent_id"])
                            result = {"code": code}
                        else:
                            result = {"error": "Unknown tool"}
                    except Exception as e:
                        result = {"error": str(e)}

                # Emit tool result event
                yield f"event: tool_result\ndata: {json.dumps(result)}\n\n"

                # Append tool result to history
                history.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result)
                })
            
            # Loop back to call model again with results

ai_service = AIService()
