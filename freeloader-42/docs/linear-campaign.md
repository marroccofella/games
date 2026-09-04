# FREEL*ADER 42 — a campaign, not a directory

Release: **2026.09.05-linear**

[Play](https://marroccofella.github.io/games/freeloader-42/play/) · [Product page](https://marroccofella.github.io/games/freeloader-42/)

## The flow

Play properties **01 → 02 → … → 42**. Recover the room's receipts and reach
its glowing exit. A short clear beat records the result, then the next room
starts automatically. There are no route menus, compulsory detours or empty
revisits to completed properties.

The goal strip always shows receipts remaining and the exit's direction.
Pause for the room's tactical hint and full controls. Your earlier receipts
and certificates survive a core dump.

## Optional bonus audits

| Bonus | Exact condition at certification |
|---|---|
| Clean | No core dumps during this room attempt |
| Pace | Reach the exit within the room's displayed, fixed target time |
| Wildcard | Survive landing on the outlined platform while E has stabilised it |
| Ride | Spend at least 0.6 seconds total grounded on the moving platform |
| Audit | Both no core dumps and the displayed time target |

Bonuses are banked only at the exit. The HUD distinguishes pending, missed
and unverified attempts; the completion beat reports earned or missed.
Time and clean-run failures stay failed after death or reload. Wildcard and
ride progress stay recorded for that attempt. A bonus is **never** required
to open an exit or finish the campaign.

Press **J**, or choose **Retry this room** while paused, for a fresh bonus
attempt before exiting. This removes only this room's recovered receipts,
resets its timer and bonus progress, and keeps earlier certificates. Global
elapsed time, core dumps and assistance history are not erased. R still asks
before restarting the entire portfolio. There is no level-select screen.

Targets are authored per room archetype and district, not dynamically changed
after failure. They are starting values for human playtesting, not claims of
optimal difficulty. The six existing layout families remain; this update
changes progression, goals, feedback and retries, not every room's geometry.

## Saves and safety

- New checkpoints use a versioned linear-campaign record. Old branching saves
  are supported without treating a visit as certification.
- Completion credit is accepted only when its required receipts are present.
  Unknown room and receipt identities are ignored safely.
- Resume selects the earliest unfinished room. A message states how many
  certificates were retained and why that property is next. Previously
  certified later rooms are skipped when reached; earned progress is not lost.
- A saved clear beat resumes at the next unfinished room, not the cleared
  room. A fully certified checkpoint restores the results instead of an
  empty playfield.
- Old attempts with no bonus history are labelled unverified, never granted
  a fabricated perfect run. Retry that room to establish a fresh attempt.
- Pausing or leaving the tab freezes both gameplay and the clear countdown.
  Held input is discarded at clear, pause and entry; returning does not
  automatically resume play.
- Human and assisted score records remain separate. Watch/Assist uses
  deterministic simulation search and verified replay, not a neural network.

## Checks and limits

The deterministic campaign check uses the real shared driver, with AI input,
to visit exactly 42 rooms in order and finish with all 126 receipts and zero
deaths. Every stored room trace also verifies from the lowest post-death
latency. Separate tests cover every bonus predicate, physical wildcard and
moving-platform contact, retry isolation, old saves, zero-bonus completion,
and held-input/transition safety.

These are mechanical checks. Human playtesting is still needed for enjoyment,
readability, touch comfort and difficulty pacing. Bonus contact fixtures show
the action can work safely; they do not claim AI-earned perfect bonuses for
all rooms. No new music, borrowed artwork or cloned voice recording was added.
