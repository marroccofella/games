import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));let html=await fs.readFile(path.join(root,'play.html'),'utf8');
// Read and inline only the declared local assets.
for(const m of [...html.matchAll(/<link rel="stylesheet" href="([^"<>]+)">/g)]){const css=await fs.readFile(path.join(root,m[1]),'utf8');html=html.replace(m[0],()=>'<style>\n'+css+'\n</style>');}
for(const m of [...html.matchAll(/<script src="([^"<>]+)"><\/script>/g)]){const code=await fs.readFile(path.join(root,m[1].split('?')[0]),'utf8');html=html.replace(m[0],()=>'<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>');}
if(/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html))throw Error('Unbundled asset');await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist/game.html'),html);console.log('Built dist/game.html');
