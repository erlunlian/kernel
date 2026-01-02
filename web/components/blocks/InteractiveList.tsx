"use client";
import { ActiveSession } from "@/lib/active-session";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";

export interface InteractiveListProps<T> {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect: (item: T) => void;
  onDelete?: (item: T) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function InteractiveList<T>({ items, renderItem, onSelect, onDelete, onCancel, autoFocus = true }: InteractiveListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [componentId] = useState(() => Math.random().toString(36).substring(7));
  
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  useEffect(() => {
    if (!autoFocus) return;

    // Register as active session
    ActiveSession.setActive(componentId);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ActiveSession.isActive(componentId)) return;
      
      // If modal is open, trap keys
      if (deletingItem) {
          if (e.key === "Escape") {
              e.preventDefault();
              e.stopImmediatePropagation();
              setDeletingItem(null);
          } else if (e.key === "Enter") {
              e.preventDefault();
              e.stopImmediatePropagation();
              if (onDelete && deletingItem) {
                  onDelete(deletingItem);
                  setDeletingItem(null); 
                  // Adjust selection if needed? auto-handled by items prop change usually
              }
          }
          return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => (prev + 1) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (onCancel) onCancel();
      } else if (e.key === "Delete" || e.key === "Backspace") {
         if (onDelete && items[selectedIndex]) {
             e.preventDefault();
             e.stopImmediatePropagation();
             setDeletingItem(items[selectedIndex]);
         }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true }); 
    return () => {
        window.removeEventListener("keydown", handleKeyDown, { capture: true });
        if (ActiveSession.isActive(componentId)) {
            ActiveSession.clear();
        }
    };
  }, [autoFocus, items, selectedIndex, onSelect, onDelete, onCancel, componentId, deletingItem]);

  // Auto-scroll effect
  useEffect(() => {
    if (containerRef.current && items.length > 0) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, items]);


  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 border border-gray-800 p-2 bg-[#0a0a0a]/50">
       {items.map((item, idx) => (
         <div 
           key={idx}
           className={clsx(
             "cursor-pointer px-2 py-1 transition-colors flex items-center group",
             idx === selectedIndex ? "bg-white/10 text-green-400" : "text-gray-400 hover:bg-white/5"
           )}
           onClick={() => onSelect(item)}
         >
           <div className="flex-1">
                {renderItem(item, idx === selectedIndex)}
           </div>
           {onDelete && (
               <div 
                className={clsx(
                    "p-1 hover:bg-red-500/20 hover:text-red-500 rounded hidden", 
                    (idx === selectedIndex || "group-hover:block") && "block" // Show on hover or selection
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    setDeletingItem(item);
                }}
               >
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
               </div>
           )}
         </div>
       ))}
       
       {deletingItem && (
           <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <div className="border border-red-900/50 bg-black p-4 rounded shadow-xl flex flex-col gap-2 max-w-[300px]">
                   <div className="font-bold text-red-500">Delete Agent?</div>
                   <div className="text-xs text-gray-400">Are you sure you want to delete this agent? This action cannot be undone.</div>
                   <div className="flex gap-2 mt-2">
                       <button className="bg-red-900/40 hover:bg-red-900/60 text-red-200 px-3 py-1 text-xs rounded border border-red-800" onClick={() => {
                           if (onDelete) onDelete(deletingItem);
                           setDeletingItem(null);
                       }}>Confirm (Enter)</button>
                       <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 text-xs rounded" onClick={() => setDeletingItem(null)}>Cancel (Esc)</button>
                   </div>
               </div>
           </div>
       )}
       
       <div className="mt-2 pt-2 border-t border-gray-800 flex gap-4 text-[10px] text-gray-500 font-mono uppercase">
          <span className="flex items-center gap-1"><span className="bg-gray-800 px-1 rounded">↑/↓</span> NAV</span>
          <span className="flex items-center gap-1"><span className="bg-gray-800 px-1 rounded">↵</span> OPTIONS</span>
          {onDelete && <span className="flex items-center gap-1"><span className="bg-gray-800 px-1 rounded">DEL</span> DELETE</span>}
          <span className="flex items-center gap-1"><span className="bg-gray-800 px-1 rounded">ESC</span> CLOSE</span>
       </div>
    </div>
  );
}
