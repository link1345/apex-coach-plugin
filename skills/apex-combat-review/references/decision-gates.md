# Decision Gates

Use this worksheet before rating any alternative.

## Option worksheet

For each option record:

- action;
- category: ability, recovery, positioning, weapon, utility, or other;
- feasibility: confirmed, conditional, unavailable, or unknown;
- evidence ids;
- conditions;
- verdict: better, acceptable, not recommended, or unrated.

Only `confirmed` options can receive an unconditional `better` verdict. A conditional option may be recommended only through an explicit if/then branch.

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
