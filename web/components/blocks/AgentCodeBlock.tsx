import { ActiveSession } from "@/lib/active-session";
import { AgentVersion, getAgentCode, getAgentVersions, refineCode, updateAgentCode } from "@/lib/api";
import { useTerminalContext } from "@/lib/terminal-context";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-dark.css"; // We might need to inject styles or assume global styles
import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";

export default function AgentCodeBlock({ agentId, onExit }: { agentId: number, onExit: () => void }) {
  const { currentModel } = useTerminalContext();
  const [code, setCode] = useState<string>("");
  const [originalCode, setOriginalCode] = useState<string>(""); // Code at the start of editing the version
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState<string>("");

  // Fetch initial code and versions
  useEffect(() => {
    let mounted = true;
    Promise.all([
        getAgentCode(agentId),
        getAgentVersions(agentId)
    ]).then(([codeData, versionsData]) => {
        if (!mounted) return;
        setCode(codeData);
        setOriginalCode(codeData);
        setVersions(versionsData);
        // Assume fetched code is HEAD, which matches the first version in our descending list if exists
        if (versionsData.length > 0) {
            setSelectedVersionId(versionsData[0].id);
        }
    }).catch(err => {
        if (mounted) setError(err.message || "Failed to fetch data");
    });
    return () => { mounted = false; };
  }, [agentId]);

  const handleSave = async () => {
      setSaving(true);
      setMessage(null);
      try {
          await updateAgentCode(agentId, code);
          setOriginalCode(code);
          setMessage("Saved new version.");
          
          // Refresh versions
          const newVersions = await getAgentVersions(agentId);
          setVersions(newVersions);
          if (newVersions.length > 0) setSelectedVersionId(newVersions[0].id);

          setTimeout(() => setMessage(null), 3000);
      } catch (e: any) {
          setError(e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleVersionChange = (versionId: number) => {
      const v = versions.find(v => v.id === versionId);
      if (v) {
          setSelectedVersionId(versionId);
          setCode(v.code);
          setOriginalCode(v.code);
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
                 // Previous Version (older) -> Next index in descending list
                 e.preventDefault();
                 if (!selectedVersionId || versions.length === 0) return;
                 const idx = versions.findIndex(v => v.id === selectedVersionId);
                 if (idx < versions.length - 1) {
                     handleVersionChange(versions[idx + 1].id);
                 }
             } else if (e.key === "]") {
                 // Next Version (newer) -> Previous index in descending list
                 e.preventDefault();
                 if (!selectedVersionId || versions.length === 0) return;
                 const idx = versions.findIndex(v => v.id === selectedVersionId);
                 if (idx > 0) {
                     handleVersionChange(versions[idx - 1].id);
                 }
             }
          }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
  }, [onExit, selectedVersionId, versions]);

  // Register Input Handler
  useEffect(() => {
      ActiveSession.setInputHandler((instruction) => {
          if (refining) return;
          setRefining(true);
          setStreamBuffer("");
          setMessage(`Refining with ${currentModel}...`);
          
          let accumulated = "";
          refineCode(code, instruction, currentModel, (chunk) => {
              accumulated += chunk;
              setCode(accumulated); // Update editor in real-time
              setStreamBuffer(accumulated);
          }).then(() => {
             setMessage("Refinement complete.");
             setTimeout(() => setMessage(null), 3000);
          }).catch(err => {
             setError(err.message);
          }).finally(() => {
             setRefining(false);
          });
      });
      
      return () => {
          ActiveSession.removeInputHandler();
      };
  }, [code, refining, currentModel]);

  if (error) return <div className="text-red-500 p-4">{error} <button onClick={onExit} className="underline">Close</button></div>;
  if (!code && !originalCode && versions.length === 0) return <div className="text-gray-500 animate-pulse p-4">Loading code...</div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#0f0f0f] border border-gray-800">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-4">
                <span className="text-gray-400 text-xs font-mono">agent_{agentId}.py</span>
                
                {/* Version Selector */}
                {versions.length > 0 && (
                    <div className="flex items-center gap-2">
                         <select 
                            className="bg-gray-800 text-gray-300 text-xs border border-gray-700 rounded px-2 py-1 outline-none focus:border-blue-500 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[600px]"
                            value={selectedVersionId || ""}
                            onChange={(e) => handleVersionChange(Number(e.target.value))}
                        >
                            {versions.map(v => (
                                <option key={v.id} value={v.id}>
                                    v{v.id} - {new Date(v.created_at).toLocaleString()}
                                </option>
                            ))}
                        </select>
                        <span className="text-gray-600 text-[10px] hidden xl:inline">CTRL + [ / ]</span>
                    </div>
                )}

                {code !== originalCode && <span className="text-yellow-500 text-xs italic">(modified)</span>}
            </div>
            <div className="flex items-center gap-4 text-xs">
                {refining && <span className="text-blue-500 animate-pulse">Streaming...</span>}
                {message && !refining && <span className="text-green-500">{message}</span>}
                <div className="flex gap-2 items-center">
                    <span className="hidden md:inline text-gray-600 mr-2">[ Ctrl+` ] View Logs</span>
                    <button 
                        onClick={handleSave}
                        disabled={saving || code === originalCode}
                        className="px-3 py-1 bg-green-700 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save (CMD+S)"}
                    </button>
                    <button onClick={onExit} className="text-gray-500 hover:text-white">[ ESC ] Close</button>
                </div>
            </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4 text-sm font-mono relative" 
             onKeyDown={(e) => {
                 // Stop propagation so we can type without triggering terminal inputs?
                 // Actually terminal input is outside this overlay.
                 if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                     e.preventDefault();
                     handleSave();
                 }
             }}
        >
            <style jsx global>{`
                .prism-editor textarea { outline: none !important; }
            `}</style>
            <Editor
                value={code}
                onValueChange={setCode}
                highlight={code => Prism.highlight(code, Prism.languages.python, 'python')}
                padding={10}
                className="prism-editor font-mono"
                style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: '100%',
                }}
            />
        </div>
    </div>
  );
}
