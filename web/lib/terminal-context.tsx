import { createContext, useContext } from "react";

export interface TerminalContextType {
  currentModel: string;
  availableModels: string[];
  setOverlay: (overlay: React.ReactNode | null) => void;
}

export const TerminalContext = createContext<TerminalContextType>({
  currentModel: "gpt-4o",
  availableModels: ["gpt-4o"],
  setOverlay: () => {},
});

export const useTerminalContext = () => useContext(TerminalContext);
