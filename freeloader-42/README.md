# FREEL\*ADER 42: Property Overflow

Forty-two condemned digital properties. 126 evidence receipts. One uninterrupted campaign.

GUEST@42 is the unpaid caretaker of 42 digital properties, played in order. Recover each room's receipts, reach the glowing exit, and the next job starts automatically. The goal strip keeps the required work visible; optional bonus audits add something to aim for without locking the exit. No route menus or empty certified-room revisits.

## Play

- [Product page](https://marroccofella.github.io/games/freeloader-42/)
- [Full-screen cabinet](https://marroccofella.github.io/games/freeloader-42/play/)

## Controls

| Input | Action |
|---|---|
| Arrow keys / WASD | Move and jump |
| Space | Jump |
| E / touch `*` | Retype the highlighted object for 4.2 seconds |
| V | Switch between 2D CRT and 3D field |
| O | Toggle the verified local autopilot |
| P / Escape | Pause |
| J / pause → Retry this room | Retry the current room and bonus; retain earlier certificates |
| M | Mute |
| R | Confirm and restart the complete portfolio |

## What ships

Latest update: **2026.09.05-linear** — [linear progression, bonus rules and save compatibility](docs/linear-campaign.md). All 42 rooms complete in order through the real shared driver with all 126 receipts and zero AI deaths; 108 tests, both builds, lint and type-check pass. These checks prove mechanics, not human enjoyment. The six existing layout families remain.

Also included: **2026.09.05-playability** — [release notes and testing checklist](docs/playability-release.md). Improved keyboard focus, automatic pause when leaving play, separate human/assisted records, safer checkpoints and clearer WATCH AI handover. Older checkpoints remain playable in the assisted/legacy category; earlier mixed records are kept in storage but not counted as new human records.

- 42 properties across seven themed districts, advancing automatically
- 126 evidence receipts, visible exit goals, optional bonus audits and room-local retries
- A renderer-neutral fixed-step platform simulation shared by 2D and 3D views
- An original wildcard-physics ability
- An original procedural score: 84 BPM, seven 6/8 bars, 42 eighth-note positions
- Semantic gameplay audio, separate music/SFX/UI buses, ducking, and limiter protection
- Touch controls, reduced-motion support, focus-contained dialogs, and local checkpoint persistence
- A lazily loaded 3D field, keeping the default 2D download small

## Provenance

The game, world, room maps, character, UI, score, sound design, narration script, and generated key art were created for this project. Third-party libraries retain their own licences. A 32-second consented synthetic narration candidate was generated locally in Promptus, but its human listening verdict is still pending, so neither the recording nor a runtime reference to it is included in this public build.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the principal libraries included in the browser build. Project licensing is stated by the repository-level `LICENSE`; third-party components remain under their own terms.

The measured campaign progression findings and next-stage level design are preserved in [docs/campaign-redesign.md](docs/campaign-redesign.md).

This is an independent [42.uk](https://42.uk) room-platformer set in The Freeloader's Guide universe.
