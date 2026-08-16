---
name: apex-combat-review
description: Review Apex Legends combat clips by separating observed information, available options, actual actions, and evaluation without relying on hindsight.
---

# APEX Combat Review Skill

Use this skill when reviewing an Apex Legends fight, death recap, clutch,
rotation fight, or short gameplay clip. The goal is to make the review
reproducible from what the player could observe at the time, not from the final
outcome alone.

## Scope

This skill defines coaching procedure and observation order. It does not store
weapon damage tables, legend statistics, patch-dependent values, frame
extraction, OCR, or audio event classification.

Use the companion MCP servers by responsibility:

- `game-video-analysis-mcp`: inspect video metadata, frames, clips, crops, and
  other media-derived evidence.
- `apex-reference-mcp`: confirm Apex-specific facts such as item behavior,
  weapon or legend details, mechanics, and patch/version-dependent reference
  data.
- This skill: decide what to observe, how to separate evidence from inference,
  and how to present coaching feedback.

When an Apex-specific fact affects the judgment, consult `apex-reference-mcp`
instead of embedding the value in this skill. If the reference is missing or
uncertain, mark the point as uncertain rather than filling the gap from memory.

## Core Rule

Evaluate each decision from the information that was observable at that moment.

- Do not call a play correct only because the player survived.
- Do not call a play wrong only because the player died.

The reason must come from observable risk, missed information, or a better
option available at the time.

Always structure analysis in this order:

1. Observed information
2. Options available at that moment
3. Actual action taken
4. Evaluation and coaching point

## Observation Checklist

Check these items before judging the play:

- Pre-fight and contact context: where the fight started, whether the player was
  rotating, holding space, third-partying, or being pressured.
- Player status: health, shield, cracked state, healing status, reload state,
  ammo, usable weapons, inventory constraints, and available healing resources.
- Ally status: teammate positions, health or shield state if visible, knocks,
  revives, crossfire potential, and whether the team can trade damage.
- Enemy status: visible damage dealt, shield cracks, knocks, armor tier if
  known, enemy count, enemy positions, and whether enemies can swing together.
- Combat log and squad count: knocks, eliminations, kill feed signals, third
  party risk, and whether the squad count changes the risk.
- Legend abilities: tactical, ultimate, passive, deployables, scans, movement
  abilities, and only the parts visible or inferable from the clip.
- Positioning: cover, angles, crossfire, distance, high ground, escape route,
  exposure during reload or heal, and whether line of sight was intentionally
  held or accidentally exposed.
- Ring and macro pressure: ring timer, ring damage risk, route constraints, and
  likely third-party paths.
- Audio information: footsteps, gunfire direction, healing, reviving, ability
  cues, climbing, doors, ziplines, and uncertainty when audio is unavailable or
  ambiguous.

## Evidence Labels

Use these labels when writing a review:

- `observed`: directly visible or audible in the clip.
- `inferred`: likely but not directly confirmed; explain the cue that supports
  it.
- `reference`: confirmed through `apex-reference-mcp`.
- `unknown`: not available from the clip or reference data.

If a statement mixes observation and inference, split it into separate bullets.

## Review Flow

1. Establish the timestamp and situation.
2. List the observed information using the checklist.
3. Identify what the player could reasonably know at that timestamp.
4. List the practical options, including doing nothing, holding, healing,
   reloading, swinging, backing up, using an ability, or repositioning.
5. Describe the actual action without judgment.
6. Evaluate the action against the known information and risk.
7. State one or two coaching points that would change the next similar fight.
8. Call out missing information or reference gaps explicitly.

Prefer narrow, actionable feedback. Avoid turning one clip into broad rank
strategy unless the clip itself provides the evidence.

## Push, Hold, or Reset Decisions

Use this procedure when judging whether the player should push, maintain the
current position, or disengage/reset. Do not decide from a single cue such as an
enemy shield crack. Compare the actual action with the practical alternatives
available at the decision timestamp.

