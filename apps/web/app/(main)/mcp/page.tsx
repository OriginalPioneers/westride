import type { Metadata } from "next";
import { McpOverview } from "./mcp-overview";

export const metadata: Metadata = {
  title: "MCP",
  description:
    "Connect ChatGPT, Claude, Cursor, and other AI assistants to WeStride.",
};

export default function McpPage() {
  return <McpOverview />;
}
