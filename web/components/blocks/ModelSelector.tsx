import { ActiveSession } from "@/lib/active-session";
import { useState } from "react";
import InteractiveList from "./InteractiveList";

interface ModelSelectorProps {
    models: string[];
    currentModel: string;
    onSelect: (model: string) => void;
}

export default function ModelSelector({ models, currentModel, onSelect }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) return (
        <div className="text-gray-500">
            Selected model: <span className="text-white font-bold">{currentModel}</span>
        </div>
    );

    return (
        <div className="my-2">
            <div className="text-sm text-gray-400 mb-2">Select AI Model:</div>
            <InteractiveList
                items={models}
                autoFocus={true}
                renderItem={(item, selected) => (
                   <span className={selected ? "font-bold text-green-400" : (item === currentModel ? "font-bold text-white" : "text-gray-400")}>
                       {item} {item === currentModel && "(current)"}
                   </span>
                )}
                onSelect={(item) => {
                    onSelect(item);
                    setIsOpen(false);
                    ActiveSession.clear();
                }}
                onCancel={() => {
                    setIsOpen(false);
                    ActiveSession.clear();
                }}
            />
        </div>
    );
}
