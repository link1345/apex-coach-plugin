import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { calculatePluginBuildMetadata } from "./plugin-content.js";

const root = join(import.meta.dir, "..");
const manifest = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));
const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
const marketplace = JSON.parse(await readFile(join(root, ".agents", "plugins", "marketplace.json"), "utf8"));

if (manifest.name !== "apex-coach-plugin") {
  throw new Error("plugin manifest name must be apex-coach-plugin");
}

if (manifest.version !== "0.3.0") {
  throw new Error("plugin manifest version must be 0.3.0");
}

for (const packagePath of [
  "package.json",
  "packages/apex-reference-mcp/package.json",
  "packages/game-video-analysis-mcp/package.json"
]) {
  const packageJson = JSON.parse(await readFile(join(root, packagePath), "utf8"));
  if (packageJson.version !== manifest.version) {
    throw new Error(`${packagePath} version must match plugin manifest version ${manifest.version}`);
  }
}

const committedMetadata = JSON.parse(
  await readFile(join(root, ".codex-plugin", "build.json"), "utf8")
);
const expectedMetadata = await calculatePluginBuildMetadata(root);
if (JSON.stringify(committedMetadata) !== JSON.stringify(expectedMetadata)) {
  throw new Error(".codex-plugin/build.json is stale; run bun run build");
}

if (manifest.skills !== "./skills/" || manifest.mcpServers !== "./.mcp.json") {
  throw new Error("plugin manifest component paths are invalid");
}

const marketplaceEntry = marketplace.plugins?.find(
  (plugin: { name?: string }) => plugin.name === manifest.name
);
const marketplaceRepository = marketplaceEntry?.source?.url?.replace(/\.git$/, "");
if (marketplaceRepository !== manifest.repository.replace(/\.git$/, "") || marketplaceEntry.source.ref !== "main") {
  throw new Error("marketplace entry must resolve the plugin manifest from the main source revision");
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
for (const reference of ["decision-gates.md", "combat-decisions.md", "recovery-inventory.md", "audio.md", "output-format.md"]) {
  await access(join(root, "skills", "apex-combat-review", "references", reference));
}
await access(join(root, "dist", "apex-reference", "data", "references", "mvp.json"));

console.log("Plugin manifest, Skill, MCP bundles, and reference data are present.");
