import { afterEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ReferenceRepository } from "../src/reference/repository.js";
import {
  applyApprovedChangeCandidates,
  extractReleaseNoteCandidates,
  writeChangeCandidates,
} from "../src/reference/changePipeline.js";
import { validateReferenceData } from "../src/reference/validation.js";
import { createApexReferenceServer } from "../src/server.js";
import { validateReviewDraft, type ReviewFinding } from "../src/review/validation.js";

const repository = new ReferenceRepository();

describe("reference data model", () => {
  test("loads current references from static JSON", async () => {
    const references = await repository.listReferences();

    expect(references.length).toBeGreaterThanOrEqual(20);
    expect(references.map((reference) => reference.id)).toContain(
      "item.shield_battery",
    );
  });

  test("does not present the removed Gold and Mythic helmets as current floor loot", async () => {
    const goldHelmet = await repository.getReference({
      id: "item.gold_armor_upgrade_helmet",
    });
    const mythicHelmet = await repository.getReference({
      id: "item.mythic_armor_upgrade_helmet",
    });

    expect(goldHelmet.found).toBe(true);
    expect(mythicHelmet.found).toBe(true);
    if (!goldHelmet.found || !mythicHelmet.found) return;

    expect(goldHelmet.reference.values.floorLootAvailable).toMatchObject({
      kind: "absolute",
      value: false,
    });
    expect(mythicHelmet.reference.values.floorLootAvailable).toMatchObject({
      kind: "absolute",
      value: false,
    });
    expect(goldHelmet.reference.patch).toMatchObject({
      version: "showdown-26.0",
    });
    expect(mythicHelmet.reference.patch).toMatchObject({
      version: "showdown-26.0",
    });
  });

  test("loads MVP data across every major reference category", async () => {
    const references = await repository.listReferences();
    const ids = references.map((reference) => reference.id);

    expect(references.length).toBeGreaterThanOrEqual(90);
    expect(new Set(references.map((reference) => reference.type))).toEqual(
      new Set(["weapon", "legend", "item", "mechanic"]),
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "item.shield_cell",
        "item.med_kit",
        "weapon.r301_carbine",
        "weapon.peacekeeper",
        "mechanic.knockdown",
        "mechanic.healing_cancel",
        "legend.lifeline",
        "legend.bangalore",
      ]),
    );
  });

  test("covers the complete Marked legend and weapon rosters without duplicate IDs", async () => {
    const references = await repository.listReferences();
    const ids = references.map((reference) => reference.id);

    expect(
      references.filter((reference) => reference.type === "legend"),
    ).toHaveLength(28);
    expect(
      references.filter((reference) => reference.type === "weapon"),
    ).toHaveLength(29);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "legend.axle",
        "legend.bloodhound",
        "legend.sparrow",
        "weapon.3030_repeater",
        "weapon.r99_smg.damage",
        "weapon.volt_smg",
      ]),
    );
  });

  test("provides structured passive, tactical, and ultimate descriptions for every Legend", async () => {
    const legends = (await repository.listReferences()).filter(
      (reference) => reference.type === "legend",
    );

    expect(legends).toHaveLength(28);
    for (const legend of legends) {
      expect(legend.values.passive).toMatchObject({ kind: "absolute" });
      expect(legend.values.tactical).toMatchObject({ kind: "absolute" });
      expect(legend.values.ultimate).toMatchObject({ kind: "absolute" });
      expect(legend.values["passive.description"]).toMatchObject({
        kind: "absolute",
      });
      expect(legend.values["tactical.description"]).toMatchObject({
        kind: "absolute",
      });
      expect(legend.values["ultimate.description"]).toMatchObject({
        kind: "absolute",
      });
      expect(legend.values.abilityUseCases).toMatchObject({ kind: "absolute" });
    }
  });

  test("completely enumerates both Legend Upgrade choices at Levels 2 and 3 for all 28 Legends", async () => {
    const references = await repository.listReferences();
    const legendIds = references
      .filter((reference) => reference.type === "legend")
      .map((reference) => reference.id)
      .sort();
    const upgradeProfiles = references.filter((reference) =>
      reference.id.startsWith("mechanic.legend_upgrades."),
    );

    expect(upgradeProfiles).toHaveLength(28);
    expect(
      upgradeProfiles
        .map((profile) => profile.values.legendId)
        .map((value) => (value?.kind === "absolute" ? value.value : undefined))
        .sort(),
    ).toEqual(legendIds);

    for (const profile of upgradeProfiles) {
      const level2 = profile.values.level2;
      const level3 = profile.values.level3;
      const selectionRule = profile.values.selectionRule;

      expect(level2?.kind).toBe("absolute");
      expect(level3?.kind).toBe("absolute");
      if (level2?.kind !== "absolute" || level3?.kind !== "absolute") continue;

      const level2Choices = level2.value as Array<{
        name?: string;
        effect?: string;
      }>;
      const level3Choices = level3.value as Array<{
        name?: string;
        effect?: string;
      }>;
      expect(level2Choices).toHaveLength(2);
      expect(level3Choices).toHaveLength(2);
      expect(
        [...level2Choices, ...level3Choices].every(
          (choice) => choice.name && choice.effect,
        ),
      ).toBe(true);
      expect(selectionRule).toEqual({
        kind: "absolute",
        value: "choose_one_per_tier",
      });
    }
  });

  test("finds current Legend Upgrade profiles by upgrade name", async () => {
    const bloodhound = await repository.searchReferences({
      query: "True Predator",
      type: "mechanic",
    });
    const wraith = await repository.searchReferences({
      query: "Phase Dome",
      type: "mechanic",
    });

    expect(bloodhound[0]?.id).toBe("mechanic.legend_upgrades.bloodhound");
    expect(wraith[0]?.id).toBe("mechanic.legend_upgrades.wraith");
  });

  test("preserves the latest upgrade replacements instead of stale pre-Marked trees", async () => {
    const getChoices = async (id: string, tier: "level2" | "level3") => {
      const result = await repository.getReference({ id });
      expect(result.found).toBe(true);
      if (!result.found) return [];
      const value = result.reference.values[tier];
      expect(value?.kind).toBe("absolute");
      return value?.kind === "absolute"
        ? (value.value as Array<{ name: string; effect: string }>)
        : [];
    };

    expect(
      (await getChoices("mechanic.legend_upgrades.ash", "level2")).map(
        (choice) => choice.name,
      ),
    ).toEqual(["Longer Reach", "Ultimate Cooldown"]);
    expect(
      (await getChoices("mechanic.legend_upgrades.axle", "level2")).map(
        (choice) => choice.name,
      ),
    ).toEqual(["Sliding Shooter", "Long Haul"]);
    expect(
      (await getChoices("mechanic.legend_upgrades.wraith", "level3")).map(
        (choice) => choice.name,
      ),
    ).toEqual(["Fast Phase", "Void Jumper"]);
    expect(
      (await getChoices("mechanic.legend_upgrades.vantage", "level3")).map(
        (choice) => choice.name,
      ),
    ).toEqual(["Herd Tracker", "Sniper Cover"]);
    expect(
      (await getChoices("mechanic.legend_upgrades.loba", "level3"))[1]?.effect,
    ).toContain("purple Backpack");
  });

  test("distinguishes stable and patch-dependent references", async () => {
    const references = await repository.listReferences();
    const stable = references.find(
      (reference) => reference.patch.mode === "stable",
    );
    const patchDependent = references.find(
      (reference) => reference.patch.mode === "patch_dependent",
    );

    expect(stable).toBeDefined();
    expect(
      references.find((reference) => reference.id === "item.shield_battery")
        ?.patch.mode,
    ).toBe("stable");
    expect(patchDependent?.patch.mode).toBe("patch_dependent");
  });

  test("tracks official patch note provenance for current values", async () => {
    const reference = await repository.getReferenceById(
      "weapon.r99_smg.damage",
    );

    expect(reference?.fieldProvenance["values.damage.body"]?.sourceType).toBe(
      "official_patch_note",
    );
    expect(
      reference?.fieldProvenance["values.damage.body"]?.effectiveFrom,
    ).toBe("2026-08-03T00:00:00.000Z");
  });

  test("keeps relative changes without inventing absolute numbers", async () => {
    const reference = await repository.getReferenceById(
      "mechanic.marked_loot_system",
    );
    const spread = reference?.values.purpleAttachmentSpawnRate;

    expect(spread?.kind).toBe("relative_change");
    expect(spread).not.toHaveProperty("amount");
  });

  test("searches references by English query, aliases, type, and limit", async () => {
    const byName = await repository.searchReferences({
      query: "shield battery",
    });
    expect(byName[0]?.id).toBe("item.shield_battery");
    expect(byName[0]?.source.sourceType).toBe("official_document");

    const byAlias = await repository.searchReferences({ query: "バッテリー" });
    expect(byAlias[0]?.id).toBe("item.shield_battery");

    const weapons = await repository.searchReferences({
      query: "sample",
      type: "weapon",
      maxResults: 1,
    });
    expect(weapons).toHaveLength(1);
    expect(weapons[0]?.type).toBe("weapon");

    const noMatch = await repository.searchReferences({
      query: "not-a-real-reference",
    });
    expect(noMatch).toEqual([]);

    const byUltimate = await repository.searchReferences({
      query: "Allfather's Cloak",
      type: "legend",
    });
    expect(byUltimate[0]?.id).toBe("legend.bloodhound");
    expect(byUltimate[0]?.summary).toContain("Passive: Tracker");
    expect(byUltimate[0]?.summary).toContain("Ultimate: Allfather's Cloak");
  });

  test("searches MVP records by practical video review categories", async () => {
    const item = await repository.searchReferences({
      query: "シールドセル",
      type: "item",
    });
    expect(item[0]?.id).toBe("item.shield_cell");

    const weapon = await repository.searchReferences({
      query: "Peacekeeper",
      type: "weapon",
    });
    expect(weapon[0]?.id).toBe("weapon.peacekeeper");

    const mechanic = await repository.searchReferences({
      query: "回復キャンセル",
      type: "mechanic",
    });
    expect(mechanic[0]?.id).toBe("mechanic.healing_cancel");

    const legend = await repository.searchReferences({
      query: "バンガ",
      type: "legend",
    });
    expect(legend[0]?.id).toBe("legend.bangalore");
  });

  test("gets complete references by id and exact name plus type", async () => {
    const byId = await repository.getReference({ id: "item.shield_battery" });
    expect(byId.found).toBe(true);
    expect(byId.found ? byId.resolvedBy : "").toBe("id");
    expect(byId.found ? byId.reference : undefined).toMatchObject({
      id: "item.shield_battery",
      type: "item",
      verifiedAt: "2026-08-16T00:00:00.000Z",
      patch: {
        mode: "stable",
      },
    });

    const byName = await repository.getReference({
      name: "R99",
      type: "weapon",
    });
    expect(byName.found).toBe(true);
    expect(byName.found ? byName.resolvedBy : "").toBe("name_type");
    expect(byName.found ? byName.reference.id : "").toBe(
      "weapon.r99_smg.damage",
    );
    expect(byName.found ? byName.reference.provenance[0]?.sourceType : "").toBe(
      "official_patch_note",
    );

    const mvpRecord = await repository.getReference({
      id: "mechanic.inventory_movement",
    });
    expect(mvpRecord.found).toBe(true);
    expect(
      mvpRecord.found ? mvpRecord.reference.values.exactConstraints : undefined,
    ).toMatchObject({
      kind: "unknown",
    });
  });

  test("resolves latest and historical patch-dependent references", async () => {
    const latest = await repository.getReference({
      id: "weapon.r99_smg.damage",
    });
    expect(latest.found).toBe(true);
    expect(latest.found ? latest.reference.patch : undefined).toMatchObject({
      mode: "patch_dependent",
      version: "marked",
    });
    expect(
      latest.found ? latest.reference.values["damage.body"] : undefined,
    ).toEqual({
      kind: "absolute",
      value: 12,
    });

    const baseline = await repository.getReference({
      id: "weapon.r99_smg.damage",
      version: "pre-marked",
    });
    expect(baseline.found).toBe(true);
    expect(
      baseline.found ? baseline.reference.values["damage.body"] : undefined,
    ).toEqual({
      kind: "absolute",
      value: 13,
    });

    const firstPatch = await repository.getReference({
      id: "weapon.r99_smg.damage",
      patch: "marked",
    });
    expect(firstPatch.found).toBe(true);
    expect(
      firstPatch.found ? firstPatch.reference.values["damage.body"] : undefined,
    ).toEqual({
      kind: "absolute",
      value: 12,
    });

    const byDate = await repository.getReference({
      id: "weapon.r99_smg.damage",
      at: "2026-08-15T00:00:00.000Z",
    });
    expect(byDate.found).toBe(true);
    expect(byDate.found ? byDate.reference.patch : undefined).toMatchObject({
      mode: "patch_dependent",
      version: "marked",
    });
    expect(
      byDate.found ? byDate.reference.values["damage.body"] : undefined,
    ).toEqual({
      kind: "absolute",
      value: 12,
    });
  });

  test("does not fall back to another version when the requested version is absent", async () => {
    const missingVersion = await repository.getReference({
      id: "weapon.r99_smg.damage",
      version: "not-a-real-patch",
    });

    expect(missingVersion.found).toBe(false);
    expect(missingVersion.found ? "" : missingVersion.reason).toBe(
      "version_not_found",
    );

    const beforeBaseline = await repository.getReference({
      id: "weapon.r99_smg.damage",
      at: "2026-01-01T00:00:00.000Z",
    });
    expect(beforeBaseline.found).toBe(false);
    expect(beforeBaseline.found ? "" : beforeBaseline.reason).toBe(
      "version_not_found",
    );
  });

  test("returns chronological history and keeps relative changes as relative", async () => {
    const withHistory = await repository.getReference({
      id: "weapon.r99_smg.damage",
      includeHistory: true,
    });
    expect(withHistory.found).toBe(true);
    expect(
      withHistory.found
        ? withHistory.history?.events.map((event) => event.patch)
        : [],
    ).toEqual(["marked"]);

    const history = await repository.getReferenceHistory({
      id: "weapon.r99_smg.damage",
    });
    expect(history.found).toBe(true);
    expect(history.found ? history.history.events : []).toHaveLength(1);
    expect(
      history.found ? history.history.events[0]?.oldValue : undefined,
    ).toEqual({
      kind: "absolute",
      value: 13,
    });

    const relative = await repository.getReference({
      id: "mechanic.marked_loot_system",
    });
    expect(relative.found).toBe(true);
    expect(
      relative.found
        ? relative.reference.values.purpleAttachmentSpawnRate
        : undefined,
    ).toEqual({
      kind: "relative_change",
      direction: "decrease",
    });
  });

  test("returns explicit lookup errors and ambiguity candidates", async () => {
    const notFound = await repository.getReference({ id: "item.not_real" });
    expect(notFound).toEqual({
      found: false,
      reason: "reference_not_found",
      candidates: [],
    });

    const missingType = await repository.getReference({
      name: "Shield Battery",
    });
    expect(missingType).toEqual({
      found: false,
      reason: "type_required_with_name",
      candidates: [],
    });

    const tempDir = await mkdtemp(join(tmpdir(), "apex-reference-"));
    try {
      await writeFile(
        join(tempDir, "ambiguous.json"),
        JSON.stringify([
          makeTestReference("item.duplicate.one", "Duplicate Item"),
          makeTestReference("item.duplicate.two", "Duplicate Item"),
        ]),
      );

      const ambiguousRepository = new ReferenceRepository(tempDir);
      const ambiguous = await ambiguousRepository.getReference({
        name: "Duplicate Item",
        type: "item",
      });

      expect(ambiguous.found).toBe(false);
      expect(ambiguous.found ? "" : ambiguous.reason).toBe(
        "ambiguous_reference",
      );
      expect(
        ambiguous.found
          ? []
          : ambiguous.candidates.map((candidate) => candidate.id),
      ).toEqual(["item.duplicate.one", "item.duplicate.two"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("review validation", () => {
  test("accepts a conditional evidence-backed finding and resolves exact reference keys", async () => {
    const finding = makeReviewFinding();
    finding.referenceClaims.push({
      referenceId: "legend.lifeline",
      valueKey: "ability.tactical.effect",
      claim: "D.O.C. can heal nearby allies.",
      expectedValue: { kind: "absolute", value: "heal_nearby_allies" }
    });

    const result = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);

    expect(result.valid).toBe(true);
    expect(result.checkedReferenceClaims[0]).toMatchObject({
      referenceId: "legend.lifeline",
      valueKey: "ability.tactical.effect",
      found: true
    });
  });

  test("rejects unavailable abilities, unsupported thresholds, and decisive ambiguous comparisons", async () => {
    const finding = makeReviewFinding();
    finding.actualActionCertainty = "ambiguous";
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Use Echo Relocation",
      categories: ["ability"],
      abilityName: "Echo Relocation",
      feasibility: "unavailable",
      verdict: "better",
      evidenceIds: ["obs-1"],
      conditions: [],
      requiresControls: [],
      uiIdentificationIds: []
    }];
    finding.numericClaims.push({ value: 25, unit: "meters", use: "threshold", evidenceIds: ["obs-1"] });

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    const codes = result.errors.map((error) => error.code);

    expect(codes).toContain("unavailable_option_recommended");
    expect(codes).toContain("ambiguous_action_compared_decisively");
    expect(codes).toContain("unsupported_numeric_threshold");
  });

  test("requires conditional language for unreviewed audio and uncertain recovery", async () => {
    const finding = makeReviewFinding();
    finding.audioDependent = true;
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Use D.O.C. and heal",
      categories: ["recovery"],
      feasibility: "confirmed",
      verdict: "better",
      evidenceIds: ["obs-1"],
      conditions: [],
      requiresControls: [],
      uiIdentificationIds: []
    }];
    finding.recoveryContext = {
      resourceTypes: ["health"],
      availability: "conditional",
      deployed: "unknown",
      reachable: "unknown",
      completionWindow: "unknown",
      evidenceIds: ["obs-1"]
    };

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    const codes = result.errors.map((error) => error.code);

    expect(codes).toContain("audio_not_analyzed_for_decisive_claim");
    expect(codes).toContain("uncertain_recovery_recommended_decisively");
  });

  test("rejects reference claims that exceed the stored value keys", async () => {
    const finding = makeReviewFinding();
    finding.referenceClaims.push({
      referenceId: "legend.lifeline",
      valueKey: "ability.tactical.restoresShields",
      claim: "D.O.C. restores shields.",
      expectedValue: { kind: "absolute", value: true }
    });

    const result = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);

    expect(result.errors.map((error) => error.code)).toContain("unsupported_reference_claim");
  });

  test("rejects reference values explicitly marked unknown", async () => {
    const finding = makeReviewFinding();
    finding.referenceClaims.push({
      referenceId: "legend.lifeline",
      valueKey: "ability.tactical.shieldRestoration",
      claim: "D.O.C. restores shields.",
      expectedValue: { kind: "absolute", value: true }
    });

    const result = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("unsupported_reference_claim");
  });

  test("requires numeric thresholds and units to exactly match the resolved value", async () => {
    const finding = makeReviewFinding();
    finding.numericClaims = [{
      value: 25,
      unit: "seconds",
      use: "threshold",
      evidenceIds: ["obs-1"],
      referenceId: "legend.vantage",
      valueKey: "ability.tactical.cooldown"
    }];

    const mismatch = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(mismatch.errors.map((error) => error.code)).toContain("unsupported_numeric_threshold");

    finding.numericClaims[0]!.value = 17;
    const exact = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(exact.valid).toBe(true);

    finding.numericClaims[0]!.valueKey = "ability.tactical.name";
    const nonNumeric = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(nonNumeric.errors.map((error) => error.code)).toContain("unsupported_numeric_threshold");
  });

  test("requires conditional mode when a conditional option is rated better", async () => {
    const finding = makeReviewFinding();
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Take the trade angle if the route remains protected.",
      categories: ["positioning"],
      feasibility: "conditional",
      verdict: "better",
      evidenceIds: ["obs-1"],
      conditions: ["The route remains protected."],
      requiresControls: ["move"],
      uiIdentificationIds: []
    }];

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("conditional_option_recommended_decisively");
  });

  test("rejects evidence-dependent claims with empty evidence lists", async () => {
    const finding = makeReviewFinding();
    finding.observations = [];
    finding.inferences = [{ statement: "The route is safe.", cueEvidenceIds: [] }];
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Push the route.",
      categories: ["positioning"],
      feasibility: "confirmed",
      verdict: "better",
      evidenceIds: [],
      conditions: [],
      requiresControls: ["move"],
      uiIdentificationIds: []
    }];
    finding.numericClaims = [];

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.valid).toBe(false);
    expect(result.errors.filter((error) => error.code === "missing_evidence")).toHaveLength(2);
  });

  test("requires and applies the reviewed patch context for reference claims", async () => {
    const finding = makeReviewFinding();
    finding.referenceClaims.push({
      referenceId: "legend.vantage",
      valueKey: "ability.tactical.cooldown",
      claim: "Echo Relocation has a 17-second cooldown.",
      expectedValue: { kind: "absolute", value: 17, unit: "seconds" }
    });

    const missingContext = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(missingContext.errors.map((error) => error.code)).toContain("missing_reference_context");

    const beforeEffectiveDate = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-05-01T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(beforeEffectiveDate.errors.map((error) => error.code)).toContain("unsupported_reference_claim");

    const current = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(current.valid).toBe(true);
  });

  test("cross-checks typed ability availability evidence", async () => {
    const finding = makeReviewFinding();
    finding.observations[0]!.abilityAvailability = [{
      ability: "Echo Relocation",
      status: "unavailable",
      source: "hud"
    }];
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Use Echo Relocation.",
      categories: ["ability"],
      abilityName: "Echo Relocation",
      feasibility: "confirmed",
      verdict: "better",
      evidenceIds: ["obs-1"],
      conditions: [],
      requiresControls: [],
      uiIdentificationIds: []
    }];

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("ability_availability_conflict");
  });

  test("checks structured expected values for reference claims", async () => {
    const finding = makeReviewFinding();
    finding.referenceClaims.push({
      referenceId: "legend.vantage",
      valueKey: "ability.tactical.effect",
      claim: "Echo restores shields.",
      expectedValue: { kind: "absolute", value: "restore_shields" }
    });

    const result = await validateReviewDraft({
      audioCoverage: "none",
      referenceContext: { at: "2026-08-16T00:00:00.000Z" },
      findings: [finding]
    }, repository);
    expect(result.errors.map((error) => error.code)).toContain("unsupported_reference_claim");
  });

  test("rejects duplicate observation ids", async () => {
    const finding = makeReviewFinding();
    finding.observations.push({ id: "obs-1", statement: "The HUD shows the ability on cooldown.", visibleAt: 78 });

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("duplicate_observation_id");
  });

  test("applies recovery gates to options that are both abilities and recovery", async () => {
    const finding = makeReviewFinding();
    finding.observations[0]!.abilityAvailability = [{
      ability: "D.O.C. Heal Drone",
      status: "available",
      source: "hud"
    }];
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Deploy D.O.C. and heal.",
      categories: ["ability", "recovery"],
      abilityName: "D.O.C. Heal Drone",
      feasibility: "confirmed",
      verdict: "better",
      evidenceIds: ["obs-1"],
      conditions: [],
      requiresControls: [],
      uiIdentificationIds: []
    }];

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("missing_recovery_context");
  });

  test("rejects weapon actions during Vantage transit and excludes later knock evidence", async () => {
    const finding = makeReviewFinding();
    finding.decisionType = "ability";
    finding.actionPhase = "transit";
    finding.controlState.fireWeapon = "unavailable";
    finding.controlState.swapWeapon = "unavailable";
    finding.decisionTimeline = {
      eventVisibleAt: 78,
      likelyPerceivedAt: null,
      controlAvailableAt: null,
      decisionCommittedAt: 79
    };
    finding.observations.push({ id: "ally-knock", statement: "The ally is knocked during transit.", visibleAt: 80 });
    finding.recommendationMode = "decisive";
    finding.options = [{
      action: "Fire or swap weapons during Echo Relocation transit.",
      categories: ["weapon"],
      feasibility: "confirmed",
      verdict: "better",
      evidenceIds: ["obs-1", "ally-knock"],
      conditions: [],
      requiresControls: ["fireWeapon", "swapWeapon"],
      uiIdentificationIds: []
    }];
    finding.reactionAssessment = { conclusion: "delayed", evidenceIds: ["obs-1"] };

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    const codes = result.errors.map((error) => error.code);

    expect(codes).toContain("control_unavailable_option_recommended");
    expect(codes).toContain("hindsight_evidence_used");
    expect(codes).toContain("reaction_timing_not_established");
  });

  test("does not confirm an ambiguous HUD percentage from one visual cue", async () => {
    const finding = makeReviewFinding();
    finding.decisionType = "ability";
    finding.observations[0] = {
      id: "obs-1",
      statement: "A percentage is visible on the HUD.",
      visibleAt: 78,
      uiIdentifications: [{
        id: "hud-percent",
        element: "HUD percentage",
        selectedCandidate: "tactical cooldown",
        candidates: [{ identity: "tactical cooldown", confidence: "medium", cueTypes: ["numeric_display"] }]
      }],
      abilityAvailability: [{
        ability: "Echo Relocation",
        status: "available",
        source: "hud",
        uiIdentificationId: "hud-percent"
      }]
    };

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("low_confidence_ui_identification");

    finding.observations[0]!.uiIdentifications![0]!.candidates[0] = {
      identity: "tactical cooldown",
      confidence: "high",
      cueTypes: ["numeric_display", "icon_shape"]
    };
    const accepted = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(accepted.valid).toBe(true);
  });

  test("requires combat overlap or concrete opportunity loss for a negative inventory finding", async () => {
    const finding = makeReviewFinding();
    finding.decisionType = "inventory";
    finding.assessment = "negative";
    finding.inventoryContext = {
      movementState: "moving",
      protectedByCover: true,
      enemyPressure: "none",
      allyCombatActive: false,
      overlapWithCombatCue: false,
      lostOpportunity: null,
      evidenceIds: ["obs-1"]
    };

    const rejected = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(rejected.errors.map((error) => error.code)).toContain("inventory_without_opportunity_loss");

    finding.assessment = "neutral";
    const accepted = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(accepted.valid).toBe(true);

    finding.assessment = "negative";
    finding.inventoryContext.lostOpportunity = "The inventory stayed open after the combat cue and delayed the weapon-ready response.";
    const causal = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(causal.valid).toBe(true);
  });

  test("rejects confirmed actions described as unidentified or only possible", async () => {
    const finding = makeReviewFinding();
    finding.actualAction = "The held item is possibly a grenade or an unidentified ability.";
    finding.actualActionCertainty = "confirmed";

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [finding] }, repository);
    expect(result.errors.map((error) => error.code)).toContain("confirmed_action_contains_uncertainty");
  });

  test("validates terminal outcome and rejects numeric rules added only to final prose", async () => {
    const finding = makeReviewFinding();
    finding.observations.push({ id: "terminal", statement: "The squad eliminated banner appears after the revive is interrupted.", visibleAt: 90 });
    const result = await validateReviewDraft({
      audioCoverage: "none",
      findings: [finding],
      terminalState: { squadOutcome: "eliminated", reviveOutcome: "interrupted", evidenceIds: ["terminal"] },
      readerFacingReview: {
        summary: "The reset succeeded.",
        findings: [{ findingId: finding.id, text: "Always draw the weapon within 1 second." }],
        themes: [],
        claims: [],
        outcome: { squadOutcome: "alive", reviveOutcome: "completed" }
      }
    }, repository);
    const codes = result.errors.map((error) => error.code);

    expect(codes).toContain("terminal_state_conflict");
    expect(codes).toContain("unvalidated_final_numeric_claim");
    expect(codes).toContain("unvalidated_final_absolute_claim");
  });

  test("represents a sound revive-cover purpose and risky execution as separate findings", async () => {
    const purpose = makeReviewFinding();
    purpose.id = "revive-purpose";
    purpose.evaluationTarget = "purpose";
    purpose.assessment = "positive";
    const execution = makeReviewFinding();
    execution.id = "revive-execution";
    execution.evaluationTarget = "execution";
    execution.assessment = "negative";

    const result = await validateReviewDraft({ audioCoverage: "none", findings: [purpose, execution] }, repository);
    expect(result.valid).toBe(true);
  });
});

