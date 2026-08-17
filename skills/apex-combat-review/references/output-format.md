# Review Output and Validation

## Structured draft

Create one `validate_review` finding per distinct decision problem. Group repeated timestamps only when they share the same root cause and coaching action.

Required fields include:

- reference patch or timestamp context when any reference-backed claim is used;
- timestamp range;
- decision type, positive/negative/neutral assessment, and whether the finding evaluates purpose or execution;
- action phase, control availability, and the controls required by each option;
- action segments for setup, targeting, commitment, transit, landing, and neutral portions whenever the interval crosses phases;
- plan context for each better option, including purpose certainty, prerequisites, plan preservation, opportunity cost, tradeoff comparison, and evidence ids;
- engagement opportunity for each better weapon or firing option, including visibility, line of sight, reachable firing position, trade window, route to effect, and evidence ids;
- event-visible, likely-perceived, control-available, and decision-committed times, using null for unknowns;
- observations with unique ids and typed ability availability cues when an ability is evaluated;
- UI identification candidates, confidence, and cue types when a HUD element is used;
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
- `readerClaims` for every numeric threshold, absolute rule, ability-availability assertion, or causal claim intended for final prose;
- recovery context when recovery is recommended.
- inventory context and concrete opportunity loss for a negative inventory finding;
- terminal squad/revive state from final-frame evidence;

Draft every reader-facing evaluation, recommendation, good decision, timeline statement, and summary as a `renderedClaims` entry. Give each entry a unique id, kind, exact text, and supporting finding ids. Run `validate_review`, repair every error, and render those validated texts without adding new factual or numeric claims afterward.

Also include `readerFacingReview`, link its declared numeric thresholds, absolute rules, ability assertions, and causal claims to exact `readerClaims`, and validate the complete final outcome text against `terminalState`.

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

If a valid purpose and risky execution occur in the same interval, use two findings with the same timestamp and different `evaluationTarget` values. Never summarize an interrupted revive followed by squad elimination as a successful reset.
