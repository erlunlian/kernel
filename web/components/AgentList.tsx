"use client";
import { Agent } from "@/lib/api";
import clsx from "clsx";
import Link from "next/link";

export default function AgentList({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return <div className="text-gray-500 mt-4">No agents found. Create one to start.</div>;
  }

  return (
    <div className="w-full font-mono text-sm mt-6">
      <div className="flex border-b border-gray-800 pb-2 mb-2 text-gray-500 uppercase text-xs tracking-wider">
        <div className="w-8"></div>
        <div className="w-64">Name</div>
        <div className="w-32">Status</div>
        <div className="w-48">Schedule</div>
        <div className="flex-1">Description</div>
      </div>
      
      {agents.map((agent) => (
        <Link 
          key={agent.id} 
          href={`/agents/${agent.id}`}
          className="flex items-center py-2 hover:bg-white/5 cursor-pointer group transition-colors"
        >
          <div className="w-8 text-center text-gray-600 group-hover:text-green-500">
            {agent.status === "active" ? "●" : "○"}
          </div>
          <div className="w-64 font-bold text-gray-300 group-hover:text-green-400">
            {agent.name}
          </div>
          <div className={clsx("w-32", agent.status === "active" ? "text-green-600" : "text-gray-600")}>
            {agent.status}
          </div>
          <div className="w-48 text-gray-500 text-xs">
            {agent.schedule || "-"}
          </div>
          <div className="flex-1 text-gray-400 truncate pr-4">
            {agent.description || "No description"}
          </div>
        </Link>
      ))}
    </div>
  );
}
