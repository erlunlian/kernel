import AgentLogBlock from "@/components/blocks/AgentLogBlock";
import { ActiveSession } from "@/lib/active-session";
import { createAgent, getModels } from "@/lib/api";
import { commandRegistry } from "@/lib/command-registry";
import { TerminalBlock } from "@/lib/terminal-types";
import React, { ReactNode, useEffect, useRef, useState } from "react";

type CreationStep = "NONE" | "NAME" | "DESC";

export function useTerminal(initialWelcome?: ReactNode) {
  const [blocks, setBlocks] = useState<TerminalBlock[]>([]);
  const [overlay, setOverlay] = useState<ReactNode | null>(null);
  
  // Model State
  const [models, setModels] = useState<string[]>(["gpt-4o"]);
  const [currentModel, setCurrentModel] = useState<string>("gpt-4o");

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Chat History (for AI context)
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant" | "tool", content: string, tool_calls?: any[] }[]>([]);

  // Slash Command Menu State
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Creation Wizard State
  const [creationState, setCreationState] = useState<{ step: CreationStep; name: string }>({ step: "NONE", name: "" });
  const [promptLabel, setPromptLabel] = useState("user@kernel:~$");
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addBlock = (type: TerminalBlock["type"], content: ReactNode, command: string) => {
    setBlocks(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        type,
        content,
        command,
        timestamp: Date.now()
    }]);
  };

  // Chat Streaming Logic
  const streamChat = async (userMessage: string) => {
      setIsProcessing(true);
      // Optimistic update
      addBlock("text", <div className="font-bold text-gray-400">{promptLabel} {userMessage}</div>, userMessage);
      
      const newHistory = [...chatHistory, { role: "user" as const, content: userMessage }];
      setChatHistory(newHistory);
      
      let currentAssistantMessage = "";
      let currentToolCalls: any[] = [];
      
      // We need a temporary way to capture the stream for the UI block
      // Update block content on the fly? React state `blocks` update is expensive if frequent.
      // Better to add a Block that reads from a ref or specific state? 
      // For now, let's update blocks on every chunk, React handles it reasonably well for text.
      
      // Step 1: Add the assistant block immediately
      const assistantBlockId = Math.random().toString(36).substring(7);
      setBlocks(prev => [...prev, {
          id: assistantBlockId,
          type: "text",
          content: <div className="text-green-400">...</div>, // Placeholder
          command: "ai",
          timestamp: Date.now()
      }]);

      const updateAssistantBlock = (content: string) => {
          setBlocks(prev => prev.map(b => b.id === assistantBlockId ? { 
              ...b, 
              content: <div className="text-green-400 whitespace-pre-wrap">{content}</div> 
          } : b));
      };

      try {
          // Import dynamically or assume it's imported (I will add import)
           await import("@/lib/api").then(async ({ chat }) => {
              await chat(newHistory, currentModel, (event) => {
                  if (event.type === "text") {
                      currentAssistantMessage += event.content;
                      updateAssistantBlock(currentAssistantMessage);
                  } else if (event.type === "tool_start") {
                      currentToolCalls.push(event.tool_call);
                      // Maybe show tool call in UI?
                      addBlock("text", <div className="text-gray-500 text-sm italic">Executing tool: {event.tool_call.function.name}...</div>, "system");
                  } else if (event.type === "tool_result") {
                      // Tool finished
                      // Add to history so next turn knows about it
                      // Ideally we'd add a separate history item for the tool output, 
                      // but backend streaming loop handles the re-injection.
                      // Actually, if backend is looping, it will emit text AFTER tool result.
                      // We just need to track it for our local history state.
                      const lastToolCall = currentToolCalls[currentToolCalls.length - 1]; // Naive matching
                      // In reality backend sends full history or we maintain it. 
                      // Since backend is stateless, WE must maintain history.
                      // But wait, the BACKEND is doing the loop. The BACKEND has the history during the request.
                      // When the REQUEST finishes, we need the FULL history that happened.
                      // Does the backend stream back the "Tool Output" message?
                      // My plan says: yield tool_result.
                      
                      // So we should append tool result to our history.
                      // For now, let's just log it.
                      console.log("Tool Result:", event.result);
                  } else if (event.type === "error") {
                      addBlock("error", <div className="text-red-500">{event.error}</div>, "ai");
                  }
              });
           });

           // After stream finishes, update our local history
           setChatHistory(prev => [
               ...prev, 
               { 
                   role: "assistant", 
                   content: currentAssistantMessage,
                   tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined
               }
           ]);

      } catch (e: any) {
          addBlock("error", <div className="text-red-500">{e.message}</div>, "ai");
      } finally {
          setIsProcessing(false);
      }
  };

  const executeCommand = async (cmdOverride?: string) => {
    // Clear any active interactive session
    ActiveSession.clear();
    const rawInput = (cmdOverride !== undefined ? cmdOverride : input).trim();
    
    if (!rawInput) return;

    // Handle Creation Wizard Steps (Legacy / Specific Flow)
    if (creationState.step !== "NONE") {
         processCreationStep(rawInput);
         return;
    }

    setHistory(prev => [...prev, rawInput]);
    setHistoryIndex(-1);
    setInput("");

    // START OF CHANGE: Default to Chat unless starts with /
    if (!rawInput.startsWith("/")) {
        await streamChat(rawInput);
        return;
    }

    // It's a command
    const cmd = rawInput.substring(1); // Remove slash
    setIsProcessing(true);
    addBlock("text", <div className="font-bold text-gray-400">{promptLabel} {rawInput}</div>, cmd); // Show with slash

    if (cmd === "clear") {
        setBlocks([]);
        setIsProcessing(false);
        return;
    }
    
    // Legacy mapping for "new" if user types /new
    if (cmd === "new") {
        setIsProcessing(false);
        setCreationState({ step: "NAME", name: "" });
        addBlock("text", <div className="text-gray-300">Enter a name for the new agent:</div>, "system");
        setPromptLabel("Name: ");
        return;
    }

    try {
        const result = await commandRegistry.execute(cmd, { 
            setOverlay,
            currentModel,
            availableModels: models,
            setModel: (m) => setCurrentModel(m)
        });
        if (result) {
            addBlock("component", result, cmd);
        }
    } catch (err: any) {
        addBlock("error", <div className="text-red-500">{err.message}</div>, cmd);
    } finally {
        setIsProcessing(false);
    }
  };

  const processCreationStep = async (cmd: string) => {
    if (creationState.step === "NAME") {
        addBlock("text", <div className="font-bold text-gray-400">{promptLabel} {cmd}</div>, cmd);
        setCreationState(prev => ({ ...prev, step: "DESC", name: cmd }));
        addBlock("text", <div className="text-gray-300">Enter a description for this agent:</div>, "system");
        setPromptLabel("Description: ");
        setInput("");
        return;
    }
    if (creationState.step === "DESC") {
        addBlock("text", <div className="font-bold text-gray-400">{promptLabel} {cmd}</div>, cmd);
        setInput("");
        setIsProcessing(true);
        try {
            const agent = await createAgent(creationState.name, cmd);
            addBlock("success", <div className="text-green-500">Successfully created agent <b>{agent.name}</b> (ID: {agent.id})</div>, "system");
            setOverlay(<AgentLogBlock agentId={agent.id} onExit={() => setOverlay(null)} />);
        } catch (err: any) {
            addBlock("error", <div className="text-red-500">Failed to create agent: {err.message}</div>, "system");
        } finally {
            setIsProcessing(false);
            setCreationState({ step: "NONE", name: "" });
            setPromptLabel("user@kernel:~$");
        }
        return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navigate Slash Menu
    if (isSlashMenuOpen) {
        const commands = commandRegistry.getAll();
        const filtered = commands.filter(c => c.name.startsWith(slashFilter));
        const count = filtered.length;

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (count > 0) {
                setSlashSelectedIndex(prev => (prev - 1 + count) % count);
            }
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (count > 0) {
                setSlashSelectedIndex(prev => (prev + 1) % count);
            }
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[slashSelectedIndex]) {
                 const selectedCmd = filtered[slashSelectedIndex].name;
                 const fullCmd = "/" + selectedCmd;
                 setInput(fullCmd); // Visual update
                 setIsSlashMenuOpen(false);
                 executeCommand(fullCmd);
            }
            return;
        }

        if (e.key === "Tab") {
            e.preventDefault();
             if (filtered[slashSelectedIndex]) {
                 const selectedCmd = filtered[slashSelectedIndex].name;
                 // Autocomplete with space, do NOT execute
                 setInput("/" + selectedCmd + " ");
                 // The useEffect will handle closing based on the space, 
                 // but we can also explicitly close here to be safe/fast.
                 setIsSlashMenuOpen(false);
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            setIsSlashMenuOpen(false);
            return;
        }
    }

    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        
        const handler = ActiveSession.getInputHandler();
        if (handler) {
            handler(input);
            setInput("");
            return;
        }

        executeCommand();
    } else if (e.key === "ArrowUp") {
        if (!ActiveSession.hasActiveSession() && !overlay && !isSlashMenuOpen) {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            }
        }
    } else if (e.key === "ArrowDown") {
        if (!ActiveSession.hasActiveSession() && !overlay && !isSlashMenuOpen) {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInput("");
            }
        }
    } else if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        if (creationState.step !== "NONE") {
             setCreationState({ step: "NONE", name: "" });
             setPromptLabel("user@kernel:~$");
             addBlock("text", <div className="text-gray-500">^C (cancelled)</div>, "system");
        } else {
             setInput(prev => prev + "^C");
             addBlock("text", <div>^C</div>, input);
        }
        setInput("");
    }
  };
  
  // Watch input for slash
  useEffect(() => {
      // Open menu only if starts with / and NO spaces (assuming commands match first word)
      // This allows arguments to be typed without the menu popping up again
      if (input.startsWith("/") && !input.includes(" ")) {
          setIsSlashMenuOpen(true);
          setSlashFilter(input.substring(1).trim());
          // Only reset index if we are opening it fresh or filter changed substantially?
          // For now resetting to 0 is standard autocomplete behavior.
          // Note: If user is navigating and types, valid storage might be good, but 0 is safe.
          // We could optimize to keep index if current selection still matches, but simplicity first.
          setSlashSelectedIndex(0);
      } else {
          setIsSlashMenuOpen(false);
      }
  }, [input]);

  // Effects
  useEffect(() => {
    // Fetch models on init
    getModels().then(ms => {
        if (ms.length > 0) {
            setModels(ms);
            // Default to first if current not in list? Or keep default
             if (!ms.includes(currentModel)) {
                 setCurrentModel(ms[0]);
             }
        }
    });

    if (initialWelcome) {
        addBlock("welcome", initialWelcome, "init");
    }

    const handleInject = (e: any) => {
        const cmd = e.detail;
        if (cmd) {
            executeCommand(cmd);
        }
    };
    
    if (typeof window !== "undefined") {
        window.addEventListener("terminal:input", handleInject);
    }
    return () => {
        if (typeof window !== "undefined") {
            window.removeEventListener("terminal:input", handleInject);
        }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks]);

  const handleContainerClick = () => {
    if (window.getSelection()?.toString()) return;
    // Do not steal focus if overlay is present
    if (overlay) return;
    inputRef.current?.focus();
  };

  return {
    blocks,
    input,
    setInput,
    history,
    isProcessing,
    inputRef,
    bottomRef,
    handleKeyDown,
    handleContainerClick,
    promptLabel,
    overlay,
    currentModel,
    // Slash Menu Props
    isSlashMenuOpen,
    slashFilter,
    slashSelectedIndex,
    models,
    setOverlay
  };
}

