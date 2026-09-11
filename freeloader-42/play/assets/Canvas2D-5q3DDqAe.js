import { O as __toESM, S as portalPose, T as require_react, a as BLASTER_SPRITE, b as portalActive, f as ROOMS, i as BLASTER_PALETTE, l as weaponPosition, m as moverX, n as useGameStore, o as exitOutstanding, p as guardianX, s as retroFor, t as require_jsx_runtime, x as portalFrame, y as drawPortal } from "./index-f8dNltQl.js";
import { a as TILE_SPRITES, c as getDriver, i as SPRITE_PALETTES, l as BELT_SPEED, n as GUARDIAN_SPRITES, o as spriteToCanvas, r as SHARD_SPRITE, s as tilePalette, t as FREELOADER_FRAMES, u as phantomStateAt } from "./sprites-CgeCSVGp.js";
//#region app/game/Canvas2D.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var VIEW_UNITS_Y = 10.5;
var CAMERA_Y = 2.6;
var PLAYER_DRAW = 1.55;
var GUARDIAN_DRAW = 1.15;
var SHARD_DRAW = 1;
function buildSprites() {
	const cache = {};
	for (const [frame, rows] of Object.entries(FREELOADER_FRAMES)) cache[`freeloader:${frame}`] = spriteToCanvas(rows, SPRITE_PALETTES.freeloader);
	for (const [kind, rows] of Object.entries(GUARDIAN_SPRITES)) cache[`guardian:${kind}`] = spriteToCanvas(rows, SPRITE_PALETTES[kind]);
	cache.shard = spriteToCanvas(SHARD_SPRITE, SPRITE_PALETTES.shard);
	cache.blaster = spriteToCanvas(BLASTER_SPRITE, BLASTER_PALETTE);
	ROOMS.forEach((room, index) => {
		for (const [kind, rows] of Object.entries(TILE_SPRITES)) cache[`tile:${index}:${kind}`] = spriteToCanvas(rows, tilePalette(room.theme));
	});
	return cache;
}
function Canvas2D({ reducedMotion, portalReducedMotion = reducedMotion }) {
	const canvasRef = (0, import_react.useRef)(null);
	const [driver] = (0, import_react.useState)(getDriver);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const sprites = buildSprites();
		const portalCanvas = document.createElement("canvas");
		portalCanvas.width = portalCanvas.height = 192;
		const portalContext = portalCanvas.getContext("2d");
		const fit = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			canvas.width = Math.max(1, Math.round(rect.width * dpr));
			canvas.height = Math.max(1, Math.round(rect.height * dpr));
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(canvas);
		let raf = 0;
		let last = performance.now();
		let lastDeathSerial = useGameStore.getState().deathSerial;
		let flashFrames = 0;
		const draw = (now) => {
			raf = window.requestAnimationFrame(draw);
			const delta = Math.min((now - last) / 1e3, .1);
			last = now;
			driver.frame(delta);
			const engine = driver.engine;
			const room = ROOMS[engine.roomIndex];
			const theme = room.theme;
			const game = useGameStore.getState();
			const transferring = portalActive(game);
			const arriving = transferring && game.roomIndex !== game.portalSourceIndex;
			const portal = transferring ? portalFrame(game.transitionRemaining, arriving, portalReducedMotion) : null;
			const width = canvas.width;
			const height = canvas.height;
			const scale = height / VIEW_UNITS_Y;
			const halfViewUnits = width / (2 * scale);
			const camX = Math.min(room.bounds.maxX - halfViewUnits + 1.2, Math.max(room.bounds.minX + halfViewUnits - 1.2, engine.x));
			const sx = (wx) => (wx - camX) * scale + width / 2;
			const sy = (wy) => height / 2 - (wy - CAMERA_Y) * scale;
			if (game.deathSerial !== lastDeathSerial) {
				lastDeathSerial = game.deathSerial;
				flashFrames = 10;
			}
			ctx.imageSmoothingEnabled = false;
			ctx.fillStyle = theme.bg;
			ctx.fillRect(0, 0, width, height);
			const glow = ctx.createLinearGradient(0, 0, 0, height);
			glow.addColorStop(0, `${theme.haze}55`);
			glow.addColorStop(.55, "transparent");
			glow.addColorStop(1, `${theme.haze}33`);
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);
			ctx.strokeStyle = `${theme.accent}22`;
			ctx.lineWidth = Math.max(1, scale * .03);
			for (let ribX = Math.floor((camX - halfViewUnits) / 1.9) * 1.9; ribX < camX + halfViewUnits + 2; ribX += 1.9) {
				const px = (ribX - camX) * .55 * scale + width / 2;
				ctx.beginPath();
				ctx.moveTo(px, 0);
				ctx.lineTo(px, height);
				ctx.stroke();
			}
			for (const platform of room.platforms) {
				const tile = sprites[`tile:${engine.roomIndex}:${platform.kind === "conveyor" ? "conveyor" : platform.kind === "crumble" ? "crumble" : platform.kind === "phantom" ? "phantom" : "solid"}`];
				if (!tile) continue;
				let alpha = 1;
				let jitter = 0;
				const rewritten = engine.wildcardSteps > 0 && engine.wildcardTargetId === platform.id;
				if (platform.kind === "phantom") {
					const ph = phantomStateAt(engine.seconds, platform.offset ?? 0);
					alpha = rewritten ? 1 : ph.solid ? ph.warning ? .35 + .4 * Math.abs(Math.sin(engine.seconds * 24)) : .92 : .16;
				}
				if (platform.kind === "crumble") {
					const integrity = engine.crumbs[platform.id] ?? 0;
					if (integrity <= 0 && !rewritten) continue;
					if (integrity < 33 && !rewritten) jitter = (reducedMotion ? 0 : Math.sin(engine.seconds * 55) * .035) * (1 - integrity / 33);
				}
				ctx.globalAlpha = alpha;
				const left = platform.x - platform.width / 2;
				const top = platform.y + platform.height / 2 + jitter;
				for (let unit = 0; unit < platform.width; unit += 1) {
					const chunk = Math.min(1, platform.width - unit);
					ctx.drawImage(tile, 0, 0, 16 * chunk, 8, sx(left + unit), sy(top), scale * chunk, platform.height * scale);
				}
				if (platform.kind === "conveyor" && !reducedMotion && !rewritten) {
					const drift = (engine.seconds * BELT_SPEED * (platform.dir ?? 1) % .8 + .8) % .8;
					ctx.fillStyle = `${theme.accent}cc`;
					for (let dash = -.8; dash < platform.width + .8; dash += .8) {
						const dashX = left + dash + drift;
						if (dashX < left || dashX > left + platform.width - .3) continue;
						ctx.fillRect(sx(dashX), sy(top) - Math.max(1, scale * .05), scale * .3, Math.max(1, scale * .05));
					}
				}
				if (engine.wildcardTargetId === platform.id && game.wildcard !== "spent") {
					ctx.strokeStyle = rewritten ? "#e6ffe6" : `${theme.accent}aa`;
					ctx.lineWidth = Math.max(2, scale * (rewritten ? .09 : .045));
					ctx.strokeRect(sx(left), sy(top), platform.width * scale, platform.height * scale);
					ctx.fillStyle = rewritten ? "#e6ffe6" : theme.accent;
					ctx.font = `${Math.max(9, scale * .22)}px monospace`;
					ctx.fillText("*", sx(left + platform.width / 2) - scale * .06, sy(top + .18));
				}
				ctx.globalAlpha = 1;
			}
			for (const mover of room.movers) {
				const tile = sprites[`tile:${engine.roomIndex}:solid`];
				if (!tile) continue;
				const left = moverX(mover, engine.seconds) - mover.width / 2;
				const top = mover.y + mover.height / 2;
				for (let unit = 0; unit < mover.width; unit += 1) {
					const chunk = Math.min(1, mover.width - unit);
					ctx.drawImage(tile, 0, 0, 16 * chunk, 8, sx(left + unit), sy(top), scale * chunk, mover.height * scale);
				}
				ctx.strokeStyle = theme.accent;
				ctx.lineWidth = Math.max(1, scale * .04);
				ctx.strokeRect(sx(left), sy(top), mover.width * scale, mover.height * scale);
			}
			for (const hazard of room.hazards) {
				const spikes = Math.max(2, Math.round(hazard.width / .3));
				ctx.save();
				ctx.fillStyle = "#ff345f";
				ctx.shadowColor = "#ff003c";
				ctx.shadowBlur = scale * .3;
				for (let spike = 0; spike < spikes; spike += 1) {
					const centerX = hazard.x - hazard.width / 2 + (spike + .5) * (hazard.width / spikes);
					ctx.beginPath();
					ctx.moveTo(sx(centerX - .16), sy(hazard.y + .3));
					ctx.lineTo(sx(centerX + .16), sy(hazard.y + .3));
					ctx.lineTo(sx(centerX), sy(hazard.y + .78));
					ctx.closePath();
					ctx.fill();
				}
				ctx.restore();
			}
			const retro = retroFor(room, game);
			const open = exitOutstanding(room, game) === 0;
			const gate = (x, y, active, unlocked) => {
				drawPortal(portalContext, {
					size: 192,
					theme,
					open: unlocked,
					seconds: engine.seconds,
					frame: active,
					reducedMotion: active ? portalReducedMotion : reducedMotion
				});
				ctx.save();
				ctx.shadowColor = unlocked ? theme.accent : "#ff1d6c";
				ctx.shadowBlur = scale * (active ? .45 : .2);
				ctx.drawImage(portalCanvas, sx(x - 2.2), sy(y + 2.2), scale * 4.4, scale * 4.4);
				ctx.restore();
			};
			gate(room.exit.x, room.exit.y, arriving ? null : portal, open);
			if (arriving) gate(room.start.x, room.start.y, portal, true);
			room.shards.forEach((shard, index) => {
				if (game.collected.includes(shard.id)) return;
				const bob = reducedMotion ? 0 : Math.sin(engine.seconds * 2 + index) * .13;
				const sprite = sprites.shard;
				if (!sprite) return;
				ctx.save();
				ctx.shadowColor = "#00ff99";
				ctx.shadowBlur = scale * .5;
				ctx.drawImage(sprite, sx(shard.x - SHARD_DRAW / 2), sy(shard.y + bob + SHARD_DRAW / 2), SHARD_DRAW * scale, SHARD_DRAW * scale);
				ctx.restore();
			});
			room.guardians.forEach((guardian, index) => {
				if (retro?.defeated.includes(guardian.id)) return;
				const sprite = sprites[`guardian:${guardian.kind}`];
				if (!sprite) return;
				const gx = guardianX(guardian, engine.seconds);
				const heading = Math.cos(engine.seconds * guardian.speed);
				const bob = reducedMotion ? 0 : Math.sin(engine.seconds * 3 + index) * .06;
				ctx.save();
				ctx.shadowColor = guardian.color;
				ctx.shadowBlur = scale * .45;
				ctx.translate(sx(gx), sy(guardian.y + bob + GUARDIAN_DRAW / 2 - .35));
				if (heading < 0) ctx.scale(-1, 1);
				ctx.drawImage(sprite, -1.15 * scale / 2, 0, GUARDIAN_DRAW * scale, GUARDIAN_DRAW * scale);
				ctx.restore();
			});
			if (retro && !portal) {
				if (!retro.weapon && sprites.blaster) {
					const pickup = weaponPosition(room);
					ctx.save();
					ctx.shadowColor = "#00c9ff";
					ctx.shadowBlur = scale * .4;
					ctx.drawImage(sprites.blaster, sx(pickup.x - .6), sy(pickup.y + .6), scale * 1.2, scale * 1.2);
					ctx.fillStyle = "#e6ffe6";
					ctx.textAlign = "center";
					ctx.font = `bold ${Math.max(9, scale * .18)}px monospace`;
					ctx.fillText("PICK UP // F TO FIRE", sx(pickup.x), sy(pickup.y + .9));
					ctx.restore();
				}
				ctx.save();
				ctx.fillStyle = "#e6ffe6";
				ctx.shadowColor = "#00c9ff";
				ctx.shadowBlur = scale * .25;
				for (const shot of engine.shots) ctx.fillRect(sx(shot.x) - scale * .08, sy(shot.y) - scale * .06, scale * .16, scale * .12);
				for (const blast of engine.blasts) {
					ctx.globalAlpha = blast.life / .3;
					for (let part = 0; part < 8; part++) {
						const angle = part * Math.PI / 4, radius = (1 - blast.life / .3) * .8;
						ctx.fillRect(sx(blast.x + Math.cos(angle) * radius) - 2, sy(blast.y + Math.sin(angle) * radius) - 2, 4, 4);
					}
				}
				ctx.restore();
			}
			const moving = Math.abs(engine.vx) > .6;
			const frame = !engine.grounded ? "jump" : moving ? Math.floor(engine.walkCycle * 6) % 2 === 0 ? "walk1" : "walk2" : "idle";
			const freeloader = sprites[`freeloader:${frame}`];
			if (freeloader) {
				ctx.save();
				const pose = portalPose(portal, {
					x: engine.x,
					y: engine.y - .06
				}, room.exit);
				ctx.translate(sx(pose.x), sy(pose.y));
				ctx.rotate(-pose.rotation);
				ctx.globalAlpha = pose.alpha;
				ctx.scale(pose.scale, pose.scale);
				if (engine.facing < 0) ctx.scale(-1, 1);
				ctx.drawImage(freeloader, -1.55 * scale / 2, -1.55 * scale / 2, PLAYER_DRAW * scale, PLAYER_DRAW * scale);
				if (retro?.weapon && sprites.blaster) ctx.drawImage(sprites.blaster, scale * .12, -scale * .25, scale * .85, scale * .85);
				ctx.restore();
			}
			if (flashFrames > 0) {
				flashFrames -= 1;
				ctx.fillStyle = `rgba(255, 40, 80, ${.05 + flashFrames / 10 * .22})`;
				ctx.fillRect(0, 0, width, height);
			}
			if (game.phase === "paused") {
				ctx.fillStyle = "rgba(2, 8, 6, 0.55)";
				ctx.fillRect(0, 0, width, height);
			}
		};
		raf = window.requestAnimationFrame(draw);
		return () => {
			window.cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}, [
		driver,
		reducedMotion,
		portalReducedMotion
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref: canvasRef,
		className: "canvas-2d",
		"aria-label": "FREEL*ADER 42 two-dimensional playfield"
	});
}
//#endregion
export { Canvas2D as default };