describe("MVP reference data validation", () => {
  test("passes schema-backed data validation and preserves unknown facts", async () => {
    const report = await validateReferenceData(
      join(process.cwd(), "data", "references"),
    );

    expect(report.valid).toBe(true);
    expect(report.referenceCount).toBeGreaterThanOrEqual(20);
    expect(report.referenceCount).toBeGreaterThanOrEqual(90);
    expect(report.countsByType).toMatchObject({
      item: expect.any(Number),
      weapon: expect.any(Number),
      legend: expect.any(Number),
      mechanic: expect.any(Number),
    });
    expect(report.unknownOrRelativeCount).toBeGreaterThanOrEqual(1);
    expect(report.issues).toEqual([]);
  });

  test("keeps the MVP video review missing-reference list reviewable", async () => {
    const raw = await readFile(
      join(process.cwd(), "data", "reviews", "mvp-video-review.json"),
      "utf8",
    );
    const review = JSON.parse(raw) as {
      observedReferences?: string[];
      missingReferences?: Array<{
        term?: string;
        type?: string;
        reason?: string;
      }>;
    };

    expect(review.observedReferences).toContain("mechanic.inventory_movement");
    expect(review.missingReferences?.length).toBeGreaterThanOrEqual(1);
    expect(review.missingReferences?.map((missing) => missing.term)).toContain(
      "EVO shield level",
    );
    expect(
      review.missingReferences?.every(
        (missing) => missing.reason !== undefined && missing.reason.length > 0,
      ),
    ).toBe(true);
  });

  test("keeps the plugin effectiveness regression contract complete", async () => {
    const raw = await readFile(join(process.cwd(), "data", "reviews", "plugin-effectiveness-regression.json"), "utf8");
    const regression = JSON.parse(raw) as {
      requiredBehaviors?: Array<{ id?: string; enforcedBy?: string[] }>;
      evaluation?: { runsPerCondition?: number; passCriteria?: { criticalUnsupportedClaims?: number; requiredBehaviorCoverage?: number } };
    };

    expect(regression.requiredBehaviors?.map((behavior) => behavior.id)).toEqual(expect.arrayContaining([
      "ability-feasibility",
      "inventory-opportunity-cost",
      "no-scene-threshold",
      "ambiguous-utility",
      "doc-conditions",
      "audio-conditional",
      "action-phase-controls",
      "decision-time-hindsight",
      "ui-identification",
      "terminal-state",
      "final-prose-validation",
      "purpose-execution-split",
      "preserve-valid-causal-findings"
    ]));
    expect(regression.requiredBehaviors?.every((behavior) => (behavior.enforcedBy?.length ?? 0) > 0)).toBe(true);
    expect(regression.evaluation).toMatchObject({
      runsPerCondition: 3,
      passCriteria: { criticalUnsupportedClaims: 0, requiredBehaviorCoverage: 13 }
    });
  });
});

