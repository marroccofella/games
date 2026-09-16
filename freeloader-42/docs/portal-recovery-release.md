# Portal recovery — 15 September 2026

Revision: **2026.09.15-portal-recovery**

This update fixes interruptions and rare same-property archive transfers in the existing 49-encounter campaign.

| Problem | Corrected behaviour |
|---|---|
| Pausing, hiding the tab, muting or restarting audio during the wormhole silenced the remaining suction sound. | The sustained bed resumes at its current pitch, stereo position and envelope phase, ending at the original point in the transfer. Charge and lock gestures do not replay. Rapid audio changes honour the latest request; browser audio interruptions cannot leave duplicate suction layers. |
| Switching WATCH / ASSIST on and off entirely while paused reset objectives without moving Willie back. | A paused room rewinds position and sector clock with the objectives, preventing a free challenge reset from a mid-room position. A paused portal preserves its spiral origin and encounter. Earned receipts remain banked. |
| A legacy revisit could dial an archive inside the same property, repeatedly resetting the encounter during arrival. | The handoff runs once. Willie and the room clock reset under the veil, then Willie visibly reassembles at the entrance in both 2D and 3D. The final victory transfer remains a departure. |
| A handoff changed the run serial and could restart the portal cue sequence. | Each transfer arms its cue sequence once; the property swap cannot replay charge, locks or arrival cues. |

The campaign still contains 42 properties, four Bug Hunts and three Byte Dashes. The 42.uk symbol rain and all 159 verified Yorkshire recordings remain part of the release.

Verification covers pause and visibility changes during suction, resuming the correct sound phase, same-property arrival opacity and scale, a single archive handoff, paused WATCH toggles, final victory, save migration and the complete 49-encounter AI campaign. Both game builds, the complete test suite, TypeScript and lint are checked before publication. Public assets and the voice inventory are checked against their release hashes.

[Play this revision](https://marroccofella.github.io/games/freeloader-42/play/?release=2026.09.15-portal-recovery) · [Previous major update](archive-rain-release.md)
