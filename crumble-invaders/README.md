# ◆ Crumble Invaders

Bond first. Blast second. Crumble Invaders is a self-contained arcade game where kookies are ammunition, toilets are shields, and converting the enemy builds a friendly network that fights beside you.

**Play:** [marroccofella.github.io/games/crumble-invaders/](https://marroccofella.github.io/games/crumble-invaders/)

## Controls

- **Move:** Left/Right arrows or A/D; on touch, drag in the left side of the playfield.
- **Launch kookie:** Space; on touch, hold the 🍪 action or press in the right side of the playfield.
- **Bond:** B or V; on touch, tap 🤝.
- **Reboot charge:** G; on touch, tap 🧨 after collecting a charge.
- **Pause/resume:** Escape.

## What ships

- One browser-ready `index.html`; no build step.
- Synthesized Web Audio effects with a mute control.
- Keyboard and multitouch play, responsive resizing, pause-on-blur, reduced-motion support, visible focus, and labelled live status.
- No accounts, trackers, cookies, external fonts, remote assets, or third-party runtime calls.

## Verification

From the arcade repository root:

```text
node --test verify.test.mjs crumble-invaders/game.test.mjs
node verify.mjs
```

The game has regression coverage for its update-loop ownership, reboot charge, projectile lifetime, collision ownership, responsive bounds, elapsed-time scoring, touch controls, pause flow, and wave-font contract. Its release changes were peer-reviewed by the OAuth-only MOMM coalition and independently verified in desktop and mobile browser layouts.

## Provenance and licence

Created with [Promptus.ai](https://www.promptus.ai/) and released as open source under the repository's [MIT licence](../LICENSE). The shipped game uses an original rule-based JavaScript gameplay engine; it does not claim or download a trained neural model at runtime.

Part of the [42.uk Arcade](../). RELAX. IT'S ALREADY OVER.
