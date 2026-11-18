# ◆ Checkout Time — The Grand Last Resort

A 42.uk zombie hotel comedy. Save the coach party while Monty Upsell, a fictional owner in a lavender suit, tries to sell the building around you.

**[Instructions and live game](https://marroccofella.github.io/games/checkout-time/)** · **[Play directly](https://marroccofella.github.io/games/checkout-time/play.html)** · [42.uk Arcade](https://marroccofella.github.io/games/)

> “Excellent footfall. Regrettable bitefall.” — Monty Upsell

## Play

Click **Check in** or press Space. Survive from 23:00 to 06:00: seven fictional hours in six real minutes. Walk near guests to make them follow, then lead them east to the glowing green coach boarding ring. A grabbed guest turns if their countdown expires; shoot the zombie holding them. The coach and off-screen grabbed guests get directional arrows.

| Action | Keyboard | Touch |
|---|---|---|
| Move in Top | Arrow keys | Direction pad |
| Move in Eyes | ↑ ↓ walk, ← → strafe | Direction pad |
| Look in Eyes | Q/E turn or click scene for mouse look | Drag the scene while using the pad |
| Move in Shoulder | ↑ ↓ walk, ← → turn | Direction pad |
| Fire with auto-aim | Tap Space | Tap FIRE |
| Keep firing | Hold Space away from doors | Hold FIRE |
| Barricade / reopen a prompted door | Hold Space near it | Hold FIRE near it |
| Negotiate with Monty | N | Haggle |
| Pause / resume | P or Escape | Pause / Resume |
| Mute / unmute | M | Sound button |

Pick up tea and biscuits for health. Red extinguisher pickups provide crowd-control foam when targets are in front and visible. Red eyes signal an incoming zombie swing. Barricades cut routes and reduce sealed zombies' outbreak contribution; nearby zombies can bash them open. Losing focus automatically pauses and releases held input.

Monty follows the porter and periodically delivers a sales pitch. Haggle produces another counter-offer. Pitches are counted separately from rescues. There is no sale, payment or purchase flow. Monty is a comic bystander, not an extra rescue target.

## Release 2026.11.18.2

First-person (Eyes) left/right movement now strafes relative to your facing without rotating. Q/E, mouse look and touch-drag turn the view. Diagonal movement stays capped at walking speed; Shoulder and Top retain their controls. The release includes the combined cinema improvements and shortened Dom alerts below.

## Dom voice announcements

Local voice update **2026.11.07.3** keeps guest-turn calls brief, rotates their wording and allows closely spaced turns to be heard without the normal duplicate cooldown. The short queue remains bounded; excess or unavailable speech keeps its caption fallback. Routine confirmations and automatic Monty pitches leave longer gaps; manually pressing Haggle still requests a pitch immediately.

**Porter acting is awaiting a performed reference:** both audition takes were rejected as insufficiently dramatic. The active pack currently contains the shortened normal-Dom alerts. The prepared gameplay hooks will trigger rotating Yorkshire porter outbursts from actual zombie hits once an acted performance is accepted, with a shared four-second cooldown and different lines at low health. Urgent guest-turn speech outranks jokes. On defeat, one final porter line may play; normal end-screen announcements remain stopped. Pause, mute, the Dom toggle and a new game cancel current speech. All synthetic speech stays at 1.8× with pitch preservation.

Click the separate speaker **1.8×** icon beside Sound to enable the consented synthetic Dom voice. Monty's pitches and event announcements use locally generated clips at exactly **1.8 times playback speed**, preserving pitch. Spoken announcement banners, Monty's text and character speech bubbles disappear in this mode; rescue arrows, countdowns, health and door prompts remain visible. Essential event text stays visible when speech is busy or unmapped, and reappears if its clip is interrupted or fails. Click again for text announcements. The preference stays in this browser. Sound off also silences Dom and restores text. Pause, loss of focus, restart and game over stop speech; urgent alerts interrupt sales chatter and stale notices are discarded.

Speech clips are generated ahead of time with the installed myvoice Dom Studio preset, then checked for signal health and word accuracy. Gameplay needs no Promptus service, microphone, speech service or browser speech synthesis. The voice pack records human listening status separately from automated checks. Character chatter is hidden rather than narrated; variable room and door alerts use concise generic speech. Generated speech is synthetic.

Run `node --test announcements.test.mjs` for announcement lifecycle tests. `node build.mjs` embeds the voice clips in the standalone build. The privacy check verifies the audio allowlist, clip hashes and metadata secret scan; the original voice reference and personal generation evidence stay outside the game folder.

## Night events and scoring

Midnight brings a wave; 01:00 introduces runners; at 03:00 dormant indoor zombies wake; at 05:00 a double wave arrives. The end screen generates a fictional guest review. One star for each:

1. Reach 06:00.
2. Save 10 guests.
3. Save 22 guests.
4. Lock 3 zombies in.
5. Reach dawn with at most 6 guests turned.

The score rewards saved guests, rescues, sealed zombies and shots that stop zombies, with a dawn bonus and penalties for guests turned. Your personal best stays only in this browser's local storage. Clear site data to reset it.

## Run and verify

No dependencies to install. Use Node.js 18 or newer:

```sh
node server.mjs
```

Open `http://127.0.0.1:8793/`. For checks:

```sh
node check.mjs
node check.mjs 42
node privacy-check.mjs
node build.mjs
```

`check.mjs` exercises real game/world logic with a stub renderer, DOM and audio. Door, rescue and dawn cases use controlled scenarios; these do not certify subjective balance or audible sound quality. Real-browser smoke tests cover rendering and input separately. `build.mjs` creates a standalone `dist/game.html` for hosts that cannot serve separate scripts. The source `play.html` is the GitHub Pages game; `index.html` is the instructions page.

## Privacy and provenance

The public release uses a newly generated, invented layout: 13 room regions and 17 doors. No real property's outlines, room coordinates, photographs, plans, addresses, correspondence, financials, credentials or private-site navigation are included. Monty and the guests are fictional characters. Shared generic hotel terms describe game props, not real people or real conditions.

This release is assembled from an explicit source allowlist into a fresh publication folder, without private development history. The privacy audit checks file types, sensitive identifiers, machine paths, credential patterns and runtime network APIs. It is a reproducible check of this package, not a guarantee about unrelated repositories or websites.

No telemetry, accounts, microphone, cloud voice, remote fonts or in-game purchases. Three.js is vendored; effects are synthesised with WebAudio after a player gesture, and optional synthetic Dom announcements play from local clips. External links lead to the arcade, source and 42.uk only. Hosting providers receive normal website requests.

## Scope and access

Keyboard and touch controls. Modern JavaScript/WebGL browser required; a graphics fallback explains unavailable WebGL. Cartoon violence, flashing effects and sudden synthetic sounds. Mute is available; reduced-motion settings disable decorative UI pulses. This fast visual action game has not been certified as fully screen-reader playable. Upper floors are scenery; no upstairs level or online multiplayer is implemented.

## Licence

Original project code and writing: MIT, see [LICENSE](LICENSE). Three.js: MIT, see [assets/THREE-LICENSE.txt](assets/THREE-LICENSE.txt). AI-assisted development and review.

Part of the [42.uk universe](https://42.uk).

**RELAX. IT'S ALREADY OVER.**


## Combined Cinema + Dom release · 2026.11.07.2

[Full preview notes, contributions and limits](https://marroccofella.github.io/games/checkout-time/preview-notes.html).

Other-agent groundwork integrated: jointed people/outfits and turning, corner movement, follower give-way, door/furniture clearance, three views, close aiming, rotating minimap and guide trails. This release combines the consented 1.8× Dom voice pack and separate speaker control with rewritten directional WebAudio, low tension score and threat cues, procedural surface detail and weather, adjustable gore/debris/death poses, comfort settings, resource cleanup and expanded checks. The invented public layout and Monty remain. No real property information is included.

C cycles camera; G toggles the trail. In Eyes, arrows walk/strafe; Q/E or mouse look turns, and touch players drag the scene. In Shoulder, arrows turn/walk. In either close view, double Down turns around and clicking the scene enables optional mouse look. Pause offers Gore, Motion, Mix and Sound check. Preferences and score are local only.

Run `node check.mjs` (27 gameplay checks), `node audio-check.mjs` (10 audio routing/lifecycle checks), `node --test announcements.test.mjs` (20 announcement checks), `node build.mjs` and `node privacy-check.mjs`. Scripts use a stub renderer or simulated WebAudio graph; browser play and device listening remain separate. No claim of photorealism or universal performance.

Touch players can switch the rescue trail on or off from Pause. Keyboard players can also press G during play.

## The last coach
Choose **Lead the five-floor evacuation**. Collect every named guest, regroup at the marked stairs, and escort the party to the ground-floor coach. Arrow keys or WASD walk, tap a floor tile to route there, or choose Guide to next stop. P pauses. Reception leaves the campaign. Nine guests across five fictional levels are required for departure. A full lighting cycle takes one minute of active play.
