import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { ReferenceRepository } from "./reference/repository.js";
import { ReferenceTypeSchema } from "./reference/schema.js";
import { validateReviewDraft } from "./review/validation.js";

export function createApexReferenceServer(repository = new ReferenceRepository()): McpServer {
  const server = new McpServer({
    name: "apex-reference-mcp",
    version: "0.2.0"
  });

  server.registerResource(
    "apex-reference-samples",
    "apex-reference://samples",
    {
      title: "APEX Reference samples",
      description: "Validated sample APEX reference records with provenance metadata.",
      mimeType: "application/json"
    },
    async (uri) => {
      const references = await repository.listReferences();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ references }, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "search_reference",
    {
      title: "Search APEX references",
      description: "Search APEX reference records by name, alias, description, and value keys.",
      inputSchema: {
        query: z.string().min(1),
        type: ReferenceTypeSchema.optional(),
        maxResults: z.number().int().min(1).max(25).optional()
      },
      outputSchema: {
        results: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: ReferenceTypeSchema,
          summary: z.string(),
          patch: z.unknown(),
          verifiedAt: z.string(),
          source: z.unknown(),
          score: z.number()
        }))
      }
    },
    async ({ query, type, maxResults }) => {
      const results = await repository.searchReferences({ query, type, maxResults });
      return {
        structuredContent: { results },
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "validate_review",
    {
      title: "Validate an APEX review draft",
      description: "Validate structured coaching findings before writing the final review. Rejects unavailable options, unsupported thresholds and references, ambiguous comparisons, and overconfident audio or recovery claims.",
      inputSchema: {
        audioCoverage: z.enum(["complete", "partial", "none"]),
        findings: z.array(reviewFindingSchema()).min(1)
      },
      outputSchema: {
        valid: z.boolean(),
        errors: z.array(reviewIssueSchema()),
        warnings: z.array(reviewIssueSchema()),
        checkedReferenceClaims: z.array(z.object({
          findingId: z.string(),
          referenceId: z.string(),
          valueKey: z.string(),
          found: z.boolean(),
          value: z.unknown().optional()
        }))
      }
    },
    async (draft) => {
      const result = await validateReviewDraft(draft, repository);
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.registerTool(
    "get_reference",
    {
      title: "Get APEX reference",
      description: "Get a complete APEX reference record by id, or by exact name/alias plus type, optionally for a patch/version or timestamp.",
      inputSchema: {
        id: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        type: ReferenceTypeSchema.optional(),
        version: z.string().min(1).optional(),
        patch: z.string().min(1).optional(),
        at: z.string().min(1).optional(),
        includeHistory: z.boolean().optional()
      },
      outputSchema: {
        found: z.boolean(),
        resolvedBy: z.enum(["id", "name_type"]).optional(),
        reason: z.enum([
          "missing_identifier",
          "type_required_with_name",
          "reference_not_found",
          "ambiguous_reference",
          "version_not_found"
        ]).optional(),
        reference: z.unknown().optional(),
        history: z.unknown().optional(),
        candidates: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: ReferenceTypeSchema,
          patch: z.unknown(),
          verifiedAt: z.string(),
          source: z.unknown()
        })).optional()
      }
    },
    async ({ id, name, type, version, patch, at, includeHistory }) => {
      const result = await repository.getReference({ id, name, type, version, patch, at, includeHistory });
      return {
        structuredContent: result,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "get_reference_history",
    {
      title: "Get APEX reference history",
      description: "Get chronological change events for a Reference record by id, or by exact name/alias plus type.",
      inputSchema: {
        id: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        type: ReferenceTypeSchema.optional()
      },
      outputSchema: {
        found: z.boolean(),
        resolvedBy: z.enum(["id", "name_type"]).optional(),
        reason: z.enum(["missing_identifier", "type_required_with_name", "reference_not_found", "ambiguous_reference"]).optional(),
        history: z.unknown().optional(),
        candidates: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: ReferenceTypeSchema,
          patch: z.unknown(),
          verifiedAt: z.string(),
          source: z.unknown()
        })).optional()
      }
    },
    async ({ id, name, type }) => {
      const result = await repository.getReferenceHistory({ id, name, type });
      return {
        structuredContent: result,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  return server;
}

function reviewFindingSchema() {
  const feasibility = z.enum(["confirmed", "conditional", "unavailable", "unknown"]);
  return z.object({
    id: z.string().min(1),
    timestampRange: z.string().min(1),
    observations: z.array(z.object({ id: z.string().min(1), statement: z.string().min(1) })),
    inferences: z.array(z.object({ statement: z.string().min(1), cueEvidenceIds: z.array(z.string().min(1)) })),
    actualAction: z.string().min(1),
    actualActionCertainty: z.enum(["confirmed", "ambiguous", "unknown"]),
    evaluation: z.string().min(1),
    recommendationMode: z.enum(["decisive", "conditional", "none"]),
    audioStatus: z.enum(["analyzed", "unusable", "not_analyzed"]),
    audioDependent: z.boolean(),
    options: z.array(z.object({
      action: z.string().min(1),
      category: z.enum(["ability", "recovery", "positioning", "weapon", "utility", "other"]),
      feasibility,
      verdict: z.enum(["better", "acceptable", "not_recommended", "unrated"]),
      evidenceIds: z.array(z.string().min(1)),
      conditions: z.array(z.string().min(1))
    })),
    numericClaims: z.array(z.object({
      value: z.number(),
      unit: z.string().min(1).optional(),
      use: z.enum(["measurement", "threshold"]),
      evidenceIds: z.array(z.string().min(1)),
      referenceId: z.string().min(1).optional(),
      valueKey: z.string().min(1).optional()
    })),
    referenceClaims: z.array(z.object({
      referenceId: z.string().min(1),
      valueKey: z.string().min(1),
      claim: z.string().min(1)
    })),
    recoveryContext: z.object({
      resourceTypes: z.array(z.enum(["health", "shield"])),
      availability: feasibility,
      deployed: z.enum(["confirmed", "not_required", "unknown"]),
      reachable: z.enum(["confirmed", "not_required", "unknown"]),
      completionWindow: z.enum(["sufficient", "pressured", "unknown"]),
      evidenceIds: z.array(z.string().min(1))
    }).optional()
  });
}

function reviewIssueSchema() {
  return z.object({
    code: z.string(),
    severity: z.enum(["error", "warning"]),
    findingId: z.string(),
    path: z.string(),
    message: z.string()
  });
}
