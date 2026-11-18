import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const elements=new Map(),listeners=new Map(),sounds=[];
function element(id){
 if(!elements.has(id))elements.set(id,{id,textContent:'',addEventListener(k,f){this[k]=f;},getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){}})});
 return elements.get(id);
}
const c={window:{},document:{getElementById:element,createElement:element,addEventListener(){}},performance,AbortController,console};
vm.createContext(c);vm.runInContext(read('assets/three.local.js'),c);c.THREE=c.window.THREE;
vm.runInContext(read('assets/people.js'),c);c.PEOPLE=c.window.PEOPLE;
c.window.addEventListener=(k,f)=>listeners.set(k,f);
c.SFX=new Proxy({},{get:(_,k)=>(...args)=>sounds.push([k,...args])});
c.AUDIO=new Proxy({status:()=>({muted:false})},{get:(o,k)=>o[k]||(()=>{})});
vm.runInContext(read('assets/campaign.js'),c);
const {floors,plan,route,daylight,launch}=c.window.HOTEL_CAMPAIGN;
test('Every guest and exit is reachable from its matching stair landing',()=>{
 for(let i=4;i>=0;i--){const tiles=plan(i),entry=(i%2?'12':'0')+',0',exit=i?(i%2?'0':'12')+',0':'13,3';
 for(const destination of [...floors[i].spots.map(p=>p.join(',')),exit])assert(route(tiles,entry,destination).length>0);}
});
test('Daylight interpolates continuously across midnight and peaks at midday',()=>{
 for(let h=-1;h<=49;h+=.1){const p=daylight(h);assert(p.t>=0&&p.t<=1);}
 assert.equal(daylight(24).a[2],daylight(0).a[2]);assert(daylight(12).a[4]>daylight(6.6).a[4]);
});
test('Complete five floors with the moving party, then board all nine',()=>{
 const canvas=element('view');canvas.clientWidth=1000;canvas.clientHeight=700;
 let left=false;const game=launch({render(){}},canvas,()=>left=true);
 for(let i=0;i<10000;i++){
  if(i===4){element('campaign-pause').click();const time=element('campaign-light').textContent;game.tick(1);assert.equal(element('campaign-light').textContent,time);element('campaign-pause').click();}
  if(i%15===0)element('campaign-action').click();
  game.tick(.05);if(element('campaign-status').textContent.startsWith('All 9 guests aboard'))break;
 }
 assert.match(element('campaign-status').textContent,/All 9 guests aboard/);
 assert.deepEqual(sounds.filter(s=>s[0]==='landing').map(s=>s[1]),[4,3,2,1,0]);
 assert.equal(sounds.filter(s=>s[0]==='saved').length,9);
 assert.equal(sounds.filter(s=>s[0]==='coachDeparture').length,1);element('campaign-action').click();assert(left);
});

test('Auto Tour delivers all nine and hands off to the night shift without input',()=>{
 const canvas=element('view');canvas.clientWidth=1000;canvas.clientHeight=700;
 let next=false;
 const game=launch({render(){}},canvas,continueTour=>next=continueTour,true);
 for(let i=0;i<4000&&!next;i++)game.tick(.05);
 assert.equal(next,true);
 assert.match(element('campaign-status').textContent,/All 9 guests aboard/);
});