describe("MCP server", () => {
  const clients: Client[] = [];

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.close()));
    clients.length = 0;
  });

  test("starts for an MCP client and exposes the current catalog as a resource", async () => {
    const server = createApexReferenceServer(repository);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    clients.push(client);

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      "apex-reference://catalog",
    );

    const resource = await client.readResource({
      uri: "apex-reference://catalog",
    });
    const content = resource.contents[0];
    expect(content?.mimeType).toBe("application/json");
    expect(content).toHaveProperty("text");
    expect("text" in content! ? content.text : "").toContain(
      "item.shield_battery",
    );

    await server.close();
  });

  test("exposes search_reference as an MCP tool", async () => {
    const server = createApexReferenceServer(repository);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    clients.push(client);

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("search_reference");

    const result = await client.callTool({
      name: "search_reference",
      arguments: {
        query: "R99",
        type: "weapon",
        maxResults: 5,
      },
    });

    const structuredContent = result.structuredContent as {
      results?: Array<{
        id: string;
        type: string;
        verifiedAt: string;
        source: unknown;
      }>;
    };
    expect(structuredContent.results?.[0]?.id).toBe("weapon.r99_smg.damage");
    expect(structuredContent.results?.[0]?.type).toBe("weapon");
    expect(structuredContent.results?.[0]?.verifiedAt).toBe(
      "2026-08-16T00:00:00.000Z",
    );
    expect(structuredContent.results?.[0]).toHaveProperty("source");

    await server.close();
  });

  test("exposes validate_review with structured validation output", async () => {
    const server = createApexReferenceServer(repository);
    const client = new Client({ name: "test-client", version: "0.2.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    clients.push(client);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("validate_review");

    const result = await client.callTool({
      name: "validate_review",
      arguments: {
        audioCoverage: "none",
        findings: [makeReviewFinding()]
      }
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ valid: true, errors: [] });
    await server.close();
  });

  test("exposes get_reference with structured output", async () => {
    const server = createApexReferenceServer(repository);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    clients.push(client);

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("get_reference");
    expect(tools.tools.map((tool) => tool.name)).toContain(
      "get_reference_history",
    );

    const result = await client.callTool({
      name: "get_reference",
      arguments: {
        id: "weapon.r99_smg.damage",
        version: "marked",
      },
    });

    const structuredContent = result.structuredContent as {
      found?: boolean;
      resolvedBy?: string;
      reference?: {
        id?: string;
        type?: string;
        verifiedAt?: string;
        patch?: { version?: string };
        values?: Record<string, unknown>;
      };
    };
    expect(structuredContent.found).toBe(true);
    expect(structuredContent.resolvedBy).toBe("id");
    expect(structuredContent.reference).toMatchObject({
      id: "weapon.r99_smg.damage",
      type: "weapon",
      verifiedAt: "2026-08-16T00:00:00.000Z",
    });
    expect(structuredContent.reference?.patch?.version).toBe("marked");
    expect(structuredContent.reference?.values?.["damage.body"]).toEqual({
      kind: "absolute",
      value: 12,
    });

    const history = await client.callTool({
      name: "get_reference_history",
      arguments: {
        id: "weapon.r99_smg.damage",
      },
    });
    const historyContent = history.structuredContent as {
      found?: boolean;
      history?: { events?: Array<{ patch?: string }> };
    };
    expect(historyContent.found).toBe(true);
    expect(historyContent.history?.events?.map((event) => event.patch)).toEqual(
      ["marked"],
    );

    const missing = await client.callTool({
      name: "get_reference",
      arguments: {
        id: "weapon.r99_smg.damage",
        version: "missing-version",
      },
    });
    expect(missing.structuredContent).toEqual({
      found: false,
      reason: "version_not_found",
      candidates: [
        expect.objectContaining({
          id: "weapon.r99_smg.damage",
        }),
      ],
    });

    await server.close();
  });
});

