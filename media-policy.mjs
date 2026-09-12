import path from 'node:path';

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

export function approvedVoiceReference(literal,names){
  return /^(?:\.\/)?(?:assets\/)?(?:clear|death)-\d{3}-[\w-]+\.flac$/.test(literal)&&names.has(literal.split("/").at(-1));
}

export function mediaReferenceViolations(file, source, names) {
  const decoded = source.replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hex, decimal) => {
    const point = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  }).replace(/&(?:quot|apos|lt|gt|amp);/gi, entity => ({'&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&amp;':'&'}[entity.toLowerCase()]));
  const violations = [];
  if (/freeloader-intro|speechSynthesis|SpeechSynthesisUtterance/.test(decoded)) violations.push('unapproved intro or browser speech');
  const texts = file.endsWith('.js') ? javascriptStringLiterals(decoded) : [decoded];
  for (const text of texts) {
    for (const match of text.matchAll(/[^\s"'<>()[\]{},;=]+\.(?:aac|flac|m4a|mp3|ogg|opus|wav|webm)(?:[?#][^\s"'<>()[\]{},;=]*)?/gi)) {
      const reference = match[0];
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), reference));
      const name = path.posix.basename(reference);
      if (/^[./\w-]+$/.test(reference) && !reference.startsWith('/') &&
          names.has(name) && resolved === 'play/assets/' + name) continue;
      violations.push(reference);
    }
  }
  return violations;
}
