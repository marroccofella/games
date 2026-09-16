import assert from "node:assert/strict";
import {javascriptStringLiterals,approvedVoiceReference,mediaReferenceViolations} from "./media-policy.mjs";
export {javascriptStringLiterals,approvedVoiceReference};
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const skippedDirectories = new Set([".git", ".ensemble_reviews", "node_modules", "dist"]);
const failures = [];
const directoryEntries = new Map();
const audioExtensions = "aac|flac|m4a|mp3|ogg|opus|wav|webm";
const audioExtension = new RegExp(`\\.(?:${audioExtensions})$`, "i");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(target));
    else files.push(target);
  }
  return files;
}

function decodeHtmlReference(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // Decode ampersands last so an intentional &amp;#39; is not decoded twice.
    .replace(/&amp;/gi, "&");
}

function collectReferences(html) {
  const references = [];
  for (const match of html.matchAll(/\b(href|src|poster)\s*=\s*(?:(["'])(.*?)\2|([^\s"'=<>]+))/gi)) {
    references.push({ kind: match[1].toLowerCase(), value: match[3] ?? match[4] });
  }
  for (const match of html.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)) {
    for (const candidate of match[2].split(",")) references.push({ kind: "srcset", value: candidate.trim().split(/\s+/, 1)[0] });
  }
  for (const match of html.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    references.push({ kind: "css-url", value: match[2] });
  }
  return references;
}

function collectMarkdownReferences(markdown) {
  return [...markdown.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)]
    .map((match) => ({ kind: "href", value: match[1] ?? match[2] }));
}

async function entriesFor(directory) {
  const resolved = path.resolve(directory);
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  if (!directoryEntries.has(key)) directoryEntries.set(key, readdir(resolved));
  return directoryEntries.get(key);
}

async function exactPath(target) {
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep).filter(Boolean);
  if (segments[0] === ".." || path.isAbsolute(relative)) return { error: "escapes the arcade root" };
  let cursor = root;
  for (const segment of segments) {
    let entries;
    try {
      entries = await entriesFor(cursor);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "unreadable";
      return { error: `cannot traverse ${path.relative(root, cursor) || "."} (${code})` };
    }
    if (!entries.includes(segment)) {
      const insensitive = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
      return { error: insensitive ? `uses wrong case; on disk it is ${insensitive}` : "does not exist" };
    }
    cursor = path.join(cursor, segment);
  }
  return { path: cursor };
}

async function resolveLocalReference(page, { kind, value }) {
  const reference = decodeHtmlReference(value.trim());
  if (/^(?:https?:|mailto:|data:|#|\/\/)/i.test(reference)) return;
  if (reference.startsWith("/")) {
    failures.push(`${path.relative(root, page)} uses unsafe root-absolute ${reference}`);
    return;
  }
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean) return;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(clean);
  } catch {
    failures.push(`${path.relative(root, page)} contains malformed percent encoding in ${clean}`);
    return;
  }
  const first = await exactPath(path.resolve(path.dirname(page), decodedPath));
  if (first.error) {
    failures.push(`${path.relative(root, page)} references ${decodedPath}: ${first.error}`);
    return;
  }
  const target = first.path;
  try {
    if ((await stat(target)).isDirectory()) {
      const indexTarget = path.join(target, "index.html");
      const index = await exactPath(indexTarget);
      if (index.error) failures.push(`${path.relative(root, page)} references ${path.relative(root, indexTarget)}: ${index.error}`);
    }
  } catch {
    failures.push(`${path.relative(root, page)} cannot inspect ${path.relative(root, target)}`);
  }
}

const allFiles = await collectFiles(root);
const pages = allFiles.filter((file) => /\.html?$/i.test(file));
await Promise.all(pages.map(async (page) => {
  const html = await readFile(page, "utf8");
  await Promise.all(collectReferences(html).map((reference) => resolveLocalReference(page, reference)));
}));
const markdownFiles = allFiles.filter((file) => /\.md$/i.test(file));
await Promise.all(markdownFiles.map(async (page) => {
  const markdown = await readFile(page, "utf8");
  await Promise.all(collectMarkdownReferences(markdown).map((reference) => resolveLocalReference(page, reference)));
}));

if (failures.length) throw new Error(`Static verification failed:\n- ${failures.sort().join("\n- ")}`);

const productRoot = path.join(root, "freeloader-42");
const product = await readFile(path.join(productRoot, "index.html"), "utf8");
assert.match(product, /<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["']data:image\/)[^>]*>/i);
const posterTag = product.match(/<img\b[^>]*\bsrc=["']og\.png["'][^>]*>/i)?.[0];
assert.ok(posterTag, "product page must contain its og.png poster");
assert.match(posterTag, /\bwidth=["']1672["']/i);
assert.match(posterTag, /\bheight=["']941["']/i);

const posterBytes = await readFile(path.join(productRoot, "og.png"));
assert.equal(posterBytes.toString("ascii", 1, 4), "PNG");
assert.equal(posterBytes.readUInt32BE(16), 1672);
assert.equal(posterBytes.readUInt32BE(20), 941);

const assetDirectory = path.join(productRoot, "play", "assets");
const assetNames = await readdir(assetDirectory);
const scripts = assetNames.filter((name) => name.endsWith(".js"));
assert.ok(scripts.length > 0, "FREEL*ADER 42 play assets must contain JavaScript");
assert.ok(scripts.some((name) => /^ThreeField-[\w-]+\.js$/.test(name)), "3D field must remain a lazy-loaded chunk");
const productFiles = allFiles.filter((file) => file.startsWith(`${productRoot}${path.sep}`));
const audioFiles = productFiles.filter((file) => audioExtension.test(file));
const voiceManifest = JSON.parse(await readFile(path.join(productRoot,"voice-manifest.json"),"utf8"));
assert.equal(voiceManifest.synthetic,true);
assert.equal(voiceManifest.profileListeningVerdict,"approved");
assert.equal(voiceManifest.individualListeningVerdicts,false,"Profile approval must not imply individual human listening");
assert.equal(voiceManifest.tempo,1.5);
assert.ok(voiceManifest.clipCount>=126);
assert.equal(voiceManifest.clips.length,voiceManifest.clipCount);
assert.equal(new Set(voiceManifest.clips.map(clip=>clip.id)).size,voiceManifest.clipCount);
const allowedAudio = new Set();
for(const clip of voiceManifest.clips){
  assert.match(clip.file,/^play\/assets\/(?:clear|death)-\d{3}-[\w-]+\.flac$/);
  assert.match(clip.sha256,/^[a-f0-9]{64}$/);
  assert.ok(Number.isFinite(clip.durationSeconds)&&clip.durationSeconds>0&&clip.durationSeconds*1000+350<15000);
  assert.ok(Number.isInteger(clip.wordErrors)&&clip.wordErrors>=0&&Number.isInteger(clip.referenceWords)&&clip.referenceWords>0&&20*clip.wordErrors<=clip.referenceWords);
  assert.equal(createHash("sha256").update(await readFile(path.join(productRoot,clip.file))).digest("hex"),clip.sha256);
  allowedAudio.add(path.basename(clip.file));
}
assert.deepEqual(audioFiles.map(file=>path.relative(productRoot,file).replaceAll(path.sep,"/")).sort(),voiceManifest.clips.map(clip=>clip.file).sort(),"Only manifest-approved voice files may ship");
for(const event of ["clear","death"]){
  assert.ok(voiceManifest.clips.filter(clip=>clip.event===event&&clip.tag==="general").length>=42);
  for(const tag of ["bug-hunt","byte-dash"])assert.ok(voiceManifest.clips.filter(clip=>clip.event===event&&clip.tag===tag).length>=7);
}

const cabinetRoot = path.join(productRoot, "play");
const cabinet = await readFile(path.join(cabinetRoot, "index.html"), "utf8");
const moduleTag = cabinet.match(/<script\b[^>]*\btype=["']module["'][^>]*>/i)?.[0];
const moduleSource = moduleTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
assert.match(moduleSource ?? "", /^\.\/assets\/index-[\w-]+\.js$/, "cabinet entry must use a relative Vite base");

const scriptText = new Map(await Promise.all(scripts.map(async (name) => [name, await readFile(path.join(assetDirectory, name), "utf8")])));
const entryName = moduleSource?.slice("./assets/".length);
assert.ok(entryName && scripts.includes(entryName), "cabinet must contain its declared Vite entry chunk");
const entryCode = scriptText.get(entryName);
// A 200 response can still be an old cabinet. Pin the revision and every
// hashed asset to the release manifest before accepting a public package.
const release = JSON.parse(await readFile(path.join(productRoot, "release.json"), "utf8"));
assert.equal(release.revision, "2026.09.15-portal-recovery");
assert.equal(release.portalSeconds, 5.42);
assert.equal(release.playerTurns, 4.2);
assert.deepEqual(release.retroModes, ["bug-hunt","byte-dash"]);
assert.equal(release.campaignEncounters,49);
assert.equal(release.voice.clipCount,voiceManifest.clipCount);
assert.equal(release.archivePlan.length,7);
assert.ok(entryCode.includes("TERMS & EXTERMINATIONS") && entryCode.includes("defeatRetroEnemy"), "the actual cabinet must include the revisit challenge and combat");
assert.ok(entryCode.includes("KeyF") && entryCode.includes("KeyX"), "the cabinet must include firing controls");
assert.ok(cabinet.includes('name="game-revision" content="' + release.revision + '"'));
assert.ok(entryCode.includes(release.revision), "the revision must be visible inside the running game");
assert.ok(entryCode.includes("LIABILITY TRANSFER"), "the portal interface must be in the actual entry bundle");
assert.ok(entryCode.includes("portalCharge") && entryCode.includes("portalArrive"), "the portal sound cues must ship");
assert.ok(entryCode.includes("playerRotation") && entryCode.includes("createStereoPanner"), "the spiral and stereo suction must ship");
const shipped = ["play/index.html", ...assetNames.map(name => "play/assets/" + name)].sort();
assert.deepEqual(Object.keys(release.assets).sort(), shipped, "manifest must cover every game file without stale extras");
for (const relative of shipped) {
  const digest = createHash("sha256").update(await readFile(path.join(productRoot, relative))).digest("hex");
  assert.equal(digest, release.assets[relative], "Release asset differs from manifest: " + relative);
}
assert.ok(product.includes(release.revision), "the product page must identify the same revision");

export const controlContracts = [
  ["ArrowLeft", /\bArrowLeft\s*:\s*["']left["']/],
  ["KeyA", /\bKeyA\s*:\s*["']left["']/],
  ["ArrowRight", /\bArrowRight\s*:\s*["']right["']/],
  ["KeyD", /\bKeyD\s*:\s*["']right["']/],
  ["ArrowUp", /\bArrowUp\s*:\s*["']jump["']/],
  ["KeyW", /\bKeyW\s*:\s*["']jump["']/],
  ["Space", /\bSpace\s*:\s*["']jump["']/],
  ["KeyE", /\bKeyE\s*:\s*["']wildcard["']/],
  ...["KeyM", "KeyO", "KeyP", "KeyR", "KeyV", "Escape"].map((key) => [key, new RegExp("[\\\"'`]" + key + "[\\\"'`]")]),
];
for (const [key, contract] of controlContracts) {
  assert.match(entryCode, contract, `cabinet entry must ship the ${key} control contract`);
}
assert.match(entryCode,/SYNTHETIC YORKSHIRE CABINET COMMENTARY/,"The game must label synthetic speech");
for(const file of productFiles.filter(file=>/\.(?:css|html?|js|json|md|txt)$/i.test(file))){
  const relative=path.relative(productRoot,file).replaceAll(path.sep,"/");
  assert.deepEqual(mediaReferenceViolations(relative,await readFile(file,"utf8"),allowedAudio),[],`${relative} references unapproved or external audio`);
}
assert.doesNotMatch(entryCode,/freeloader-intro|speechSynthesis|SpeechSynthesisUtterance/,"Old unapproved intro and browser TTS must remain excluded");

const dynamicImports = [...entryCode.matchAll(/import\(\s*["']\.\/([^"']+)["']\s*\)/g)].map((match) => match[1]);
assert.ok(dynamicImports.some((name) => /^ThreeField-[\w-]+\.js$/.test(name)), "entry chunk must dynamically import the 3D field");
for (const imported of dynamicImports) assert.ok(assetNames.includes(imported), `dynamic import ${imported} must exist in the cabinet assets`);
await stat(path.join(productRoot, "docs", "campaign-redesign.md"));

const publicCopy = [
  await readFile(path.join(root, "index.html"), "utf8"),
  await readFile(path.join(root, "README.md"), "utf8"),
  product,
  await readFile(path.join(productRoot, "README.md"), "utf8"),
  cabinet,
].join("\n");
assert.doesNotMatch(publicCopy, /\bW[i*]LLY\b|three context shards|neon computational mansion|Rapier\/WebAssembly/i);
let obsoleteFolderAbsent = false;
try {
  await stat(path.join(root, "willy"));
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") obsoleteFolderAbsent = true;
  else throw error;
}
assert.equal(obsoleteFolderAbsent, true, "obsolete staging folder must not ship");

console.log(`Verified ${pages.length} arcade pages, ${markdownFiles.length} Markdown documents, exact-case assets, and FREEL*ADER 42's shipped controls, media, and lazy 3D field.`);
