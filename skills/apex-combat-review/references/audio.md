# Audio Evidence

Audio can change push, hold, heal, reload, revive denial, retreat, and third-party judgments. Treat it as evidence with uncertainty, not decoration.

## Coverage

Record whole-review coverage as `complete`, `partial`, or `none`. Record each finding as `analyzed`, `unusable`, or `not_analyzed`.

When audio could change a decisive recommendation and is not analyzed, use conditional branches. Never imply silence when audio was not inspected.

## Observation fields

- event: footstep, gunfire, heal, revive, reload, door, zipline, climb, ability, or environment;
- direction: broad left, right, front, behind, same building, outside, or unknown;
- distance band: close, mid, far, blocked, or unknown;
- confidence: high, medium, or low;
- ambiguity: ally, enemy, third party, environment, or mixed;
- visible confirmation or contradiction;
- decision impact;
- no-audio counterfactual.

Do not infer exact meters, floor, player count, or identity from stereo audio alone. Prefer directly visible facts when audio and video conflict.

## Decision use

- Footsteps show pressure, not identity.
- Healing or revive sounds create an attack window only when path, timing, cover, and ally support make denial feasible.
- Reload sounds support a swing only when contact can occur before readiness returns.
- Door, climb, zipline, or ability cues may justify checking an angle before the threat becomes visible.
- If a sound is masked or mixed, use `inferred` and lower confidence.

Automatic audio classification, when available, remains an inference. Confirm it against visible events where possible.
