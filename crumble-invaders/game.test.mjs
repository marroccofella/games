import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const gameDirectory = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(gameDirectory, "index.html");
const html = readFileSync(gamePath, "utf8");
const engineBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];

assert.equal(engineBlocks.length, 1, "the game must contain exactly one inline engine script");
const script = engineBlocks[0][1];
assert.match(script, /function\s+gameLoop\s*\(/, "the inline script must contain the game engine");

function fakeClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
  };
}

function fakeElement(id, initialClasses = []) {
  const attributes = new Map();
  const listeners = new Map();
  return {
    id,
    listeners,
    classList: fakeClassList(initialClasses),
    style: {},
    textContent: "",
    innerHTML: "",
    focused: false,
    focus() { this.focused = true; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, listener) {
      const registered = listeners.get(type) ?? [];
      registered.push(listener);
      listeners.set(type, registered);
    },
  };
}

function audioNode(extra = {}) {
  return {
    connect(target) { return target; },
    disconnect() {},
    start() {},
    stop() {},
    ...extra,
  };
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.sampleRate = 8000;
    this.state = "running";
    this.bufferCreations = 0;
    this.oscillatorRamps = [];
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  createOscillator() {
    const rampTargets = this.oscillatorRamps;
    return audioNode({
      frequency: {
        setValueAtTime() {},
        exponentialRampToValueAtTime(value) { rampTargets.push(value); },
      },
      type: "sine",
    });
  }
  createGain() {
    return audioNode({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
  }
  createBuffer(_channels, length) {
    this.bufferCreations += 1;
    return { getChannelData: () => new Float32Array(Math.ceil(length)) };
  }
  createBufferSource() { return audioNode({ buffer: null }); }
  createBiquadFilter() {
    return audioNode({
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      type: "lowpass",
    });
  }
}

function createHarness({ width = 1024, height = 768 } = {}) {
  const elements = new Map();
  const documentListeners = new Map();
  const canvasListeners = new Map();
  const windowListeners = new Map();
  const timers = new Map();
  const rafCallbacks = new Map();
  let nextTimerId = 1;
  let nextRafId = 1;

  const gradient = { addColorStop() {} };
  const drawingContext = new Proxy({
    createLinearGradient: () => gradient,
    setTransform() {},
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });

  const canvas = fakeElement("game-canvas");
  canvas.getContext = () => drawingContext;
  canvas.addEventListener = (type, listener) => canvasListeners.set(type, listener);
  elements.set("game-canvas", canvas);
  elements.set("gameover-overlay", fakeElement("gameover-overlay", ["hidden"]));
  elements.set("pause-overlay", fakeElement("pause-overlay", ["hidden"]));

  const element = (id) => {
    if (!elements.has(id)) elements.set(id, fakeElement(id));
    return elements.get(id);
  };
  const addListener = (registry, type, listener) => {
    const listeners = registry.get(type) ?? [];
    listeners.push(listener);
    registry.set(type, listeners);
  };

  const document = {
    body: fakeElement("body"),
    getElementById: element,
    createElement(tagName) {
      const created = fakeElement(`created-${tagName}`);
      if (tagName === "canvas") created.getContext = () => drawingContext;
      return created;
    },
    querySelector(selector) {
      if (selector === "canvas") return canvas;
      if (selector === "#gameover-overlay h1") return element("gameover-title");
      if (selector === "#gameover-overlay .subtitle") return element("gameover-subtitle");
      return null;
    },
    addEventListener(type, listener) { addListener(documentListeners, type, listener); },
  };

  const context = {
    console,
    document,
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    location: { href: "http://example.test/games/crumble-invaders/" },
    performance: { now: () => 0 },
    AudioContext: FakeAudioContext,
    webkitAudioContext: FakeAudioContext,
    setTimeout(callback, delay = 0) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) {
      const id = nextRafId++;
      rafCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { rafCallbacks.delete(id); },
    addEventListener(type, listener) { addListener(windowListeners, type, listener); },
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(script, context, { filename: gamePath });

  return {
    canvasListeners,
    documentListeners,
    elements,
    rafCallbacks,
    timers,
    windowListeners,
    run(expression) { return vm.runInContext(expression, context); },
    setViewport(nextWidth, nextHeight) {
      context.innerWidth = nextWidth;
      context.innerHeight = nextHeight;
    },
  };
}

function safeInvaderSource() {
  return `({
    x: W / 2, y: playTop + 30, char: '🦀', type: 'crust', hp: 5, maxHp: 5,
    size: 24, poopTimer: 1e9, alive: true, bondProgress: 0, letterIndex: 0
  })`;
}

test("every sound-effect call has a matching definition", () => {
  const called = [...script.matchAll(/\b(sfx[A-Za-z]+)\s*\(/g)].map((match) => match[1]);
  const defined = new Set([...script.matchAll(/function\s+(sfx[A-Za-z]+)/g)].map((match) => match[1]));
  const missing = [...new Set(called)].filter((name) => !defined.has(name));
  assert.deepEqual(missing, []);
});

test("using a collected reboot grenade does not crash the update loop", () => {
  const game = createHarness();
  game.run("startGame(); rebootCharges = 1; keys.KeyG = true");
  assert.doesNotThrow(() => game.run("update(1)"));
});

test("restarting owns exactly one scheduled game loop", () => {
  const game = createHarness();
  game.run("startGame(); startGame()");
  const gameLoops = [...game.rafCallbacks.values()].filter((callback) => callback.name === "gameLoop");
  assert.equal(gameLoops.length, 1);
});

test("a run never schedules a forced navigation timer", () => {
  const game = createHarness();
  game.run("startGame(); startGame()");
  const forcedExitTimers = [...game.timers.values()].filter(({ delay }) => delay === 180000);
  assert.equal(forcedExitTimers.length, 0);
});

test("offscreen bullets, poops, and powerups are culled on every boundary", () => {
  const game = createHarness();
  game.run(`startGame();
    invaders = [${safeInvaderSource()}]; invSpeed = 0; toilets = []; allies = [];
    bullets = [{x: -40, y: 100, vx: -2, vy: 1, size: 10, ally: true}];
    poops = [{x: 100, y: H + 40, vy: 1, size: 10, rot: 0}];
    powerups = [{x: W + 40, y: 100, vy: 0, size: 10, type: 'kookie', char: '🍪'}];
    update(1);`);
  assert.equal(game.run("bullets.length"), 0);
  assert.equal(game.run("poops.length"), 0);
  assert.equal(game.run("powerups.length"), 0);
});

test("one poop can be consumed by only one collision owner", () => {
  const game = createHarness();
  game.run(`startGame();
    invaders = [${safeInvaderSource()}]; invSpeed = 0; toilets = []; bullets = [];
    player.invincible = 0; lives = 3;
    allies = [{x: player.x, y: player.y, char: '🦀', size: 20, fireTimer: 1e9, vx: 0}];
    poops = [
      {x: player.x, y: player.y, vy: 0, size: 10, rot: 0},
      {x: 10, y: 10, vy: 0, size: 10, rot: 0}
    ];
    update(1);`);
  assert.equal(game.run("poops.length"), 1);
});

test("invader descent updates the whole formation before game over", () => {
  const game = createHarness();
  game.run(`startGame();
    const loseY = playTop + playH * 0.70;
    invaders = [${safeInvaderSource()}, ${safeInvaderSource()}];
    for (const inv of invaders) { inv.x = 0; inv.y = loseY; }
    invSpeed = 1; update(1);`);
  assert.deepEqual(game.run("invaders.map(inv => inv.y)"), game.run("invaders.map(() => invaders[0].y)"));
});

test("edge reversal preserves rigid formation spacing", () => {
  const game = createHarness();
  game.run(`startGame();
    invaders = [${safeInvaderSource()}, ${safeInvaderSource()}];
    invaders[0].x = W - 10; invaders[1].x = W - 110;
    invaders[0].y = invaders[1].y = playTop + 50;
    invDir = 1; invSpeed = 1;`);
  const before = game.run("invaders[0].x - invaders[1].x");
  game.run("update(1)");
  assert.equal(game.run("invaders[0].x - invaders[1].x"), before);
});

test("Escape pauses a live run instead of navigating away", () => {
  const game = createHarness();
  game.run("startGame()");
  const before = game.run("location.href");
  const handler = game.documentListeners.get("keydown")?.[0];
  assert.ok(handler, "keydown handler must be registered");
  handler({ code: "Escape", preventDefault() {} });
  assert.equal(game.run("location.href"), before);
  assert.equal(game.run("gameState"), "paused");
});

test("resize keeps the player inside the new play area", () => {
  const game = createHarness({ width: 390, height: 844 });
  game.run("startGame()");
  game.setViewport(844, 390);
  game.run("resize()");
  assert.ok(game.run("player.y <= H && player.y >= playTop"));
});

test("collision radii scale with the rendered sprites", () => {
  const game = createHarness({ width: 1600, height: 1200 });
  game.run(`startGame();
    invaders = [${safeInvaderSource()}]; invSpeed = 0; toilets = []; allies = []; bullets = [];
    player.invincible = 0; lives = 3;
    poops = [{x: player.x + player.size * 0.45, y: player.y, vy: 0, size: Math.round(22 * S), rot: 0}];
    update(1);`);
  assert.equal(game.run("lives"), 2);
});

test("passive ally income is elapsed-time based, not refresh-rate based", () => {
  function scoreAfterOneSecond(refreshRate) {
    const game = createHarness();
    game.run(`startGame();
      invaders = [${safeInvaderSource()}]; invSpeed = 0; toilets = []; poops = []; bullets = [];
      allies = [{x: player.x, y: player.y - 55, char: '🦀', size: 20, fireTimer: 1e9, vx: 0}];
      score = 0; frameCount = 0;`);
    for (let frame = 0; frame < refreshRate; frame++) {
      game.run(`frameCount++; update(${60 / refreshRate})`);
    }
    return game.run("score");
  }

  assert.equal(scoreAfterOneSecond(60), scoreAfterOneSecond(144));
});

test("lifting one touch preserves the other touch's action", () => {
  const game = createHarness({ width: 400, height: 700 });
  const touchStart = game.canvasListeners.get("touchstart");
  const touchEnd = game.canvasListeners.get("touchend");
  touchStart({
    preventDefault() {},
    changedTouches: [{ identifier: 1, clientX: 100 }, { identifier: 2, clientX: 350 }],
    touches: [{ identifier: 1, clientX: 100 }, { identifier: 2, clientX: 350 }],
    targetTouches: [{ identifier: 1, clientX: 100 }, { identifier: 2, clientX: 350 }],
  });
  touchEnd({
    preventDefault() {},
    changedTouches: [{ identifier: 2, clientX: 350 }],
    touches: [{ identifier: 1, clientX: 100 }],
    targetTouches: [{ identifier: 1, clientX: 100 }],
  });
  assert.equal(game.run("touchX"), 100);
  assert.equal(game.run("touchFire"), false);
});

test("an action-button finger cannot latch canvas autofire", () => {
  const game = createHarness({ width: 400, height: 700 });
  const touchStart = game.canvasListeners.get("touchstart");
  const touchEnd = game.canvasListeners.get("touchend");
  const canvasFinger = { identifier: 1, clientX: 100 };
  const actionFinger = { identifier: 9, clientX: 370 };
  touchStart({
    preventDefault() {},
    changedTouches: [canvasFinger],
    touches: [canvasFinger, actionFinger],
    targetTouches: [canvasFinger],
  });
  touchEnd({
    preventDefault() {},
    changedTouches: [canvasFinger],
    touches: [actionFinger],
    targetTouches: [],
  });
  assert.equal(game.run("touchFire"), false);
  assert.equal(game.run("touchX"), null);
});

test("every wave word has an explicit pixel-font glyph", () => {
  const game = createHarness();
  const unsupported = game.run("WAVE_WORDS.flatMap(({word}) => [...word].filter(ch => !FONT[ch]).map(ch => `${word}:${ch}`))");
  assert.equal(unsupported.length, 0, `unsupported glyphs: ${[...unsupported].join(", ")}`);
});

test("touch players are given Bond and Reboot controls", () => {
  assert.match(html, /aria-label=["']Bond nearest invader["']/i);
  assert.match(html, /aria-label=["']Use reboot charge["']/i);
});

test("restart clears deferred presentation and sound work from the previous run", () => {
  const game = createHarness();
  game.run("startGame()");
  const firstRunTimers = game.timers.size;
  game.run("startGame()");
  assert.equal(game.timers.size, firstRunTimers);
});

test("core random drops can be driven deterministically", () => {
  const game = createHarness();
  game.run(`startGame(); rng = () => 0;
    invaders = [${safeInvaderSource()}]; invaders[0].hp = 1; invaders[0].maxHp = 1;
    invSpeed = 0; toilets = []; poops = []; allies = []; powerups = [];
    bullets = [{x: invaders[0].x, y: invaders[0].y, vx: 0, vy: 0, size: 18}];
    update(0);`);
  assert.equal(game.run("powerups.length"), 2);
  assert.equal(game.run("powerups[0].type"), "kookie");
  assert.equal(game.run("powerups[1].type"), "grenade");
});

test("holding G consumes at most one reboot charge per key press", () => {
  const game = createHarness();
  game.run(`startGame(); rebootCharges = 2;
    invaders = [${safeInvaderSource()}]; invSpeed = 0; toilets = []; poops = []; allies = []; bullets = [];`);
  const keydown = game.documentListeners.get("keydown")?.[0];
  keydown({ code: "KeyG", repeat: false, preventDefault() {} });
  game.run("update(0)");
  keydown({ code: "KeyG", repeat: true, preventDefault() {} });
  game.run("update(0)");
  assert.equal(game.run("rebootCharges"), 1);
});

test("noise synthesis reuses one preallocated buffer", () => {
  const game = createHarness();
  game.run("initAudio(); playNoise(0.1); playNoise(0.2)");
  assert.equal(game.run("audioCtx.bufferCreations"), 1);
});

test("rapid score updates are not an aria-live announcement stream", () => {
  assert.doesNotMatch(html, /id=["']hud-score["'][^>]*aria-live/i);
});

test("the decorative hex grid is cached between render frames", () => {
  const game = createHarness();
  assert.equal(game.run("Boolean(gridCanvas && gridCanvas.width && gridCanvas.height)"), true);
  assert.doesNotThrow(() => game.run("render(); render()"));
  assert.match(script, /if \(gridCanvas\) ctx\.drawImage\(gridCanvas, 0, 0, W, H\)/);
});

test("emoji font strings are memoized by rendered pixel size", () => {
  const game = createHarness();
  game.run("emojiFont(24); emojiFont(24); emojiFont(36)");
  assert.equal(game.run("emojiFontCache.size"), 2);
});

test("sound and rendering never consume gameplay randomness", () => {
  const game = createHarness();
  game.run(`startGame(); let gameplayRngCalls = 0;
    rng = () => { gameplayRngCalls++; return 0.5; };
    shakeTimer = 1; playNoise(0.1); render();`);
  assert.equal(game.run("gameplayRngCalls"), 0);
});

test("a reboot key press while paused cannot queue a charge", () => {
  const game = createHarness();
  game.run("startGame(); rebootCharges = 1; togglePause(true)");
  const keydown = game.documentListeners.get("keydown")?.[0];
  keydown({ code: "KeyG", repeat: false, preventDefault() {} });
  game.run("togglePause(); update(0)");
  assert.equal(game.run("rebootCharges"), 1);
});

test("pause and game over retire callbacks from the active run", () => {
  const game = createHarness();
  game.run("startGame(); togglePause(true)");
  assert.equal(game.run("gameplayTimers.size"), 0);
  game.run("startGame(); gameOver()");
  assert.equal(game.run("gameplayTimers.size"), 2, "only the two game-over follow-up tones remain");
});

test("an over-wide formation is fitted once instead of descending every frame", () => {
  const game = createHarness({ width: 320, height: 700 });
  game.run(`startGame();
    invaders = [${safeInvaderSource()}, ${safeInvaderSource()}];
    invaders[0].x = -20; invaders[1].x = W + 20;
    invaders[0].y = invaders[1].y = playTop + 50;
    invDir = 1; invSpeed = 0; update(1);`);
  assert.equal(game.run("invaders.every(inv => inv.x >= 30 * S && inv.x <= W - 30 * S)"), true);
  const descendedY = game.run("invaders[0].y");
  game.run("update(1)");
  assert.equal(game.run("invaders[0].y"), descendedY);
});

test("each Fire pointer owns its own hold", () => {
  const game = createHarness();
  const fire = game.elements.get("touch-fire");
  const pointerDown = fire.listeners.get("pointerdown")?.[0];
  const pointerUp = fire.listeners.get("pointerup")?.[0];
  pointerDown({ pointerId: 1, preventDefault() {} });
  pointerDown({ pointerId: 2, preventDefault() {} });
  pointerUp({ pointerId: 1 });
  assert.equal(game.run("touchFire"), true);
  pointerUp({ pointerId: 2 });
  assert.equal(game.run("touchFire"), false);
});

test("wave letter edges are precomputed and ally links use spatial buckets", () => {
  const game = createHarness();
  game.run(`startGame(); allies = [
    {x: 0, y: 0}, {x: 100, y: 0}, {x: 250, y: 0}, {x: 1000, y: 0}
  ]`);
  assert.equal(game.run("invaderEdges.length > 0"), true);
  assert.equal(game.run("JSON.stringify(nearbyAllyPairs(200))"), "[[0,1],[1,2]]");
});

test("the audio harness verifies oscillator slide clamping", () => {
  const game = createHarness();
  game.run("initAudio(); playTone(440, 0.1, 'sine', 0.1, -50)");
  assert.equal(game.run("audioCtx.oscillatorRamps.every(value => value >= 20)"), true);
  assert.equal(game.run("JSON.stringify(audioCtx.oscillatorRamps)"), "[20]");
});

test("a non-monotonic frame timestamp cannot run simulation backwards", () => {
  const game = createHarness();
  game.run(`startGame(); invaders = [${safeInvaderSource()}];
    invaders[0].x = W / 2; invSpeed = 1; invDir = 1; lastTime = 1000;`);
  const before = game.run("invaders[0].x");
  game.run("gameLoop(900)");
  assert.equal(game.run("invaders[0].x"), before);
});

test("the game visibly credits Promptus and its open-source licence", () => {
  assert.match(html, /href=["']https:\/\/www\.promptus\.ai\/["'][^>]*>Promptus\.ai<\/a>/);
  assert.match(html, />Open source \(MIT\)<\/a>/);
  assert.match(html, /AI-assisted creation · original rule-based gameplay engine/);
  assert.doesNotMatch(html, /trained neural (?:net|network)/i);
});
