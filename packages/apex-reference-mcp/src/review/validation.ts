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
  requiresControls: Array<"move" | "aim" | "fireWeapon" | "swapWeapon" | "cancel">;
  uiIdentificationIds: string[];
};

type ControlAvailability = "available" | "limited" | "unavailable" | "unknown";
type UiCueType = "position" | "icon_shape" | "numeric_display" | "input_prompt" | "animation" | "target_marker" | "observed_effect" | "frame_continuity";
type UiIdentification = {
  id: string;
  element: string;
  selectedCandidate?: string;
  candidates: Array<{
    identity: string;
    confidence: "high" | "medium" | "low";
    cueTypes: UiCueType[];
  }>;
};

export type ReviewFinding = {
  id: string;
  timestampRange: string;
  decisionType: "ability" | "inventory" | "recovery" | "positioning" | "weapon" | "utility" | "other";
  assessment: "positive" | "negative" | "neutral";
  evaluationTarget: "purpose" | "execution";
  actionPhase: "targeting" | "committed" | "transit" | "landing" | "neutral";
  controlState: Record<"move" | "aim" | "fireWeapon" | "swapWeapon" | "cancel", ControlAvailability>;
  decisionTimeline: {
    eventVisibleAt: number | null;
    likelyPerceivedAt: number | null;
    controlAvailableAt: number | null;
    decisionCommittedAt: number | null;
  };
  observations: Array<{
    id: string;
    statement: string;
    visibleAt: number | null;
    abilityAvailability?: Array<{
      ability: string;
      status: "available" | "unavailable" | "unknown";
      source: "hud" | "prior_use" | "other";
      uiIdentificationId?: string;
    }>;
    uiIdentifications?: UiIdentification[];
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
  readerClaims: string[];
  recoveryContext?: {
    resourceTypes: Array<"health" | "shield">;
    availability: "confirmed" | "conditional" | "unavailable" | "unknown";
    deployed: "confirmed" | "not_required" | "unknown";
    reachable: "confirmed" | "not_required" | "unknown";
    completionWindow: "sufficient" | "pressured" | "unknown";
    evidenceIds: string[];
  };
  reactionAssessment?: {
    conclusion: "delayed" | "not_delayed" | "unknown";
    evidenceIds: string[];
  };
  inventoryContext?: {
    movementState: "moving" | "stopped" | "unknown";
    protectedByCover: boolean | "unknown";
    enemyPressure: "none" | "possible" | "active" | "unknown";
    allyCombatActive: boolean | "unknown";
    overlapWithCombatCue: boolean | "unknown";
    lostOpportunity: string | null;
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
  terminalState?: {
    squadOutcome: "alive" | "eliminated" | "unknown";
    reviveOutcome: "completed" | "interrupted" | "not_attempted" | "unknown";
    evidenceIds: string[];
  };
  readerFacingReview?: {
    summary: string;
    findings: Array<{ findingId: string; text: string }>;
    themes: string[];
    claims: Array<{
      findingId: string;
      type: "numeric_threshold" | "ability_availability" | "causal" | "absolute_rule";
      statement: string;
    }>;
    outcome: {
      squadOutcome: "alive" | "eliminated" | "unknown";
      reviveOutcome: "completed" | "interrupted" | "not_attempted" | "unknown";
    };
  };
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
  const allEvidenceIds = new Set(draft.findings.flatMap((finding) => finding.observations.map((observation) => observation.id)));
  const findingsById = new Map(draft.findings.map((finding) => [finding.id, finding]));

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
    const uiIdentificationsById = new Map(finding.observations.flatMap((observation) => observation.uiIdentifications ?? []).map((identification) => [identification.id, identification]));
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
      if (option.verdict === "better") {
        for (const control of option.requiresControls) {
          const controlAvailability = finding.controlState[control];
          if (controlAvailability === "unavailable") {
            issues.push(issue("control_unavailable_option_recommended", "error", finding.id, path, `${control} is unavailable during the ${finding.actionPhase} phase.`));
          } else if (controlAvailability === "unknown" && option.feasibility === "confirmed") {
            issues.push(issue("unknown_control_option_recommended", "error", finding.id, path, `${control} cannot support confirmed feasibility while its control state is unknown.`));
          }
        }

        const committedAt = finding.decisionTimeline.decisionCommittedAt;
        if (committedAt !== null) {
          const hindsightEvidence = option.evidenceIds.filter((evidenceId) => {
            const visibleAt = observationsById.get(evidenceId)?.visibleAt;
            return visibleAt !== null && visibleAt !== undefined && visibleAt > committedAt;
          });
          if (hindsightEvidence.length > 0) {
            issues.push(issue("hindsight_evidence_used", "error", finding.id, path, `Evidence visible after decision commitment cannot justify the earlier decision: ${hindsightEvidence.join(", ")}.`));
          }
        }

        for (const uiIdentificationId of option.uiIdentificationIds) {
          const uiIdentification = uiIdentificationsById.get(uiIdentificationId);
          if (!uiIdentification) {
            issues.push(issue("missing_ui_identification", "error", finding.id, path, `Unknown UI identification id: ${uiIdentificationId}.`));
            continue;
          }
          const selected = selectedUiCandidate(uiIdentification);
          if (!selected || !isStrongUiIdentification(selected)) {
            issues.push(issue("low_confidence_ui_decisive_basis", "error", finding.id, path, `UI identification ${uiIdentification.id} needs a selected high-confidence candidate and at least two distinct visual cue types before it can support a better option.`));
          }
        }
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

    for (const [observationIndex, observation] of finding.observations.entries()) {
      const uiById = new Map((observation.uiIdentifications ?? []).map((identification) => [identification.id, identification]));
      for (const [availabilityIndex, availability] of (observation.abilityAvailability ?? []).entries()) {
        if (!availability.uiIdentificationId) {
          continue;
        }
        const identification = uiById.get(availability.uiIdentificationId);
        const path = `findings.${finding.id}.observations.${observationIndex}.abilityAvailability.${availabilityIndex}`;
        if (!identification) {
          issues.push(issue("missing_ui_identification", "error", finding.id, path, `Unknown UI identification id: ${availability.uiIdentificationId}.`));
          continue;
        }
        const selected = selectedUiCandidate(identification);
        if (availability.status !== "unknown" && (!selected || !isStrongUiIdentification(selected))) {
          issues.push(issue("low_confidence_ui_identification", "error", finding.id, path, "A HUD-derived availability state requires a selected high-confidence candidate backed by at least two distinct visual cue types."));
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

    if (finding.actualActionCertainty === "confirmed" && containsUncertaintyLanguage(finding.actualAction)) {
      issues.push(issue(
        "confirmed_action_contains_uncertainty",
        "error",
        finding.id,
        `findings.${finding.id}.actualActionCertainty`,
        "A confirmed actual action cannot be described as unidentified, unknown, or only possible."
      ));
    }

    if (finding.reactionAssessment) {
      addMissingEvidenceIssues(issues, finding.id, `findings.${finding.id}.reactionAssessment`, finding.reactionAssessment.evidenceIds, evidenceIds);
      if (
        finding.reactionAssessment.conclusion === "delayed"
        && (finding.decisionTimeline.likelyPerceivedAt === null || finding.decisionTimeline.controlAvailableAt === null)
      ) {
        issues.push(issue("reaction_timing_not_established", "error", finding.id, `findings.${finding.id}.reactionAssessment`, "Do not classify reaction delay until both likely perception and required-control availability are established."));
      }
    }

    if (finding.inventoryContext) {
      addMissingEvidenceIssues(issues, finding.id, `findings.${finding.id}.inventoryContext`, finding.inventoryContext.evidenceIds, evidenceIds);
    }
    if (finding.decisionType === "inventory" && finding.assessment === "negative") {
      const context = finding.inventoryContext;
      if (!context) {
        issues.push(issue("missing_inventory_context", "error", finding.id, `findings.${finding.id}.inventoryContext`, "A negative inventory finding requires movement, cover, pressure, combat-overlap, and opportunity-loss context."));
      } else if (context.overlapWithCombatCue !== true && !context.lostOpportunity?.trim()) {
        issues.push(issue("inventory_without_opportunity_loss", "error", finding.id, `findings.${finding.id}.inventoryContext`, "Inventory opening count alone is not a negative finding; identify combat overlap or a concrete lost opportunity."));
      }
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

    for (const [index, readerClaim] of finding.readerClaims.entries()) {
      for (const numeric of extractNumericClaims(readerClaim)) {
        const supportedThreshold = finding.numericClaims.some((claim) =>
          claim.use === "threshold"
          && claim.value === numeric.value
          && normalizeUnitAlias(claim.unit) === normalizeUnitAlias(numeric.unit)
        );
        if (!supportedThreshold) {
          issues.push(issue("unsupported_reader_numeric_rule", "error", finding.id, `findings.${finding.id}.readerClaims.${index}`, `Reader claim ${numeric.raw} requires a validated threshold claim, not a scene measurement.`));
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

  if (draft.terminalState) {
    addMissingEvidenceIssues(issues, "review", "terminalState", draft.terminalState.evidenceIds, allEvidenceIds);
  }

  if (draft.readerFacingReview) {
    validateReaderFacingReview(issues, draft, findingsById);
  }

  const errors = issues.filter((candidate) => candidate.severity === "error");
  const warnings = issues.filter((candidate) => candidate.severity === "warning");
  return { valid: errors.length === 0, errors, warnings, checkedReferenceClaims };
}

function validateReaderFacingReview(
  issues: ReviewValidationIssue[],
  draft: ReviewDraft,
  findingsById: Map<string, ReviewFinding>
): void {
  const review = draft.readerFacingReview!;
  const allReviewText = [review.summary, ...review.findings.map((finding) => finding.text), ...review.themes].join("\n");
  for (const [index, finalFinding] of review.findings.entries()) {
    const finding = findingsById.get(finalFinding.findingId);
    if (!finding) {
      issues.push(issue("unknown_final_finding", "error", finalFinding.findingId, `readerFacingReview.findings.${index}`, "Reader-facing findings must link to a validated structured finding."));
      continue;
    }
    validateFinalNumericClaims(issues, finalFinding.text, [finding], finalFinding.findingId, `readerFacingReview.findings.${index}.text`);
  }

  validateFinalNumericClaims(issues, [review.summary, ...review.themes].join("\n"), draft.findings, "review", "readerFacingReview");
  validateFinalAbsoluteClaims(issues, allReviewText, draft.findings, "review", "readerFacingReview");

  for (const [index, claim] of review.claims.entries()) {
    const finding = findingsById.get(claim.findingId);
    const path = `readerFacingReview.claims.${index}`;
    if (!finding) {
      issues.push(issue("unknown_final_finding", "error", claim.findingId, path, "Reader-facing claims must link to a validated structured finding."));
    } else if (!finding.readerClaims.some((supported) => normalizeClaim(supported) === normalizeClaim(claim.statement))) {
      issues.push(issue("unvalidated_final_claim", "error", claim.findingId, path, "Reader-facing ability, causal, absolute, and threshold claims must be present in the linked finding's readerClaims."));
    } else if (claim.type === "numeric_threshold") {
      const numerics = extractNumericClaims(claim.statement);
      if (numerics.length === 0 || numerics.some((numeric) => !finding.numericClaims.some((candidate) =>
        candidate.use === "threshold"
        && candidate.value === numeric.value
        && normalizeUnitAlias(candidate.unit) === normalizeUnitAlias(numeric.unit)
      ))) {
        issues.push(issue("unvalidated_final_claim", "error", claim.findingId, path, "A reader-facing numeric threshold must link to an exact validated threshold claim."));
      }
    } else if (claim.type === "ability_availability") {
      const hasTypedAvailability = finding.observations.some((observation) =>
        (observation.abilityAvailability ?? []).some((availability) => availability.status !== "unknown")
      );
      if (!hasTypedAvailability) {
        issues.push(issue("unvalidated_final_claim", "error", claim.findingId, path, "A reader-facing ability-availability claim requires typed non-unknown availability evidence."));
      }
    }
    if (!normalizeClaim(allReviewText).includes(normalizeClaim(claim.statement))) {
      issues.push(issue("orphan_final_claim", "error", claim.findingId, path, "Declared reader-facing claim is not present in the reader-facing text."));
    }
  }

  if (draft.terminalState) {
    if (review.outcome.squadOutcome !== draft.terminalState.squadOutcome) {
      issues.push(issue("terminal_state_conflict", "error", "review", "readerFacingReview.outcome.squadOutcome", "Reader-facing squad outcome must match the observed terminal state."));
    }
    if (review.outcome.reviveOutcome !== draft.terminalState.reviveOutcome) {
      issues.push(issue("terminal_state_conflict", "error", "review", "readerFacingReview.outcome.reviveOutcome", "Reader-facing revive outcome must match the observed terminal state."));
    }
    if (
      draft.terminalState.squadOutcome === "eliminated"
      && /(立て直し成功|生存(?:した|できた)|reset succeeded|survived|stabilized successfully)/i.test(review.summary)
    ) {
      issues.push(issue("terminal_state_conflict", "error", "review", "readerFacingReview.summary", "Reader-facing summary cannot describe a successful survival or reset after observed squad elimination."));
    }
    if (
      draft.terminalState.reviveOutcome === "interrupted"
      && /(蘇生(?:が|は)?完了|revive (?:was )?completed)/i.test(review.summary)
    ) {
      issues.push(issue("terminal_state_conflict", "error", "review", "readerFacingReview.summary", "Reader-facing summary cannot describe a completed revive when the observed revive was interrupted."));
    }
  }
}

function validateFinalAbsoluteClaims(
  issues: ReviewValidationIssue[],
  text: string,
  findings: ReviewFinding[],
  findingId: string,
  path: string
): void {
  const supported = findings.flatMap((finding) => finding.readerClaims).map(normalizeClaim);
  const sentences = text.split(/[。.!?\n]+/).map((sentence) => sentence.trim()).filter(Boolean);
  for (const sentence of sentences) {
    if (/(必ず|常に|絶対|以内|してはならない|しない|＝|=|\balways\b|\bnever\b|\bmust\b|\bwithin\b)/i.test(sentence)
      && !supported.some((claim) => claim === normalizeClaim(sentence))) {
      issues.push(issue("unvalidated_final_absolute_claim", "error", findingId, path, `Reader-facing absolute rule is not present in a validated finding: ${sentence}`));
    }
  }
}

function validateFinalNumericClaims(
  issues: ReviewValidationIssue[],
  text: string,
  findings: ReviewFinding[],
  findingId: string,
  path: string
): void {
  const allowed = findings.flatMap((finding) => finding.numericClaims).map((claim) => `${claim.value}:${normalizeUnitAlias(claim.unit)}`);
  for (const claim of extractNumericClaims(text)) {
    if (!allowed.includes(`${claim.value}:${normalizeUnitAlias(claim.unit)}`)) {
      issues.push(issue("unvalidated_final_numeric_claim", "error", findingId, path, `Reader-facing numeric claim ${claim.raw} is not present in a validated finding.`));
    }
  }
}

function extractNumericClaims(text: string): Array<{ value: number; unit: string; raw: string }> {
  const matches = text.matchAll(/(\d+(?:\.\d+)?)\s*(秒|seconds?|secs?|s|メートル|meters?|metres?|m)(?:\s*(?:以内|未満|以下|以上|within|under|over|at least|or less|or more))?/gi);
  return Array.from(matches, (match) => ({ value: Number(match[1]), unit: match[2]!, raw: match[0] }));
}

function normalizeUnitAlias(unit: string | undefined): string | undefined {
  const normalized = normalizeUnit(unit);
  if (["秒", "second", "seconds", "sec", "secs", "s"].includes(normalized ?? "")) return "seconds";
  if (["メートル", "meter", "meters", "metre", "metres", "m"].includes(normalized ?? "")) return "meters";
  return normalized;
}

function normalizeClaim(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function selectedUiCandidate(identification: UiIdentification) {
  return identification.candidates.find((candidate) => candidate.identity === identification.selectedCandidate);
}

function isStrongUiIdentification(candidate: { confidence: "high" | "medium" | "low"; cueTypes: UiCueType[] }): boolean {
  return candidate.confidence === "high" && new Set(candidate.cueTypes).size >= 2;
}

function containsUncertaintyLanguage(value: string): boolean {
  return /(未同定|可能性|不明|判別でき|unknown|unidentified|possibly|might|may be|could be)/i.test(value);
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
