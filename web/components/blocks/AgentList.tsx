import { ActiveSession } from "@/lib/active-session";
import { Agent, deleteAgent, getAgents, triggerRun } from "@/lib/api";
import { useTerminalContext } from "@/lib/terminal-context";
import clsx from "clsx";
import { useEffect, useState } from "react";
import AgentDetailBlock from "./AgentDetailBlock";
import InteractiveList from "./InteractiveList";

interface AgentListProps {
    initialAgents?: Agent[];
}

export default function AgentList({ initialAgents }: AgentListProps) {
    const [agents, setAgents] = useState<Agent[]>(initialAgents || []);
    const [loading, setLoading] = useState(!initialAgents);
    const [error, setError] = useState<string | null>(null);

    const [viewState, setViewState] = useState<"LIST" | "OPTIONS">("LIST");
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    const fetchAgents = async () => {
        try {
            const data = await getAgents();
            setAgents(data);
            setError(null);
        } catch (e) {
            setError("Failed to fetch agents.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialAgents) {
            fetchAgents();
        }
    }, []);

    const handleDelete = async (agent: Agent) => {
        try {
            await deleteAgent(agent.id);
            setAgents(prev => prev.filter(a => a.id !== agent.id));
            if (selectedAgent?.id === agent.id) {
                setViewState("LIST");
                setSelectedAgent(null);
            }
        } catch (e) {
            console.error("Failed to delete agent", e);
        }
    };

    const { setOverlay } = useTerminalContext();

    const handleOptionSelect = async (option: string) => {
        if (!selectedAgent) return;
        
        if (option === "Back") {
            setViewState("LIST");
            setSelectedAgent(null);
            return;
        }

        if (option === "Run Now") {
             // Trigger run then view logs
             try {
                const run = await triggerRun(selectedAgent.id);
                setOverlay(<AgentDetailBlock agentId={selectedAgent.id} initialView="LOGS" initialRunId={run.id} onExit={() => setOverlay(null)} />);
                setIsOpen(false);
                ActiveSession.clear();
             } catch (err: any) {
                 console.error("Failed to run agent:", err);
                 // Maybe show error in UI? For now just log
             }
             return;
        }

        if (option === "View Code") {
            // Direct overlay set - Deterministic!
            setOverlay(<AgentDetailBlock agentId={selectedAgent.id} initialView="CODE" onExit={() => setOverlay(null)} />);
            setIsOpen(false); // Close the list
            ActiveSession.clear();
            return;
        } else if (option === "View Logs") {
             setOverlay(<AgentDetailBlock agentId={selectedAgent.id} initialView="LOGS" onExit={() => setOverlay(null)} />);
             setIsOpen(false);
             ActiveSession.clear();
        } else if (option === "View Artifacts") {
             setOverlay(<AgentDetailBlock agentId={selectedAgent.id} initialView="ARTIFACTS" onExit={() => setOverlay(null)} />);
             setIsOpen(false);
             ActiveSession.clear();
        }
    };

    if (loading) return <div className="text-gray-500">Loading agents...</div>;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!isOpen) return <div className="text-gray-500 italic text-sm">List closed.</div>;
    if (agents.length === 0) return <div className="text-gray-500">No agents found. Type 'new' to create one.</div>;

    if (viewState === "OPTIONS" && selectedAgent) {
        const options = ["Run Now", "View Code", "View Logs", "View Artifacts", "Back"];
        return (
            <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-400 border-b border-gray-800 pb-2 mb-1">
                    Agent: <span className="text-green-500 font-bold">{selectedAgent.name}</span>
                </div>
                <InteractiveList
                    items={options}
                    renderItem={(item, selected) => (
                        <span className={clsx("font-bold", selected ? "text-green-500" : "text-gray-500")}>{item}</span>
                    )}
                    onSelect={handleOptionSelect}
                    onCancel={() => {
                        setViewState("LIST");
                        setSelectedAgent(null);
                    }}
                />
            </div>
        );
    }

    return (
        <InteractiveList
            items={agents}
            renderItem={(agent, selected) => (
                <div className="flex gap-4 items-center">
                    <span className="w-4 font-bold text-center">{selected ? ">" : " "}</span>
                    <span className="w-48 font-bold">{agent.name}</span>
                    <span className={clsx(agent.status === "active" ? "text-green-500" : "text-gray-600")}>{agent.status}</span>
                    <span className="text-gray-500 text-xs italic flex-1">{agent.description}</span>
                </div>
            )}
            onSelect={(agent) => {
                setSelectedAgent(agent);
                setViewState("OPTIONS");
            }}
            onDelete={handleDelete}
            onCancel={() => {
                setIsOpen(false);
                ActiveSession.clear();
            }}
        />
    );
}