Evaluate the expected value at the moment of decision, not the later result. A
push that fails can still be reasonable if the observable information favored
it, and a push that succeeds can still be a poor habit if it relied on
information the player could not know.

### Required Observations

- Enemy damage state: estimated remaining health or shield state, and whether a
  crack, flesh damage, knock, or armor swap was actually observed.
- Squad state: current knocks, likely enemy squad size, teammate count, and
  whether the fight is a 3v3, 3v2, 2v3, isolated duel, or unclear.
- Player and ally resources: health, shield, healing state, reload state,
  magazine depth, backup weapon readiness, grenades, movement tools, and
  ability availability when visible.
- Ally support: teammate distance, whether allies can swing or hold line of
  sight at the same time, and whether the player is creating a trade or
  entering alone.
- Distance and timing: distance to the enemy, travel time, climb or door delay,
  whether the enemy can finish a heal/revive/reload before contact, and whether
  the player can return to cover.
- Enemy position: cover quality, retreat path, door or building control, height,
  and whether the enemy can kite the push or force a bad entry angle.
- Enemy vulnerability: healing sound, revive sound, reload timing, ability
  recovery, recent damage, split position, or forced movement.
- Player vulnerability: low health, no shield, empty magazine, slow weapon swap,
  exposed path, crossfire risk, and missing escape route.
- Push assistance: grenades, scans, movement abilities, teammate utility, door
  pressure, or angles that make the push safer.
- External risk: third-party audio, nearby gunfire, ring pressure, exposed
  rotation route, or another squad likely to arrive during the commit.

### Decision Rules

- Do not mark "should have pushed" from an enemy shield crack alone. Require a
  combination such as low enemy resources, teammate advantage, synchronized
  line of sight, short travel time, enemy healing/reviving/reloading, or utility
  that reduces entry risk.
- Mark a push as reasonable when the player has enough resources to survive the
  entry, allies can trade or follow quickly, the enemy is vulnerable, and the
  route does not expose the player to likely crossfire or third parties.
- Mark holding as reasonable when pressure, space control, or a safe angle is
  already winning value, but a full commit would remove cover, split the team,
  or allow another enemy to trade for free.
- Mark disengaging or resetting as reasonable when the player's resources are
  low, ally support is unavailable, enemy count or angle control is unfavorable,
  or external risk makes a commit lower value than healing, reloading, or
  repositioning.
- If the decision is close, present multiple acceptable choices and explain what
  extra observation would separate them. Avoid forcing a single correct answer
  when the clip supports a range.
- Always compare actual action against at least one reasonable alternative:
  push, hold, heal/reload, reposition, use utility, or fully reset.

### Decision Examples

Push is reasonable:

- observed: The player cracked an enemy and dealt additional flesh damage.
- observed: A teammate is close enough to swing the same door within a moment.
- observed: The enemy begins healing behind shallow cover and has no visible
  teammate angle protecting the path.
- inferred: The enemy is unlikely to finish the heal before contact.
- evaluation: Pushing is reasonable because damage, teammate timing, enemy
  vulnerability, and short travel time combine to create a favorable entry. The
  crack alone is not the reason; the supporting observations make the commit
  high value.

Holding is reasonable:

- observed: The player cracked one enemy across a lane.
- observed: The enemy remains behind strong cover with a second enemy angle
  watching the crossing.
- observed: The player's team can hold the current angle and deny a revive or
  rotation.
- evaluation: Maintaining the angle is reasonable because the team already has
  pressure without crossing open space. A push might work, but it would trade a
  controlled angle for an exposed entry against an unconfirmed second enemy.

Resetting is reasonable:

- observed: The player is low health with an empty or nearly empty magazine.
- observed: Teammates are far enough away that they cannot immediately trade.
- inferred: Nearby gunfire or footsteps suggests third-party or flank risk.
- evaluation: Backing up to heal, reload, and regroup is reasonable because the
  player lacks resources and support. Even if the damaged enemy later turns out
  to be weak, that was not reliable enough at the decision timestamp.

