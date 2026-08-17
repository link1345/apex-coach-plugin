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
    "apex-reference-catalog",
    "apex-reference://catalog",
    {
      title: "APEX Reference catalog",
      description: "Validated current APEX reference catalog with patch and provenance metadata.",
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
      description: "Validate structured coaching findings and every reader-facing claim before writing the final review. Rejects unsupported team aggregates, target-motion causality, new numeric rules, unavailable options, unsupported references, ambiguous comparisons, and overconfident audio or recovery claims.",
      inputSchema: {
        audioCoverage: z.enum(["complete", "partial", "none"]),
        referenceContext: z.object({
          patch: z.string().min(1).optional(),
          at: z.iso.datetime().optional()
        }).refine(
          (context) => context.patch !== undefined || context.at !== undefined,
          "referenceContext requires patch or at"
        ).optional(),
        findings: z.array(reviewFindingSchema()).min(1),
        renderedClaims: z.array(z.object({
          id: z.string().min(1),
          kind: z.enum(["evaluation", "recommendation", "good_decision", "timeline", "summary", "other"]),
          text: z.string().min(1),
          findingIds: z.array(z.string().min(1))
        })).min(1),
        terminalState: z.object({
          squadOutcome: z.enum(["alive", "eliminated", "unknown"]),
          reviveOutcome: z.enum(["completed", "interrupted", "not_attempted", "unknown"]),
          evidenceIds: z.array(z.string().min(1)).min(1)
        }).optional(),
        readerFacingReview: z.object({
          summary: z.string().min(1),
          findings: z.array(z.object({ findingId: z.string().min(1), text: z.string().min(1) })),
          themes: z.array(z.string().min(1)).max(3),
          claims: z.array(z.object({
            findingId: z.string().min(1),
            type: z.enum(["numeric_threshold", "ability_availability", "causal", "absolute_rule"]),
            statement: z.string().min(1)
          })),
          outcome: z.object({
            squadOutcome: z.enum(["alive", "eliminated", "unknown"]),
            reviveOutcome: z.enum(["completed", "interrupted", "not_attempted", "unknown"])
          })
        }).optional()
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
        })),
        reviewCoverage: z.object({
          validatedFindingIds: z.array(z.string()),
          renderedFindingIds: z.array(z.string()),
          unvalidatedClaims: z.array(z.string())
        })
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
  const controlAvailability = z.enum(["available", "limited", "unavailable", "unknown"]);
  const uiCueType = z.enum(["position", "icon_shape", "numeric_display", "input_prompt", "animation", "target_marker", "observed_effect", "frame_continuity"]);
  return z.object({
    id: z.string().min(1),
    timestampRange: z.string().min(1),
    decisionType: z.enum(["ability", "inventory", "recovery", "positioning", "weapon", "utility", "other"]),
    assessment: z.enum(["positive", "negative", "neutral"]),
    evaluationTarget: z.enum(["purpose", "execution"]),
    actionPhase: z.enum(["targeting", "committed", "transit", "landing", "neutral"]),
    controlState: z.object({
      move: controlAvailability,
      aim: controlAvailability,
      fireWeapon: controlAvailability,
      swapWeapon: controlAvailability,
      cancel: controlAvailability
    }),
    decisionTimeline: z.object({
      eventVisibleAt: z.number().nonnegative().nullable(),
      likelyPerceivedAt: z.number().nonnegative().nullable(),
      controlAvailableAt: z.number().nonnegative().nullable(),
      decisionCommittedAt: z.number().nonnegative().nullable()
    }),
    observations: z.array(z.object({
      id: z.string().min(1),
      statement: z.string().min(1),
      visibleAt: z.number().nonnegative().nullable(),
      abilityAvailability: z.array(z.object({
        ability: z.string().min(1),
        status: z.enum(["available", "unavailable", "unknown"]),
        source: z.enum(["hud", "prior_use", "other"]),
        uiIdentificationId: z.string().min(1).optional()
      })).optional(),
      uiIdentifications: z.array(z.object({
        id: z.string().min(1),
        element: z.string().min(1),
        selectedCandidate: z.string().min(1).optional(),
        candidates: z.array(z.object({
          identity: z.string().min(1),
          confidence: z.enum(["high", "medium", "low"]),
          cueTypes: z.array(uiCueType).min(1)
        })).min(1)
      })).optional()
    })),
    inferences: z.array(z.object({ statement: z.string().min(1), cueEvidenceIds: z.array(z.string().min(1)) })),
    actualAction: z.string().min(1),
    actualActionCertainty: z.enum(["confirmed", "ambiguous", "unknown"]),
    evaluation: z.string().min(1),
    recommendationMode: z.enum(["decisive", "conditional", "none"]),
    audioStatus: z.enum(["analyzed", "unusable", "not_analyzed"]),
    audioDependent: z.boolean(),
    options: z.array(z.object({
      action: z.string().min(1),
      categories: z.array(z.enum(["ability", "recovery", "positioning", "weapon", "utility", "other"])).min(1),
      abilityName: z.string().min(1).optional(),
      feasibility,
      verdict: z.enum(["better", "acceptable", "not_recommended", "unrated"]),
      evidenceIds: z.array(z.string().min(1)),
      conditions: z.array(z.string().min(1)),
      requiresControls: z.array(z.enum(["move", "aim", "fireWeapon", "swapWeapon", "cancel"])),
      uiIdentificationIds: z.array(z.string().min(1))
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
      claim: z.string().min(1),
      expectedValue: z.unknown()
    })),
    teamStatus: z.object({
      members: z.array(z.object({
        slot: z.enum(["self", "ally_1", "ally_2"]),
        legend: z.string().min(1),
        healthState: z.enum(["full", "damaged", "downed", "unknown"]),
        shieldState: z.enum(["full", "damaged", "empty", "unknown"]),
        confidence: z.enum(["high", "medium", "low"]),
        evidenceIds: z.array(z.string().min(1))
      }))
    }).optional(),
    distanceObservations: z.array(z.object({
      subject: z.enum(["enemy_marker", "enemy_model", "ping", "unknown"]),
      startDistance: z.number().nonnegative(),
      endDistance: z.number().nonnegative(),
      observerMotion: z.enum(["stationary", "moving_toward", "moving_away", "unknown"]),
      targetMotion: z.enum(["stationary", "moving_toward", "moving_away", "unknown"]),
      changeCause: z.enum(["observer", "target", "both", "unknown"]),
      evidenceIds: z.array(z.string().min(1))
    })).optional(),
    readerClaims: z.array(z.string().min(1)),
    recoveryContext: z.object({
      resourceTypes: z.array(z.enum(["health", "shield"])),
      availability: feasibility,
      deployed: z.enum(["confirmed", "not_required", "unknown"]),
      reachable: z.enum(["confirmed", "not_required", "unknown"]),
      completionWindow: z.enum(["sufficient", "pressured", "unknown"]),
      evidenceIds: z.array(z.string().min(1))
    }).optional(),
    reactionAssessment: z.object({
      conclusion: z.enum(["delayed", "not_delayed", "unknown"]),
      evidenceIds: z.array(z.string().min(1))
    }).optional(),
    inventoryContext: z.object({
      movementState: z.enum(["moving", "stopped", "unknown"]),
      protectedByCover: z.union([z.boolean(), z.literal("unknown")]),
      enemyPressure: z.enum(["none", "possible", "active", "unknown"]),
      allyCombatActive: z.union([z.boolean(), z.literal("unknown")]),
      overlapWithCombatCue: z.union([z.boolean(), z.literal("unknown")]),
      lostOpportunity: z.string().min(1).nullable(),
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
