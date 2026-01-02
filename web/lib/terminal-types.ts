import { ReactNode } from "react";

export type BlockType = "text" | "table" | "component" | "error" | "success" | "welcome";

export interface TerminalBlock {
  id: string;
  type: BlockType;
  content: ReactNode;
  command: string; // The command that generated this block
  timestamp: number;
}

export interface CommandContext {
  setOverlay: (node: ReactNode | null) => void;
  currentModel: string;
  availableModels: string[];
  setModel: (model: string) => void;
}

export type CommandHandler = (args: string[], context: CommandContext) => Promise<ReactNode> | ReactNode;

export interface CommandDefinition {
  name: string;
  description: string;
  handler: CommandHandler;
}
