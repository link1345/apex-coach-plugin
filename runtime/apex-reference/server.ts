import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ReferenceRepository } from "../../packages/apex-reference-mcp/src/reference/repository.js";
import { createApexReferenceServer } from "../../packages/apex-reference-mcp/src/server.js";

const runtimeRoot = dirname(fileURLToPath(import.meta.url));
const referenceDataDir = join(runtimeRoot, "data", "references");

const server = createApexReferenceServer(new ReferenceRepository(referenceDataDir));
await server.connect(new StdioServerTransport());
