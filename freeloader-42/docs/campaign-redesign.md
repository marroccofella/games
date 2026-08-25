# Campaign redesign — verified diagnosis and aligned backlog

Source: the 2026-08-24 campaign design audits (momm runs `rev_20260824234641_uk5g`
and `rev_20260824235016_7joa`), with every quantitative claim independently
reproduced from live level data and verified solver traces on 2026-08-25.
Update this file in the same change as any campaign-structure work, mirroring
the momm ROADMAP convention, so parallel sessions build one redesign.

## Verified diagnosis (reproduced, not opinion)

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

## The agreed structure (deferred backlog, in priority order)

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

## Release boundary

The current v1 release is not blocked on the nine-item redesign backlog above.
Its v1 blockers were deterministic reachability, the Property 42 prerequisite
gate, consent-safe audio packaging, accessible pause/reset behavior, and a
complete 42-property autopilot proof; those gates are shipped and tested.
Items 1–9 are the ordered v1.1 campaign-expansion contract. None should be
presented as shipped until its level data, solver trace, and human playtest
criteria land in the same change.

## Standing constraints

- Every room ships machine-verified reachable (tests/game-rules.test.mjs).
- Every audio timing cue needs a visual equivalent.
- The autopilot must still complete any redesigned campaign (retrain lessons
  and keep the campaign proof test green); a room the solver cannot beat is
  treated as a design defect until proven otherwise.
- Names, marketing and distinctive presentation get professional clearance
  before commercial release.
