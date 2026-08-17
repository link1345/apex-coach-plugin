import { isDeepStrictEqual } from "node:util";
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
  categories: Array<"ability" | "recovery" | "positioning" | "weapon" | "utility" | "other">;
  abilityName?: string;
  feasibility: "confirmed" | "conditional" | "unavailable" | "unknown";
  verdict: "better" | "acceptable" | "not_recommended" | "unrated";
  evidenceIds: string[];
  conditions: string[];
};

export type TeamMemberStatus = {
  slot: "self" | "ally_1" | "ally_2";
  legend: string | "unknown";
  healthState: "full" | "damaged" | "downed" | "unknown";
  shieldState: "full" | "damaged" | "empty" | "unknown";
  confidence: "high" | "medium" | "low";
  evidenceIds: string[];
};

export type DistanceObservation = {
  subject: "enemy_marker" | "enemy_model" | "ping" | "unknown";
  startDistance: number;
  endDistance: number;
  observerMotion: "stationary" | "moving_toward" | "moving_away" | "unknown";
  targetMotion: "stationary" | "moving_toward" | "moving_away" | "unknown";
  changeCause: "observer" | "target" | "both" | "unknown";
  evidenceIds: string[];
};

export type RenderedReviewClaim = {
  id: string;
  kind: "evaluation" | "recommendation" | "good_decision" | "timeline" | "summary" | "other";
  text: string;
  findingIds: string[];
};

export type ReviewFinding = {
  id: string;
  timestampRange: string;
  observations: Array<{
    id: string;
    statement: string;
    abilityAvailability?: Array<{
      ability: string;
      status: "available" | "unavailable" | "unknown";
      source: "hud" | "prior_use" | "other";
    }>;
  }>;
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
    expectedValue: unknown;
  }>;
  teamStatus?: {
    members: TeamMemberStatus[];
  };
  distanceObservations?: DistanceObservation[];
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
  renderedClaims?: RenderedReviewClaim[];
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
  reviewCoverage: {
    validatedFindingIds: string[];
    renderedFindingIds: string[];
    unvalidatedClaims: string[];
  };
};

