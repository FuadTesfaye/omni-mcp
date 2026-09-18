import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni-MCP — MCPify Anything",
  description:
    "Turn any API, CLI, database, website, SDK, or codebase into a production-ready MCP server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