## Heal, Reload, and Inventory Decisions

Use this procedure when judging healing, reloading, armor swapping, looting, or
inventory management during a fight. Do not score the action itself as good or
bad. Score the opportunity cost, exposure, and whether the player chose the
best continuation from the information available at that moment.

Opening the inventory is not automatically a mistake. A short inventory action
while safely moving through cover can be correct, while the same action at a
door, crossing, or enemy swing timing can be costly. Always explain what risk
changed the evaluation.

### Required Observations

- Enemy pressure: enemy distance, line of sight, footsteps, gunfire direction,
  climb, door, zipline, ability, or other approach cues.
- Player survivability: current health and shield, cracked state, cover
  quality, escape route, and whether a heal is needed before the next trade.
- Weapon readiness: magazine state, backup weapon availability, reload status,
  and whether the current weapon can finish or deter the next swing.
- Time window: how long the heal, reload, armor swap, or inventory action
  appears to continue, and whether the enemy can punish that window.
- Ally state: whether teammates are fighting, knocked, healing, holding for the
  player, or needing immediate support.
- Attack opportunity: enemy healing, reviving, reloading, armor swapping,
  isolated position, or missed chance to deny a reset.
- Movement during operation: whether the player kept moving, slid, strafed,
  used cover, or stopped in a punishable place.
- Cover and line of sight: whether the operation is protected from the known
  enemy angle and whether a different angle can still see the player.
- Information uncertainty: whether audio is absent, mixed with ally sounds, or
  not strong enough to confirm enemy distance.

### Decision Rules

- Do not write "bad because the inventory was opened." Write what the inventory
  action prevented, what risk it created, or why it was safe enough.
- Treat safe moving inventory management differently from stationary or
  extended management immediately before contact.
- Compare finishing the heal, canceling the heal, reloading, swapping weapons,
  attacking, holding cover, and repositioning when those options are practical.
- Finishing a heal is reasonable when the player has cover, enemy pressure is
  delayed or blocked, allies can hold the angle, and the added health changes
  the next trade.
- Canceling a heal is reasonable when enemy pressure arrives before completion,
  an ally needs an immediate trade, or an enemy heal/revive creates a higher
  value attack window.
- Reloading is reasonable when the current magazine cannot support the next
  fight and the player has enough cover or team pressure to protect the reload.
- Switching away from reload or inventory work is reasonable when teammate
  pressure, enemy vulnerability, or incoming footsteps makes action more urgent
  than preparation.
- Do not over-prioritize self-recovery while ignoring teammates who are actively
  trading or enemies who are visibly resetting. Explain whether helping the
  fight now beats recovering first.
- When the clip is close, present both acceptable options and name the
  observation that would decide it, such as an enemy footstep, teammate call,
  or visible magazine count.

### Decision Examples

Safe inventory management:

- observed: The player opens inventory briefly while sliding between covered
  positions.
- observed: No enemy line of sight is visible, and the closest gunfire remains
  distant or blocked.
- observed: Teammates are not actively taking damage in the moment.
- evaluation: The inventory action is acceptable because it is short, protected,
  and does not cost an immediate trade or attack window. The inventory opening
  itself is not a penalty.

Punishable inventory management:

- observed: The player keeps inventory open near a doorway after enemy
  footsteps or gunfire indicate close pressure.
- observed: The player stops moving and loses the ability to react to the swing.
- inferred: The enemy can reach the doorway before the inventory action creates
  meaningful value.
- evaluation: The problem is not "inventory open"; the problem is extended
  management during a punishable timing. Closing inventory, holding the door, or
  repositioning would better protect the next decision.

Heal continuation:

- observed: The player is low shield behind solid cover.
- observed: A teammate holds the enemy angle, and enemy footsteps do not close
  before the heal is likely to finish.
