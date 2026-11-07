# ◆ Checkout Time — The Grand Last Resort

A 42.uk zombie hotel comedy. Save the coach party while Monty Upsell, a fictional owner in a lavender suit, tries to sell the building around you.

**[Instructions and live game](https://marroccofella.github.io/games/checkout-time/)** · **[Play directly](https://marroccofella.github.io/games/checkout-time/play.html)** · [42.uk Arcade](https://marroccofella.github.io/games/)

> “Excellent footfall. Regrettable bitefall.” — Monty Upsell

## Play

Click **Check in** or press Space. Survive from 23:00 to 06:00: seven fictional hours in six real minutes. Walk near guests to make them follow, then lead them east to the glowing green coach boarding ring. A grabbed guest turns if their countdown expires; shoot the zombie holding them. The coach and off-screen grabbed guests get directional arrows.

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys | Direction pad |
| Fire with auto-aim | Tap Space | Tap FIRE |
| Keep firing | Hold Space away from doors | Hold FIRE |
| Barricade / reopen a prompted door | Hold Space near it | Hold FIRE near it |
| Negotiate with Monty | N | Haggle |
| Pause / resume | P or Escape | Pause / Resume |
| Mute / unmute | M | Sound button |

Pick up tea and biscuits for health. Red extinguisher pickups provide crowd-control foam when targets are in front and visible. Red eyes signal an incoming zombie swing. Barricades cut routes and reduce sealed zombies' outbreak contribution; nearby zombies can bash them open. Losing focus automatically pauses and releases held input.

Monty follows the porter and periodically delivers a sales pitch. Haggle produces another counter-offer. Pitches are counted separately from rescues. There is no sale, payment or purchase flow. Monty is a comic bystander, not an extra rescue target.

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

No telemetry, accounts, microphone, cloud voice, remote fonts or in-game purchases. Three.js is vendored; sounds are synthesised with WebAudio after a player gesture. External links lead to the arcade, source and 42.uk only. Hosting providers receive normal website requests.

## Scope and access

Keyboard and touch controls. Modern JavaScript/WebGL browser required; a graphics fallback explains unavailable WebGL. Cartoon violence, flashing effects and sudden synthetic sounds. Mute is available; reduced-motion settings disable decorative UI pulses. This fast visual action game has not been certified as fully screen-reader playable. Upper floors are scenery; no upstairs level or online multiplayer is implemented.

## Licence

Original project code and writing: MIT, see [LICENSE](LICENSE). Three.js: MIT, see [assets/THREE-LICENSE.txt](assets/THREE-LICENSE.txt). AI-assisted development and review.

Part of the [42.uk universe](https://42.uk).

**RELAX. IT'S ALREADY OVER.**


## Cinema Preview · 2026.11.07.1

[Full preview notes, contributions and limits](https://marroccofella.github.io/games/checkout-time/preview-notes.html).

Other-agent groundwork integrated: jointed people/outfits and turning, corner movement, follower give-way, door/furniture clearance, three views, close aiming, rotating minimap and guide trails. This release adds rewritten directional WebAudio, low tension score and threat cues, procedural surface detail and weather, adjustable gore/debris/death poses, comfort settings, resource cleanup and expanded checks. The invented public layout and Monty remain. No real property information is included.

C cycles camera; G toggles the trail. In close views arrows turn/walk, double Down turns around, and clicking the scene enables optional mouse look. Pause offers Gore, Motion, Mix and Sound check. Preferences and score are local only.

Run `node check.mjs` (21 gameplay checks), `node audio-check.mjs` (10 audio routing/lifecycle checks), `node build.mjs` and `node privacy-check.mjs`. Scripts use a stub renderer or simulated WebAudio graph; browser play and device listening remain separate. No claim of photorealism or universal performance.
