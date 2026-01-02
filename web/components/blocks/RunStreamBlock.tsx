"use client";
import { useEffect, useRef, useState } from "react";
// Reuse logic from old RunStream but styled as a block

export default function RunStreamBlock({ runId }: { runId: number }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("initializing");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:8000/api/runs/${runId}/stream`);

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
      if (event.data.includes("Execution completed")) {
          setStatus("finished");
          eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
      setStatus("error");
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="border border-green-900 bg-black max-w-3xl font-mono text-xs my-2">
       <div className="bg-green-900/20 text-green-500 px-3 py-1 border-b border-green-900 flex justify-between">
          <span>Run #{runId} Log Stream</span>
          <span className="animate-pulse">{status === "finished" ? "DONE" : "LIVE"}</span>
       </div>
       <div className="p-3 h-64 overflow-y-auto">
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap text-gray-300">
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
       </div>
    </div>
  );
}