- evaluation: Finishing the heal is reasonable because the cover and teammate
  pressure protect the time window, and the restored shield matters for the next
  trade.

Heal cancel:

- observed: A teammate is actively fighting at close range while the player
  heals behind cover.
- observed: The enemy begins a revive or heal within reachable distance.
- inferred: Canceling now can create a trade or deny the enemy reset before the
  self-heal completes.
- evaluation: Canceling the heal and helping the fight may be better than
  finishing self-recovery. The review should compare the health gained against
  the missed chance to swing with the teammate.

Reload decision:

- observed: The current magazine is low after the first spray.
- observed: The backup weapon is ready, but a second enemy angle is not yet
  pressuring the player.
- evaluation: Reloading behind cover is reasonable if the next contact is
  delayed. If footsteps close or an ally starts taking a 1v1, swapping weapons
  or swinging to trade may become higher value than completing the reload.

## Line of Sight, Cover, and Positioning Decisions

Use this procedure when judging angles, cover use, peeking, spacing from
teammates, height, doors, buildings, rocks, and the next cover available during
an advance, hold, or retreat. Do not stop at "use cover." Judge whether the
cover and position were sufficient for the player's action objective at that
timestamp.

Check the movement before and after contact when one frame is not enough. A
single frame can show that cover exists, but the path into or out of that cover
often decides whether the position was playable.

### Required Observations

- Enemy line count: how many enemies can reasonably see or swing the player,
  whether those lines are confirmed, inferred, or unknown, and whether the
  player can isolate one enemy at a time.
- Cover quality: cover size, body coverage, head-glitch or shoulder exposure,
  distance from cover, breakable doors, climbable objects, and whether the
  player can leave without crossing open space.
- Peek exposure: how much of the player's body is exposed, how long the peek
  lasts, whether the peek is repeated from the same timing, and whether the
  enemy can pre-aim it.
- Ally angles: whether teammates can shoot the same target, trade if the player
  is swung, or create a cross instead of standing on the same line.
- Team overlap: whether the player and teammates are stacked behind one cover,
  blocking each other, or all vulnerable to the same enemy angle, grenade, door,
  or ability.
- Height and vertical routes: high-ground value, drop risk, climb delay, zipline
  exposure, and whether the player can return to cover after using height.
- Next cover: the next safe object, door, building corner, rock, knockdown
  shield, or terrain fold available when pushing, holding, or retreating.
- Terrain use: doors, buildings, rocks, ledges, bins, corners, and other local
  objects that change line of sight or timing.
- Protected recovery: whether the player can heal or reload while enemy line of
  sight is broken, and whether another angle can still see the recovery.
- Path history: the player's movement path before and after the fight started,
  including whether they entered a position with a return route or drifted into
  open space.

### Decision Rules

- Do not write only "you should have used cover." Name the enemy line, the
  cover object, the exposure problem, and the better next position.
- Evaluate cover against the objective. The same rock can be good for holding a
  single angle, poor for crossing into two enemies, and acceptable for a short
  reload if teammates control the open side.
- A peek is reasonable when it exposes only the needed angle, has a clear
  purpose, is short enough to avoid free focus fire, and keeps a return route.
- A peek is punishable when it exposes the player to multiple enemy lines, lasts
  after the shot opportunity ends, repeats from a pre-aimed angle, or prevents a
  teammate from trading.
- Favor cross formation when teammates can pressure the same enemy from
  different protected angles without becoming isolated.
- Mark isolation when the player takes a line that teammates cannot support,
  commits around a corner alone, drops height without trade potential, or moves
  to cover that cannot be reached by the team.
- When attacking, identify the next cover before the commit. A push through open
  space needs a short travel window, team pressure, utility, or an enemy state
  that justifies the exposure.
- When holding, check whether the current position denies space or only keeps
  the player safe while teammates lose playable angles elsewhere.
- When retreating, check whether the path breaks line of sight in stages. A
  retreat that turns away through open space can be worse than briefly holding a
  corner, door, or height edge.
