import { API_URL, getRuns, Run } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

export default function AgentLogBlock({ agentId, initialRunId, onExit }: { agentId: number, initialRunId?: number, onExit: () => void }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [logs, setLogs] = useState<string>("");
  const [status, setStatus] = useState<string>("loading");
  const [runId, setRunId] = useState<number | null>(initialRunId || null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Initial fetch
  useEffect(() => {
    let mounted = true;
    getRuns(agentId).then(data => {
        if (!mounted) return;
        // Sort by version desc, then id desc
        const sorted = data.sort((a, b) => {
             const vA = a.version_id || 0;
             const vB = b.version_id || 0;
             if (vA !== vB) return vB - vA;
             return b.id - a.id;
        });
        setRuns(sorted);
        if (sorted.length === 0) {
            setLogs("No runs found.");
            setStatus("idle");
            return;
        }
        
        // If we have an initial run ID, try to find it in the fetched runs
        // Logic: 
        // 1. If we already have runId (from props), keep it (but update data/status from fetch if found)
        // 2. If no runId, default to latest (data[0])
        
        let targetRun = sorted[0]; // Default to latest
        if (runId) {
             const found = sorted.find(r => r.id === runId);
             if (found) targetRun = found;
        }

        setRunId(targetRun.id);
        setLogs(targetRun.logs || "");
        setStatus(targetRun.status);
    }).catch(err => {
        if (mounted) setError("Failed to fetch runs: " + err.message);
    });
    return () => { mounted = false; };
  }, [agentId]);

  // Stream logic
  useEffect(() => {
    if (!runId) return;
    // Only stream if we caught it in queued state (Run Now flow)
    // If it's already running, we can't join the stream with current backend (it would restart)
    // The backend returns "Run already completed" if not queued.
    // So we just try to connect if status is queued.
    // We connect if it's queued OR running (to join the stream)
    if (status !== "queued" && status !== "running") return;

    const es = new EventSource(`${API_URL}/runs/${runId}/stream`);
    
    es.onopen = () => {
        setStatus("running");
        setLogs(""); // Clear initial logs as we will receive them fresh? Or maybe backend sends all? 
        // Backend executes and yields. Logs in DB might be empty or partial. 
        // Safest to clear and let stream populate.
    };

    es.onmessage = (event) => {
        const data = event.data;
        if (data.includes("[SYSTEM] Run already completed")) {
             es.close();
             setStatus("completed");
             return;
        }
        setLogs(prev => prev + data + "\n");
    };

    es.onerror = (e) => {
        // Stream ended or error
        es.close();
        setStatus("completed"); 
    };

    return () => {
        es.close();
    };
  }, [runId, status]); // Re-subscribe if runId changes and it happens to be queued (unlikely for old runs)

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight > 50) {
            setAutoScroll(false);
        } else {
            setAutoScroll(true);
        }
    }
  };

  const handleRunChange = (newRunId: number) => {
      const run = runs.find(r => r.id === newRunId);
      if (run) {
          setRunId(run.id);
          setLogs(run.logs || "");
          setStatus(run.status);
          // If we switch to a run, we generally don't expect it to be queued unless we just created it?
          // Existing logic will handle if it is queued.
      }
  };

  // Global key handler
  useEffect(() => {
      const handler = (e: KeyboardEvent) => {
          if (e.key === "Escape") {
              onExit();
              return;
          }

          if (e.ctrlKey) {
             if (e.key === "[") {
                 // Previous Run (Up/Newer) -> Index - 1
                 e.preventDefault();
                 if (!runId || runs.length === 0) return;
                 const idx = runs.findIndex(r => r.id === runId);
                 if (idx > 0) {
                     handleRunChange(runs[idx - 1].id);
                 }
             } else if (e.key === "]") {
                 // Next Run (Down/Older) -> Index + 1
                 e.preventDefault();
                 if (!runId || runs.length === 0) return;
                 const idx = runs.findIndex(r => r.id === runId);
                 if (idx < runs.length - 1) {
                     handleRunChange(runs[idx + 1].id);
                 }
             }
          }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
  }, [onExit, runId, runs]);

  if (error) return <div className="text-red-500 p-4">{error} <button onClick={onExit} className="underline">Close</button></div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#0f0f0f] border border-gray-800">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-4">
                <span className="text-gray-400 text-xs font-mono">agent_{agentId}.log</span>
                
                {/* Run Selector */}
                {runs.length > 0 && (
                    <div className="flex items-center gap-2">
                        <select 
                            className="bg-gray-800 text-gray-300 text-xs border border-gray-700 rounded px-2 py-1 outline-none focus:border-blue-500 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[600px]"
                            value={runId || ""}
                            onChange={(e) => handleRunChange(Number(e.target.value))}
                        >
                            {runs.map(run => (
                                <option key={run.id} value={run.id}>
                                    v{run.version_id ?? "?"} - #{run.id} - {run.status.toUpperCase()} - {new Date(run.start_time).toLocaleString()}
                                </option>
                            ))}
                        </select>
                        <span className="text-gray-600 text-[10px] hidden xl:inline">CTRL + [ / ]</span>
                    </div>
                )}


                {status === "running" && <span className="text-green-500 text-xs animate-pulse">● Live</span>}
                {status === "queued" && <span className="text-yellow-500 text-xs">● Queued</span>}
                {(status === "completed" || status === "success") && <span className="text-gray-500 text-xs">● Finished</span>}
            </div>
            <div className="flex items-center gap-4 text-xs">
                <div className="flex gap-2 items-center">
                     <span className="hidden md:inline text-gray-600 mr-2">[ Ctrl+` ] View Code</span>
                     <button 
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`px-3 py-1 ${autoScroll ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-400'} hover:bg-blue-600`}
                    >
                        {autoScroll ? "Auto-Scroll: ON" : "Auto-Scroll: OFF"}
                    </button>
                    <button onClick={onExit} className="text-gray-500 hover:text-white">[ ESC ] Close</button>
                </div>
            </div>
        </div>
        
        <div 
            className="flex-1 overflow-auto bg-[#1e1e1e] p-4 text-sm font-mono relative"
            ref={scrollRef}
            onScroll={handleScroll}
        >
            {status === "loading" ? (
                <div className="text-gray-500 animate-pulse">Loading logs...</div>
            ) : (
                <pre className="whitespace-pre-wrap font-mono text-gray-300">
                    {logs}
                </pre>
            )}
        </div>
    </div>
  );
}
