# APEX Reference MCP

APEX Legends reference data and review-validation MCP server. Factual gameplay judgment remains in the Skill; this server verifies reference provenance and rejects structurally unsupported review claims.

## Requirements

- Bun 1.3+

## Commands

```sh
bun install
bun run typecheck
bun test
bun run start
bun run references:validate
bun run changes:extract -- --input ./release-note.md --output ./data/changes/pending/release-note.json --patch next-patch --effectiveFrom 2026-09-01T00:00:00.000Z --sourceUrl https://www.ea.com/games/apex-legends/news/example
bun run changes:approve -- --candidates ./data/changes/pending/release-note.json --references ./data/references/sample.json
```

`bun run start` launches a stdio MCP server. MCP clients can also run the package entrypoint directly:

```json
{
  "mcpServers": {
    "apex-reference": {
      "command": "bun",
      "args": ["/Users/link/dev/apex-reference-mcp/bin/apex-reference-mcp.ts"]
    }
  }
}
```

If the package is linked or installed, use the binary name instead:

```json
{
  "mcpServers": {
    "apex-reference": {
      "command": "apex-reference-mcp"
    }
  }
}
```

## Data Model

Reference records live under `data/references/*.json` and are validated by `src/reference/schema.ts`.

The schema distinguishes:

- stable facts vs patch-dependent facts
- official patch note, official document, manual verification, and derived provenance
- absolute values vs relative changes where no absolute value is known
- baseline values vs chronological change events for patch-dependent records

Relative changes intentionally preserve direction only and do not invent numeric values.

`bun run references:validate` loads every `data/references/*.json` file through the schema and reports missing provenance, missing `verifiedAt`, missing patch effective periods, and suspicious numeric absolute values on fields marked as unknown.

## Current Coverage

The catalog is verified as of **2026-08-16** against Season 30 **Marked** (effective 2026-08-04), including the published 2026-08-11 live fixes.

- all 28 current Legends, with class, Passive/Tactical/Ultimate names, per-ability behavior descriptions, practical combat use cases, and current patch-specific values where published
- all 28 current Legends' complete Legend Upgrade trees: exactly two Level 2 choices and two Level 3 choices, their effects, EVO unlock thresholds, and the one-choice-per-tier rule
- all 29 current weapons, with class/ammo and current patch-specific values where EA publishes them
- detailed Marked changes for Bloodhound, Loba, Rampart, Valkyrie, Axle, and Seer
- detailed current behavior for energy-ammo regeneration, Corrupted Attachments, Hardlight, Deathbox Respawn, Chain Healing, EVO Armor, Arsenals, loot resets, current rotations, and related combat-review systems
- current recovery, armor, helmet, ammunition, ordnance, and core inventory references
- Gold and Mythic Armor Upgrade Helmets are recorded as removed from floor loot since Showdown; their former Takeover effects remain historical context, not current obtainable gear

`data/reviews/current-spec-audit-2026-08-16.json` records the exact official sources, roster counts, live-update check, and remaining official-source gaps. A missing published number is stored as `unknown`; old community tables are not silently treated as current facts.

The legacy `sample.json` filename remains for compatibility with the change-pipeline tests, but its runtime records are current factual Shield Battery and R-99 references rather than fictional sample-season data.

## Release Note Change Pipeline

`bun run changes:extract` reads saved official release note text, Markdown, or copied HTML text and writes reviewable change candidates to a pending JSON file. The extractor recognizes explicit numeric changes such as `13 -> 14`, additions, removals, and relative changes such as `increased` or `decreased`.

Candidate records include the target Reference candidate, type, field path, old/new values when stated, change type, patch, effective timestamp, source/provenance, confidence, evidence text, and a status:

- `applicable`: matches an existing Reference and can be reviewed for approval.
- `new_entity`: no existing Reference matched the entity.
- `review_required`: the candidate conflicts with the latest known Reference value.
- `duplicate`: the same source/patch/entity/field change already exists or was generated in the same run.

Extraction never writes candidates into confirmed Reference records. Humans approve candidates by setting `approved: true` in the pending JSON. `bun run changes:approve` applies only approved, applicable candidates as `changeEvents`; skipped candidates remain out of the static Reference data. The resulting events are resolved by `get_reference` and `get_reference_history`.

## Tools

### `search_reference`

Searches local Reference records by `name`, `aliases`, `description`, and value keys.

Input:

- `query` required string
- `type` optional filter: `weapon`, `legend`, `item`, or `mechanic`
- `maxResults` optional result limit from 1 to 25

Each result includes `id`, `name`, `type`, `summary`, `patch`, `verifiedAt`, `source`, and `score`, so a client can pass the returned `id` to a later detail lookup tool.

### `get_reference`

Gets one complete Reference record.

Input:

- `id` optional Reference ID. When present, this is used directly.
- `name` optional exact name or alias.
- `type` optional filter required when resolving by `name`: `weapon`, `legend`, `item`, or `mechanic`.
- `version` optional exact patch/version label.
- `patch` optional alias for `version`.
- `at` optional ISO timestamp used to resolve the Reference valid at that time.
- `includeHistory` optional boolean to include chronological change events with the resolved Reference.

Successful responses include `found: true`, `resolvedBy`, and the full `reference` record with `source`/`provenance`, `verifiedAt`, and `patch` metadata. When no version selector is provided, patch-dependent records resolve to the latest known version. Missing IDs, missing `type` for name lookup, missing versions, and ambiguous name/type matches return `found: false` with a machine-readable `reason`; ambiguous lookups also include candidate records.

For patch-dependent records, the server applies `changeEvents` in chronological order to the baseline values. Explicit `oldValue`/`newValue` changes such as `11 -> 12` become absolute values for the resolved version. Relative changes without absolute values remain `relative_change` values and are not converted into invented numbers.

### `get_reference_history`

Gets chronological change history for one Reference record.

Input:

- `id` optional Reference ID. When present, this is used directly.
- `name` optional exact name or alias.
- `type` optional filter required when resolving by `name`: `weapon`, `legend`, `item`, or `mechanic`.

Successful responses include `found: true`, `resolvedBy`, and `history` with the baseline patch and ordered `events`.

### `validate_review`

Validates a structured combat-review draft before prose generation. It checks:

- unique observation ids, typed ability-availability cues, option feasibility, and evidence ids;
- empty evidence lists and unavailable, unknown, or conditional abilities recommended too decisively;
- scene measurements incorrectly promoted to numeric thresholds that do not exactly match a numeric reference value and unit;
- decisive comparisons against ambiguous actions;
- decisive audio-dependent recommendations when audio was not analyzed;
- recovery recommendations, including recovery abilities with multiple applicable categories, that do not distinguish health, shield, deployment, reachability, and completion window;
- reference claims whose exact `referenceId`, `valueKey`, and structured expected value do not match the resolved value, or whose value is absent or explicitly unknown;
- reference-backed claims that omit the reviewed patch or ISO timestamp in `referenceContext`.
- squad-wide low-durability language that is not supported by separate HUD records for self and both allies;
- enemy-approach causality when the evidence establishes only that relative distance changed;
- numbers introduced in reader-facing text that are absent from linked timestamps, numeric claims, and validated reference values;
- reader-facing evaluations, recommendations, praise, timeline statements, or summaries that do not link to a finding.

Pass every reader-facing statement in the required, non-empty `renderedClaims` array before publishing it. The result contains `valid`, separate `errors` and `warnings`, the exact reference values resolved for supported claims, and `reviewCoverage` with validated finding ids, rendered finding ids, and unvalidated claim ids. Clients should fix every error and avoid describing the whole response as validated when the coverage is partial.
