import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),findings=[];let files=0;
const allowed=new Set(['index.html','play.html','README.md','LICENSE','.nojekyll','.gitignore','server.mjs','build.mjs','check.mjs','privacy-check.mjs','CHECKS.json','assets/audio.js','assets/game.js','assets/game.css','assets/level.js','assets/world.js','assets/three.local.js','assets/THREE-LICENSE.txt','dist/game.html']);
for(const name of ['assets/campaign.js','campaign.test.mjs','preview-notes.html','audio-check.mjs','assets/people.js','assets/announcements.js','assets/voice-catalog.json','assets/voice-pack.js','announcements.test.mjs'])allowed.add(name);
const voiceSource=fs.readFileSync(path.join(root,'assets/voice-pack.js'),'utf8');
const voicePack=JSON.parse(voiceSource.replace(/^window\.DOM_VOICE=/,'').trim().replace(/;$/,''));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/voice-catalog.json'),'utf8'));
if(!voicePack.complete||voicePack.synthetic!==true||voicePack.playbackRate!==1.8||Object.keys(voicePack.clips).length!==catalog.clips.length)findings.push('Dom voice pack incomplete or incorrectly labelled');
const catalogIds=new Set(catalog.clips.map(entry=>entry.id));
if(catalogIds.size!==catalog.clips.length)findings.push('Dom voice catalog has duplicate ids');
if(Object.keys(voicePack.clips).some(id=>!catalogIds.has(id)))findings.push('Dom voice manifest has unlisted catalog ids');
for(const entry of catalog.clips){
 const clip=voicePack.clips[entry.id];if(!clip||clip.file!=='assets/voice/'+entry.id+'.wav'||!/^[a-z0-9-]+$/.test(entry.id))throw Error('Invalid voice manifest entry');allowed.add(clip.file);
 if(clip.textSha256!==createHash('sha256').update(entry.text).digest('hex'))findings.push(clip.file+': narration hash mismatch');
 if(!Number.isFinite(clip.normalizedWordErrorPercent)||clip.normalizedWordErrorPercent>5||clip.normalizedWordErrorPercent<0||!(clip.recognizedWordRatio>=.95&&clip.recognizedWordRatio<=1.05))findings.push(clip.file+': word gate failed');
 let audio;try{audio=fs.readFileSync(path.join(root,clip.file));}catch{findings.push(clip.file+': missing or unreadable audio');continue;}
 if(createHash('sha256').update(audio).digest('hex')!==clip.sha256)findings.push(clip.file+': audio hash mismatch');
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git')continue;const p=path.join(dir,e.name),rel=path.relative(root,p).replaceAll('\\','/');if(e.isSymbolicLink())throw Error('Symlink refused');if(e.isDirectory()){walk(p);continue;}files++;if(!allowed.has(rel))findings.push(rel+': outside publication allowlist');const voiceAudio=/^assets\/voice\/[a-z0-9-]+\.wav$/.test(rel),s=fs.readFileSync(p,voiceAudio?'latin1':'utf8');if(rel==='privacy-check.mjs')continue;
if(/[A-Z]:[\\/](?:Users|Code Projects)[\\/]|\/(?:home|Users)\/[^/\s"'<>]+/i.test(s))findings.push(rel+': machine path');
if(/(?:password|passwd|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\s]{8,}["']/i.test(s))findings.push(rel+': credential assignment');
if(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s))findings.push(rel+': private key');
if(!voiceAudio&&!['assets/three.local.js','dist/game.html','server.mjs'].includes(rel)&&/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(s))findings.push(rel+': unexpected runtime networking');
if(/welbeck|well\.42\.uk|window\.TRACES|private-knowledge-base|Gill room|Central Promenade|\b(?:IM1|IM2|IM3)\s*\d[A-Z]{2}\b/i.test(s))findings.push(rel+': real property or private-source reference');
if(/\.html$/.test(rel)&&/<script[^>]+src=["']https?:|<link[^>]+href=["']https?:[^>]+rel=["']stylesheet/i.test(s))findings.push(rel+': external runtime asset');
}}
walk(root);console.log(JSON.stringify({passed:findings.length===0,files,findings}));if(findings.length)process.exitCode=1;
