import type { Reference } from "../reference/schema.js";
import { ReferenceRepository } from "../reference/repository.js";

export type ReviewValidationIssue = {
  code: string;
  severity: "error" | "warning";
  findingId: string;
  path: string;
  message: string;
};

export type ReviewOption = {
  action: string;
  category: "ability" | "recovery" | "positioning" | "weapon" | "utility" | "other";
  feasibility: "confirmed" | "conditional" | "unavailable" | "unknown";
  verdict: "better" | "acceptable" | "not_recommended" | "unrated";
  evidenceIds: string[];
  conditions: string[];
};

export type ReviewFinding = {
  id: string;
  timestampRange: string;
  observations: Array<{ id: string; statement: string }>;
  inferences: Array<{ statement: string; cueEvidenceIds: string[] }>;
  actualAction: string;
  actualActionCertainty: "confirmed" | "ambiguous" | "unknown";
  evaluation: string;
  recommendationMode: "decisive" | "conditional" | "none";
  audioStatus: "analyzed" | "unusable" | "not_analyzed";
  audioDependent: boolean;
  options: ReviewOption[];
  numericClaims: Array<{
    value: number;
    unit?: string;
    use: "measurement" | "threshold";
    evidenceIds: string[];
    referenceId?: string;
    valueKey?: string;
  }>;
  referenceClaims: Array<{
    referenceId: string;
    valueKey: string;
    claim: string;
  }>;
  recoveryContext?: {
    resourceTypes: Array<"health" | "shield">;
    availability: "confirmed" | "conditional" | "unavailable" | "unknown";
    deployed: "confirmed" | "not_required" | "unknown";
    reachable: "confirmed" | "not_required" | "unknown";
    completionWindow: "sufficient" | "pressured" | "unknown";
    evidenceIds: string[];
  };
};

export type ReviewDraft = {
  audioCoverage: "complete" | "partial" | "none";
  referenceContext?: {
    patch?: string;
    at?: string;
  };
  findings: ReviewFinding[];
};

export type ReviewValidationResult = {
  valid: boolean;
  errors: ReviewValidationIssue[];
  warnings: ReviewValidationIssue[];
  checkedReferenceClaims: Array<{
    findingId: string;
    referenceId: string;
    valueKey: string;
    found: boolean;
    value?: Reference["values"][string];
  }>;
};