describe("release note change candidate pipeline", () => {
  test("extracts reviewable candidates without writing to confirmed reference data", async () => {
    const note = [
      "R99: damage body 12 -> 14",
      "weapon spread sample: spread decreased",
      "Shield Battery: fast use added",
      "Test LMG weapon: charged state added",
      "R99: hopup removed",
    ].join("\n");

    const before = await repository.getReference({
      id: "weapon.r99_smg.damage",
    });
    const candidates = await extractReleaseNoteCandidates({
      inputText: note,
      patch: "sample-season-3",
      effectiveFrom: "2026-10-01T00:00:00.000Z",
      sourceUrl: "https://www.ea.com/games/apex-legends/news/sample-season-3",
      sourcePublishedAt: "2026-10-01T00:00:00.000Z",
    });
    const after = await repository.getReference({
      id: "weapon.r99_smg.damage",
      version: "sample-season-3",
    });

    expect(candidates).toHaveLength(5);
    expect(candidates.map((candidate) => candidate.status)).toContain(
      "new_entity",
    );
    expect(candidates.map((candidate) => candidate.changeType)).toEqual([
      "set",
      "decrease",
      "add",
      "add",
      "remove",
    ]);
    expect(candidates[0]).toMatchObject({
      referenceId: "weapon.r99_smg.damage",
      fieldPath: "values.damage.body",
      oldValue: { kind: "absolute", value: 12 },
      newValue: { kind: "absolute", value: 14 },
      source: {
        sourceType: "official_patch_note",
        sourceUrl: "https://www.ea.com/games/apex-legends/news/sample-season-3",
      },
    });
    expect(candidates[1]?.newValue).toEqual({
      kind: "relative_change",
      direction: "decrease",
    });
    expect(candidates[1]?.newValue).not.toHaveProperty("amount");
    expect(candidates[3]).toMatchObject({
      type: "weapon",
      status: "new_entity",
    });
    expect(candidates[4]).toMatchObject({
      changeType: "remove",
      newValue: {
        kind: "relative_change",
        direction: "remove",
      },
    });
    expect(
      before.found ? before.reference.values["damage.body"] : undefined,
    ).toEqual({
      kind: "absolute",
      value: 12,
    });
    expect(after.found).toBe(false);
  });

  test("marks mismatched old values for review instead of applying them", async () => {
    const candidates = await extractReleaseNoteCandidates({
      inputText: "R99: damage body 99 -> 15",
      patch: "sample-conflict",
      effectiveFrom: "2026-10-15T00:00:00.000Z",
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      status: "review_required",
      reviewReason: "oldValue does not match the latest known Reference value",
    });
  });

  test("applies only approved candidates and then suppresses duplicate generation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "apex-reference-changes-"));
    const referenceFilePath = join(tempDir, "sample.json");
    const pendingPath = join(tempDir, "pending.candidates");

    try {
      await writeFile(
        referenceFilePath,
        await readFile(
          join(process.cwd(), "data", "references", "sample.json"),
          "utf8",
        ),
      );
      const tempRepository = new ReferenceRepository(tempDir);
      const candidates = await extractReleaseNoteCandidates({
        repository: tempRepository,
        inputText: "R99: damage body 12 -> 14",
        patch: "sample-season-3",
        effectiveFrom: "2026-10-01T00:00:00.000Z",
        sourceUrl: "https://www.ea.com/games/apex-legends/news/sample-season-3",
      });

      const approvedCandidates = candidates.map((candidate) => ({
        ...candidate,
        approved: true,
      }));
      await writeChangeCandidates(pendingPath, approvedCandidates);
      const result = await applyApprovedChangeCandidates({
        candidates: approvedCandidates,
        referenceFilePath,
      });
      const afterRepository = new ReferenceRepository(tempDir);
      const resolved = await afterRepository.getReference({
        id: "weapon.r99_smg.damage",
        version: "sample-season-3",
      });
      const duplicateCandidates = await extractReleaseNoteCandidates({
        repository: afterRepository,
        inputText: "R99: damage body 12 -> 14",
        patch: "sample-season-3",
        effectiveFrom: "2026-10-01T00:00:00.000Z",
        sourceUrl: "https://www.ea.com/games/apex-legends/news/sample-season-3",
      });

      expect(JSON.parse(await readFile(pendingPath, "utf8"))[0]).toHaveProperty(
        "approved",
        true,
      );
      expect(result).toEqual({
        applied: 1,
        skipped: 0,
        referenceCount: 2,
      });
      expect(resolved.found).toBe(true);
      expect(
        resolved.found ? resolved.reference.values["damage.body"] : undefined,
      ).toEqual({
        kind: "absolute",
        value: 14,
      });
      expect(duplicateCandidates[0]).toMatchObject({
        status: "duplicate",
        reviewReason:
          "matching change event already exists in Reference history",
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function makeTestReference(id: string, name: string) {
  return {
    id,
    name,
    type: "item",
    aliases: [],
    description: "Temporary duplicate reference for lookup tests.",
    verifiedAt: "2026-08-12T00:00:00.000Z",
    patch: {
      mode: "stable",
    },
    values: {},
    provenance: [
      {
        sourceType: "manual_verified",
        sourceId: "test",
        confidence: 1,
        evidenceLevel: "manual_confirmation",
        evidence: "Test fixture.",
      },
    ],
    fieldProvenance: {},
    changeEvents: [],
  };
}

function makeReviewFinding(): ReviewFinding {
  return {
    id: "finding-1",
    timestampRange: "01:18-01:21",
    decisionType: "positioning",
    assessment: "neutral",
    evaluationTarget: "execution",
    actionPhase: "neutral",
    controlState: {
      move: "available",
      aim: "available",
      fireWeapon: "available",
      swapWeapon: "available",
      cancel: "available"
    },
    decisionTimeline: {
      eventVisibleAt: 78,
      likelyPerceivedAt: 78,
      controlAvailableAt: 78,
      decisionCommittedAt: null
    },
    observations: [{ id: "obs-1", statement: "The teammate is ahead when contact starts.", visibleAt: 78 }],
    inferences: [],
    actualAction: "The player approaches the building.",
    actualActionCertainty: "confirmed",
    evaluation: "The scene supports more than one acceptable continuation.",
    recommendationMode: "conditional",
    audioStatus: "not_analyzed",
    audioDependent: false,
    options: [{
      action: "Take a protected trade angle if it remains reachable.",
      categories: ["positioning"],
      feasibility: "conditional",
      verdict: "acceptable",
      evidenceIds: ["obs-1"],
      conditions: ["The route remains protected."],
      requiresControls: ["move"],
      uiIdentificationIds: []
    }],
    numericClaims: [{ value: 27, unit: "meters", use: "measurement", evidenceIds: ["obs-1"] }],
    referenceClaims: [],
    readerClaims: []
  };
}
