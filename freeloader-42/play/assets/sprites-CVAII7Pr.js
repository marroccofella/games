import { a as FINAL_ROOM_ID, c as WORLD_GRAPH, d as playSfx, f as controls, i as LATENCY_DRAIN, l as guardianX, n as useGameStore, o as GUARDIAN_REASONS, s as ROOMS, u as moverX } from "./index-D0xPQ0Xn.js";
//#region app/game/engine.mjs
var FIXED_STEP = 1 / 60;
var PLAYER_HALF_WIDTH = .3;
var PLAYER_HALF_HEIGHT = .72;
var RUN_SPEED = 4.65;
var JUMP_VELOCITY = 7.35;
var GRAVITY = 18.5;
var JUMP_CUT = .48;
var BELT_SPEED = 1.7;
var PHANTOM_PERIOD = 2.6;
var PHANTOM_SOLID_DUTY = .62;
var GATE_RADIUS = 1.15;
function phantomStateAt(seconds, offset = 0) {
	const t = ((seconds + offset) % PHANTOM_PERIOD + PHANTOM_PERIOD) % PHANTOM_PERIOD;
	const solid = t < PHANTOM_PERIOD * PHANTOM_SOLID_DUTY;
	return {
		solid,
		warning: solid && t > 1.262,
		t
	};
}
function isPlatformSolid(platform, state) {
	if (state.wildcardSteps > 0 && state.wildcardTargetId === platform.id) return true;
	if (platform.kind === "crumble") return (state.crumbs[platform.id] ?? 0) > 0;
	if (platform.kind === "phantom") return phantomStateAt(state.seconds, platform.offset ?? 0).solid;
	return true;
}
function createEngineState(roomIndex = 0) {
	const state = {
		roomIndex: 0,
		seconds: 0,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		facing: 1,
		grounded: false,
		walkCycle: 0,
		coyote: 6,
		jumpBuffer: 0,
		wasJumpHeld: false,
		subSteps: 0,
		crumbs: {},
		prevMoverX: {},
		ridingMoverId: null,
		beltPush: 0,
		gateWasNear: false,
		wildcardSteps: 0,
		wildcardTargetId: null,
		phantomWarnings: {}
	};
	resetEngineState(state, roomIndex);
	return state;
}
function resetEngineState(state, roomIndex) {
	const room = ROOMS[roomIndex];
	state.roomIndex = roomIndex;
	state.seconds = 0;
	state.x = room.start.x;
	state.y = room.start.y;
	state.vx = 0;
	state.vy = 0;
	state.facing = 1;
	state.grounded = false;
	state.walkCycle = 0;
	state.coyote = 6;
	state.jumpBuffer = 0;
	state.wasJumpHeld = false;
	state.subSteps = 0;
	state.crumbs = {};
	for (const platform of room.platforms) if (platform.kind === "crumble") state.crumbs[platform.id] = 33;
	state.prevMoverX = {};
	for (const mover of room.movers) state.prevMoverX[mover.id] = moverX(mover, 0);
	state.ridingMoverId = null;
	state.beltPush = 0;
	state.gateWasNear = false;
	state.wildcardSteps = 0;
	state.wildcardTargetId = room.wildcardTargetId;
	state.phantomWarnings = {};
	for (const platform of room.platforms) if (platform.kind === "phantom") state.phantomWarnings[platform.id] = false;
}
var clamp = (value, low, high) => Math.min(high, Math.max(low, value));
function stepEngine(state, controls, game) {
	const room = ROOMS[state.roomIndex];
	const events = [];
	state.seconds += FIXED_STEP;
	if (controls.wildcardQueued) {
		controls.wildcardQueued = false;
		if (state.wildcardSteps === 0 && game.activateWildcard()) {
			state.wildcardSteps = 252;
			events.push("wildcard");
		}
	}
	if (state.wildcardSteps > 0) {
		state.wildcardSteps -= 1;
		if (state.wildcardSteps === 0) game.expireWildcard();
	}
	let warningEmittedThisStep = false;
	for (const platform of room.platforms) {
		if (platform.kind !== "phantom") continue;
		if (!phantomStateAt(state.seconds, platform.offset ?? 0).warning) {
			state.phantomWarnings[platform.id] = false;
			continue;
		}
		const horizontalGap = Math.max(0, Math.abs(state.x - platform.x) - platform.width / 2 - PLAYER_HALF_WIDTH);
		const verticalGap = Math.abs(state.y - PLAYER_HALF_HEIGHT - (platform.y + platform.height / 2));
		if (horizontalGap <= 2.2 && verticalGap <= 2.6 && !state.phantomWarnings[platform.id]) {
			if (!warningEmittedThisStep) events.push("warning");
			warningEmittedThisStep = true;
			state.phantomWarnings[platform.id] = true;
		}
	}
	let carried = 0;
	for (const mover of room.movers) {
		const currentX = moverX(mover, state.seconds);
		if (state.ridingMoverId === mover.id) carried += currentX - state.prevMoverX[mover.id];
		state.prevMoverX[mover.id] = currentX;
	}
	carried += state.beltPush * FIXED_STEP;
	if (controls.jumpQueued) {
		state.jumpBuffer = 6;
		controls.jumpQueued = false;
	} else state.jumpBuffer = Math.max(0, state.jumpBuffer - 1);
	const direction = Number(controls.right) - Number(controls.left);
	if (direction !== 0) state.facing = direction;
	const blend = direction === 0 ? .24 : .34;
	state.vx += (direction * RUN_SPEED - state.vx) * blend;
	if (state.jumpBuffer > 0 && state.coyote > 0) {
		state.vy = JUMP_VELOCITY;
		state.jumpBuffer = 0;
		state.coyote = 0;
		events.push("jump");
	}
	if (!controls.jumpHeld && state.wasJumpHeld && state.vy > 0) state.vy *= JUMP_CUT;
	state.wasJumpHeld = controls.jumpHeld;
	const wasGrounded = state.grounded;
	state.vy -= GRAVITY * FIXED_STEP;
	const impactVelocity = state.vy;
	const previousBottom = state.y - PLAYER_HALF_HEIGHT;
	const nextX = clamp(state.x + carried + state.vx * FIXED_STEP, room.bounds.minX, room.bounds.maxX);
	let nextY = state.y + state.vy * FIXED_STEP;
	let grounded = false;
	let groundedPlatform = null;
	let ridingMoverId = null;
	if (state.vy <= 0) {
		for (const mover of room.movers) {
			const surface = {
				...mover,
				x: state.prevMoverX[mover.id]
			};
			if (landsOn(surface, nextX, nextY, previousBottom)) {
				nextY = surface.y + surface.height / 2 + PLAYER_HALF_HEIGHT;
				state.vy = 0;
				grounded = true;
				ridingMoverId = mover.id;
				break;
			}
		}
		if (!grounded) for (const platform of room.platforms) {
			if (!isPlatformSolid(platform, state)) continue;
			if (landsOn(platform, nextX, nextY, previousBottom)) {
				nextY = platform.y + platform.height / 2 + PLAYER_HALF_HEIGHT;
				state.vy = 0;
				grounded = true;
				groundedPlatform = platform;
				break;
			}
		}
	}
	const wildcardGround = groundedPlatform?.id === state.wildcardTargetId && state.wildcardSteps > 0;
	state.beltPush = grounded && groundedPlatform?.kind === "conveyor" && !wildcardGround ? groundedPlatform.dir * BELT_SPEED : 0;
	if (grounded && groundedPlatform?.kind === "crumble" && !wildcardGround) {
		state.crumbs[groundedPlatform.id] -= 1;
		if (state.crumbs[groundedPlatform.id] <= 0) events.push("crumble");
	}
	state.coyote = grounded ? 6 : Math.max(0, state.coyote - 1);
	state.ridingMoverId = grounded ? ridingMoverId : null;
	state.grounded = grounded;
	if (grounded && !wasGrounded && impactVelocity < -.8) events.push("land");
	state.walkCycle = grounded && direction !== 0 ? state.walkCycle + Math.abs(state.vx) * FIXED_STEP : 0;
	state.x = nextX;
	state.y = nextY;
	for (const shard of room.shards) if (Math.hypot(nextX - shard.x, nextY - shard.y) < .82 && game.collect(shard.id)) events.push("collect");
	if (nextY < room.bounds.killY) return die(state, game, events, "GRAVITY REMAINS LEGACY INFRASTRUCTURE");
	for (const hazard of room.hazards) if (Math.abs(nextX - hazard.x) < hazard.width / 2 + .3 && nextY - .72 < hazard.y + .55) return die(state, game, events, "NULL POINTER UNDERFOOT");
	for (const guardian of room.guardians) {
		const gx = guardianX(guardian, state.seconds);
		const nearestX = clamp(gx, nextX - PLAYER_HALF_WIDTH, nextX + PLAYER_HALF_WIDTH);
		const nearestY = clamp(guardian.y, nextY - PLAYER_HALF_HEIGHT, nextY + PLAYER_HALF_HEIGHT);
		if (Math.hypot(gx - nearestX, guardian.y - nearestY) < guardian.radius) return die(state, game, events, GUARDIAN_REASONS[guardian.kind] ?? GUARDIAN_REASONS.manager);
	}
	const nearGate = Math.hypot(nextX - room.exit.x, nextY - room.exit.y) < GATE_RADIUS;
	const outstanding = room.shards.length - game.roomCollectedCount();
	if (nearGate && outstanding === 0) {
		game.setPlayerX(nextX);
		const result = game.clearRoom();
		if (result === "won") events.push("win");
		else if (result === "routing") events.push("route");
		return events;
	}
	if (nearGate && !state.gateWasNear && outstanding > 0) {
		game.denyGate(outstanding);
		events.push("denied");
	}
	state.gateWasNear = nearGate;
	state.subSteps += 1;
	if (state.subSteps >= 6) {
		state.subSteps = 0;
		game.tick(.1);
		game.setPlayerX(nextX);
		if (game.latency() <= .01) return die(state, game, events, "LATENCY BUDGET LIQUIDATED");
	}
	return events;
}
function landsOn(surface, nextX, nextY, previousBottom) {
	const top = surface.y + surface.height / 2;
	const left = surface.x - surface.width / 2;
	const right = surface.x + surface.width / 2;
	const overlaps = nextX + .3 > left && nextX - .3 < right;
	const nextBottom = nextY - PLAYER_HALF_HEIGHT;
	return overlaps && previousBottom >= top - .08 && nextBottom <= top + .08;
}
function die(state, game, events, reason) {
	game.die(reason);
	resetEngineState(state, state.roomIndex);
	events.push("die");
	return events;
}
LATENCY_DRAIN * .1;
var CANDIDATE_MACROS = [];
for (const dir of [
	1,
	-1,
	0
]) for (const jump of [
	0,
	4,
	9,
	14,
	18,
	24
]) for (const steps of [
	8,
	16,
	28,
	40,
	60
]) CANDIDATE_MACROS.push([
	Math.max(steps, jump),
	dir,
	jump
]);
CANDIDATE_MACROS.push([
	30,
	0,
	0
], [
	60,
	0,
	0
], [
	90,
	0,
	0
]);
var REFINE_MACROS = [];
for (const dir of [
	1,
	-1,
	0
]) for (const [steps, jump] of [
	[16, 0],
	[28, 18],
	[9, 9],
	[28, 0],
	[60, 24]
]) REFINE_MACROS.push([
	steps,
	dir,
	jump
]);
REFINE_MACROS.push([
	20,
	0,
	0
], [
	40,
	0,
	0
]);
function planNextRoute(currentRoomId, completedRooms) {
	const completed = new Set(completedRooms);
	const othersDone = ROOMS.every((room) => room.id === FINAL_ROOM_ID || completed.has(room.id));
	const isGoal = othersDone ? (id) => id === FINAL_ROOM_ID : (id) => id !== FINAL_ROOM_ID && !completed.has(id);
	const queue = [[currentRoomId]];
	const seen = /* @__PURE__ */ new Set([currentRoomId]);
	while (queue.length) {
		const path = queue.shift();
		for (const next of WORLD_GRAPH[path.at(-1)] ?? []) {
			if (seen.has(next)) continue;
			if (!othersDone && next === FINAL_ROOM_ID) continue;
			const nextPath = [...path, next];
			if (isGoal(next)) return nextPath[1];
			seen.add(next);
			queue.push(nextPath);
		}
	}
	return WORLD_GRAPH[currentRoomId]?.[0] ?? null;
}
function createAutopilotController(lessons) {
	const offsetsByRoom = /* @__PURE__ */ new Map();
	let routeDelay = 0;
	function macroAt(roomId, stepIndex) {
		const lesson = lessons?.rooms?.[roomId];
		if (!lesson) return null;
		let offsets = offsetsByRoom.get(roomId);
		if (!offsets) {
			offsets = [];
			let total = 0;
			for (const macro of lesson.trace) {
				offsets.push(total);
				total += macro[0];
			}
			offsetsByRoom.set(roomId, offsets);
		}
		for (let i = offsets.length - 1; i >= 0; i -= 1) if (stepIndex >= offsets[i]) {
			const macro = lesson.trace[i];
			const local = stepIndex - offsets[i];
			return local < macro[0] ? {
				macro,
				local
			} : null;
		}
		return null;
	}
	return {
		applyStep(engine, controls) {
			controls.wildcardHeld = false;
			controls.wildcardQueued = false;
			const roomId = ROOMS[engine.roomIndex].id;
			const hit = macroAt(roomId, Math.round(engine.seconds / FIXED_STEP));
			if (!hit) {
				controls.left = false;
				controls.right = false;
				controls.jumpHeld = false;
				controls.jumpQueued = false;
				return;
			}
			const [, dir, jump] = hit.macro;
			controls.left = dir === -1;
			controls.right = dir === 1;
			controls.jumpHeld = hit.local < jump;
			controls.jumpQueued = hit.local === 0 && jump > 0;
		},
		routeTick(store) {
			if (store.phase !== "routing") {
				routeDelay = 0;
				return;
			}
			routeDelay += 1;
			if (routeDelay < 24) return;
			routeDelay = 0;
			const next = planNextRoute(ROOMS[store.roomIndex].id, store.completedRooms);
			if (next) store.chooseRoute(next);
		}
	};
}
//#endregion
//#region app/game/lessons.mjs
var LESSONS = Object.freeze({
	"version": 1,
	"rooms": {
		"p01-asymmetric-advantage": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					4
				],
				[
					28,
					1,
					0
				],
				[
					28,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					40,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 298
		},
		"p02-the-wildcard": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					28,
					1,
					18
				],
				[
					14,
					1,
					14
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					0
				],
				[
					40,
					1,
					9
				]
			],
			"attempts": 1,
			"steps": 432
		},
		"p03-compute-is-policy": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					16,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					1,
					4
				],
				[
					16,
					0,
					0
				],
				[
					16,
					1,
					4
				],
				[
					16,
					0,
					0
				],
				[
					18,
					1,
					18
				],
				[
					90,
					0,
					0
				],
				[
					16,
					0,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					28,
					1,
					4
				],
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					14,
					0,
					14
				],
				[
					14,
					1,
					14
				],
				[
					60,
					1,
					0
				],
				[
					14,
					1,
					14
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 605
		},
		"p04-failure-is-data": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					60,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					14,
					0,
					14
				],
				[
					28,
					1,
					0
				],
				[
					28,
					1,
					9
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					16,
					1,
					0
				],
				[
					18,
					1,
					18
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					9
				],
				[
					16,
					-1,
					0
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					14,
					0,
					14
				],
				[
					8,
					0,
					4
				],
				[
					90,
					0,
					0
				],
				[
					60,
					1,
					14
				],
				[
					40,
					1,
					24
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 636
		},
		"p05-prompt-over-pedigree": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					14
				],
				[
					60,
					1,
					14
				],
				[
					16,
					1,
					14
				],
				[
					9,
					1,
					9
				],
				[
					60,
					1,
					4
				],
				[
					28,
					0,
					0
				],
				[
					60,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					9,
					1,
					9
				],
				[
					8,
					0,
					0
				]
			],
			"attempts": 1,
			"steps": 334
		},
		"p06-entropy-is-a-feature": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					60,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					18,
					1,
					18
				],
				[
					40,
					0,
					0
				],
				[
					40,
					1,
					9
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					4
				],
				[
					16,
					0,
					0
				],
				[
					24,
					0,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					16,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					16,
					0,
					0
				],
				[
					28,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 535
		},
		"p07-the-latency-tax": {
			"trace": [
				[
					28,
					-1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					24
				],
				[
					14,
					-1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					28,
					-1,
					0
				],
				[
					28,
					-1,
					24
				],
				[
					40,
					-1,
					0
				],
				[
					40,
					-1,
					0
				]
			],
			"attempts": 1,
			"steps": 298
		},
		"p08-inference-over-permission": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					28,
					1,
					18
				],
				[
					28,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					4
				],
				[
					24,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 446
		},
		"p09-the-pareto-prompt": {
			"trace": [
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					24
				],
				[
					40,
					-1,
					24
				],
				[
					9,
					-1,
					9
				],
				[
					16,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					-1,
					24
				],
				[
					18,
					-1,
					18
				],
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					28,
					0,
					0
				],
				[
					14,
					-1,
					14
				],
				[
					16,
					0,
					4
				],
				[
					40,
					-1,
					0
				],
				[
					8,
					0,
					0
				],
				[
					16,
					-1,
					4
				],
				[
					60,
					-1,
					0
				],
				[
					16,
					0,
					9
				],
				[
					16,
					-1,
					0
				]
			],
			"attempts": 1,
			"steps": 457
		},
		"p10-attention-is-the-new-oil": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					28,
					1,
					18
				],
				[
					16,
					1,
					9
				],
				[
					8,
					0,
					0
				],
				[
					9,
					-1,
					9
				],
				[
					24,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					24,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					16,
					-1,
					0
				],
				[
					16,
					1,
					0
				],
				[
					9,
					0,
					9
				],
				[
					28,
					1,
					4
				],
				[
					40,
					1,
					4
				],
				[
					40,
					1,
					18
				]
			],
			"attempts": 1,
			"steps": 476
		},
		"p11-hallucinations-are-hypotheses": {
			"trace": [
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					14
				],
				[
					60,
					-1,
					14
				],
				[
					16,
					-1,
					14
				],
				[
					9,
					-1,
					9
				],
				[
					60,
					-1,
					4
				],
				[
					18,
					-1,
					18
				],
				[
					60,
					-1,
					24
				]
			],
			"attempts": 1,
			"steps": 299
		},
		"p12-vram-is-destiny": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					40,
					1,
					24
				],
				[
					16,
					1,
					0
				],
				[
					16,
					1,
					0
				],
				[
					28,
					1,
					14
				],
				[
					40,
					1,
					9
				],
				[
					40,
					1,
					4
				],
				[
					60,
					1,
					24
				]
			],
			"attempts": 1,
			"steps": 324
		},
		"p13-the-freeloader-s-paradox": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					4
				],
				[
					28,
					1,
					0
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					4
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 294
		},
		"p14-context-windows-are-worldviews": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					28,
					1,
					18
				],
				[
					14,
					1,
					14
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					28,
					1,
					24
				],
				[
					16,
					1,
					14
				],
				[
					60,
					0,
					0
				],
				[
					60,
					1,
					4
				],
				[
					18,
					1,
					18
				],
				[
					8,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 514
		},
		"p15-ship-the-prototype": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					16,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					14
				],
				[
					14,
					0,
					14
				],
				[
					14,
					1,
					14
				],
				[
					9,
					0,
					9
				],
				[
					28,
					1,
					4
				],
				[
					40,
					-1,
					4
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					0
				],
				[
					60,
					1,
					18
				],
				[
					8,
					1,
					0
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 484
		},
		"p16-fork-everything": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					60,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					-1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					28,
					1,
					9
				],
				[
					28,
					1,
					0
				],
				[
					9,
					0,
					9
				],
				[
					40,
					1,
					4
				],
				[
					28,
					1,
					4
				],
				[
					40,
					1,
					24
				]
			],
			"attempts": 1,
			"steps": 441
		},
		"p17-noise-is-signal-at-volume": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					14
				],
				[
					60,
					1,
					14
				],
				[
					16,
					1,
					14
				],
				[
					9,
					1,
					9
				],
				[
					60,
					1,
					4
				],
				[
					60,
					1,
					4
				],
				[
					9,
					1,
					9
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 298
		},
		"p18-the-model-doesn-t-care": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					60,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					14
				],
				[
					60,
					1,
					14
				]
			],
			"attempts": 1,
			"steps": 305
		},
		"p19-compounding-curiosity": {
			"trace": [
				[
					28,
					-1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					24
				],
				[
					14,
					-1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					28,
					-1,
					0
				],
				[
					28,
					-1,
					24
				],
				[
					28,
					-1,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					8,
					-1,
					0
				]
			],
			"attempts": 1,
			"steps": 294
		},
		"p20-the-api-tax": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					28,
					1,
					18
				],
				[
					28,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					4
				],
				[
					24,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 446
		},
		"p21-satire-as-armour": {
			"trace": [
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					24
				],
				[
					40,
					-1,
					24
				],
				[
					9,
					-1,
					9
				],
				[
					16,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					-1,
					24
				],
				[
					18,
					-1,
					18
				],
				[
					28,
					-1,
					4
				],
				[
					14,
					-1,
					14
				],
				[
					24,
					0,
					24
				],
				[
					40,
					-1,
					4
				],
				[
					9,
					-1,
					9
				],
				[
					40,
					-1,
					9
				],
				[
					40,
					-1,
					9
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 410
		},
		"p22-temperature-is-taste": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					60,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					28,
					1,
					18
				],
				[
					16,
					1,
					0
				],
				[
					18,
					1,
					18
				],
				[
					18,
					1,
					18
				],
				[
					16,
					1,
					14
				],
				[
					28,
					1,
					0
				],
				[
					60,
					0,
					24
				],
				[
					60,
					1,
					9
				],
				[
					40,
					1,
					24
				]
			],
			"attempts": 1,
			"steps": 480
		},
		"p23-workflows-over-tools": {
			"trace": [
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					14
				],
				[
					60,
					-1,
					14
				],
				[
					16,
					-1,
					14
				],
				[
					9,
					-1,
					9
				],
				[
					16,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					60,
					-1,
					9
				],
				[
					28,
					-1,
					4
				]
			],
			"attempts": 1,
			"steps": 329
		},
		"p24-own-your-weights": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					40,
					1,
					24
				],
				[
					16,
					1,
					0
				],
				[
					16,
					1,
					0
				],
				[
					28,
					1,
					14
				],
				[
					8,
					-1,
					0
				],
				[
					8,
					0,
					4
				],
				[
					14,
					0,
					14
				],
				[
					18,
					1,
					18
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					40,
					1,
					0
				],
				[
					14,
					0,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					4
				],
				[
					8,
					-1,
					0
				],
				[
					28,
					1,
					18
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 443
		},
		"p25-the-turing-bluff": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					4
				],
				[
					28,
					1,
					0
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					4
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 294
		},
		"p26-data-gravity": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					28,
					1,
					18
				],
				[
					14,
					1,
					14
				],
				[
					40,
					1,
					0
				],
				[
					40,
					1,
					24
				],
				[
					90,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					40,
					1,
					4
				]
			],
			"attempts": 1,
			"steps": 424
		},
		"p27-escape-velocity": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					16,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					14,
					1,
					14
				],
				[
					40,
					1,
					0
				],
				[
					28,
					1,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					28,
					0,
					18
				],
				[
					9,
					1,
					9
				],
				[
					14,
					0,
					14
				],
				[
					60,
					1,
					9
				]
			],
			"attempts": 1,
			"steps": 466
		},
		"p28-the-human-residual": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					60,
					1,
					24
				],
				[
					16,
					1,
					0
				],
				[
					40,
					1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					8,
					-1,
					4
				],
				[
					16,
					0,
					0
				],
				[
					28,
					1,
					14
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					90,
					0,
					0
				],
				[
					28,
					1,
					9
				],
				[
					28,
					1,
					0
				],
				[
					14,
					1,
					14
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 502
		},
		"p29-iterate-in-public": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					14
				],
				[
					60,
					1,
					14
				],
				[
					16,
					1,
					14
				],
				[
					9,
					1,
					9
				],
				[
					60,
					1,
					4
				],
				[
					40,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					18,
					0,
					18
				],
				[
					16,
					1,
					0
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 311
		},
		"p30-prompt-injection-is-persuasion": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					60,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					60,
					1,
					24
				],
				[
					18,
					0,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					9
				],
				[
					24,
					1,
					24
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 367
		},
		"p31-marginal-cost-zero": {
			"trace": [
				[
					28,
					-1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					24
				],
				[
					14,
					-1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					28,
					-1,
					0
				],
				[
					28,
					-1,
					24
				],
				[
					28,
					-1,
					0
				],
				[
					40,
					-1,
					4
				],
				[
					8,
					-1,
					0
				]
			],
			"attempts": 1,
			"steps": 294
		},
		"p32-the-latent-space-is-larger-than-the-map": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					16,
					1,
					14
				],
				[
					18,
					1,
					18
				],
				[
					60,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					4
				],
				[
					24,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					40,
					1,
					9
				]
			],
			"attempts": 1,
			"steps": 416
		},
		"p33-embrace-the-uncanny": {
			"trace": [
				[
					10,
					0,
					0
				],
				[
					28,
					-1,
					18
				],
				[
					8,
					0,
					0
				],
				[
					28,
					-1,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					4
				],
				[
					14,
					0,
					14
				],
				[
					16,
					-1,
					9
				],
				[
					9,
					-1,
					9
				],
				[
					28,
					-1,
					18
				],
				[
					8,
					-1,
					0
				],
				[
					40,
					-1,
					14
				],
				[
					60,
					-1,
					4
				],
				[
					16,
					0,
					14
				],
				[
					28,
					-1,
					0
				],
				[
					24,
					-1,
					24
				],
				[
					24,
					-1,
					24
				],
				[
					8,
					-1,
					4
				],
				[
					8,
					1,
					0
				],
				[
					60,
					-1,
					14
				]
			],
			"attempts": 3,
			"steps": 465
		},
		"p34-energy-budget": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					16,
					1,
					14
				],
				[
					40,
					0,
					0
				],
				[
					60,
					0,
					0
				],
				[
					28,
					1,
					18
				],
				[
					16,
					1,
					0
				],
				[
					18,
					1,
					18
				],
				[
					18,
					1,
					18
				],
				[
					16,
					1,
					14
				],
				[
					24,
					1,
					24
				],
				[
					8,
					1,
					0
				],
				[
					60,
					1,
					4
				],
				[
					40,
					1,
					18
				]
			],
			"attempts": 1,
			"steps": 420
		},
		"p35-agents-over-apps": {
			"trace": [
				[
					28,
					-1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					-1,
					14
				],
				[
					60,
					-1,
					14
				],
				[
					16,
					-1,
					14
				],
				[
					9,
					-1,
					9
				],
				[
					60,
					-1,
					9
				],
				[
					60,
					-1,
					9
				],
				[
					28,
					-1,
					4
				]
			],
			"attempts": 1,
			"steps": 309
		},
		"p36-memetics-over-marketing": {
			"trace": [
				[
					5,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					40,
					1,
					24
				],
				[
					16,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					28,
					1,
					4
				],
				[
					8,
					0,
					0
				],
				[
					16,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					16,
					1,
					0
				],
				[
					40,
					0,
					0
				],
				[
					28,
					1,
					18
				],
				[
					16,
					1,
					4
				],
				[
					8,
					1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					18,
					0,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					9,
					0,
					9
				],
				[
					9,
					0,
					9
				],
				[
					40,
					1,
					9
				],
				[
					28,
					1,
					4
				]
			],
			"attempts": 2,
			"steps": 505
		},
		"p37-the-stack-is-the-strategy": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					14,
					1,
					14
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					4
				],
				[
					28,
					1,
					0
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					40,
					1,
					4
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 294
		},
		"p38-synthetic-majority": {
			"trace": [
				[
					28,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					18
				],
				[
					40,
					1,
					9
				],
				[
					28,
					1,
					4
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					18
				],
				[
					8,
					0,
					0
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					14
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					28,
					1,
					24
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 396
		},
		"p39-permission-is-deprecated": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					24
				],
				[
					40,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					16,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					16,
					0,
					0
				],
				[
					14,
					1,
					14
				],
				[
					16,
					0,
					9
				],
				[
					40,
					1,
					0
				],
				[
					16,
					0,
					0
				],
				[
					18,
					1,
					18
				],
				[
					28,
					1,
					9
				],
				[
					8,
					1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					-1,
					4
				],
				[
					8,
					-1,
					0
				],
				[
					9,
					0,
					9
				],
				[
					8,
					0,
					0
				],
				[
					16,
					0,
					0
				],
				[
					60,
					1,
					14
				]
			],
			"attempts": 1,
			"steps": 576
		},
		"p40-feedback-loops-are-flywheels": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					60,
					1,
					24
				],
				[
					16,
					1,
					0
				],
				[
					40,
					1,
					0
				],
				[
					24,
					1,
					24
				],
				[
					18,
					1,
					18
				],
				[
					8,
					0,
					0
				],
				[
					8,
					-1,
					0
				],
				[
					8,
					1,
					0
				],
				[
					8,
					-1,
					4
				],
				[
					16,
					0,
					0
				],
				[
					28,
					1,
					14
				],
				[
					28,
					1,
					24
				],
				[
					28,
					1,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					4
				],
				[
					16,
					0,
					0
				],
				[
					9,
					1,
					9
				],
				[
					28,
					1,
					4
				],
				[
					28,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					8,
					1,
					4
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 495
		},
		"p41-the-last-romantics": {
			"trace": [
				[
					28,
					1,
					14
				],
				[
					8,
					0,
					0
				],
				[
					40,
					1,
					14
				],
				[
					60,
					1,
					14
				],
				[
					16,
					1,
					14
				],
				[
					9,
					1,
					9
				],
				[
					60,
					1,
					4
				],
				[
					18,
					1,
					18
				],
				[
					60,
					1,
					18
				]
			],
			"attempts": 1,
			"steps": 299
		},
		"p42-largely-your-property-now": {
			"trace": [
				[
					24,
					1,
					24
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					28,
					1,
					0
				],
				[
					16,
					1,
					9
				],
				[
					60,
					1,
					24
				],
				[
					24,
					1,
					24
				],
				[
					9,
					1,
					9
				],
				[
					28,
					1,
					24
				],
				[
					40,
					1,
					0
				],
				[
					8,
					0,
					4
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					8,
					0,
					0
				],
				[
					9,
					0,
					9
				],
				[
					40,
					1,
					9
				],
				[
					24,
					1,
					24
				],
				[
					8,
					1,
					0
				]
			],
			"attempts": 1,
			"steps": 358
		}
	}
});
//#endregion
//#region app/game/driver.ts
var storeAdapter = {
	collect: (id) => useGameStore.getState().collect(id),
	die: (reason) => useGameStore.getState().die(reason),
	denyGate: (outstanding) => useGameStore.getState().denyGate(outstanding),
	clearRoom: () => useGameStore.getState().clearRoom(),
	tick: (seconds) => useGameStore.getState().tick(seconds),
	setPlayerX: (x) => useGameStore.getState().setPlayerX(x),
	latency: () => useGameStore.getState().latency,
	roomCollectedCount: () => {
		const state = useGameStore.getState();
		return ROOMS[state.roomIndex].shards.filter((shard) => state.collected.includes(shard.id)).length;
	},
	activateWildcard: () => useGameStore.getState().activateWildcard(),
	expireWildcard: () => useGameStore.getState().expireWildcard()
};
function playEvent(event) {
	switch (event) {
		case "jump":
			playSfx("jump");
			break;
		case "land":
			playSfx("land");
			break;
		case "collect":
			playSfx("receipt", { receiptCount: useGameStore.getState().banked });
			break;
		case "die":
			playSfx("death");
			break;
		case "denied":
			playSfx("denied");
			break;
		case "crumble":
			playSfx("crumble");
			break;
		case "warning":
			playSfx("warning");
			break;
		case "wildcard":
			playSfx("wildcard");
			break;
		case "route":
			playSfx("route");
			break;
		case "win": playSfx("win");
	}
}
function createDriver() {
	const engine = createEngineState(useGameStore.getState().roomIndex);
	const autopilotController = createAutopilotController(LESSONS);
	let accumulator = 0;
	let observedRunSerial = useGameStore.getState().runSerial;
	let observedAutopilot = useGameStore.getState().autopilot;
	return {
		engine,
		frame(frameDelta) {
			let state = useGameStore.getState();
			if (state.autopilot) {
				autopilotController.routeTick({
					phase: state.phase,
					roomIndex: state.roomIndex,
					completedRooms: state.completedRooms,
					chooseRoute: (id) => useGameStore.getState().chooseRoute(id)
				});
				state = useGameStore.getState();
			}
			const autopilotEngaged = state.autopilot && !observedAutopilot && state.phase === "playing";
			if (state.phase === "playing" || !state.autopilot) observedAutopilot = state.autopilot;
			if (engine.roomIndex !== state.roomIndex || observedRunSerial !== state.runSerial || autopilotEngaged) {
				accumulator = 0;
				resetEngineState(engine, state.roomIndex);
				observedRunSerial = state.runSerial;
			}
			if (useGameStore.getState().phase !== "playing") return;
			accumulator = Math.min(accumulator + Math.min(frameDelta, .05), FIXED_STEP * 5);
			let steps = 0;
			while (accumulator >= .016666666666666666 && steps < 5) {
				accumulator -= FIXED_STEP;
				steps += 1;
				if (useGameStore.getState().autopilot) autopilotController.applyStep(engine, controls);
				const events = stepEngine(engine, controls, storeAdapter);
				for (const event of events) playEvent(event);
				if (events.includes("die") || events.includes("route") || events.includes("win")) {
					accumulator = 0;
					break;
				}
			}
		},
		resetForRun() {
			accumulator = 0;
			const state = useGameStore.getState();
			observedRunSerial = state.runSerial;
			resetEngineState(engine, state.roomIndex);
		}
	};
}
var sharedDriver = null;
function getDriver() {
	sharedDriver ??= createDriver();
	return sharedDriver;
}
//#endregion
//#region app/game/sprites.mjs
var FREELOADER_FRAMES = Object.freeze({
	idle: [
		"................",
		"....kkkkkkk.....",
		"...kcccccccck...",
		"..kcccccccccck..",
		"..kCCCCCCCCCCk..",
		"...kffffffffk...",
		"...kfeeekeefk...",
		"...kffffffffk...",
		"....kffffffk....",
		"...kbbbbbbbbk...",
		"..kbbdbbbbdbbk..",
		"..ksbbbbbbbbsk..",
		"...kbbbbbbbbk...",
		"....kddkkddk....",
		"....kgg..ggk....",
		"....kkk..kkk...."
	],
	walk1: [
		"................",
		"....kkkkkkk.....",
		"...kcccccccck...",
		"..kcccccccccck..",
		"..kCCCCCCCCCCk..",
		"...kffffffffk...",
		"...kfeeekeefk...",
		"...kffffffffk...",
		"....kffffffk....",
		"...kbbbbbbbbk...",
		"..kbbdbbbbdbbk..",
		"..ksbbbbbbbbsk..",
		"...kbbbbbbbbk...",
		"...kddk..kddk...",
		"..kgg......ggk..",
		"..kkk......kkk.."
	],
	walk2: [
		"................",
		"....kkkkkkk.....",
		"...kcccccccck...",
		"..kcccccccccck..",
		"..kCCCCCCCCCCk..",
		"...kffffffffk...",
		"...kfeeekeefk...",
		"...kffffffffk...",
		"....kffffffk....",
		"...kbbbbbbbbk...",
		"..kbbdbbbbdbbk..",
		"..ksbbbbbbbbsk..",
		"...kbbbbbbbbk...",
		".....kddkddk....",
		".....kggggk.....",
		".....kkkkkk....."
	],
	jump: [
		"................",
		"....kkkkkkk.....",
		"...kcccccccck...",
		"..kcccccccccck..",
		"..kCCCCCCCCCCk..",
		"...kffffffffk...",
		"...kfeeekeefk...",
		"...kffffffffk...",
		"....kffffffk....",
		"..s.kbbbbbbk.s..",
		"..kbbdbbbbdbbk..",
		"...kbbbbbbbbk...",
		"...kbbbbbbbbk...",
		"....kddkkddk....",
		"...kgg....ggk...",
		"................"
	]
});
var GUARDIAN_SPRITES = Object.freeze({
	captcha: [
		"......kkkk......",
		"......kcck......",
		"...kkkkkkkkkk...",
		"..kcccccccccck..",
		"..kcwwkwwkwwck..",
		"..kcwtkwwkwwck..",
		"..kcccccccccck..",
		"..kcwwkwwkwwck..",
		"..kcwwkwtkwwck..",
		"..kcccccccccck..",
		"..kcwwkwwkwwck..",
		"..kcwwkwwkwtck..",
		"..kcccccccccck..",
		"...kkkkkkkkkk...",
		"....kc....ck....",
		"....kk....kk...."
	],
	clip: [
		"....kkkkkkkk....",
		"...kmmmmmmmmk...",
		"..kmm......mmk..",
		"..km..kkkk..mk..",
		"..km.kwwkwwkmk..",
		"..km.kwpkwpkmk..",
		"..km..kkkk..mk..",
		"..kmm......mmk..",
		"..kmmmkkkkmmmk..",
		"..km.kmmmmk.mk..",
		"..km.km..mk.mk..",
		"..km.kmmmmk.mk..",
		"..kmm.kkkk.mmk..",
		"...kmmmmmmmmk...",
		"....kkkkkkkk....",
		"................"
	],
	cookie: [
		".....kkkkkk.....",
		"....koooooOk....",
		"...koooooooOk...",
		"..koohooooohOk..",
		"..koookwwkooOk..",
		"..koookwpkooOk..",
		"..koooooohoOk...",
		"..khoooooooOOk..",
		"..koooohooooOk..",
		"...koooooooOk...",
		"...kOoooooOOk...",
		"....kOOOOOOk....",
		".....kkkkkk.....",
		"................",
		"................",
		"................"
	],
	orb: [
		".....kkkkkk.....",
		"....kvvvvvVk....",
		"...kvvvvvvvVk...",
		"..kvvkkkkkkvVk..",
		"..kvkwwwwwwkVk..",
		"..kvkwwppwwkVk..",
		"..kvkwwppwwkVk..",
		"..kvkwwwwwwkVk..",
		"..kvvkkkkkkvVk..",
		"...kvvvvvvvVk...",
		"....kvvvvvVk....",
		".....kkkkkk.....",
		"......k..k......",
		".....k....k.....",
		"................",
		"................"
	],
	manager: [
		"....kkkkkkkk....",
		"...kaaaaaaaak...",
		"..kaaaaaaaaaak..",
		"..kaapaaaapaak..",
		"..kaaaaaaaaaak..",
		"..kaakkkkkkaak..",
		"..kaaaaaaaaaak..",
		"...kwwttttwwk...",
		"...kaakttkaak...",
		"...kaakttkaak...",
		"...kaaakkaaak...",
		"...kaaaaaaaak...",
		"....kkkkkkkk....",
		"................",
		"................",
		"................"
	]
});
var SHARD_SPRITE = Object.freeze([
	"................",
	".......kk.......",
	"......keek......",
	".....keeeek.....",
	"....kewweeek....",
	"...keewweeeek...",
	"...keeeeeEEEk...",
	"....keeeeEEk....",
	".....keeEEk.....",
	"......kEEk......",
	".......kk.......",
	"................",
	"................",
	"................",
	"................",
	"................"
]);
var TILE_SPRITES = Object.freeze({
	solid: [
		"tttttttttttttttt",
		"bbbbbbbbbbbbbbbb",
		"bsbbbbsbbbbsbbbb",
		"bbbbbbbbbbbbbbbb",
		"bbbsbbbbsbbbbsbb",
		"bbbbbbbbbbbbbbbb",
		"sbbbbsbbbbsbbbbs",
		"kkkkkkkkkkkkkkkk"
	],
	crumble: [
		"tttttttttttttttt",
		"bbkbbbbbbkbbbbbb",
		"bbbkbbbbkbbbbkbb",
		"bkbbkbbkbbbkbbbb",
		"bbbbbkkbbbbbkbbb",
		"bbkbbbbkbbkbbbbb",
		"sbbksbbbksbbksbb",
		"kkkkkkkkkkkkkkkk"
	],
	conveyor: [
		"tttttttttttttttt",
		"aabbaabbaabbaabb",
		"baabbaabbaabbaab",
		"bbaabbaabbaabbaa",
		"bbbbbbbbbbbbbbbb",
		"sbbbbsbbbbsbbbbs",
		"bbbbbbbbbbbbbbbb",
		"kkkkkkkkkkkkkkkk"
	],
	phantom: [
		"t.t.t.t.t.t.t.t.",
		".b.b.b.b.b.b.b.b",
		"b.b.b.b.b.b.b.b.",
		".b.b.b.b.b.b.b.b",
		"b.b.b.b.b.b.b.b.",
		".b.b.b.b.b.b.b.b",
		"s.s.s.s.s.s.s.s.",
		"k.k.k.k.k.k.k.k."
	]
});
var SPRITE_PALETTES = Object.freeze({
	freeloader: {
		k: "#081008",
		c: "#ffb000",
		C: "#b87700",
		f: "#ece4cf",
		e: "#00ff99",
		b: "#1d6e54",
		d: "#0f3d2e",
		s: "#ffc891",
		g: "#39424e"
	},
	captcha: {
		k: "#04121a",
		c: "#00c9ff",
		w: "#eaf6ff",
		t: "#00ff99"
	},
	clip: {
		k: "#10131c",
		m: "#cfd6e6",
		w: "#ffffff",
		p: "#10131c"
	},
	cookie: {
		k: "#1c1006",
		o: "#c98a3d",
		O: "#9a6226",
		h: "#4a2c12",
		w: "#ffffff",
		p: "#1c1006"
	},
	orb: {
		k: "#0e081c",
		v: "#9d7cff",
		V: "#5b3fb0",
		w: "#ffffff",
		p: "#1c1030"
	},
	manager: {
		k: "#1c1206",
		a: "#ffb000",
		A: "#b87700",
		w: "#ffffff",
		t: "#7a1d3f",
		p: "#1c1206"
	},
	shard: {
		k: "#03301f",
		e: "#00ff99",
		E: "#00b36b",
		w: "#e6ffe6"
	}
});
function tilePalette(theme) {
	return {
		t: theme.accent,
		b: theme.platform,
		s: shadeHex(theme.platform, .55),
		a: theme.accent,
		k: "#04060a"
	};
}
function shadeHex(hex, factor) {
	const value = parseInt(hex.slice(1), 16);
	const channel = (shift) => Math.round((value >> shift & 255) * factor);
	return `#${(channel(16) << 16 | channel(8) << 8 | channel(0)).toString(16).padStart(6, "0")}`;
}
function spriteToCanvas(rows, palette) {
	if (typeof document === "undefined") return null;
	const canvas = document.createElement("canvas");
	canvas.width = rows[0].length;
	canvas.height = rows.length;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	for (let y = 0; y < rows.length; y += 1) for (let x = 0; x < rows[y].length; x += 1) {
		const key = rows[y][x];
		if (key === ".") continue;
		ctx.fillStyle = palette[key];
		ctx.fillRect(x, y, 1, 1);
	}
	return canvas;
}
//#endregion
export { TILE_SPRITES as a, getDriver as c, SPRITE_PALETTES as i, BELT_SPEED as l, GUARDIAN_SPRITES as n, spriteToCanvas as o, SHARD_SPRITE as r, tilePalette as s, FREELOADER_FRAMES as t, phantomStateAt as u };
