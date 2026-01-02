"use client";
import { createAgent, getSecrets, linkSecret, Secret } from "@/lib/api";
import React, { useEffect, useRef, useState } from "react";

export default function NewAgentBlock({ onComplete }: { onComplete: (msg: React.ReactNode) => void }) {
  const [step, setStep] = useState<"name" | "desc" | "secrets">("name");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [availableSecrets, setAvailableSecrets] = useState<Secret[]>([]);
  const [selectedSecretIds, setSelectedSecretIds] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "secrets") {
        getSecrets().then(setAvailableSecrets).catch(console.error);
    }
  }, [step]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);
  
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        const val = (e.target as HTMLInputElement).value;
        if (!val.trim()) return;

        if (step === "name") {
            setName(val);
            setStep("desc");
            (e.target as HTMLInputElement).value = "";
        } else if (step === "desc") {
            setDesc(val);
            setStep("secrets");
            (e.target as HTMLInputElement).value = "";
        } else if (step === "secrets") {
            // submit
            if (val.trim() === "done" || val.trim() === "") {
                try {
                    const agent = await createAgent(name, desc);
                    
                    // Link secrets
                    if (selectedSecretIds.size > 0) {
                        for (const secretId of Array.from(selectedSecretIds)) {
                             await linkSecret(agent.id, secretId);
                        }
                    }

                    onComplete(
                        <div className="text-green-500">
                            Successfully created agent <b>{agent.name}</b> (ID: {agent.id}).
                        </div>
                    );
                } catch (err) {
                    onComplete(<div className="text-red-500">Error creating agent.</div>);
                }
            } else {
                // Toggle secret selection by ID or Key
                // Simple parsing: if user types a number, toggle ID. If string, match key.
                const id = Number(val);
                let found: Secret | undefined;
                if (!isNaN(id)) {
                    found = availableSecrets.find(s => s.id === id);
                } else {
                    found = availableSecrets.find(s => s.key === val.trim());
                }

                if (found) {
                    const newSet = new Set(selectedSecretIds);
                    if (newSet.has(found.id)) {
                        newSet.delete(found.id);
                    } else {
                        newSet.add(found.id);
                    }
                    setSelectedSecretIds(newSet);
                    (e.target as HTMLInputElement).value = ""; // clear input to allow typing more
                }
            }
        }
    }
  };

  return (
    <div className="p-2 border border-gray-700 bg-[#0f0f0f] max-w-lg">
      <div className="text-white font-bold mb-2">Create New Agent</div>
      
      {step === "name" && (
        <div className="text-gray-400 text-sm">
            Enter unique name for the agent:
        </div>
      )}
      {step === "desc" && (
        <div>
            <div className="text-green-500 text-sm mb-1">Name: {name}</div>
            <div className="text-gray-400 text-sm">Describe what this agent should do:</div>
        </div>
      )}
      {step === "secrets" && (
        <div className="text-sm">
             <div className="text-green-500 text-sm mb-1">Name: {name}</div>
             <div className="text-gray-400 text-sm mb-2">Select secrets to grant access (type ID or Key to toggle, Enter to finish):</div>
             <div className="grid grid-cols-2 gap-2 mb-2">
                {availableSecrets.map(s => (
                    <div key={s.id} className={`border px-2 py-1 rounded ${selectedSecretIds.has(s.id) ? "border-green-500 bg-green-900/30 text-white" : "border-gray-700 text-gray-400"}`}>
                        <span className="text-xs font-mono mr-2">[{s.id}]</span>
                        {s.key}
                    </div>
                ))}
                {availableSecrets.length === 0 && <div className="text-gray-500 italic col-span-2">No secrets available.</div>}
             </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 text-green-500">
        <span>?</span>
        <input 
            ref={inputRef}
            className="bg-transparent border-none outline-none flex-1 text-white"
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus 
        />
      </div>
    </div>
  );
}

