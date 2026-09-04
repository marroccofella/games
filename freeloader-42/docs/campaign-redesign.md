# Campaign redesign — current direction and historical diagnosis

## Current direction — 5 September 2026

The user's latest instruction supersedes the branching-route proposals below:
**no path selection and no empty transit through certified levels**.

Implemented: a linear 1–42 campaign, shared automatic progression after a
1.8-second clear beat, a visible receipt/exit contract in every room, and five
optional mastery predicates (clean, pace, wildcard contact, moving-platform
ride, combined clean-and-pace audit). Failure of any or all bonuses never
blocks certification. J, or the pause-card retry action, resets only the
current room and its bonus attempt; earlier certificates remain earned.

Legacy saves retain valid earned credit and resume at the earliest unfinished
property. Already-certified properties are skipped automatically. Completion
requires receipts and an exit certificate for every room, not bonus awards.

Both renderers and Watch/Assist use the same progression in the shared driver.
The campaign replay test exercises that live driver, proves 42 ordered visits
with no repeats and no deaths, and separately verifies every room trace from
the post-death latency floor. This proves mechanical completion, not human fun.

Do not reintroduce directory choices, mandatory mastery detours or certified
transit rooms from the historical proposals below without a new user request.
The 28+14 branching plan is superseded. New mechanics, bespoke geometry and
human-tested difficulty pacing remain future work; this release does not
claim 42 newly authored layouts.

See [linear-campaign.md](linear-campaign.md) for current rules and testing.

Source: the 2026-08-24 campaign design audits (momm runs `rev_20260824234641_uk5g`
and `rev_20260824235016_7joa`), with every quantitative claim independently
reproduced from live level data and verified solver traces on 2026-08-25.
Update this file in the same change as any campaign-structure work, mirroring
the momm ROADMAP convention, so parallel sessions build one redesign.

## Historical diagnosis (before linear progression)

- Six layout archetypes repeat across seven districts; every major mechanic
  appears by Property 3 and nothing new is introduced after.
- Difficulty peaks in District 1 then plateaus: average verified steps per
  district run `473 → 383 → 389 → 400 → 394 → 402 → 403`.
- Property 4 is an onboarding spike (636 steps, densest room in the game);
  Property 42 took only 358 steps and reuses the archetype already seen in
  Properties 6, 12, 18, 24, 30 and 36.
- ~~The shortest route reached Property 42 while skipping 39 and 41~~ —
  **FIXED 2026-08-25**: the freehold is now sealed until every other property
  is certified (store gate + autopilot routing + directory "SEALED" state,
  regression-tested).
- The wildcard mechanic is not required anywhere in the verified solution
  set; perfect play is ~4.74 min of unique rooms (~23% of a full run is
  repeat traversal).
- All 42 properties and 126 receipts are mandatory; branching changes order
  but rarely constitutes a meaningful choice.

## Historical backlog (subject to the current direction above)

1. **Six-room dramatic shape per district**: Reveal → Reverse → Choose →
   Combine → Breather (with optional mastery anomaly) → Audit.
2. **Conceptual escalation by district** — movement/onboarding, moving
   threats, unstable fabric, route/world-state decisions, resource pressure,
   optional mastery, portfolio-wide synthesis; no new mechanics after
   Property 36.
3. **A bespoke, multi-stage Property 42**: combines at least three mastered
   rules, recoverable phase checkpoints, no tutorial material. (Its
   prerequisite lock already exists — see FIXED above.)
4. **~14 remixable "gameplay genes"** (lane crossing, ricochet, cyclic
   pursuit, tile-state switching, temporary floors, push blocks, falling
   stacks, resource allocation, terrain alteration, limited thrust,
   formation gaps, sight-cone evasion, chain reactions, checkpoint
   sprinting) — expressed through abstract rules only, never copied
   characters, names, maps, melodies or distinctive presentations, per the
   idea/expression line the project has held throughout.
5. **Normal route of 28 properties (4 per district) + 14 mastery
   properties**; all 42 required only for the "Full Portfolio" ending.
6. **Per-property challenge contracts**: taught rule, tested rule, precision
   demand, recovery opportunity, optional objective, target clear time —
   this is also where receipt-count rationale and explicit wildcard-target
   design belong (deferred dispositions from the audit).
7. **Grading and records**: time/deaths/wildcard/optional-objective grades;
   personal bests; assisted (autopilot) records separated from unassisted;
   rename autopilot to Watch/Assist in competitive contexts.
8. **Modes**: Short Lease, Daily Seven, Full Audit, practice; confirm before
   R erases a campaign; keep repeated transit under 10% of a normal run.
9. **Seven optional Archive Anomalies** (one per district, 10–30s mastery
   challenges) before considering per-property Legacy Protocols.

## Success criteria (human playtesting, not solver traces alone)

Rising median clear time and deaths by district; no difficulty drop greater
than 10%; at most three consecutive high-intensity rooms; a finale
demonstrably harder than every ordinary property.

## Standing constraints

- Every room ships machine-verified reachable (tests/game-rules.test.mjs).
- Every audio timing cue needs a visual equivalent.
- The autopilot must still complete any redesigned campaign (retrain lessons
  and keep the campaign proof test green); a room the solver cannot beat is
  treated as a design defect until proven otherwise.
- Names, marketing and distinctive presentation get professional clearance
  before commercial release.
