# Review Output and Validation

## Structured draft

Create one `validate_review` finding per distinct decision problem. Group repeated timestamps only when they share the same root cause and coaching action.

Required fields include:

- reference patch or timestamp context when any reference-backed claim is used;
- timestamp range;
- decision type, positive/negative/neutral assessment, and whether the finding evaluates purpose or execution;
- action phase, control availability, and the controls required by each option;
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
- `readerClaims` for every numeric threshold, absolute rule, ability-availability assertion, or causal claim intended for final prose;
- recovery context when recovery is recommended.
- inventory context and concrete opportunity loss for a negative inventory finding;
- terminal squad/revive state from final-frame evidence;

Run `validate_review`. Repair every error before prose generation. Then include `readerFacingReview`, link its declared claims to exact `readerClaims`, and run it again so final outcome text, ability/causal assertions, absolute rules, and numeric claims cannot exceed the validated findings.

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

## Final themes

For each theme include:

- habit or decision pattern;
- why it changes fight outcomes;
- observable next cue;
- concrete next action;
- linked finding timestamps.

Do not introduce new claims in the summary.

If a valid purpose and risky execution occur in the same interval, use two findings with the same timestamp and different `evaluationTarget` values. Never summarize an interrupted revive followed by squad elimination as a successful reset.
