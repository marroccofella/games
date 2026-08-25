import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const skippedDirectories = new Set([".git", ".ensemble_reviews", "node_modules", "dist"]);
const failures = [];
const directoryEntries = new Map();
const audioExtensions = "aac|flac|m4a|mp3|ogg|opus|wav|webm";
const audioExtension = new RegExp(`\\.(?:${audioExtensions})$`, "i");
const audioReference = new RegExp(`\\.(?:${audioExtensions})(?:[?#\"')\\s]|$)`, "i");

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

export function javascriptStringLiterals(source) {
  const literals = [];
  for (let index = 0; index < source.length;) {
    const character = source[index];
    const next = source[index + 1];
    if (character === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }
    if (character === "/" && next === "/") {
      const newline = source.indexOf("\n", index + 2);
      index = newline === -1 ? source.length : newline + 1;
      continue;
    }
    if (character !== '"' && character !== "'" && character !== "`") {
      index += 1;
      continue;
    }
    const quote = character;
    let literal = "";
    index += 1;
    while (index < source.length) {
      const current = source[index];
      if (current === "\\") {
        literal += current + (source[index + 1] ?? "");
        index += 2;
      } else if (current === quote) {
        literals.push(literal);
        index += 1;
        break;
      } else {
        literal += current;
        index += 1;
      }
    }
  }
  return literals;
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
assert.deepEqual(audioFiles, [], `unaccepted audio must not ship anywhere in FREEL*ADER 42: ${audioFiles.map((file) => path.relative(productRoot, file)).join(", ")}`);

const cabinetRoot = path.join(productRoot, "play");
const cabinet = await readFile(path.join(cabinetRoot, "index.html"), "utf8");
const moduleTag = cabinet.match(/<script\b[^>]*\btype=["']module["'][^>]*>/i)?.[0];
const moduleSource = moduleTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
assert.match(moduleSource ?? "", /^\.\/assets\/index-[\w-]+\.js$/, "cabinet entry must use a relative Vite base");

const scriptText = new Map(await Promise.all(scripts.map(async (name) => [name, await readFile(path.join(assetDirectory, name), "utf8")])));
const entryName = moduleSource?.slice("./assets/".length);
assert.ok(entryName && scripts.includes(entryName), "cabinet must contain its declared Vite entry chunk");
const entryCode = scriptText.get(entryName);
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
assert.match(entryCode, /WITHHELD[^\n]{0,80}LISTENING VERDICT/i, "cabinet entry must visibly disclose that the voice candidate is withheld");
const textualProductFiles = productFiles.filter((file) => /\.(?:css|html?|js|json|md|txt)$/i.test(file));
for (const file of textualProductFiles) {
  const source = await readFile(file, "utf8");
  const auditableSource = file.endsWith(".js")
    ? javascriptStringLiterals(source).join("\n")
    : source;
  assert.doesNotMatch(auditableSource, audioReference, `${path.relative(productRoot, file)} must not reference unaccepted audio`);
}

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
