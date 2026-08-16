import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = join(import.meta.dir, "..");

await verifyServer(
  "apex-reference",
  join(root, "dist", "apex-reference", "server.js"),
  ["search_reference", "get_reference", "get_reference_history", "validate_review"]
);
await verifyServer(
  "game-video-analysis",
  join(root, "dist", "game-video-analysis", "server.js"),
  ["check_runtime", "get_video_info", "get_frame", "get_frames", "get_clip", "get_audio", "crop_region"]
);

async function verifyServer(name: string, entrypoint: string, expectedTools: string[]): Promise<void> {
  const client = new Client({ name: `${name}-plugin-smoke`, version: "0.2.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entrypoint],
    cwd: root
  });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    const actualTools = new Set(result.tools.map((tool) => tool.name));
    const missingTools = expectedTools.filter((tool) => !actualTools.has(tool));
    if (missingTools.length > 0) {
      throw new Error(`${name} is missing tools: ${missingTools.join(", ")}`);
    }
    if (name === "game-video-analysis") {
      const diagnostic = await client.callTool({ name: "check_runtime", arguments: {} });
      const ready = (diagnostic.structuredContent as { ready?: unknown } | undefined)?.ready;
      if (typeof ready !== "boolean") {
        throw new Error("game-video-analysis check_runtime did not return readiness");
      }
      console.log(`${name}: runtime diagnostic available (ready=${ready}).`);
    }
    console.log(`${name}: ${expectedTools.length} expected tools available.`);
  } finally {
    await client.close();
  }
}
