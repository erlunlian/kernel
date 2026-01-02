"use client";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

export default function ArtifactBrowser({ agentName, runId }: { agentName: string, runId: number }) {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    // In a real app we'd fetch the file list from API
    // For MVP we just assume we can fetch list if we had an endpoint
    // Actually we implemented GET /artifacts/{agent_name}/{run_id} to list
    fetch(`http://localhost:8000/api/artifacts/${agentName}/${runId}`)
      .then(res => res.json())
      .then(data => setFiles(data))
      .catch(err => console.error(err));
  }, [agentName, runId]);

  if (files.length === 0) return <div className="text-gray-600 italic text-xs p-4">No artifacts produced.</div>;

  return (
    <div className="p-4 bg-[#0a0a0a] border border-gray-800 h-[400px]">
      <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Artifacts</div>
      <ul className="space-y-1">
        {files.map(file => (
          <li key={file}>
            <a 
              href={`http://localhost:8000/api/artifacts/${agentName}/${runId}/${file}`}
              target="_blank"
              download
              className="flex items-center gap-2 text-green-400 hover:text-green-300 hover:underline text-sm font-mono"
            >
              <FileText size={14} />
              {file}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
