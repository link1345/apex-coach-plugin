import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = join(repositoryRoot, "dist");

await rm(distRoot, { recursive: true, force: true });

await buildServer(
  join(repositoryRoot, "runtime", "apex-reference", "server.ts"),
  join(distRoot, "apex-reference")
);
await buildServer(
  join(repositoryRoot, "runtime", "game-video-analysis", "server.ts"),
  join(distRoot, "game-video-analysis")
);

await mkdir(join(distRoot, "apex-reference", "data"), { recursive: true });
await cp(
  join(repositoryRoot, "packages", "apex-reference-mcp", "data", "references"),
  join(distRoot, "apex-reference", "data", "references"),
  { recursive: true }
);

async function buildServer(entrypoint: string, outdir: string): Promise<void> {
  await mkdir(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir,
    target: "bun",
    minify: true
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Failed to build ${entrypoint}`);
  }

  for (const output of result.outputs) {
    if (output.path.endsWith(".js")) {
      const bundledSource = await readFile(output.path, "utf8");
      await writeFile(output.path, bundledSource.replace(/[ \t]+$/gm, ""));
    }
  }
}
