import assert from "node:assert/strict";
import test from "node:test";

import { controlContracts, javascriptStringLiterals } from "./verify.mjs";

test("control contracts cannot confuse Space with a library identifier", () => {
  const withBinding = 'const SRGBColorSpace=3001;const CONTROL_BY_CODE={Space:"jump"};';
  const withoutBinding = 'const SRGBColorSpace=3001;const CONTROL_BY_CODE={};';
  const spaceContract = controlContracts.find(([key]) => key === "Space")[1];
  assert.match(withBinding, spaceContract);
  assert.doesNotMatch(withoutBinding, spaceContract);
});

test("audio strings remain visible when comment markers occur inside strings", () => {
  const source = 'const open="http://example.test/*";const voice="narration.mp3";const close="*/";';
  const literals = javascriptStringLiterals(source);
  assert.ok(literals.includes("narration.mp3"));
});

test("third-party documentation comments do not become runtime audio references", () => {
  const source = "/** loader.load('example.ogg') */ const mode='silent';";
  assert.deepEqual(javascriptStringLiterals(source), ["silent"]);
});
