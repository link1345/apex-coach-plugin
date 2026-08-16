import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const manifest = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));
const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));

if (manifest.name !== "apex-coach-plugin") {
  throw new Error("plugin manifest name must be apex-coach-plugin");
}

if (manifest.skills !== "./skills/" || manifest.mcpServers !== "./.mcp.json") {
  throw new Error("plugin manifest component paths are invalid");
}

for (const [name, server] of Object.entries(mcp.mcpServers) as Array<[
  string,
  { command?: string; args?: string[] }
]>) {
  if (server.command !== "bun" || server.args?.length !== 1) {
    throw new Error(`invalid MCP launch configuration: ${name}`);
  }
  await access(join(root, server.args[0]!));
}

await access(join(root, "skills", "apex-combat-review", "SKILL.md"));
await access(join(root, "dist", "apex-reference", "data", "references", "mvp.json"));

console.log("Plugin manifest, Skill, MCP bundles, and reference data are present.");