export async function validateReviewDraft(
  draft: ReviewDraft,
  repository = new ReferenceRepository()
): Promise<ReviewValidationResult> {
  const issues: ReviewValidationIssue[] = [];
  const checkedReferenceClaims: ReviewValidationResult["checkedReferenceClaims"] = [];
  const findingIds = new Set(draft.findings.map((finding) => finding.id));

  for (const duplicateId of duplicates(draft.findings.map((finding) => finding.id))) {
    issues.push(issue(
      "duplicate_finding_id",
      "error",
      duplicateId,
      "findings",
      `Finding id ${duplicateId} must be unique within a review.`
    ));
  }

  for (const finding of draft.findings) {
    const duplicateObservationIds = finding.observations
      .map((observation) => observation.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index)
      .filter((id, index, ids) => ids.indexOf(id) === index);
    for (const duplicateId of duplicateObservationIds) {
      issues.push(issue(
        "duplicate_observation_id",
        "error",
        finding.id,
        `findings.${finding.id}.observations`,
        `Observation id ${duplicateId} must be unique within a finding.`
      ));
    }
    const evidenceIds = new Set(finding.observations.map((observation) => observation.id));
    const observationsById = new Map(finding.observations.map((observation) => [observation.id, observation]));
    const decisiveOptions = finding.options.filter((option) => option.verdict === "better");
    const referenceSelector = {
      ...(draft.referenceContext?.patch ? { patch: draft.referenceContext.patch } : {}),
      ...(draft.referenceContext?.at ? { at: draft.referenceContext.at } : {})
    };
    const hasReferenceContext = Object.keys(referenceSelector).length > 0;
    const hasReferenceDependentClaims = finding.referenceClaims.length > 0
      || finding.numericClaims.some((claim) => claim.use === "threshold" && claim.referenceId && claim.valueKey);

    if (finding.teamStatus) {
      validateTeamStatus(issues, finding, evidenceIds);
    }

    for (const [index, distance] of (finding.distanceObservations ?? []).entries()) {
      addMissingEvidenceIssues(
        issues,
        finding.id,
        `findings.${finding.id}.distanceObservations.${index}`,
        distance.evidenceIds,
        evidenceIds
      );
    }

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
      if (option.categories.includes("ability") && option.verdict === "better") {
        const abilityName = option.abilityName?.trim();
        if (!abilityName) {
          issues.push(issue("ability_without_availability_evidence", "error", finding.id, path, "A recommended ability must identify abilityName and cite typed availability evidence."));
        } else {
          const availability = option.evidenceIds.flatMap((evidenceId) =>
            observationsById.get(evidenceId)?.abilityAvailability ?? []
          ).filter((cue) => normalizeAbilityName(cue.ability) === normalizeAbilityName(abilityName));
          if (availability.length === 0) {
            issues.push(issue("ability_without_availability_evidence", "error", finding.id, path, `No typed availability evidence was cited for ${abilityName}.`));
          } else if (
            availability.some((cue) => cue.status === "unavailable")
            || (option.feasibility === "confirmed" && !availability.some((cue) => cue.status === "available"))
          ) {
            issues.push(issue("ability_availability_conflict", "error", finding.id, path, `The typed availability evidence does not support ${abilityName} as confirmed available.`));
          }
        }
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

    const recoveryRecommended = decisiveOptions.some((option) => option.categories.includes("recovery"));
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
      } else if (!isDeepStrictEqual(value, referenceClaim.expectedValue)) {
        issues.push(issue(
          "unsupported_reference_claim",
          "error",
          finding.id,
          `findings.${finding.id}.referenceClaims`,
          `Claimed value for ${referenceClaim.referenceId} values.${referenceClaim.valueKey} does not match the resolved reference value.`
        ));
      }
    }

    if (finding.recommendationMode === "decisive" && decisiveOptions.length === 0) {
      issues.push(issue("missing_decisive_option", "warning", finding.id, `findings.${finding.id}.options`, "A decisive recommendation should identify the option rated better."));
    }
  }

  validateRenderedClaims(issues, draft, findingIds);

  const errors = issues.filter((candidate) => candidate.severity === "error");
  const warnings = issues.filter((candidate) => candidate.severity === "warning");
  const invalidFindingIds = new Set(errors.map((error) => error.findingId).filter((id) => findingIds.has(id)));
  const validatedFindingIds = [...findingIds].filter((id) => !invalidFindingIds.has(id));
  const renderedFindingIds = [...new Set((draft.renderedClaims ?? []).flatMap((claim) => claim.findingIds))];
  const duplicateRenderedClaimIds = new Set(duplicates((draft.renderedClaims ?? []).map((claim) => claim.id)));
  const unvalidatedClaims = (draft.renderedClaims ?? [])
    .filter((claim, index) =>
      claim.findingIds.length === 0
      || claim.findingIds.some((id) => !validatedFindingIds.includes(id))
      || duplicateRenderedClaimIds.has(claim.id)
      || errors.some((error) => error.path === `renderedClaims.${index}`)
    )
    .map((claim) => claim.id);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedReferenceClaims,
    reviewCoverage: { validatedFindingIds, renderedFindingIds, unvalidatedClaims }
  };
}

function validateTeamStatus(
  issues: ReviewValidationIssue[],
  finding: ReviewFinding,
  evidenceIds: Set<string>
): void {
  const members = finding.teamStatus?.members ?? [];
  const slots = members.map((member) => member.slot);
  const expectedSlots: TeamMemberStatus["slot"][] = ["self", "ally_1", "ally_2"];

  if (members.length !== expectedSlots.length || expectedSlots.some((slot) => !slots.includes(slot)) || duplicates(slots).length > 0) {
    issues.push(issue(
      "incomplete_team_status",
      "error",
      finding.id,
      `findings.${finding.id}.teamStatus.members`,
      "Team HUD assessment must record self, ally_1, and ally_2 exactly once."
    ));
  }

  for (const [index, member] of members.entries()) {
    addMissingEvidenceIssues(
      issues,
      finding.id,
      `findings.${finding.id}.teamStatus.members.${index}`,
      member.evidenceIds,
      evidenceIds
    );
  }
}

function validateRenderedClaims(
  issues: ReviewValidationIssue[],
  draft: ReviewDraft,
  findingIds: Set<string>
): void {
  const renderedClaims = draft.renderedClaims ?? [];
  const findingsById = new Map(draft.findings.map((finding) => [finding.id, finding]));

  for (const duplicateId of duplicates(renderedClaims.map((claim) => claim.id))) {
    issues.push(issue(
      "duplicate_rendered_claim_id",
      "error",
      "review",
      "renderedClaims",
      `Rendered claim id ${duplicateId} must be unique within a review.`
    ));
  }

  for (const [index, claim] of renderedClaims.entries()) {
    const path = `renderedClaims.${index}`;
    if (claim.findingIds.length === 0) {
      issues.push(issue(
        "unlinked_rendered_claim",
        "error",
        "review",
        path,
        "Every reader-facing evaluation, recommendation, good decision, and timeline claim must link to a finding id."
      ));
      continue;
    }

    const unknownIds = claim.findingIds.filter((id) => !findingIds.has(id));
    if (unknownIds.length > 0) {
      issues.push(issue(
        "unknown_rendered_finding",
        "error",
        "review",
        path,
        `Unknown rendered finding ids: ${unknownIds.join(", ")}.`
      ));
    }

    const linkedFindings = claim.findingIds
      .map((id) => findingsById.get(id))
      .filter((finding): finding is ReviewFinding => finding !== undefined);
    validateRenderedNumbers(issues, claim, linkedFindings, path);
    validateTeamAggregateLanguage(issues, claim, linkedFindings, path);
    validateDistanceLanguage(issues, claim, linkedFindings, path);
  }
}