export async function validateReviewDraft(
  draft: ReviewDraft,
  repository = new ReferenceRepository()
): Promise<ReviewValidationResult> {
  const issues: ReviewValidationIssue[] = [];
  const checkedReferenceClaims: ReviewValidationResult["checkedReferenceClaims"] = [];

  for (const finding of draft.findings) {
    const evidenceIds = new Set(finding.observations.map((observation) => observation.id));
    const decisiveOptions = finding.options.filter((option) => option.verdict === "better");
    const referenceSelector = {
      ...(draft.referenceContext?.patch ? { patch: draft.referenceContext.patch } : {}),
      ...(draft.referenceContext?.at ? { at: draft.referenceContext.at } : {})
    };
    const hasReferenceContext = Object.keys(referenceSelector).length > 0;
    const hasReferenceDependentClaims = finding.referenceClaims.length > 0
      || finding.numericClaims.some((claim) => claim.use === "threshold" && claim.referenceId && claim.valueKey);

    if (hasReferenceDependentClaims && !hasReferenceContext) {
      issues.push(issue(
        "missing_reference_context",
        "error",
        finding.id,
        "referenceContext",
        "Reference-backed claims require the reviewed game's patch or timestamp."
      ));
    }

    for (const [index, inference] of finding.inferences.entries()) {
      addMissingEvidenceIssues(issues, finding.id, `findings.${finding.id}.inferences.${index}`, inference.cueEvidenceIds, evidenceIds);
    }

    for (const [index, option] of finding.options.entries()) {
      const path = `findings.${finding.id}.options.${index}`;
      addMissingEvidenceIssues(issues, finding.id, path, option.evidenceIds, evidenceIds);
      if (option.verdict === "better" && option.feasibility === "unavailable") {
        issues.push(issue("unavailable_option_recommended", "error", finding.id, path, "An unavailable option cannot be recommended as better."));
      }
      if (option.verdict === "better" && option.feasibility === "unknown") {
        issues.push(issue("unknown_option_recommended", "error", finding.id, path, "An option with unknown feasibility cannot be recommended as better."));
      }
      if (option.feasibility === "conditional" && option.conditions.length === 0) {
        issues.push(issue("missing_option_conditions", "error", finding.id, path, "A conditional option must list its conditions."));
      }
      if (option.verdict === "better" && option.feasibility === "conditional" && finding.recommendationMode === "decisive") {
        issues.push(issue("conditional_option_recommended_decisively", "error", finding.id, path, "A conditional option rated better requires conditional recommendation mode."));
      }
      if (option.category === "ability" && option.verdict === "better" && option.evidenceIds.length === 0) {
        issues.push(issue("ability_without_availability_evidence", "error", finding.id, path, "A recommended ability requires HUD, prior-use, or availability evidence."));
      }
    }

    if (finding.actualActionCertainty !== "confirmed" && decisiveOptions.length > 0) {
      issues.push(issue(
        "ambiguous_action_compared_decisively",
        "error",
        finding.id,
        `findings.${finding.id}.actualActionCertainty`,
        "Do not rank an alternative as better when the actual action is ambiguous or unknown."
      ));
    }

    if (finding.audioStatus !== "analyzed" && finding.audioDependent && finding.recommendationMode === "decisive") {
      issues.push(issue(
        "audio_not_analyzed_for_decisive_claim",
        "error",
        finding.id,
        `findings.${finding.id}.audioStatus`,
        "Use a conditional recommendation when unavailable audio could change the decision."
      ));
    }

    if (draft.audioCoverage === "none" && finding.audioStatus === "analyzed") {
      issues.push(issue(
        "audio_coverage_conflict",
        "error",
        finding.id,
        `findings.${finding.id}.audioStatus`,
        "A finding cannot mark audio analyzed when draft audio coverage is none."
      ));
    }

    for (const [index, numericClaim] of finding.numericClaims.entries()) {
      const path = `findings.${finding.id}.numericClaims.${index}`;
      addMissingEvidenceIssues(issues, finding.id, path, numericClaim.evidenceIds, evidenceIds);
      if (numericClaim.use === "threshold" && (!numericClaim.referenceId || !numericClaim.valueKey)) {
        issues.push(issue(
          "unsupported_numeric_threshold",
          "error",
          finding.id,
          path,
          "A numeric threshold requires a referenceId and valueKey; an observed measurement is not a general rule."
        ));
      } else if (numericClaim.use === "threshold" && numericClaim.referenceId && numericClaim.valueKey) {
        if (!hasReferenceContext) {
          continue;
        }
        const lookup = await repository.getReference({ id: numericClaim.referenceId, ...referenceSelector });
        const value = lookup.found ? lookup.reference.values[numericClaim.valueKey] : undefined;
        checkedReferenceClaims.push({
          findingId: finding.id,
          referenceId: numericClaim.referenceId,
          valueKey: numericClaim.valueKey,
          found: value !== undefined,
          ...(value !== undefined ? { value } : {})
        });
        if (value === undefined) {
          issues.push(issue("unsupported_numeric_threshold", "error", finding.id, path, `Reference ${numericClaim.referenceId} does not provide values.${numericClaim.valueKey}.`));
        } else if (
          value.kind !== "absolute"
          || typeof value.value !== "number"
          || value.value !== numericClaim.value
          || normalizeUnit(value.unit) !== normalizeUnit(numericClaim.unit)
        ) {
          issues.push(issue(
            "unsupported_numeric_threshold",
            "error",
            finding.id,
            path,
            `Threshold ${numericClaim.value}${numericClaim.unit ? ` ${numericClaim.unit}` : ""} does not exactly match the numeric reference value.`
          ));
        }
      }
    }

    const recoveryRecommended = decisiveOptions.some((option) => option.category === "recovery");
    if (recoveryRecommended) {
      const context = finding.recoveryContext;
      if (!context || context.resourceTypes.length === 0) {
        issues.push(issue("missing_recovery_context", "error", finding.id, `findings.${finding.id}.recoveryContext`, "A recovery recommendation must distinguish health and shield resources."));
      } else {
        addMissingEvidenceIssues(issues, finding.id, `findings.${finding.id}.recoveryContext`, context.evidenceIds, evidenceIds);
        const uncertain = context.availability !== "confirmed"
          || context.deployed === "unknown"
          || context.reachable === "unknown"
          || context.completionWindow === "unknown";
        if (uncertain && finding.recommendationMode === "decisive") {
          issues.push(issue("uncertain_recovery_recommended_decisively", "error", finding.id, `findings.${finding.id}.recoveryContext`, "Use a conditional recovery recommendation when deployment, reachability, availability, or timing is uncertain."));
        }
      }
    }

    for (const referenceClaim of finding.referenceClaims) {
      if (!hasReferenceContext) {
        continue;
      }
      const lookup = await repository.getReference({ id: referenceClaim.referenceId, ...referenceSelector });
      const value = lookup.found ? lookup.reference.values[referenceClaim.valueKey] : undefined;
      checkedReferenceClaims.push({
        findingId: finding.id,
        referenceId: referenceClaim.referenceId,
        valueKey: referenceClaim.valueKey,
        found: value !== undefined,
        ...(value !== undefined ? { value } : {})
      });
      if (value === undefined) {
        issues.push(issue(
          "unsupported_reference_claim",
          "error",
          finding.id,
          `findings.${finding.id}.referenceClaims`,
          `Reference ${referenceClaim.referenceId} does not provide values.${referenceClaim.valueKey}.`
        ));
      } else if (value.kind === "unknown") {
        issues.push(issue(
          "unsupported_reference_claim",
          "error",
          finding.id,
          `findings.${finding.id}.referenceClaims`,
          `Reference ${referenceClaim.referenceId} marks values.${referenceClaim.valueKey} as unknown: ${value.reason}`
        ));
      }
    }

    if (finding.recommendationMode === "decisive" && decisiveOptions.length === 0) {
      issues.push(issue("missing_decisive_option", "warning", finding.id, `findings.${finding.id}.options`, "A decisive recommendation should identify the option rated better."));
    }
  }

  const errors = issues.filter((candidate) => candidate.severity === "error");
  const warnings = issues.filter((candidate) => candidate.severity === "warning");
  return { valid: errors.length === 0, errors, warnings, checkedReferenceClaims };
}

function addMissingEvidenceIssues(
  issues: ReviewValidationIssue[],
  findingId: string,
  path: string,
  referencedIds: string[],
  availableIds: Set<string>
): void {
  if (referencedIds.length === 0) {
    issues.push(issue("missing_evidence", "error", findingId, path, "At least one observation evidence id is required."));
    return;
  }
  const missingEvidence = referencedIds.filter((evidenceId) => !availableIds.has(evidenceId));
  if (missingEvidence.length > 0) {
    issues.push(issue("missing_evidence", "error", findingId, path, `Unknown evidence ids: ${missingEvidence.join(", ")}.`));
  }
}

function normalizeUnit(unit: string | undefined): string | undefined {
  return unit?.trim().toLowerCase();
}

function issue(
  code: string,
  severity: ReviewValidationIssue["severity"],
  findingId: string,
  path: string,
  message: string
): ReviewValidationIssue {
  return { code, severity, findingId, path, message };
}
