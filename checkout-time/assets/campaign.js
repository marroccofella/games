// Fictional cutaway floors. Columns are shared by the stair cores on every storey.
(() => {
'use strict';
const floors=[
 {name:'Promenade lobby', colour:0x366c67, rooms:[[2,-1,2],[9,-1,2],[5,1,2]], guests:['Concierge'], spots:[[9,-3]], exit:[13,3]},
 {name:'Wedding gallery', colour:0x995862, rooms:[[2,-1,2],[8,-1,2],[5,1,2]], guests:['Bride','Groom'], spots:[[2,-3],[5,3]]},
 {name:'Garden suites', colour:0x45795b, rooms:[[4,-1,2],[10,-1,2],[7,1,2]], guests:['Gardener','Florist'], spots:[[4,-3],[10,-3]]},
 {name:'Cabaret rooms', colour:0x79577e, rooms:[[2,-1,2],[7,-1,2],[10,1,2]], guests:['Singer','Pianist'], spots:[[7,-3],[10,3]]},
 {name:'Lantern attic', colour:0x456f8d, rooms:[[3,-1,2],[9,-1,2],[6,1,2]], guests:['Night auditor','Stargazer'], spots:[[3,-3],[6,3]]}
];
const key=(x,z)=>x+','+z, coords=id=>id.split(',').map(Number);
const cell=1.55, wx=x=>(x-6)*cell, wz=z=>z*cell;
function plan(n){
 const f=floors[n], cells=new Set(), add=(x,z)=>cells.add(key(x,z));
 for(let x=0;x<=12;x++)add(x,0);
 for(const [cx,side,w] of f.rooms){
  add(cx,side);
  for(let d=2;d<=3;d++)for(let x=cx-w;x<=cx+w;x++)add(x,d*side);
 }
 if(n===0){for(let x=12;x<=13;x++)for(let z=0;z<=3;z++)add(x,z);}
 return cells;
}
function route(cells,from,to){
 if(!cells.has(to)||from===to)return [];
 const queue=[from],parent=new Map([[from,null]]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=coords(queue[i]);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=key(x+dx,z+dz);
   if(parent.has(next)||!cells.has(next))continue;
   parent.set(next,queue[i]);queue.push(next);
   if(next===to){const result=[];for(let k=to;k!==from;k=parent.get(k))result.push(k);return result.reverse();}
  }
 }
 return [];
}
const phases=[
 [0,'Night',0x152747,0x9ab6fc,.72],[4.5,'Night',0x243454,0x9eacea,.77],
 [5.6,'Dawn',0xa06f89,0xffb684,1.15],[6.6,'Golden hour',0xf1ba86,0xffbd70,2.05],
 [8,'Morning',0x9cd3df,0xffe8c3,2.35],[12,'Midday',0xb7e3f4,0xfff5df,3],
 [15,'Afternoon',0x96c9df,0xffdfab,2.55],[17.7,'Golden hour',0xedac7c,0xffaf61,1.95],
 [19,'Evening',0xb27a88,0xffa67e,1.32],[20.2,'Dusk',0x565273,0xc1aedb,.95],
 [21.6,'Night',0x192947,0x9eb6fc,.72],[24,'Night',0x152747,0x9ab6fc,.72]
];
function daylight(hour){
 const h=((hour%24)+24)%24;
 const i=phases.findIndex((p,j)=>j<phases.length-1&&h<phases[j+1][0]),a=phases[i],b=phases[i+1];
 const t=(h-a[0])/(b[0]-a[0]);
 return {label:a[1],a,b,t,h};
}
window.HOTEL_CAMPAIGN={floors,plan,route,daylight,launch};
function launch(renderer,canvas,onLeave,autoStart=false){
 const $=id=>document.getElementById(id),ui=$('campaign-ui'),scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(45,1,.1,180);
 const sky=new THREE.HemisphereLight(0xe3f4ff,0x6c5144,1.7),sun=new THREE.DirectionalLight(0xffcca0,2);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:16,bottom:-16});sun.shadow.bias=-.001;
 const fill=new THREE.DirectionalLight(0xffe4cb,1.5);fill.position.set(-4,8,12);scene.add(sky,sun,fill);scene.background=new THREE.Color();scene.fog=new THREE.Fog(0x8193ae,30,85);
 const round=new THREE.SphereGeometry(1,12,8),cube=new THREE.BoxGeometry(),materials=new Map(),textures=[];
 let touring=autoStart, tourDelay=0;
 let deck,objects=[],index=4,tiles,exit,hero,guests=[],convoy=[],inputs=new Set(),path=[],elapsed=0,paused=false,won=false,foot=0,phaseStamp='',message='',lastMessage='',stepTime=0,callTime=3;
 const controller=new AbortController(),listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal});
 function mat(c,lit=false){const k=c+':'+lit;if(!materials.has(k))materials.set(k,lit?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshStandardMaterial({color:c,roughness:.76}));return materials.get(k);}
 function block(x,y,z,w,h,d,c,parent=deck,lit=false){const o=new THREE.Mesh(cube,mat(c,lit));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function sign(text,x,y,z,scale=2){
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
  ctx.fillStyle='#142329';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f4dca6';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 48px system-ui';ctx.fillText(text,256,48,486);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);
  const material=new THREE.SpriteMaterial({map:tex,depthTest:false});objects.push(material);
  const sprite=new THREE.Sprite(material);sprite.scale.set(scale,scale*96/512,1);sprite.position.set(x,y,z);sprite.renderOrder=4;deck.add(sprite);return sprite;
 }
 // Repeatable, hand-drawn brocade and parquet patterns at room scale.
 function surfaceMaterial(tone,runner=false){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle='#'+tone.toString(16).padStart(6,'0');g.fillRect(0,0,128,128);
  if(runner){
   g.strokeStyle='#c19d65';g.lineWidth=2;
   for(const y of [8,14,114,120]){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}
   for(const x of [0,64,128]){g.beginPath();g.moveTo(x,38);g.lineTo(x+22,64);g.lineTo(x,90);g.lineTo(x-22,64);g.closePath();g.stroke();}
  }else{
   for(let r=0;r<8;r++)for(let j=-1;j<4;j++){
    const x=j*48+(r%2)*24,y=r*16;
    g.fillStyle='rgba(245,210,153,'+(.025+((r*13+j*7+20)%8)*.012)+')';g.fillRect(x+1,y+1,46,14);
    g.fillStyle='rgba(35,15,8,.22)';g.fillRect(x,y,1,16);g.fillRect(x,y,48,1);
   }
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const m=new THREE.MeshStandardMaterial({map:tex,roughness:runner?.95:.65});textures.push(tex);objects.push(m);return m;
 }
 function oval(x,y,z,sx,sy,sz,col){
  const o=new THREE.Mesh(round,mat(col));o.position.set(x,y,z);o.scale.set(sx,sy,sz);deck.add(o);return o;
 }
 function person(name,outfit,id,leader=false){
  const [x,z]=coords(id),rig=PEOPLE.make(outfit);deck.add(rig.g);rig.g.position.set(wx(x),0,wz(z));
  const actor={name,rig,id,next:null,fraction:0,kind:leader?'p':'c',vx:0,vz:0,aim:0,joined:leader};
  // A luggage tag and a porter’s brass shoulder lamp keep roles visible from above.
  block(.22,1.12,-.12,.15,.22,.12,leader?0xffce70:0x59d4c1,rig.g,true);
  if(leader){
   block(.25,.9,-.09,.19,.31,.28,0x996944,rig.body);
   block(.06,1.24,-.16,.07,.71,.04,0xc2975f,rig.body).rotation.z=-.48;
  }else if(name==='Gardener'||name==='Stargazer'){
   block(0,1.15,-.21,.35,.46,.19,name==='Gardener'?0x867044:0x405d80,rig.body);
   block(0,1.25,-.32,.28,.05,.03,0xc2a272,rig.body);
  }else if(name==='Singer'||name==='Pianist'){
   block(0,1.41,.15,.28,.09,.04,0xd9a55c,rig.body);
  }
  if(!leader)actor.tag=sign(name,wx(x),2.18,wz(z),2.3);
  return actor;
 }
 function stairCell(f){return key(f%2?0:12,0);}
 function build(){
  if(deck){for(const a of [hero,...guests,...convoy].filter((v,i,a)=>a.indexOf(v)===i))PEOPLE.dispose(a.rig);scene.remove(deck);textures.splice(0).forEach(x=>x.dispose());objects.splice(0).forEach(x=>x.dispose());}
  const carry=convoy.map(a=>[a.name,a.rig.o]);convoy=[];deck=new THREE.Group();scene.add(deck);
  const f=floors[index];tiles=plan(index);exit=index?stairCell(index):key(...f.exit);
  const start=stairCell(index+1);hero=person('Porter',{...PEOPLE.OUTFITS.porter(),gun:false},start,true);
  for(const [name,outfit] of carry){const a=person(name,outfit,start);a.joined=true;a.tag.visible=false;convoy.push(a);}
  guests=f.guests.map((name,i)=>person(name,PEOPLE.OUTFITS[({Bride:'bride',Groom:'groom',Concierge:'staff',Gardener:'elderly',Pianist:'groom','Night auditor':'staff'})[name]||'guest'](),key(...f.spots[i])));
  const wood=surfaceMaterial(0x936c50),carpet=surfaceMaterial(0x803e46,true);
  for(const id of tiles){const [x,z]=coords(id),X=wx(x),Z=wz(z);
   const flooring=block(X,-.17,Z,cell,.32,cell,0x936c50);flooring.material=wood;
   if(z===0){block(X,.002,Z,cell,.012,.8,0x85454a).material=carpet;for(const s of [-1,1])block(X,.012,Z+s*.34,cell,.01,.035,0xdcb776);}
   for(const [dx,dz] of [[0,-1],[0,1],[-1,0],[1,0]]){
    if(tiles.has(key(x+dx,z+dz))||(!index&&x>=12&&z>0))continue;
    const h=dz===-1?1.50:.32,w=dx?.12:cell,d=dx?cell:.12,xx=X+dx*cell/2,zz=Z+dz*cell/2;
    block(xx,h/2,zz,w,h,d,0xbba990);block(xx,h,zz,w+.025,.07,d+.025,0x483f40);
    if(dz===-1){block(xx,.28,zz+.075,w,.42,.03,f.colour);block(xx,.53,zz+.09,w,.045,.05,0xd5b978);
     if(z===-3&&x%2){block(xx,.98,zz+.08,.51,.56,.06,0xd3ae68);block(xx,.98,zz+.12,.44,.48,.03,f.colour);block(xx,1,zz+.14,.29,.032,.025,0xf3d696);}}
    if(dz===-1&&z===-3&&x%2===0){block(xx,.69,zz+.08,.92,.63,.05,0xa6d9e2);block(xx,.70,zz+.12,.045,.64,.05,0xfcdfb3);}
   }
  }
  // Furnish the backs of the guest rooms while leaving the walkable cell centres clear.
  for(const [cx,side] of f.rooms){
   const X=wx(cx-2),Z=wz(3*side)+side*.38;
   block(X,.42,Z+side*.27,1.68,.82,.09,f.colour);block(X,.85,Z+side*.27,1.7,.045,.12,0xe7c888);
   block(X,.23,Z,1.27,.42,1.76,0x5e463c);block(X,.49,Z,1.3,.15,1.79,index?0xe7dbbb:0x93654f);
   block(X,.62,Z+side*.58,1.02,.13,.39,0xf4eccf);block(X,.60,Z-side*.38,1.31,.07,.81,f.colour);
   // A different landmark on each floor: palms, stage piano, banquet florals or telescope.
   const fx=wx(cx+2),fz=wz(3*side)+side*.3;
   if(index===4){
    for(const d of [-1,1])block(fx+d*.18,.3,fz,.07,.65,.08,0xae8c56).rotation.z=-d*.29;
    const lens=block(fx,.88,fz,.24,.25,.82,0x3f595e);lens.rotation.x=-.48;
    oval(fx,1.04,fz-.32,.14,.13,.08,0x98d5e2);
   }else if(index===3){
    block(fx,.63,fz,1.2,.61,.57,0x332d35);block(fx,.56,fz-side*.34,1.12,.06,.23,0xffe9bd);
    for(let k=0;k<8;k++)block(fx-.48+k*.13,.61,fz-side*.32,.05,.07,.13,0x312f32);
   }else{
    block(fx,.24,fz,.42,.45,.42,index===1?0xe8c5b8:0x9e755e);
    for(let k=0;k<7;k++){const a=k*.9;const leaf=oval(fx+Math.cos(a)*.18,.67+k*.06,fz+Math.sin(a)*.18,.12,.36,.14,index===1?0xdba6a2:0x407c60);leaf.rotation.z=Math.cos(a)*.65;}
   }
   block(X+1.02,.32,Z,.42,.64,.4,0x57443e);block(X+1.02,.82,Z,.34,.32,.34,0xffd595,deck,true);
  }
  const [ex,ez]=coords(exit),X=wx(ex),Z=wz(ez);
  if(index){for(let k=0;k<5;k++)block(X,.06+k*.05,Z+.52-k*.23,1.1,.10+k*.10,.23,0xc9bb9e);}
  else{block(X+2.1,.96,Z,2.4,1.68,5.2,0x225854);
   block(X+.88,1.08,Z,.09,1.86,.85,0x183030);block(X+.63,.16,Z,.58,.2,.85,0xd3c492);
   for(let j=-2;j<=2;j++)block(X+.86,1.70,Z+j*.85,.12,.59,.06,0x315957);block(X+2.1,1.68,Z,2.44,.58,4.8,0x9bd4d7);block(X+2.1,2.05,Z,2.5,.17,5.25,0xe4d7aa);
   for(const z of [-1.72,1.72])for(const x of [-1.13,1.13])block(X+2.1+x,.36,Z+z,.28,.64,.69,0x182124);}
  sign(index?'STAIRS ↓':'COACH',X,1.85,Z,2.4);
  block(0,-1.9,-23,92,.9,16,0x778583);block(0,-1.52,-15.4,92,.2,1.1,0xc6b59e);
  for(let i=0;i<18;i++){
   const h=2.4+(i*7%6)*.62,x=(i-9)*3.2,z=-18-(i%3)*1.1;
   block(x,h/2-1.5,z,3.05,h,2.4,[0x82766a,0x737a79,0x82726e][i%3]);
   block(x,h-1.42,z,3.16,.15,2.52,0x40474c);
   block(x+.84,h-1.16,z,.25,.72,.34,0x835c4c);
   for(let row=0;row<Math.floor(h/1.1);row++)for(let j=0;j<3;j++){
    block(x+j*.78-.78,-.88+row*1.05,z+1.21,.43,.65,.05,(i+j+row)%3?0x54636a:0xf7cb84);
   }
  }
  block(0,-1.26,0,20,1.86,11.8,0x596067);
  for(const [cx,side,w] of f.rooms){
   // The bedside cabinet and the upholstered bench occupy the end cells.
   tiles.delete(key(cx-w,side*3));tiles.delete(key(cx+w,side*3));
  }
  block(0,-2.3,0,115,.3,78,0x496f79);
  for(let i=0;i<65;i++)block((i*7%41)-20,-2.13,-10-(i*3%15),.3+(i%6)*.32,.014,.035,0x91b4b4);
  // Batch repeated architecture and decorations into a handful of draw calls.
  const batches=new Map();for(const o of [...deck.children])if(o.isMesh){
   const k=o.geometry.uuid+o.material.uuid;if(!batches.has(k))batches.set(k,[]);batches.get(k).push(o);
  }
  for(const meshes of batches.values()){
   const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
   meshes.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);deck.remove(m);});
   batch.castShadow=batch.receiveShadow=true;deck.add(batch);objects.push(batch);
  }path=[];inputs.clear();phaseStamp='';message='';lastMessage='';stepTime=0;tourDelay=1.8;foot=0;
  $('campaign-floor').textContent=(index?'Floor '+index:'Ground')+' / '+f.name;
  AUDIO.setFire(0);AUDIO.setSiren(0);SFX.landing(index);
 }
 function objective(){const unjoined=guests.filter(a=>!a.joined);return unjoined.length?'Find '+unjoined.map(a=>a.name).join(' and '):index?'Lead everyone to the stairs':'Bring everyone to the coach';}
 function stepActor(a,id,dt,speed){
  if(!a.next&&id&&tiles.has(id)&&id!==a.id){a.next=id;a.fraction=0;}
  if(!a.next){a.vx=a.vz=0;PEOPLE.pose(a.rig,a,dt);return;}
  const [x,z]=coords(a.id),[nx,nz]=coords(a.next);a.fraction=Math.min(1,a.fraction+speed*dt);
  a.vx=(nx-x)*speed*cell;a.vz=(nz-z)*speed*cell;
  a.rig.g.position.set(wx(x+(nx-x)*a.fraction),0,wz(z+(nz-z)*a.fraction));a.rig.g.rotation.y=Math.atan2(a.vx,a.vz);PEOPLE.pose(a.rig,a,dt);
  if(a.fraction===1){a.id=a.next;a.next=null;}
 }
 function move(dt){
  const [x,z]=coords(hero.id);let next=null;
  if(!hero.next){
   const dir=[...inputs].at(-1);
   if(dir){const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[dir];next=key(x+d[0],z+d[1]);path=[];}
   else next=path.shift();
  }
  stepActor(hero,next,dt,3.1);
  for(const g of guests)if(!g.joined&&g.id===hero.id){g.joined=true;g.tag.visible=false;convoy.push(g);SFX.saved();message=g.name+' joined the group';stepTime=2;tourDelay=1.4;}
  callTime-=dt;
  if(callTime<=0){
   const nextGuest=guests.find(g=>!g.joined);
   if(nextGuest){const point=nextGuest.rig.g.position;SFX.guestCall(point.x,point.z);}
   callTime=9;
  }
  let leader=hero;let order=0;
  for(const g of convoy){
   const catchUp=route(tiles,g.id,leader.id);
   const gather=hero.id===exit&&guests.every(guest=>guest.joined);
   const next=!g.next&&(gather||catchUp.length>1)?catchUp[0]:null;
   stepActor(g,next,dt,3.45);
   if(!g.next){const [x,z]=coords(g.id);g.rig.g.position.set(wx(x)+(order%2?.32:-.32),0,wz(z)+.28);}
   order++;leader=g;
  }
  for(const g of guests)if(!g.joined)PEOPLE.pose(g.rig,g,dt);
  if(hero.id===exit&&!hero.next&&guests.every(g=>g.joined)){
   if(convoy.every(g=>g.id===exit&&!g.next)){
    if(index){index--;build();return;}
    for(const [i,g] of convoy.entries()){
     g.rig.g.position.set(wx(13)+1.65+(i%2)*.62,.65,wz(3)-1.85+Math.floor(i/2)*.81);
    }
    won=true;SFX.coachDeparture();$('campaign-action').textContent=touring?'Watch the night shift':'Return to reception';tourDelay=3;$('campaign-pause').hidden=true;
   }else{message='Hold here for the rest of the group';stepTime=.4;}
  }
  foot-=dt;if((hero.vx||hero.vz)&&foot<=0){SFX.footstep(hero.rig.g.position.x,hero.rig.g.position.z,index?'carpet':'street');foot=.34;}
  AUDIO.setListener(hero.rig.g.position.x,hero.rig.g.position.z,0);AUDIO.setIntensity(index*.07);AUDIO.setScene({danger:index*.06,health:100,indoors:index>0||hero.id!==exit});
 }
 function choose(id){if(paused||won)return;inputs.clear();path=route(tiles,hero.next||hero.id,id);}
 function guide(){const g=guests.find(g=>!g.joined);choose(g?g.id:exit);}
 function leave(continueTour=false){controller.abort();for(const a of new Set([hero,...guests,...convoy]))PEOPLE.dispose(a.rig);materials.forEach(m=>m.dispose());textures.forEach(m=>m.dispose());objects.forEach(m=>m.dispose());round.dispose();cube.dispose();ui.hidden=true;AUDIO.setPaused(true);onLeave(continueTour);}
 function pause(value){if(won)return;paused=value;$('campaign-action').disabled=value;inputs.clear();$('campaign-pause').textContent=value?'Resume':'Pause';AUDIO.setPaused(value);}
 function tick(dt){
  if(!paused&&!won){elapsed+=dt;stepTime-=dt;
   tourDelay-=dt;
   if(touring&&tourDelay<=0&&!path.length&&!hero.next)guide();
   move(dt);}
  if(won&&touring&&(tourDelay-=dt)<=0){leave(true);return;}
  const light=daylight(18+elapsed/2.5),{a,b,t,h}=light;
  scene.background.setHex(a[2]).lerp(skyTint.setHex(b[2]),t);scene.fog.color.copy(scene.background);
  sun.color.setHex(a[3]).lerp(skyTint.setHex(b[3]),t);sun.intensity=a[4]+(b[4]-a[4])*t;
  sky.color.copy(scene.background).lerp(white,.55);sky.intensity=.85+sun.intensity*.55;
  const angle=(h-6)*Math.PI/12;sun.position.set(Math.cos(angle)*14,5+Math.max(0,Math.sin(angle))*19,7);
  const minutes=Math.floor(h*60);const stamp=light.label+' · '+String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  if(light.label==='Dawn'&&!phaseStamp.startsWith('Dawn')&&phaseStamp)SFX.dawn();
  if(stamp!==phaseStamp){$('campaign-light').textContent=stamp;phaseStamp=stamp;}
  const status=won?'All '+convoy.length+' guests aboard. The coach is leaving.':paused?'Shift paused':stepTime>0?message:objective();
  if(status!==lastMessage){$('campaign-status').textContent=status;lastMessage=status;}
  $('campaign-count').textContent=convoy.length+' / 9 guests';
  const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
  camera.aspect=aspect;camera.fov=aspect<1?53:41;camera.updateProjectionMatrix();
  const v=hero.rig.g.position,focusX=v.x*(aspect<1?.98:.84),focusZ=v.z*.85;
  camera.position.set(focusX,aspect<1?13:11,focusZ+13);camera.lookAt(focusX,.3,focusZ-.65);renderer.render(scene,camera);
 }
 const white=new THREE.Color(0xffffff),skyTint=new THREE.Color();
 function syncTour(){
  $('campaign-register').textContent=touring?'AUTO TOUR · EVACUATION':'PORTER’S REGISTER';
  $('campaign-action').textContent=touring?'Take control':'Guide to next stop';
 }
 function takeOver(){touring=false;path=[];syncTour();}
 ui.hidden=false;$('campaign-action').disabled=false;$('campaign-pause').hidden=false;$('campaign-pause').textContent='Pause';syncTour();
 listen($('campaign-action'),'click',()=>{if(paused)return;if(won){leave(touring);return;}if(touring)takeOver();else guide();});
 listen($('campaign-pause'),'click',()=>pause(!paused));listen($('campaign-leave'),'click',()=>leave());
 listen($('campaign-audio'),'click',()=>{AUDIO.toggleMute();audioLabel();});
 function audioLabel(){$('campaign-audio').textContent=AUDIO.status().muted?'Sound off':'Sound on';}
 listen(window,'blur',()=>pause(true));listen(document,'visibilitychange',()=>{if(document.hidden)pause(true);});
 listen(window,'keydown',e=>{const k=({w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'})[e.key.toLowerCase()]||e.key;
  if(['Escape','p','P'].includes(k)&&!e.repeat){pause(!paused);return;}
  if(k.startsWith('Arrow')&&!paused&&!won){e.preventDefault();if(touring)takeOver();inputs.add(k);}});
 listen(window,'keyup',e=>inputs.delete(({w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'})[e.key.toLowerCase()]||e.key));
 listen(canvas,'pointerdown',e=>{if(paused||won)return;if(touring)takeOver();const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
  const point=new THREE.Vector3();if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point))choose(key(Math.round(point.x/cell+6),Math.round(point.z/cell)));});
 AUDIO.start();AUDIO.setPaused(false);audioLabel();build();return {tick};
}
})();