function validateRenderedNumbers(
  issues: ReviewValidationIssue[],
  claim: RenderedReviewClaim,
  findings: ReviewFinding[],
  path: string
): void {
  const withoutTimestamps = claim.text.replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b/g, "");
  const renderedNumbers = [...withoutTimestamps.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const allowedNumbers = new Set<number>();

  for (const finding of findings) {
    for (const numericClaim of finding.numericClaims) {
      allowedNumbers.add(numericClaim.value);
    }
    for (const referenceClaim of finding.referenceClaims) {
      const expected = referenceClaim.expectedValue;
      if (isNumericReferenceValue(expected)) {
        allowedNumbers.add(expected.value);
      }
    }
  }

  const unsupported = [...new Set(renderedNumbers.filter((value) => !allowedNumbers.has(value)))];
  if (unsupported.length > 0) {
    issues.push(issue(
      "unsupported_rendered_number",
      "error",
      "review",
      path,
      `Reader-facing text contains numbers not present in linked timestamp ranges, numeric claims, or validated reference values: ${unsupported.join(", ")}.`
    ));
  }
}

function validateTeamAggregateLanguage(
  issues: ReviewValidationIssue[],
  claim: RenderedReviewClaim,
  findings: ReviewFinding[],
  path: string
): void {
  if (!hasLowDurabilityTeamAggregate(claim.text)) {
    return;
  }

  const members = findings.flatMap((finding) => finding.teamStatus?.members ?? []);
  const latestBySlot = new Map<TeamMemberStatus["slot"], TeamMemberStatus>();
  for (const member of members) {
    latestBySlot.set(member.slot, member);
  }
  const allSlots: TeamMemberStatus["slot"][] = ["self", "ally_1", "ally_2"];
  const supportsAggregate = allSlots.every((slot) => {
    const member = latestBySlot.get(slot);
    return member !== undefined && (
      member.healthState === "damaged"
      || member.healthState === "downed"
      || member.shieldState === "damaged"
      || member.shieldState === "empty"
    );
  });

  if (!supportsAggregate) {
    issues.push(issue(
      "unsupported_team_aggregate",
      "error",
      "review",
      path,
      "A whole-team low-durability statement requires member-level HUD status supporting it for self, ally_1, and ally_2."
    ));
  }
}

function validateDistanceLanguage(
  issues: ReviewValidationIssue[],
  claim: RenderedReviewClaim,
  findings: ReviewFinding[],
  path: string
): void {
  if (!assertsEnemyApproach(claim.text)) {
    return;
  }

  const observations = findings.flatMap((finding) => finding.distanceObservations ?? []);
  const supportsTargetMotion = observations.some((observation) =>
    (observation.changeCause === "target" || observation.changeCause === "both")
    && observation.targetMotion === "moving_toward"
  );
  if (!supportsTargetMotion) {
    issues.push(issue(
      "unsupported_target_motion_claim",
      "error",
      "review",
      path,
      "A shrinking relative distance does not establish that the enemy approached; target motion needs direct supporting evidence."
    ));
  }
}

function hasLowDurabilityTeamAggregate(text: string): boolean {
  return /(?:低耐久の?(?:3人|三人)|(?:3人|三人|全員|部隊全体).{0,12}低耐久|all (?:three )?(?:players|members).{0,20}(?:low|damaged)|(?:three|3) (?:low[- ]durability|damaged) (?:players|members))/iu.test(text);
}

function assertsEnemyApproach(text: string): boolean {
  return /(?:敵.{0,12}(?:急接近|接近した|詰めた|詰めてき)|enemy.{0,20}(?:approached|pushed|closed in|rushed))/iu.test(text);
}

function isNumericReferenceValue(value: unknown): value is { kind: "absolute"; value: number } {
  return typeof value === "object"
    && value !== null
    && "kind" in value
    && value.kind === "absolute"
    && "value" in value
    && typeof value.value === "number";
}

function duplicates<T>(values: T[]): T[] {
  return values
    .filter((value, index) => values.indexOf(value) !== index)
    .filter((value, index, duplicates) => duplicates.indexOf(value) === index);
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

function normalizeAbilityName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
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
