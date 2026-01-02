"use client";
import { useEffect, useRef, useState } from "react";

export default function RunStream({ runId, isActive }: { runId: number; isActive: boolean }) {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !runId) return;

    setLogs([]); // Clear logs on new run
    const eventSource = new EventSource(`http://localhost:8000/api/runs/${runId}/stream`);

    eventSource.onmessage = (event) => {
      // data: [STDOUT] hello
      // data: [SYSTEM] finished
      // We parse the raw line. The backend sends "data: ...\n\n"
      // The browser EventSource API handles the framing, 'event.data' is the content.
      setLogs((prev) => [...prev, event.data]);
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, isActive]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="bg-black border border-gray-800 p-4 font-mono text-xs h-[400px] overflow-y-auto text-gray-300">
      {logs.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap font-mono">
          {line}
        </div>
      ))}
      {logs.length === 0 && <div className="text-gray-600 italic">Waiting for logs...</div>}
      <div ref={bottomRef} />
    </div>
  );
}
