import React from "react";
import AgentCodeBlock from "../../components/blocks/AgentCodeBlock";
import AgentList from "../../components/blocks/AgentList";
import ModelSelector from "../../components/blocks/ModelSelector";
import NewAgentBlock from "../../components/blocks/NewAgentBlock";
import SecretBlock from "../../components/blocks/SecretBlock";
import { commandRegistry } from "../command-registry";

// Helper to wrap component in a clearer way if needed
// For now we return ReactNode directly.

export function registerDefaultCommands() {
  
  commandRegistry.register("help", "Show available commands", () => {
    const commands = commandRegistry.getAll();
    return (
      <div className="grid grid-cols-[100px_1fr] gap-4 text-sm text-gray-400">
        {commands.map(cmd => (
            <React.Fragment key={cmd.name}>
                <div className="text-green-500 font-bold">{cmd.name}</div>
                <div>{cmd.description}</div>
            </React.Fragment>
        ))}
      </div>
    );
  });

  commandRegistry.register("agents", "List agents", () => {
     return <AgentList />;
  });

  commandRegistry.register("new", "Create a new agent", () => {
    return <NewAgentBlock onComplete={(msg: any) => console.log(msg)} />;
  });

  commandRegistry.register("secrets", "Manage secrets", () => {
    return <SecretBlock />;
  });

  commandRegistry.register("clear", "Clear terminal", () => {
    // Handled in TerminalLayout natively
    return null; 
  });

  commandRegistry.register("view", "View agent code", (args: string[], { setOverlay, currentModel }) => {
      const id = Number(args[0]);
      if (!id) return <div className="text-red-500">Usage: view &lt;agent_id&gt;</div>;
      
      setOverlay(<AgentCodeBlock agentId={id} onExit={() => setOverlay(null)} />);
      return null; // Return null so nothing is added to the log stream
  });

  commandRegistry.register("logs", "View agent logs", (args: string[]) => {
      const id = args[0];
      if (!id) return <div className="text-red-500">Usage: logs &lt;agent_id&gt;</div>;
       // TODO: Implement actual logs view
      return <div className="text-gray-400">Viewing logs for agent {id}... (Not implemented yet)</div>;
  });

  commandRegistry.register("model", "Cycle AI model", (_args: string[], { availableModels, currentModel, setModel }) => {
       return <ModelSelector models={availableModels || []} currentModel={currentModel} onSelect={setModel} />;
  });
}
