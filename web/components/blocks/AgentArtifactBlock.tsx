import { API_URL, getArtifacts, getRuns, Run } from "@/lib/api";
import { useEffect, useState } from "react";

export default function AgentArtifactBlock({ agentId, initialRunId, onExit }: { agentId: number, initialRunId?: number, onExit: () => void }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<number | null>(initialRunId || null);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch of runs
  useEffect(() => {
    let mounted = true;
    getRuns(agentId).then(data => {
        if (!mounted) return;
        const sorted = data.sort((a, b) => {
             const vA = a.version_id || 0;
             const vB = b.version_id || 0;
             if (vA !== vB) return vB - vA;
             return b.id - a.id;
        });
        setRuns(sorted);
        
        let targetRun = sorted[0]; 
        if (runId) {
             const found = sorted.find(r => r.id === runId);
             if (found) targetRun = found;
        }

        if (targetRun) {
            setRunId(targetRun.id);
        }
    }).catch(err => {
        if (mounted) setError("Failed to fetch runs: " + err.message);
    });
    return () => { mounted = false; };
  }, [agentId]);

  // Fetch artifacts when runId changes
  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    setArtifacts([]);
    setSelectedArtifact(null);
    setContent(null);

    getArtifacts(agentId, runId).then(data => {
        setArtifacts(data);
        if (data.length > 0) {
            // Auto-select first? Maybe not.
        }
    }).catch(err => {
        console.error("Failed to fetch artifacts", err);
    }).finally(() => {
        setLoading(false);
    });
  }, [agentId, runId]);

  // Fetch content when artifact selected (if text)
  useEffect(() => {
    if (!selectedArtifact || !runId) return;

    if (isImage(selectedArtifact)) {
        setContent(null); // Will use img tag
        return;
    }

    setLoading(true);
    fetch(`${API_URL}/artifacts/${agentId}/${runId}/${selectedArtifact}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load content");
            return res.text();
        })
        .then(text => {
            setContent(text);
        })
        .catch(err => {
            setContent("Error loading content: " + err.message);
        })
        .finally(() => setLoading(false));

  }, [agentId, runId, selectedArtifact]);

  const handleRunChange = (newRunId: number) => {
      setRunId(newRunId);
  };

  const isImage = (filename: string) => {
      return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename);
  };

    // Global key handler
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onExit();
                return;
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (artifacts.length === 0) return;
                const idx = selectedArtifact ? artifacts.indexOf(selectedArtifact) : -1;
                if (idx > 0) {
                    setSelectedArtifact(artifacts[idx - 1]);
                } else if (idx === -1) {
                    setSelectedArtifact(artifacts[artifacts.length - 1]);
                }
                return;
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (artifacts.length === 0) return;
                const idx = selectedArtifact ? artifacts.indexOf(selectedArtifact) : -1;
                if (idx < artifacts.length - 1) {
                    setSelectedArtifact(artifacts[idx + 1]);
                } else if (idx === -1) {
                    setSelectedArtifact(artifacts[0]);
                }
                return;
            }

            if (e.ctrlKey) {
                if (e.key === "[") {
                    // Previous Run -> Newer (smaller index)
                    e.preventDefault();
                    if (!runId || runs.length === 0) return;
                    const idx = runs.findIndex(r => r.id === runId);
                    if (idx > 0) {
                        handleRunChange(runs[idx - 1].id);
                    }
                } else if (e.key === "]") {
                    // Next Run -> Older (larger index)
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
    }, [onExit, runId, runs, artifacts, selectedArtifact]);

    return (
        <div className="w-full h-full flex flex-col bg-[#0f0f0f] border border-gray-800">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-xs font-mono">artifacts / run_{runId}</span>
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
                </div>
                <div className="flex gap-2">
                    <button onClick={onExit} className="text-gray-500 hover:text-white text-xs">[ ESC ] Close</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-64 border-r border-gray-800 flex flex-col bg-[#161616]">
                    <div className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Artifacts</div>
                <div className="flex-1 overflow-auto">
                    {artifacts.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm italic">No artifacts found.</div>
                    ) : (
                        artifacts.map(file => (
                            <div 
                                key={file}
                                onClick={() => setSelectedArtifact(file)}
                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-800 ${selectedArtifact === file ? "bg-blue-900/30 text-blue-400 border-l-2 border-blue-500" : "text-gray-300"}`}
                            >
                                {file}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4">
                {!selectedArtifact ? (
                    <div className="h-full flex items-center justify-center text-gray-600">
                        Select an artifact to view
                    </div>
                ) : (
                    <>
                        {isImage(selectedArtifact) ? (
                            <div className="flex justify-center">
                                <img 
                                    src={`${API_URL}/artifacts/${agentId}/${runId}/${selectedArtifact}`} 
                                    className="max-w-full border border-gray-700 rounded"
                                    alt={selectedArtifact} 
                                />
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                                {content}
                            </pre>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
  );
}
