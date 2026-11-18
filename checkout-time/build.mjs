import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));let html=await fs.readFile(path.join(root,'play.html'),'utf8');
// Read and inline only the declared local assets.
for(const m of [...html.matchAll(/<link rel="stylesheet" href="([^"<>]+)">/g)]){const css=await fs.readFile(path.join(root,m[1].split('?')[0]),'utf8');html=html.replace(m[0],()=>'<style>\n'+css+'\n</style>');}
for(const m of [...html.matchAll(/<script src="([^"<>]+)"><\/script>/g)]){const src=m[1].split('?')[0];let code=await fs.readFile(path.join(root,src),'utf8');
if(src==='assets/voice-pack.js'){
 const pack=JSON.parse(code.replace(/^window\.DOM_VOICE=/,'').trim().replace(/;$/,''));
 if(!pack.complete)throw Error('Dom voice pack is incomplete');
 for(const clip of Object.values(pack.clips)){if(!/^assets\/voice\/[a-z0-9-]+\.wav$/.test(clip.file))throw Error('Invalid voice asset');const audio=await fs.readFile(path.join(root,clip.file));if(createHash('sha256').update(audio).digest('hex')!==clip.sha256)throw Error('Dom voice hash mismatch: '+clip.file);clip.file='data:audio/wav;base64,'+audio.toString('base64');}
 code='window.DOM_VOICE='+JSON.stringify(pack)+';';
}
html=html.replace(m[0],()=>'<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>');}
html=html.replaceAll('href="index.html"','href="../index.html"').replaceAll('href="play.html"','href="game.html"').replaceAll('href="preview-notes.html"','href="../preview-notes.html"');
if(/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html))throw Error('Unbundled asset');if(html.includes('assets/voice/'))throw Error('Unbundled voice asset');await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist/game.html'),html.replace(/\r\n/g,'\n'));console.log('Built dist/game.html');
