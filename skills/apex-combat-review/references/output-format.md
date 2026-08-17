# Review Output and Validation

## Structured draft

Create one `validate_review` finding per distinct decision problem. Group repeated timestamps only when they share the same root cause and coaching action.

Required fields include:

- reference patch or timestamp context when any reference-backed claim is used;
- timestamp range;
- observations with unique ids and typed ability availability cues when an ability is evaluated;
- inferences and cue evidence ids;
- actual action and certainty;
- evaluation;
- recommendation mode;
- audio status and dependency;
- options with every applicable category, ability name when relevant, feasibility, and verdict;
- numeric claims as measurement or threshold;
- exact reference claims with the expected structured reference value;
- member-level `teamStatus` for self and both allies whenever squad durability affects a claim;
- `distanceObservations` whenever distance change affects movement causality;
- recovery context when recovery is recommended.

Draft every reader-facing evaluation, recommendation, good decision, timeline statement, and summary as a `renderedClaims` entry. Give each entry a unique id, kind, exact text, and supporting finding ids. Run `validate_review`, repair every error, and render those validated texts without adding new factual or numeric claims afterward.

Read `reviewCoverage` literally:

- `validatedFindingIds` are findings without validation errors;
- `renderedFindingIds` are findings used by reader-facing claims;
- `unvalidatedClaims` are rendered claim ids that lack validated support.

Only describe the whole review as validated when all rendered finding ids are validated and `unvalidatedClaims` is empty. Otherwise state the validated finding scope and label or remove the remaining observations.

## Reader-facing review

Present:

1. Fight summary and main causal chain.
2. Priority findings.
3. Good decisions to keep.
4. Reference checks and limitations.
5. Up to three final improvement themes.

For each finding state the timestamp, severity, root cause, observed facts, inference, actual action, evaluation, better option or conditional branches, rationale, confidence, audio status, and reference impact.

Use `critical` only for a decision that directly exposes the player to death, loses a necessary trade or reset, or ignores a confirmed high-value objective. Use `high`, `medium`, and `low` for progressively smaller outcome impact. Do not use the later death itself to set severity.

## Good decisions

Use the same evidence standard for praise. Name the visible action, why it worked from information available then, what to repeat, and confidence. Avoid vague praise.

Good decisions are `renderedClaims` too. A “best decision” or similar evaluation without a linked validated finding is not publishable.

## Final themes

For each theme include:

- habit or decision pattern;
- why it changes fight outcomes;
- observable next cue;
- concrete next action;
- linked finding timestamps.

Do not introduce new claims in the summary.
