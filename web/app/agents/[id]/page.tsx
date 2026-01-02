"use client";
import ArtifactBrowser from "@/components/ArtifactBrowser";
import RunStream from "@/components/RunStream";
import { Agent, Run, getAgentCode } from "@/lib/api";
import clsx from "clsx";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AgentPage() {
  const params = useParams();
  const id = Number(params.id);
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [code, setCode] = useState<string>("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [tab, setTab] = useState<"code" | "console" | "artifacts">("console");

  useEffect(() => {
    if (!id) return;
    
    // Fetch Agent
    fetch(`http://localhost:8000/api/agents/${id}`).then(r => r.json()).then(setAgent);
    // Fetch Code
    getAgentCode(id).then(setCode).catch(console.error);
    // Fetch Runs
    fetch(`http://localhost:8000/api/runs?agent_id=${id}`).then(r => r.json()).then(setRuns);
  }, [id]);

  const handleRun = async () => {
    if (!agent) return;
    try {
      // Trigger new run
      const res = await fetch(`http://localhost:8000/api/runs/trigger/${agent.id}`, { method: "POST" });
      const newRun = await res.json();
      setRuns(prev => [newRun, ...prev]);
      setActiveRunId(newRun.id);
      setTab("console");
    } catch (err) {
      console.error(err);
    }
  };

  if (!agent) return <div className="p-8 text-gray-500">Loading agent...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold">{agent.name}</h1>
               <span className={clsx("text-xs px-2 py-0.5 rounded border", agent.status === "active" ? "border-green-800 text-green-500 bg-green-900/20" : "border-gray-700 text-gray-500")}>
                 {agent.status}
               </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{agent.description || "No description"}</p>
          </div>
          
          <button 
            onClick={handleRun}
            className="text-white bg-green-700 hover:bg-green-600 px-6 py-2 text-sm font-bold font-mono transition-colors"
          >
            [ RUN AGENT ]
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Left: Code & Config */}
        <div className="w-1/2 flex flex-col gap-4">
           {/* Simple Tabs */}
           <div className="flex gap-4 text-sm font-mono border-b border-gray-800">
             <button onClick={() => setTab("code")} className={clsx("pb-2 px-1", tab === "code" && "text-green-500 border-b-2 border-green-500")}>CODE</button>
             <button onClick={() => setTab("console")} className={clsx("pb-2 px-1", tab === "console" && "text-green-500 border-b-2 border-green-500")}>CONSOLE</button>
             <button onClick={() => setTab("artifacts")} className={clsx("pb-2 px-1", tab === "artifacts" && "text-green-500 border-b-2 border-green-500")}>ARTIFACTS</button>
           </div>
           
           <div className="flex-1 bg-[#0f0f0f] border border-gray-800 p-4 font-mono text-xs overflow-auto">
             {tab === "code" && (
                <div className="relative">
                   <div className="absolute top-0 right-0 p-2 text-xs text-gray-500 font-mono">v{agent.current_version_id || "?"}</div>
                   <pre className="text-gray-300 whitespace-pre-wrap font-mono text-xs">
{code || "# Loading code..."}
                   </pre>
                </div>
             )}
             {tab === "console" && (
                activeRunId ? (
                   <RunStream runId={activeRunId} isActive={true} />
                ) : (
                   <div className="text-gray-600 italic">No active run selected.</div>
                )
             )}
             {tab === "artifacts" && (
                activeRunId ? (
                   <ArtifactBrowser agentName={agent.name} runId={activeRunId} />
                ) : (
                   <div className="text-gray-600 italic">Select a run to view artifacts.</div>
                )
             )}
           </div>
        </div>

        {/* Right: History */}
        <div className="w-1/2 flex flex-col">
           <div className="text-sm font-mono text-gray-500 mb-2 uppercase tracking-wider">Run History</div>
           <div className="flex-1 overflow-auto border border-gray-800 bg-[#0f0f0f]">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="p-3">ID</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr 
                      key={run.id} 
                      onClick={() => { setActiveRunId(run.id); setTab("console"); }}
                      className={clsx("hover:bg-white/5 cursor-pointer border-b border-gray-800/50", activeRunId === run.id && "bg-white/10")}
                    >
                      <td className="p-3 text-gray-400">#{run.id}</td>
                      <td className={clsx("p-3", run.status === "success" ? "text-green-500" : run.status === "error" ? "text-red-500" : "text-yellow-500")}>
                        {run.status}
                      </td>
                      <td className="p-3 text-gray-500">{new Date(run.start_time || "").toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}