- Height is valuable only while it provides pressure, information, or a safe
  exit. Dropping or climbing should be evaluated by the delay and exposure it
  creates, not by "high ground" as a fixed rule.
- If ally spacing is unclear, label it `unknown` and avoid claiming a failed
  cross. Use visible teammate icons, tracers, knock feed, and simultaneous
  damage as evidence.

### Positioning Examples

Attack through next cover:

- observed: The enemy is behind a door and one teammate is close enough to shoot
  the same entrance.
- observed: The player can move from a rock to the door frame with only a brief
  open crossing.
- inferred: A second enemy line is not confirmed on the crossing.
- evaluation: Advancing is reasonable because the next cover is defined, ally
  pressure can trade the entry, and the exposure window is short. The coaching
  point is to commit from rock to door frame, not to stop halfway in the open.

Hold a protected cross:

- observed: The player holds a corner that sees the same enemy doorway as a
  teammate from a different angle.
- observed: The player's body is mostly covered, and backing up breaks the
  enemy line.
- observed: Moving forward would stack the player with the teammate and expose
  both to the same door swing.
- evaluation: Holding is better than pushing because the current position forms
  a cross and preserves a retreat path. The same cover would be weaker if the
  player wide-peeked long enough for two enemies to focus the angle.

Retreat in stages:

- observed: The player is cracked near a building corner while enemy shots come
  from the front and right.
- observed: A door and interior wall are reachable after a short slide, while
  the longer path to teammates crosses open ground.
- evaluation: Retreating through the door is the higher-value choice because it
  breaks line of sight in stages and creates a protected heal or reload window.
  Running directly across open ground asks the player to survive two enemy
  lines without meaningful cover.

Poor same-cover overlap:

- observed: Two teammates already occupy the same small rock and shoot the same
  lane.
- observed: The player joins the rock instead of taking a nearby side corner.
- inferred: One grenade or wide swing can pressure the whole team at once.
- evaluation: The issue is not that the rock has no cover; it is that all three
  players share one defensive angle. Taking the side corner would create a
  cross while keeping a retreat path back to the team.

## Audio Information Decisions

Use this procedure when footsteps, gunfire, healing, reviving, reloading,
movement objects, environmental sounds, or legend ability sounds could change a
combat decision. Audio is decision evidence, not only extra context. It can
justify pushing, holding, checking an angle, delaying a heal, retreating, or
ignoring a weak-looking opportunity when unseen risk is audible.

Do not over-state audio precision. Stereo left/right cues may support a broad
direction, but do not claim exact height, floor, distance, player count, or
enemy identity unless the clip also gives visible support. Write "heard" only
when the audio is clear in the clip; write "possibly heard" or `inferred` when
the sound is masked, mixed, or could be a teammate or environment cue.

### Required Observations

- Audio event type: footstep, gunfire, healing sound, revive sound, reload
  sound, door, zipline, climb, jump pad or other movement cue, environmental
  sound, or distinctive legend ability cue.
- Estimated direction: broad left, right, front, behind, same building, outside,
  or unknown. Use stereo information for broad left/right only.
- Estimated distance: close, mid, far, blocked, or unknown. Do not infer exact
  meters or vertical floor from audio alone.
- Confidence: high when the sound is isolated and repeated, medium when it is
  plausible but partially masked, and low when teammates, multiple fights, or
  environment noise could explain it.
- Source ambiguity: whether the sound could be an ally, a third party, a
  different nearby fight, a door or zipline object, or a legend ability from
  either team.
- Video confirmation: visible enemy movement, teammate icon position, tracers,
  damage numbers, doors opening, revive/heal animation, ability effect, kill
  feed, or map/ring context that supports or contradicts the audio.
- Decision impact: whether the sound changes push, hold, warning, retreat,
  heal, reload, revive denial, door hold, or repositioning value.
- Counterfactual baseline: how the play would be evaluated if the audio cue had
  not been present or had lower confidence.

