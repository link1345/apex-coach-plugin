# Review Output and Validation

## Structured draft

Create one `validate_review` finding per distinct decision problem. Group repeated timestamps only when they share the same root cause and coaching action.

Required fields include:

- timestamp range;
- observations with unique ids;
- inferences and cue evidence ids;
- actual action and certainty;
- evaluation;
- recommendation mode;
- audio status and dependency;
- options with feasibility and verdict;
- numeric claims as measurement or threshold;
- exact reference claims;
- recovery context when recovery is recommended.

Run `validate_review`. Repair every error before prose generation.

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
