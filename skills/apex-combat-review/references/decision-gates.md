# Decision Gates

Use this worksheet before rating any alternative.

## Option worksheet

For each option record:

- action;
- all applicable categories: ability, recovery, positioning, weapon, utility, or other (for example, D.O.C. healing is both `ability` and `recovery`);
- feasibility: confirmed, conditional, unavailable, or unknown;
- evidence ids;
- conditions;
- controls required by the option;
- current purpose, setup step, prerequisites, whether the option preserves the plan, its opportunity cost, and the tradeoff comparison;
- for weapon or firing options, target visibility, line of sight, reachable firing position, ally trade window, and route to effect;
- verdict: better, acceptable, not recommended, or unrated.

Only `confirmed` options can receive an unconditional `better` verdict. A conditional option may be recommended only through an explicit if/then branch.

Mechanical availability alone never establishes `better`. If an option breaks the current plan, rate it better only when timestamped evidence establishes that abandoning the plan has higher value. If plan preservation, opportunity cost, target visibility, line of sight, firing-position reachability, or effect timing is unknown, use `conditional` or `unrated`.

## Ability availability

Check the decision timestamp and the preceding use window:

- HUD icon and cooldown indicator;
- whether the ability was just used;
- required target, deployable, companion, charge, or placement;
- usable route and travel time;
- exposure created during activation;
- whether the player could return to cover;
- patch-specific behavior through an exact reference value.

If the HUD shows cooldown, classify the option `unavailable`. If the HUD cannot be read, classify it `unknown`; do not list it as the missed best play.

Before assigning a HUD identity, compare position, icon shape, numeric display, input prompt, animation, target marker, observed effect, and frame continuity. Store competing candidates and confidence. Do not select tactical cooldown or ultimate progress from a percentage alone; a decisive identity needs high confidence and at least two distinct cue types.

## Action phase and controls

Record the action phase as `setup`, `targeting`, `committed`, `transit`, `landing`, or `neutral`. Record move, aim, fire, weapon swap, and cancel as available, limited, unavailable, or unknown.

Use `actionSegments` whenever purpose or control availability changes inside a finding. In particular, split an ability approach/setup from activation, transit, and landing. A visible approach that flows into activation is not neutral downtime merely because weapons remain mechanically available during that setup.

An option is not confirmed when one of its required controls is unavailable or unknown. In particular, do not convert an ability transit interval into delayed firing or weapon-swap reaction time.

## Measurements versus rules

A displayed distance, damage number, magazine count, or observed duration is a measurement. It describes the clip only.

A threshold predicts what should always happen beyond a number. Require an exact reference for a threshold. Otherwise replace it with causal variables:

- time to reach a trade angle;
- line of sight;
- route obstruction;
- enemy reset time;
- teammate survival window;
- cover and return path.

## Ambiguous actions

Set `actualActionCertainty` to:

- `confirmed` when the item, ability, animation, or outcome is identifiable;
- `ambiguous` when two or more actions remain plausible;
- `unknown` when the action cannot be identified.

For ambiguous or unknown actions, describe the visible consequence. Do not say “weapon fire was better than the utility” unless the utility and its effect can be evaluated.

## Counterfactual discipline

Compare the actual action only with options available at the same timestamp. Do not use information revealed later. When several options are close, present them as acceptable alternatives and state what missing cue would separate them.

Record the event-visible, likely-perceived, control-available, and decision-committed times. Use null for unknown times. Evidence appearing after commitment may describe the outcome, but it cannot prove the earlier choice was wrong. A reaction-delay finding requires both likely-perceived and control-available times.

Delay, slow-reaction, "should have acted first," and missed-early-opportunity language requires a `reactionAssessment` in structured and reader-facing claims. If likely perception or required-control availability is null, do not publish the negative timing claim.
