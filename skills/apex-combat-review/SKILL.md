---
name: apex-combat-review
description: Review Apex Legends fights, death recaps, clutches, rotations, and gameplay clips from timestamped video evidence. Separate observations, feasible options, actual actions, inference, references, uncertainty, and coaching; use the companion video and APEX reference MCP tools before recommending abilities, recovery, pushes, holds, resets, inventory actions, or audio-dependent decisions.
---

# APEX Combat Review

Review the decision from information available at that timestamp. Do not use the later result as proof that a decision was good or bad.

## Required tool sequence

1. Call `game-video-analysis.check_runtime` before video analysis.
2. If runtime readiness is false, report the missing dependency and limit claims to evidence that can still be inspected. Do not silently replace the plugin workflow with an unreported fallback.
3. Inspect video metadata, broad phases, and then dense frames or clips around decision points.
4. Extract audio around a decision when sound could change the recommendation. Record audio coverage as `complete`, `partial`, or `none`.
5. Use `apex-reference.search_reference` and `get_reference` when an APEX-specific fact affects the judgment. Cite the exact reference id and `values` key used.
6. Build structured findings and call `apex-reference.validate_review` before writing the final answer.
7. Fix every validation error. Report unresolved warnings or evidence gaps as limitations.

## Hard decision gates

Apply every gate before rating an alternative as better.

### Evidence gate

- Label direct video or audio facts `observed`.
- Label supported but unconfirmed conclusions `inferred` and name their cues.
- Label MCP-backed facts `reference` and name the exact value key.
- Label unavailable information `unknown`; never fill it from memory.
- Split mixed observation and inference into separate statements.

### Feasibility gate

Assign every practical option one status:

- `confirmed`: evidence shows the action was available.
- `conditional`: available only if listed conditions hold.
- `unavailable`: evidence shows it could not be performed.
- `unknown`: availability cannot be established.

Never recommend an `unavailable` or `unknown` option as the better action. A `conditional` recommendation must state its conditions.

For an ability, check HUD state, prior use, cooldown evidence, placement requirements, route, and exposure. A reference cooldown does not prove that the ability was ready in the clip. Read [decision-gates.md](references/decision-gates.md) for the full option worksheet.

### Numeric rule gate

Treat a number measured in the clip as a scene fact, not a general threshold. Do not turn “the teammate was 27m away” into “at 25m or more, always do X.” Use travel time, line of sight, route obstruction, ally survival window, and trade timing instead.

Only state a general numeric threshold when `validate_review` can trace it to a reference id and value key.

### Ambiguous-action gate

If an action is only “possibly a grenade or ability,” mark the actual action `ambiguous`. Do not claim another action was better unless the action or its effect is confirmed through impact, damage, displacement, delay, or another cue.

### Recovery gate

Separate health and shield recovery. Before recommending recovery, record:

- resource type: `health`, `shield`, or both as separate entries;
- availability;
- whether a deployable is actually deployed or an item is possessed;
- reachability;
- whether the completion window is sufficient, pressured, or unknown.

A subtitle or prompt is not proof that D.O.C. is deployed, reachable, or able to restore every missing durability pool. If any decisive condition is unknown, use a conditional branch rather than “always heal.” Read [recovery-inventory.md](references/recovery-inventory.md).

### Audio gate

Set each finding's audio status to `analyzed`, `unusable`, or `not_analyzed`. If audio could change a push, heal, hold, or retreat and was not analyzed, make the recommendation conditional. Never penalize a player for missing an audio-only cue that the clip does not establish. Read [audio.md](references/audio.md).

## Review workflow

For every decision point, use this order:

1. Timestamp and situation.
2. Observations with unique evidence ids.
3. Information the player could reasonably know then.
4. Feasible options and feasibility status.
5. Actual action and certainty.
6. Evaluation from pre-outcome risk and value.
7. One or two actionable coaching cues.
8. Confidence, audio status, reference impact, and unknowns.

Read only the relevant decision guide:

- Push, hold, reset, cover, peeking, team support: [combat-decisions.md](references/combat-decisions.md)
- Healing, reload, armor swap, inventory, D.O.C.: [recovery-inventory.md](references/recovery-inventory.md)
- Footsteps, healing, revive, reload, movement, third-party cues: [audio.md](references/audio.md)
- Structured draft, severity, good decisions, final themes: [output-format.md](references/output-format.md)

## Priority

Rank repeated root causes and fight-losing decisions before aim polish, loot, or inventory details. Do not inflate severity because the player later died.

Include evidence-backed good decisions. Separate a good retreat from a poor choice made after reaching safety; do not score an entire interval as one failure.

End with at most three improvement themes, each with a future cue and concrete next action.

## Final guardrails

- Do not invent damage, timing, ability, weapon, audio, or patch facts.
- Do not convert tactical preferences or scene measurements into fixed APEX rules.
- Do not infer exact enemy identity, count, floor, or distance from ambiguous audio.
- Do not claim a reference supports a fact unless its exact `values` key does.
- Do not recommend a mechanically unavailable action.
- Do not compare an unidentified action decisively with a proposed alternative.
- Keep unsupported facts `unknown` and lower confidence.
