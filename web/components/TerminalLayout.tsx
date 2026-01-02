"use client";
import { useTerminal } from "@/hooks/useTerminal";
import { ReactNode } from "react";

import { commandRegistry } from "@/lib/command-registry";
import { TerminalContext } from "@/lib/terminal-context";

export default function TerminalLayout({ initialWelcome }: { initialWelcome?: ReactNode }) {
  const {
    blocks,
    input,
    setInput,
    isProcessing,
    inputRef,
    bottomRef,
    handleKeyDown,
    handleContainerClick,
    promptLabel,
    overlay,
    currentModel,
    isSlashMenuOpen,
    slashFilter,
    slashSelectedIndex,
    models,
    setOverlay
  } = useTerminal(initialWelcome);

  const commands = commandRegistry.getAll().filter(c => c.name.startsWith(slashFilter));

  return (
    <TerminalContext.Provider value={{ currentModel, availableModels: models, setOverlay }}>
    <div 
      className="w-full h-screen bg-[#0a0a0a] text-[#e5e5e5] font-mono flex items-center justify-center"
      onClick={handleContainerClick}
    >
      <div className="w-full h-full flex flex-col relative p-20">
        {/* Output Stream */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide relative">
          {overlay ? (
             <div className="absolute inset-0 z-10 bg-[#0a0a0a]">
                {overlay}
             </div>
          ) : (
             <>
                {blocks.map(block => (
                    <div key={block.id} className="animate-in fade-in duration-200">
                        {block.content}
                    </div>
                ))}
                <div ref={bottomRef} className="h-4" />
             </>
          )}
        </div>

        {/* Input Line */}
        <div className="mt-4 flex items-center gap-2 text-green-500 shrink-0 border-t border-white/5 pt-4 relative">
          {/* Slash Command Menu */}
          {isSlashMenuOpen && commands.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-xl z-20">
                  {commands.map((cmd, index) => (
                      <div 
                        key={cmd.name}
                        className={`px-3 py-2 flex items-center justify-between text-sm ${index === slashSelectedIndex ? 'bg-green-500/20 text-green-400' : 'text-gray-400'}`}
                      >
                          <span className="font-bold">/{cmd.name}</span>
                          <span className="text-xs opacity-50">{cmd.description}</span>
                      </div>
                  ))}
              </div>
          )}

          <div className="flex flex-col items-end mr-2 text-xs text-gray-600 font-mono">
             <div>{currentModel}</div>
          </div>
          <span className="font-bold select-none">{promptLabel}</span>
          <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[#e5e5e5] placeholder-gray-700 font-bold"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              autoComplete="off"
              spellCheck={false}
          />
          {isProcessing && <div className="w-2 h-4 bg-green-500 animate-pulse" />}
        </div>
      </div>
    </div>
    </TerminalContext.Provider>
  );
}