### Decision Rules

- Use audio as a reason to change the decision only when the event type,
  direction, distance band, and confidence are stated separately.
- Treat footsteps as pressure evidence, not identity proof. If ally and enemy
  footsteps cannot be separated, label the source uncertain and avoid claiming
  a confirmed flank.
- Use gunfire direction to estimate third-party or teammate pressure, but check
  whether the sound could come from another squad fight rather than the current
  target.
- Healing or revive audio can create an attack window when the player can reach
  safely, deny the reset, and still avoid unsupported crossfire.
- Reload audio can justify a swing only when timing, distance, cover, and ally
  trade potential make contact realistic before the enemy is ready again.
- Door, zipline, climb, and other movement or environmental sounds should change
  warning and angle-holding decisions before they become visible threats.
- Distinctive legend ability sounds can explain threat or opportunity, but use
  `apex-reference-mcp` when the judgment depends on exact ability behavior,
  duration, or patch-specific details.
- When audio and video conflict, prefer the directly visible fact for confirmed
  position and keep the audio as uncertainty. Example: if footsteps sound left
  but the enemy is visible right, write that an additional source may be left,
  not that the visible enemy teleported.
- Always compare the audio-informed evaluation with the no-audio baseline when
  the sound changes the recommendation.
- If the clip has no usable audio, say so and avoid penalizing the player for
  missing an audio-only cue.

### Audio Examples

Footstep warning changes a hold:

- observed: Footsteps are audible on the player's left while the visible enemy
  remains in front.
- inferred: Direction confidence is medium because teammate position is not
  fully visible and gunfire masks part of the cue.
- observed: The player keeps healing without checking the left doorway.
- evaluation: With the audio cue, canceling or delaying the heal to check the
  doorway is reasonable because close pressure may arrive before the heal
  finishes. Without that audio, finishing the heal behind cover would be more
  acceptable.

Healing sound creates a push window:

- observed: A healing sound starts behind a nearby door after the player cracks
  an enemy.
- observed: A teammate is close enough to trade, and the path to the door stays
  mostly covered.
- inferred: The sound source is likely the damaged enemy, but exact health and
  heal completion timing are unknown.
- evaluation: Pushing or applying door pressure is reasonable because the audio
  suggests a reset window to deny. The review should not say the enemy was
  guaranteed one-shot; it should say the healing audio increased the value of a
  coordinated push.

Revive sound changes priority:

- observed: A revive sound is audible from the room while another enemy angle is
  not currently shooting.
- observed: The player chooses to loot instead of holding or pressuring the
  doorway.
- inferred: Confidence is high if the revive sound is isolated and no teammate
  revive is happening nearby.
- evaluation: Pressuring the doorway is higher value than looting because revive
  audio signals a time-limited denial opportunity. If the sound were absent,
  the same short loot action might be acceptable.

Reload sound supports a swing:

- observed: An enemy reload sound occurs immediately after the enemy fires a
  long burst from close range.
- observed: The player has cover, a ready weapon, and a teammate angle that can
  trade the swing.
- inferred: The reload cue is medium confidence because nearby gunfire overlaps
  the end of the sound.
- evaluation: A short swing can be reasonable because the audio indicates a
  temporary readiness gap. The recommendation depends on timing and support, not
  on claiming the enemy is defenseless.

Zipline and gunfire suggest retreat risk:

- observed: Zipline audio appears behind the team while gunfire continues in
  front.
- inferred: This could be a third party or a teammate movement cue; confidence
  is low to medium without a visible enemy.
- evaluation: The sound should raise flank risk and make a full forward commit
  less attractive until the rear angle is checked. Without the audio, continuing
  pressure on the front fight may remain reasonable.

## Review Output Format and Priority

Use this format when producing a combat review. The output should help the
player decide what to change first, not list every small mistake in timestamp
order. Prioritize repeated root causes and fight-losing decisions over minor
mechanical errors unless the mechanical error directly caused a major decision
failure.

