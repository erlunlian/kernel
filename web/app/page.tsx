"use client";
import TerminalLayout from "@/components/TerminalLayout";
import { registerDefaultCommands } from "@/lib/commands/default";

// Register commands immediately when this module loads
registerDefaultCommands();

export default function Home() {
  
  // No need for useEffect registration anymore


  const welcomeMessage = (
    <div className="mb-4">
      <pre className="text-xs font-bold text-green-500 leading-none mb-2">
        {`██╗  ██╗███████╗██████╗ ███╗   ██╗███████╗██╗     
██║ ██╔╝██╔════╝██╔══██╗████╗  ██║██╔════╝██║     
█████╔╝ █████╗  ██████╔╝██╔██╗ ██║█████╗  ██║     
██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝  ██║     
██║  ██╗███████╗██║  ██║██║ ╚████║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝`}
      </pre>
      <div className="text-gray-500 text-sm">
        Welcome to Kernel v1.0 <br/>
        Type <span className="text-white font-bold">/help</span> to see available commands.
      </div>
    </div>
  );

  return (
    <TerminalLayout initialWelcome={welcomeMessage} />
  );
}
