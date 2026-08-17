import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const HASH_INPUTS = [
  ".agents/plugins/marketplace.json",
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "skills",
  "dist"
] as const;

async function listFiles(root: string, paths: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  for (const path of paths) {
    const absolutePath = join(root, path);
    const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => undefined);
    if (entries === undefined) {
      files.push(absolutePath);
      continue;
    }
    for (const entry of entries) {
      const child = join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        files.push(...await listFiles(root, [relative(root, child)]));
      } else if (entry.isFile()) {
        files.push(child);
      }
    }
  }
  return files.sort((left, right) => relative(root, left).localeCompare(relative(root, right)));
}

async function hashPaths(root: string, paths: readonly string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const file of await listFiles(root, paths)) {
    hash.update(relative(root, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function calculatePluginBuildMetadata(root: string) {
  const manifest = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));
  const apexPackage = JSON.parse(await readFile(join(root, "packages", "apex-reference-mcp", "package.json"), "utf8"));
  const videoPackage = JSON.parse(await readFile(join(root, "packages", "game-video-analysis-mcp", "package.json"), "utf8"));
  return {
    pluginVersion: manifest.version,
    contentHash: await hashPaths(root, HASH_INPUTS),
    skillRevision: await hashPaths(root, ["skills/apex-combat-review"]),
    mcpServers: {
      "apex-reference": {
        version: apexPackage.version,
        revision: await hashPaths(root, ["dist/apex-reference"])
      },
      "game-video-analysis": {
        version: videoPackage.version,
        revision: await hashPaths(root, ["dist/game-video-analysis"])
      }
    }
  };
}

export async function writePluginBuildMetadata(root: string): Promise<void> {
  const metadata = await calculatePluginBuildMetadata(root);
  await writeFile(
    join(root, ".codex-plugin", "build.json"),
    `${JSON.stringify(metadata, null, 2)}\n`
  );
}
