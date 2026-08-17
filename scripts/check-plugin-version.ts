import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const baseArgIndex = process.argv.indexOf("--base");
const base = baseArgIndex >= 0 ? process.argv[baseArgIndex + 1] : undefined;
const manifest = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));

for (const packagePath of [
  "package.json",
  "packages/apex-reference-mcp/package.json",
  "packages/game-video-analysis-mcp/package.json"
]) {
  const packageJson = JSON.parse(await readFile(join(root, packagePath), "utf8"));
  if (packageJson.version !== manifest.version) {
    throw new Error(`${packagePath} version ${packageJson.version} does not match plugin version ${manifest.version}`);
  }
}

if (base && !/^0+$/.test(base)) {
  const previousManifest = runGit(["show", `${base}:.codex-plugin/plugin.json`]);
  if (previousManifest.status === 0) {
    const previousVersion = JSON.parse(previousManifest.stdout).version;
    const changedFiles = runGit(["diff", "--name-only", base]);
    if (changedFiles.status !== 0) {
      throw new Error(changedFiles.stderr || `Unable to compare against ${base}`);
    }
    const distributedContentChanged = changedFiles.stdout
      .split(/\r?\n/)
      .some(isDistributedContent);
    if (distributedContentChanged && previousVersion === manifest.version) {
      throw new Error(
        `Distributed plugin content changed without a version bump (still ${manifest.version}).`
      );
    }
  }
}

console.log(`Plugin version ${manifest.version} is consistent.`);

function isDistributedContent(path: string): boolean {
  return path === ".mcp.json" ||
    path === ".agents/plugins/marketplace.json" ||
    path.startsWith(".codex-plugin/") ||
    path.startsWith("skills/") ||
    path.startsWith("runtime/") ||
    path.startsWith("dist/") ||
    /^packages\/[^/]+\/(?:package\.json|src\/|data\/)/.test(path);
}

function runGit(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return {
    status: result.exitCode,
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim()
  };
}
