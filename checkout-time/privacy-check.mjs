import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),findings=[];let files=0;
const allowed=new Set(['index.html','play.html','README.md','LICENSE','.nojekyll','.gitignore','server.mjs','build.mjs','check.mjs','privacy-check.mjs','CHECKS.json','assets/audio.js','assets/game.js','assets/game.css','assets/level.js','assets/world.js','assets/three.local.js','assets/THREE-LICENSE.txt','dist/game.html']);
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git')continue;const p=path.join(dir,e.name),rel=path.relative(root,p).replaceAll('\\','/');if(e.isSymbolicLink())throw Error('Symlink refused');if(e.isDirectory()){walk(p);continue;}files++;if(!allowed.has(rel))findings.push(rel+': outside publication allowlist');const s=fs.readFileSync(p,'utf8');if(rel==='privacy-check.mjs')continue;
if(/[A-Z]:[\\/](?:Users|Code Projects)[\\/]|\/(?:home|Users)\/[^/\s"'<>]+/i.test(s))findings.push(rel+': machine path');
if(/(?:password|passwd|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\s]{8,}["']/i.test(s))findings.push(rel+': credential assignment');
if(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s))findings.push(rel+': private key');
if(!['assets/three.local.js','dist/game.html','server.mjs'].includes(rel)&&/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(s))findings.push(rel+': unexpected runtime networking');
if(/\.html$/.test(rel)&&/<script[^>]+src=["']https?:|<link[^>]+href=["']https?:[^>]+rel=["']stylesheet/i.test(s))findings.push(rel+': external runtime asset');
}}
walk(root);console.log(JSON.stringify({passed:findings.length===0,files,findings}));if(findings.length)process.exitCode=1;
