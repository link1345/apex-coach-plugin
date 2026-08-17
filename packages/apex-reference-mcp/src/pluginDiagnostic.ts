import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";

export interface PluginBuildInfo {
  pluginVersion: string;
  contentHash: string;
  skillRevision: string;
  mcpServers: {
    "apex-reference": { version: string; revision: string };
    "game-video-analysis": { version: string; revision: string };
  };
}

export async function readPluginBuildInfo(pluginRoot = process.cwd()): Promise<PluginBuildInfo & { cachePath: string }> {
  const metadataPath = join(pluginRoot, ".codex-plugin", "build.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as PluginBuildInfo;
  return { ...metadata, cachePath: await realpath(pluginRoot) };
}