Each review must include:

1. Fight summary
2. Priority findings
3. Good decisions to keep
4. Reference checks when used
5. Final improvement themes

### Finding Format

Write each finding with the same fields so observations, inference, and
evaluation stay separated:

- timestamp / range: the moment or segment the finding covers.
- severity: `critical`, `high`, `medium`, or `low`.
- improvement impact: `fight-losing`, `major`, `moderate`, or `minor`.
- root cause: the underlying habit or decision pattern, not only the visible
  mistake.
- observations: direct visible or audible facts from the clip, labeled
  `observed`.
- inferences: likely but unconfirmed context, labeled `inferred`, with the cue
  that supports it.
- actual action: what the player did, written without judgment.
- evaluation: why the action was strong, weak, or close from the available
  information.
- better option or keep doing: the next action to choose, or the good choice to
  repeat.
- rationale: why that option changes the next similar fight.
- confidence: `high`, `medium`, or `low`, with the reason for uncertainty.
- reference impact: only when `apex-reference-mcp` was used; name the reference
  item and which fact affected the judgment.

Do not merge labels inside one sentence. If one point contains both a visible
fact and a guess, split it into `observed` and `inferred` bullets.

### Priority Rules

- Rank findings by death, knock, lost fight, failed reset, or lost trade impact
  before listing small aim, movement, loot, or inventory issues.
- Give `critical` to decisions that directly expose the player to death, lose a
  winnable team trade, abandon a necessary reset, or ignore a confirmed
  high-value objective such as denying a revive.
- Give `high` to decisions that strongly reduce fight win probability but do
  not alone decide the fight.
- Give `medium` to correctable choices that create avoidable risk but have
  limited fight outcome impact.
- Give `low` to polish items, minor timing improvements, or mechanics that
  should not distract from larger decision work.
- When a minor mechanical error and a major decision error appear together,
  explain the decision first. Example: "wide-peeking two enemy lines while low
  resources" outranks "missed the last bullets."
- Do not inflate severity because the player died after the action. Severity
  must come from information available before or during the decision.

### Repetition and Grouping

Group repeated mistakes when they share a root cause. Do not write five
separate findings for five similar wide peeks if they all come from the same
spacing problem. Use one finding with multiple timestamps:

- root cause: repeated long peeks from cover after the shot opportunity ended.
- timestamps: `00:18-00:21`, `00:34-00:36`, `00:51-00:54`.
- evaluation: the repeated pattern gave enemies focus-fire windows and made
  healing/reloading harder.

Keep a separate finding only when the timestamp has a different decision
problem, different evidence, or different coaching action.

### Good Decisions

Include good decisions that the player should intentionally repeat. A good
decision must be as evidence-backed as an improvement point:

- timestamp / range
- observed information
- actual action
- why it worked from the available information
- what to keep doing next time
- confidence

Do not write vague praise. "Good patience" is too broad. Write the visible
decision, such as holding a protected cross until the teammate arrived, canceling
a heal when a revive sound created a denial window, or resetting because the
player lacked ammo and ally trade support.

### Final Improvement Themes

End the whole video review with up to three priority themes. These are not new
findings; they summarize the highest-leverage patterns from the findings above.

Each theme should include:

- theme: the habit or decision pattern.
- why it matters: how it changes fight outcomes.
- next cue: the observable trigger the player should notice in a future fight.
- next action: the concrete response to practice.
- linked findings: timestamps or finding numbers.

If there are more than three possible themes, keep the three with the largest
fight outcome impact. Put low-severity polish items in the relevant finding, not
in the final theme list.

### Reference Check Reporting

When `apex-reference-mcp` changes the judgment, include a compact reference
entry:

- reference: item, weapon, legend, mechanic, or patch-specific value checked.
- used for: which decision the reference affected.
- result: confirmed fact, unknown fact, or patch-specific uncertainty.
- impact: how the review changed because of the reference.

