"use client";
import { createAgent } from "@/lib/api";
import React, { useState } from "react";

export default function NewAgentInput({ onCreated }: { onCreated: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setLoading(true);
    try {
      // Basic parsing: "new <name> <description>" or just natural language payload
      // For V1, let's treat the whole input as name or prompt?
      // "describe what this agent should do"
      await createAgent(`agent-${Math.floor(Math.random() * 1000)}`, value);
      setValue("");
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-800 p-4 bg-[#0a0a0a] fixed bottom-0 left-64 right-0">
      <form onSubmit={handleSubmit} className="flex gap-2 text-sm font-mono items-center">
        <span className="text-green-500 font-bold">$</span>
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="describe new agent..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600"
          autoFocus
          disabled={loading}
        />
        {loading && <span className="text-yellow-500 animate-pulse">Processing...</span>}
      </form>
    </div>
  );
}
