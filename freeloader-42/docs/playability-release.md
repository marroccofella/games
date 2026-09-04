# FREEL*ADER 42 — playability update

Release: **2026.09.05-playability**

[Play the full-screen cabinet](https://marroccofella.github.io/games/freeloader-42/play/) · [Product page](https://marroccofella.github.io/games/freeloader-42/)

## What changed

- Clicking a game control returns keyboard input to the playfield. Tab navigation still supports native button activation, and text-entry controls keep their own keys.
- Switching away during play pauses the clock, releases held movement and attempts to save the checkpoint. Returning does not automatically resume the run.
- Cancelling a restart cannot leave a movement key stuck down.
- **WATCH AI / TAKE OVER** explains the handover. Starting AI rewinds the current room and restores its wildcard charge, while keeping recovered receipts. Press **O** to take control again.
- Human and assisted records are separate. Once AI has been enabled, that run remains assisted even after taking over or reloading. Old checkpoints still load, but are conservatively labelled assisted/legacy because their original control history is unknown.
- Previous mixed high-score entries remain untouched in browser storage. New human and assisted records start in separate categories; old scores are not silently promoted to human records.
- Checkpoint availability follows successful writes. Finishing the campaign clears both the saved checkpoint and its in-memory copy; a late death notification cannot recreate it.
- The pause card now includes the controls and current run category. Collecting the final receipt explicitly tells you to reach the exit to certify the property.

The original 42 properties, 126 receipts, branching directory, finale prerequisite gate, procedural score and shared 2D/3D simulation are unchanged. AI uses deterministic search and verified replay, not a neural network. No voice recording has been added.

## Testing this release

1. Start a run, click mute or swap view, then immediately move and jump.
2. Hold a direction, request a restart with R and cancel. Movement should stop.
3. Switch tabs during play. Return and deliberately resume from the pause card.
4. Try WATCH AI, then TAKE OVER. The run remains labelled assisted.
5. Pause and reload. Continue the checkpoint; receipts and its assisted status should survive when browser storage is available.
6. Try both 2D CRT and 3D FIELD, plus touch controls on a real phone. Report device, browser, property and exact steps for any problem.

Automated verification covers input-event behaviour, save/record isolation, engine mechanics, build packaging and full-campaign AI replay. These checks do not replace human assessment of feel, rendering or mobile usability. Personal records are local conveniences, not tamper-proof competitive leaderboards.

Part of the [42.uk](https://42.uk) universe. RELAX. IT'S ALREADY OVER.
