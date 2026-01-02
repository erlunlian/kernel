import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kernel // Automate",
  description: "Personal Automation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-[#e5e5e5] h-screen w-screen overflow-hidden flex flex-col">
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </body>
    </html>
  );
}
