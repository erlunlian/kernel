import { ReactNode } from "react";
import { CommandContext, CommandDefinition, CommandHandler } from "./terminal-types";

class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();

  register(name: string, description: string, handler: CommandHandler) {
    this.commands.set(name, { name, description, handler });
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  async execute(input: string, context: CommandContext): Promise<ReactNode> {
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    if (!commandName) return null;

    const command = this.get(commandName);
    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    try {
        return await command.handler(args, context);
    } catch (e: any) {
        throw new Error(e.message || String(e));
    }
  }
}

export const commandRegistry = new CommandRegistry();
