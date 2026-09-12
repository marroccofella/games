import assert from 'node:assert/strict';
import test from 'node:test';
import {mediaReferenceViolations} from './media-policy.mjs';
const names=new Set(['clear-001-abc123.flac']);

test('all public text surfaces reject links to unapproved and remote audio',()=>{
 for(const [file,source]of [
  ['play/index.html','<audio src="https://example.test/withheld.mp3"></audio>'],
  ['play/assets/style.css','.voice { background: url(../withheld.wav); }'],
  ['voice-manifest.json','{"file":"https://example.test/withheld.flac"}'],
  ['docs/notes.md','[Listen](https://example.test/withheld.ogg)'],
  ['notes.txt','Audio: https://example.test/withheld.wav'],
  ['play/index.html','<audio src="https://example.test/withheld&#46;mp3"></audio>'],
 ])assert.ok(mediaReferenceViolations(file,source,names).length>0,file+' must reject an unapproved audio reference');
});

test('JavaScript accepts only named local recordings and rejects remote speech services',()=>{
 assert.deepEqual(mediaReferenceViolations('play/assets/main.js','const url="./clear-001-abc123.flac";',names),[]);
 assert.ok(mediaReferenceViolations('play/assets/lazy.js','const url="https://example.test/clear-001-abc123.flac";',names).length>0);
 assert.ok(mediaReferenceViolations('play/assets/lazy.js','speechSynthesis.speak(new SpeechSynthesisUtterance("Hello"));',names).length>0);
});

test('approved references must resolve to the actual packaged asset directory',()=>{
 for(const [file,source]of [
  ['play/index.html','<audio src="./assets/clear-001-abc123.flac"></audio>'],
  ['voice-manifest.json','{"file":"play/assets/clear-001-abc123.flac"}'],
  ['docs/notes.md','[Listen](../play/assets/clear-001-abc123.flac)'],
 ])assert.deepEqual(mediaReferenceViolations(file,source,names),[]);
 for(const reference of ['../clear-001-abc123.flac','/clear-001-abc123.flac','https://example.test/clear-001-abc123.flac'])
  assert.ok(mediaReferenceViolations('play/index.html',`<audio src="${reference}"></audio>`,names).length>0);
});
