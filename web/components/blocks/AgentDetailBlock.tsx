import { useEffect, useState } from "react";
import AgentArtifactBlock from "./AgentArtifactBlock";
import AgentCodeBlock from "./AgentCodeBlock";
import AgentLogBlock from "./AgentLogBlock";

interface AgentDetailBlockProps {
    agentId: number;
    initialView?: "CODE" | "LOGS" | "ARTIFACTS";
    initialRunId?: number;
    onExit: () => void;
}

export default function AgentDetailBlock({ agentId, initialView = "CODE", initialRunId, onExit }: AgentDetailBlockProps) {
    const [view, setView] = useState<"CODE" | "LOGS" | "ARTIFACTS">(initialView);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Check for Ctrl + ~ (Backtick)
            if (e.ctrlKey && e.key === "`") {
                e.preventDefault();
                setView((prev: "CODE" | "LOGS" | "ARTIFACTS") => {
                    if (prev === "CODE") return "LOGS";
                    if (prev === "LOGS") return "ARTIFACTS";
                    return "CODE";
                });
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    if (view === "CODE") {
        return <AgentCodeBlock agentId={agentId} onExit={onExit} />;
    } else if (view === "LOGS") {
        return <AgentLogBlock agentId={agentId} initialRunId={initialRunId} onExit={onExit} />;
    } else {
        return <AgentArtifactBlock agentId={agentId} initialRunId={initialRunId} onExit={onExit} />;
    }
}
