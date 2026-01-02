export const API_URL = "http://localhost:8000/api";

export interface Agent {
  id: number;
  name: string;
  status: string;
  schedule?: string;
  description?: string;
  current_version_id?: number;
  created_at: string;
}

export interface AgentVersion {
  id: number;
  created_at: string;
  parent_version_id?: number | null;
  code: string;
}

export interface Run {
  id: number;
  version_id?: number | null;
  status: string;
  start_time: string;
  logs: string;
}

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_URL}/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function getAgentVersions(id: number): Promise<AgentVersion[]> {
  const res = await fetch(`${API_URL}/agents/${id}/versions`);
  if (!res.ok) throw new Error("Failed to fetch agent versions");
  return res.json();
}

export async function getAgentCode(id: number): Promise<string> {
  const res = await fetch(`${API_URL}/agents/${id}/code`);
  if (!res.ok) throw new Error("Failed to fetch agent code");
  const data = await res.json();
  return data.code;
}

export async function getAgentLogs(id: number): Promise<string> {
  const res = await fetch(`${API_URL}/agents/${id}/logs`);
  if (!res.ok) throw new Error("Failed to fetch agent logs");
  const data = await res.json();
  return data.logs;
}


export async function createAgent(name: string, description: string): Promise<Agent> {
  const res = await fetch(`${API_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create agent");
  return res.json();
}

export async function deleteAgent(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete agent");
}

export async function updateAgentCode(id: number, code: string): Promise<void> {
  const res = await fetch(`${API_URL}/agents/${id}/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Failed to update agent code");
}

export async function getModels(): Promise<string[]> {
  const res = await fetch(`${API_URL}/ai/models`);
  if (!res.ok) return ["gpt-4o"];
  return res.json();
}

export async function refineCode(code: string, instruction: string, model: string | null, onChunk: (chunk: string) => void): Promise<void> {
  const res = await fetch(`${API_URL}/ai/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, instruction, model }),
  });

  if (!res.ok) throw new Error("Failed to refine code");
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    onChunk(chunk);
  }
}

export type ChatMessage = { role: "user" | "assistant" | "tool"; content: string; tool_calls?: any[] };
export type ChatEvent = 
  | { type: "text"; content: string }
  | { type: "tool_start"; tool_call: any }
  | { type: "tool_result"; result: any }
  | { type: "error"; error: string }
  | { type: "finish" };

export async function chat(messages: ChatMessage[], model: string, onEvent: (event: ChatEvent) => void): Promise<void> {
  const res = await fetch(`${API_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model }),
  });

  if (!res.ok) {
      const err = await res.text();
      throw new Error(`Chat failed: ${err}`);
  }
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process full events (double newline separated usually, or just newline for data)
    // Standard SSE: 
    // event: name\n
    // data: content\n\n
    
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || ""; // Keep incomplete part

    for (const part of parts) {
        if (!part.trim()) continue;
        
        const lines = part.split("\n");
        let eventName = "message";
        let data = "";

        for (const line of lines) {
            if (line.startsWith("event: ")) {
                eventName = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
                data = line.substring(6);
            }
        }

        if (eventName === "text") {
            onEvent({ type: "text", content: JSON.parse(data) });
        } else if (eventName === "tool_start") {
             onEvent({ type: "tool_start", tool_call: JSON.parse(data) });
        } else if (eventName === "tool_result") {
             onEvent({ type: "tool_result", result: JSON.parse(data) });
        } else if (eventName === "error") {
             onEvent({ type: "error", error: JSON.parse(data) });
        } else  if (eventName === "finish") {
             onEvent({ type: "finish" });
        }
    }
  }
}

export async function getRuns(agentId: number): Promise<Run[]> {
  const res = await fetch(`${API_URL}/runs?agent_id=${agentId}`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function triggerRun(agentId: number): Promise<Run> {
  const res = await fetch(`${API_URL}/runs/trigger/${agentId}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to trigger run");
  return res.json();
}

export async function getArtifacts(agentId: number, runId: number): Promise<string[]> {
  const res = await fetch(`${API_URL}/artifacts/${agentId}/${runId}`);
  if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error("Failed to fetch artifacts");
  }
  return res.json();
}

// Secrets
export interface Secret {
    id: number;
    key: string;
    last_4_chars: string;
    description?: string;
}

export async function getSecrets(): Promise<Secret[]> {
    const res = await fetch(`${API_URL}/secrets`);
    if (!res.ok) throw new Error("Failed to fetch secrets");
    return res.json();
}

export async function createSecret(key: string, value: string, description?: string): Promise<Secret> {
    const res = await fetch(`${API_URL}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, description }),
    });
    if (!res.ok) throw new Error("Failed to create secret");
    return res.json();
}

export async function deleteSecret(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/secrets/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete secret");
}

export async function getAgentSecrets(agentId: number): Promise<{id: number, key: string}[]> {
    const res = await fetch(`${API_URL}/agents/${agentId}/secrets`);
    if (!res.ok) throw new Error("Failed to fetch agent secrets");
    return res.json();
}

export async function linkSecret(agentId: number, secretId: number): Promise<void> {
    const res = await fetch(`${API_URL}/agents/${agentId}/secrets/${secretId}`, {
         method: "POST"
    });
    if (!res.ok) throw new Error("Failed to link secret");
}

export async function unlinkSecret(agentId: number, secretId: number): Promise<void> {
    const res = await fetch(`${API_URL}/agents/${agentId}/secrets/${secretId}`, {
         method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to unlink secret");
}