If the reference is missing or uncertain, keep the finding confidence lower and
state what remains unknown. Do not fill missing reference values from memory.

## Expected Review Shape

```markdown
## Fight Summary
- range: 00:00-01:12
- context: Close-range building fight after initial shield damage.
- main issue: The fight was lost more from repeated unsupported re-peeks while
  low on resources than from one isolated aim miss.

## Priority Findings

### Finding 1
- timestamp / range: 00:42-00:48
- severity: critical
- improvement impact: fight-losing
- root cause: Re-peeking before restoring weapon readiness or changing angle.
- observations:
  - observed: You cracked one enemy shield before taking cover.
  - observed: Your magazine was low before the second peek.
  - observed: The doorway still had a second possible enemy weapon angle.
- inferences:
  - inferred: At least one enemy could trade the re-peek because the second
    angle remained active.
- actual action: You re-peeked before reloading and stayed exposed after the
  first burst.
- evaluation: The re-peek had reward because one enemy was cracked, but the
  known ammo state and exposure made the follow-up fragile. This is not wrong
  because you died; it is risky because the clip already showed low ammo and a
  second possible enemy angle before the death.
- better option or keep doing: Hold cover, reload or swap, then re-peek from a
  changed angle with teammate trade support.
- rationale: Readiness and angle change protect the next trade while preserving
  the pressure created by the crack.
- confidence: high because the ammo state, cover position, and enemy angle were
  visible.

### Finding 2
- timestamp / range: 00:18-00:21 and 00:34-00:36
- severity: high
- improvement impact: major
- root cause: Repeated long peeks after the shot opportunity ended.
- observations:
  - observed: You stayed exposed after the initial shots in both segments.
  - observed: Backing up would have broken the visible enemy line.
- actual action: You continued holding the same exposed angle.
- evaluation: These are grouped because the same root cause appears twice. The
  issue is not two separate minor peeking mistakes; it is the repeated habit of
  giving enemies focus-fire time after your useful damage window closes.
- better option or keep doing: Fire the useful burst, break line of sight, then
  re-open from cover or a new angle.
- rationale: Short exposure keeps pressure without offering free return damage.
- confidence: medium because enemy count behind the angle is partly inferred.

## Good Decisions To Keep

### Keep 1
- timestamp / range: 00:27-00:31
- observations:
  - observed: Enemy pressure paused after your teammate created a side angle.
  - observed: You backed into cover before starting the shield heal.
- actual action: You chose a protected short reset instead of chasing damage.
- evaluation: This was a good decision because the available information showed
  a safe recovery window and the extra shield mattered for the next trade.
- keep doing: Reset behind solid cover when teammate pressure blocks the swing.
- confidence: high.

## Reference Checks
- reference: Use `apex-reference-mcp` if the judgment depends on exact reload,
  healing, ability, mechanic, or patch-specific values.
- result: No patch-specific value was required for this example.

## Final Improvement Themes
1. Stop repeated long peeks after the damage window closes.
   - why it matters: It prevents free focus-fire damage and keeps reset options
     available.
   - next cue: Your first burst ends, magazine is low, or a second enemy angle
     remains visible.
   - next action: Break line of sight, reload or swap, then reopen from cover.
   - linked findings: Finding 1, Finding 2.
2. Preserve good protected resets.
   - why it matters: Safe healing keeps you trade-ready without abandoning the
     fight.
   - next cue: Teammate pressure blocks the enemy swing and you are behind solid
     cover.
   - next action: Finish the short heal, then rejoin from a playable angle.
   - linked findings: Keep 1.
```

## Guardrails

- Do not invent exact damage, timing, ability, weapon, or patch values.
- Do not treat the final result as the proof of decision quality.
- Do not assume the player heard an audio cue unless the clip supports it.
- Do not convert tactical preferences into fixed Apex facts.
- Do not quote external wiki text into this skill.
- Keep unsupported facts as `unknown`.
