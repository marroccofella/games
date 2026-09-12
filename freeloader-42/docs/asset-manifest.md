# Asset and audio provenance

This manifest distinguishes shipped media from retained, unshipped candidates.
Package dependencies and their licences are recorded by the package lock and
their upstream packages.

## Current cabinet voice and wallpaper

The arcade-rain release uses original short Yorkshire recordings after clears
and deaths. They were synthesized locally in Promptus F5-TTS from the creator's
consented voice. The creator approved the theatrical Fast B performance at
1.5× tempo; this profile approval does not assert individual listening verdicts
for every clip.

Every shipped final FLAC passes signal-health analysis and local word checks
after pitch-preserving tempo conversion: no signal flags, at most 5% normalized
word error and a recognized-word ratio between 0.95 and 1.05, enforced using
exact counts. Each file is hash-bound to its intended subtitle. Failed takes,
the voice reference and private generation records are excluded.

The [shipped voice inventory](https://marroccofella.github.io/games/freeloader-42/voice-manifest.json)
records the final clip count, text, duration and SHA-256 for each recording.
The game loads these same-origin clips on demand and labels them synthetic.

The symbol wallpaper is independently authored local Canvas drawing code:
42.uk asterisks, broken rings, brackets and geometric emblems over three depth
layers. The source's palette and transformations were informed by 42.uk's
improbability cascade; no external wallpaper script or third-party game art is
downloaded at runtime.

| Asset | Origin | Licence / consent basis | SHA-256 |
|---|---|---|---|
| `public/og.png` | Generated for this project with the built-in OpenAI image-generation tool on 2026-08-19 from a clean original 42.uk Freeloader prompt; no third-party image reference was supplied | Project-specific generated key art; review final use under the applicable OpenAI terms | `9412F848CF11842394AB58B2CCBAB7374E68B23DD594D85D6E7189935C635DE5` |
| Retained old intro candidate, unshipped | Generated locally with Promptus F5-TTS in Poetic mode, seed 44 | User-owned voice; individual listening verdict pending; excluded from the public build | `86146D302025B11356DC0F5ECF7605517FDB168B53E62427E0E8601522101530` |
| `app/game/sprites.mjs` | Code-authored pixel sprites created for this project | Project-specific source | generated at runtime |
| `app/game/audio-design.mjs` | Original note-event pattern and seven deterministic district transforms | Project-specific source; no imported MIDI, samples or arrangements | generated at runtime |
| `app/game/audio.ts` | Web Audio synthesis and mixing graph | Project-specific source | generated at runtime |
| 3D scene geometry and materials | Procedural primitives authored in `app/game/GameScene.tsx` | Project-specific source | generated at runtime |

## Historical intro candidate verification, unshipped

- Output format: mono MP3, 24 kHz, 160 kb/s
- Duration: 32.09 seconds
- Embedded metadata: none; decoded audio matches the gated source (`MD5 46e496b8491524b5b5042cae534dccd0`)
- Peak: −1.41 dBFS
- Clipping: 0%
- DC offset: 0.000136
- Possible clicks: 0%
- Recognized-word ratio: 1.00
- Normalized word error: 0%
- Automated signal flags: none
- Human listening verdict: pending; the asset is a verified candidate, not yet accepted

## Exclusions

- No game ROM, disassembly, sprite sheet, map, MIDI, audio recording or screenshot from another game was used.
- No public-domain classical melody or recognizable legacy cue is included.
- No estate-agent photograph, tenant data, security layout or architectural drawing from a real property is included.
