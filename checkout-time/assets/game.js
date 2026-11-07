// Checkout Time — The Grand Last Resort. All characters and places are invented.
(function(){
'use strict';
const W=window.WORLD,S=W.S,THREE=window.THREE;
const $=s=>document.querySelector(s);
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const PREF={gore:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,mix:'cinema'};
try{const p=JSON.parse(localStorage.getItem('checkout-presentation')||'{}');if(typeof p.gore==='boolean')PREF.gore=p.gore;if(typeof p.motion==='boolean')PREF.motion=p.motion;if(p.mix==='quiet')PREF.mix='quiet';}catch(e){}
function syncPrefs(){document.body?.classList.toggle('calm-motion',!PREF.motion);$('#gore-toggle').textContent='Gore: '+(PREF.gore?'Full':'Reduced');$('#gore-toggle').setAttribute('aria-pressed',String(PREF.gore));$('#motion-toggle').textContent='Motion: '+(PREF.motion?'Cinema':'Reduced');$('#motion-toggle').setAttribute('aria-pressed',String(PREF.motion));$('#mix-toggle').textContent='Mix: '+(PREF.mix==='quiet'?'Quiet':'Cinema');AUDIO.setMix(PREF.mix);try{localStorage.setItem('checkout-presentation',JSON.stringify(PREF));}catch(e){}}
const px=v=>v*S; // layout units -> metres
let seed=4242;const srnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};

// ================================================================ renderer
const canvas=$('#view');
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('#title').hidden=true;$('#game-error').hidden=false;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x05080d);
scene.fog=new THREE.Fog(0x05080d,26,62);
const camera=new THREE.PerspectiveCamera(42,1,.1,200);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?58:42;camera.updateProjectionMatrix();$('#touch').hidden=$('#hud').hidden||!(matchMedia('(pointer:coarse)').matches||w<760);}
addEventListener('resize',resize);resize();

const hemi=new THREE.HemisphereLight(0x7a8cc0,0x1c241c,2.1);scene.add(hemi);
const moon=new THREE.DirectionalLight(0xa9bcff,1.7);moon.position.set(-14,26,18);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:70});moon.shadow.bias=-.0008;
scene.add(moon,moon.target);

// ================================================================ materials
const matCache={};
function lam(color,extra){const k=color+JSON.stringify(extra||{});return matCache[k]||(matCache[k]=new THREE.MeshLambertMaterial(Object.assign({color},extra||{})));}
function glow(color,i=1){return lam(color,{emissive:color,emissiveIntensity:i});}
function mesh(geo,mat,x=0,y=0,z=0,parent=scene,shadow=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(shadow){m.castShadow=true;m.receiveShadow=true;}parent.add(m);return m;}
const BOX=new THREE.BoxGeometry(1,1,1),CYL=new THREE.CylinderGeometry(1,1,1,16),SPH=new THREE.SphereGeometry(1,16,12);
function box(w,h,d,mat,x,y,z,parent,rotY=0){const m=mesh(BOX,mat,x,y,z,parent);m.scale.set(w,h,d);m.rotation.y=rotY;return m;}
function cyl(r,h,mat,x,y,z,parent){const m=mesh(CYL,mat,x,y,z,parent);m.scale.set(r,h,r);return m;}

// ================================================================ world: build grid, rooms, props
W.inflate();
const PLAN_WALL=W.wall.slice(); // walls from the drawing only (before cars and furniture), for the minimap
W.rooms=W.assignRooms();
const roomByName=n=>W.rooms.find(r=>r.name===n);

// ---- floor texture painted from the plan grid
const BX0=200,BZ0=270,BX1=1420,BZ1=1340,CPX=8;
function paintFloor(){
  const cw=Math.ceil((BX1-BX0)/W.CELL),ch=Math.ceil((BZ1-BZ0)/W.CELL);
  const c=document.createElement('canvas');c.width=cw*CPX;c.height=ch*CPX;const g=c.getContext('2d');
  const gx0=Math.floor((BX0-W.GX0)/W.CELL),gz0=Math.floor((BZ0-W.GZ0)/W.CELL);
  const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);let r=n>>16,gg=n>>8&255,b=n&255;r=clamp(r*f,0,255)|0;gg=clamp(gg*f,0,255)|0;b=clamp(b*f,0,255)|0;return `rgb(${r},${gg},${b})`;};
  for(let z=0;z<ch;z++)for(let x=0;x<cw;x++){
    const i=(gz0+z)*W.GW+gx0+x;if(i<0||i>=W.N||!W.inside[i])continue;
    const r=W.room[i]>=0?W.rooms[W.room[i]]:null,X=gx0+x,Z=gz0+z;
    let col;
    if(!r)col=((X+Z)%2?shade('#3b2a22',1):shade('#3b2a22',.92));
    else{const t=r.theme,h=(Math.sin(X*12.9898+Z*78.233)*43758.5453)%1;
      switch(t.floor){
        case 'wood':{const plank=Math.floor(Z/2),off=(plank*7)%5;col=shade(t.tint,.85+((plank*37)%9)/40+((X+off)%6===0?-.18:0));break;}
        case 'parquet':col=shade(t.tint,((Math.floor(X/2)+Math.floor(Z/2))%2)?1.1:.82);break;
        case 'tile':col=shade(t.tint,(X+Z)%2?1:.72);break;
        case 'concrete':col=shade(t.tint,.9+Math.abs(h)*.2);break;
        case 'rubber':col=shade(t.tint,.95+Math.abs(h)*.15);break;
        default:col=shade(t.tint,.9+Math.abs(h)*.14+((X%8===0||Z%8===0)?-.12:0));}
    }
    g.fillStyle=col;g.fillRect(x*CPX,z*CPX,CPX,CPX);
  }
  // Fictional arcade geometry.
  g.textAlign='center';g.textBaseline='middle';
  W.rooms.forEach(r=>{const X=(r.lx/S-BX0)/W.CELL*CPX,Z=(r.lz/S-BZ0)/W.CELL*CPX;g.font=`600 ${r.cells.length>300?28:18}px ui-monospace,Consolas,monospace`;g.fillStyle='rgba(230,255,240,.22)';g.fillText(r.name.replace(' (plan label)','').toUpperCase(),X,Z);});
  W.FE_POINTS.forEach(([X,Z])=>{const x=(X-BX0)/W.CELL*CPX,z=(Z-BZ0)/W.CELL*CPX;g.strokeStyle='rgba(57,255,136,.45)';g.lineWidth=2;g.strokeRect(x-14,z-10,28,20);g.fillStyle='rgba(57,255,136,.6)';g.font='600 13px monospace';g.fillText('FE',x,z);});
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const geo=new THREE.PlaneGeometry(cw*W.CELL*S,ch*W.CELL*S);
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:tex,alphaTest:.5,transparent:false}));
  m.rotation.x=-Math.PI/2;m.position.set((W.GX0+gx0*W.CELL)*S+cw*W.CELL*S/2,.012,(W.GZ0+gz0*W.CELL)*S+ch*W.CELL*S/2);m.receiveShadow=true;scene.add(m);
}
paintFloor();
  // Fictional arcade geometry.
const wallMat=lam(0x576059),capMat=glow(0x39ff88,.55),outerMat=lam(0x515951);
const plaster=(()=>{const c=document.createElement('canvas');c.width=c.height=96;const a=c.getContext('2d');a.fillStyle='#aaa';a.fillRect(0,0,96,96);for(let i=0;i<2400;i++){const v=140+Math.floor(Math.random()*65);a.fillStyle='rgb('+v+','+v+','+v+')';a.fillRect(Math.random()*96,Math.random()*96,1,1);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;})();wallMat.map=plaster;outerMat.map=plaster;
const outerWalls=new THREE.Group(),innerWalls=new THREE.Group();scene.add(outerWalls,innerWalls);
function wallSeg(a,b,group,h,mat,t=.14){
  const ax=px(a[0]),az=px(a[1]),bx=px(b[0]),bz=px(b[1]),L=Math.hypot(bx-ax,bz-az);if(L<.05)return;
  const g=new THREE.Group();g.position.set((ax+bx)/2,0,(az+bz)/2);g.rotation.y=-Math.atan2(bz-az,bx-ax);group.add(g);
  const m=mesh(BOX,mat,0,h/2,0,g);m.scale.set(L+t,h,t);
  const c=mesh(BOX,capMat,0,h+.01,0,g,false);c.scale.set(L+t,.03,t+.02);
}
W.WALLS.forEach((poly,pi)=>{for(let k=0;k<poly.length-1;k++){
  // skip pieces of the outline that are cut for entrances
  const a=poly[k],b=poly[k+1];
  {const cuts=W.doors.filter(d=>W.segDist((d.ax+d.bx)/2,(d.az+d.bz)/2,a[0],a[1],b[0],b[1])<14);
    if(cuts.length){let pts=[a];const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz;
      const ts=cuts.map(d=>{const t1=((d.ax-a[0])*dx+(d.az-a[1])*dz)/L2,t2=((d.bx-a[0])*dx+(d.bz-a[1])*dz)/L2;return [Math.min(t1,t2),Math.max(t1,t2)];}).sort((p,q)=>p[0]-q[0]);
      let t0=0;ts.forEach(([s,e])=>{if(s>t0)wallSeg([a[0]+dx*t0,a[1]+dz*t0],[a[0]+dx*s,a[1]+dz*s],pi===0?outerWalls:innerWalls,pi===0?1:1.15,pi===0?outerMat:wallMat,.22);t0=e;});
      if(t0<1)wallSeg([a[0]+dx*t0,a[1]+dz*t0],b,pi===0?outerWalls:innerWalls,pi===0?1:1.15,pi===0?outerMat:wallMat,.22);continue;}
    wallSeg(a,b,pi===0?outerWalls:innerWalls,pi===0?1:1.15,pi===0?outerMat:wallMat,.22);
  }
}});
  // Fictional arcade geometry.
const EXIT_GEO=new THREE.PlaneGeometry(.62,.24),EXIT_MAT=(()=>{const c=document.createElement('canvas');c.width=128;c.height=48;const g=c.getContext('2d');g.fillStyle='#0a8a3a';g.fillRect(0,0,128,48);g.fillStyle='#eafff2';g.font='700 30px monospace';g.textAlign='center';g.fillText('EXIT',64,33);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,fog:false});})();
const plankMat=lam(0x8a5a2b),doorMat=lam(0x5b3a22),frameMat=glow(0x39ff88,.8);
W.doors.forEach(d=>{
  const g=new THREE.Group();g.position.set(d.x,0,d.z);g.rotation.y=-d.ang;scene.add(g);
  const L=d.len;
  box(.08,2.1,.2,frameMat,-L/2,1.05,0,g);box(.08,2.1,.2,frameMat,L/2,1.05,0,g);
  const panel=box(L*.96,1.9,.06,doorMat,0,.95,0,g);panel.visible=false;
  const planks=[0,1,2].map(k=>{const p=box(L*1.15,.16,.08,plankMat,0,.5+k*.5,.07,g);p.rotation.z=(k-1)*.35;p.visible=false;return p;});
  // open door leaf swung against the wall
  // open leaf folded back flat against the wall beside the opening, so it doesn't stand out into the room
  const leaf=box(L*.9,1.9,.04,doorMat,0,.95,0,g);leaf.position.set(-L*.97,.95,.11);
  // illuminated EXIT signs over every way out to the street, readable from both sides
  if(d.kind==='entrance'){for(const side of [1,-1]){const s=new THREE.Mesh(EXIT_GEO,EXIT_MAT);s.position.set(0,2.0,side*.13);s.rotation.y=side>0?0:Math.PI;g.add(s);}}
  d.mesh={g,panel,planks,leaf,shake:0};
});
function refreshDoor(d){const m=d.mesh;m.panel.visible=d.barricaded;m.leaf.visible=!d.barricaded;const n=d.barricaded?Math.ceil(d.hp/34):0;m.planks.forEach((p,k)=>p.visible=k<n);}

// ---- building mass above the ground floor (hidden when the player is inside)
const upper=new THREE.Group();scene.add(upper);
(function(){
  const shape=new THREE.Shape(W.OUTLINE.map(([X,Z])=>new THREE.Vector2(px(X),-px(Z))));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:12.16,bevelEnabled:false});
  const mat=new THREE.MeshLambertMaterial({color:0x252e2b,transparent:true,opacity:1,side:THREE.DoubleSide});
  const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.y=3.04;m.castShadow=true;upper.add(m);upper.userData.mats=[mat];
  // windows on outward-facing outline segments, four storeys
  const spots=[];const O=W.OUTLINE;let area=0;for(let i=0;i<O.length;i++){const a=O[i],b=O[(i+1)%O.length];area+=a[0]*b[1]-b[0]*a[1];}const sgn=Math.sign(area);
  for(let i=0;i<O.length;i++){const a=O[i],b=O[(i+1)%O.length],L=Math.hypot(b[0]-a[0],b[1]-a[1])*S;if(L<1.4)continue;
    const ux=(b[0]-a[0])*S/L,uz=(b[1]-a[1])*S/L,nx=uz*sgn,nz=-ux*sgn;if(nz<-.6)continue;
    const n=Math.floor(L/1.7);for(let k=0;k<n;k++){const t=(k+.5)/n;for(let f=1;f<5;f++)spots.push([px(a[0])+ux*L*t+nx*.03,3.04*f+1.5,px(a[1])+uz*L*t+nz*.03,Math.atan2(nx,nz)]);}}
  const win=new THREE.InstancedMesh(new THREE.PlaneGeometry(.8,1.35),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}),spots.length);
  const M=new THREE.Matrix4(),q=new THREE.Quaternion(),col=new THREE.Color();
  spots.forEach((s,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),s[3]);M.compose(new THREE.Vector3(s[0],s[1],s[2]),q,new THREE.Vector3(1,1,1));win.setMatrixAt(i,M);
    const r=Math.random();col.set(r<.45?0xffc277:r<.6?0x9fdcff:r<.66?0x39ff88:0x10161a);win.setColorAt(i,col);});
  upper.add(win);upper.userData.win=win;upper.userData.mats.push(win.material);
  // parapet glow line and sign
  const sc=document.createElement('canvas');sc.width=512;sc.height=96;const g=sc.getContext('2d');g.fillStyle='#0b120e';g.fillRect(0,0,512,96);g.fillStyle='#39ff88';g.font='700 54px ui-monospace,Consolas,monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('GRAND LAST RESORT',256,50);
  const st=new THREE.CanvasTexture(sc);st.colorSpace=THREE.SRGBColorSpace;const sm=new THREE.MeshBasicMaterial({map:st,transparent:true});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,.95),sm);sign.position.set(px(640),3.5,px(1262)+.05);upper.add(sign);upper.userData.mats.push(sm);
})();

// ---- street, promenade, sea
const street=new THREE.Group();scene.add(street);
(function(){
  const X0=-12,X1=52,mk=(z0,z1,color,y=0)=>{const m=mesh(new THREE.PlaneGeometry(X1-X0,px(z1-z0)),lam(color),(X0+X1)/2,y,px((z0+z1)/2),street,false);m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m;};
  mk(150,W.ROAD_Z0,0x2a2d2b,-.01);                // pavements / forecourt / side streets
  const asphalt=mk(W.ROAD_Z0,W.ROAD_Z1,0x17191b,0);asphalt.material.dispose();asphalt.material=new THREE.MeshStandardMaterial({color:0x20262a,roughness:.38,metalness:.12});           // Fictional seafront road
  mk(W.ROAD_Z1,W.PROM_Z1,0x3b3a33,.005);         // promenade walk
  const sand=mk(W.PROM_Z1,W.PROM_Z1+260,0x5b5140,-.4);
  const sea=mesh(new THREE.PlaneGeometry(200,90),new THREE.MeshLambertMaterial({color:0x0a1a2a,emissive:0x061220}),20,-.7,px(W.PROM_Z1)+52,street,false);sea.rotation.x=-Math.PI/2;street.userData.sea=sea;
  // lane markings and tram rails
  for(let x=X0;x<X1;x+=3){const l=mesh(BOX,glow(0xd8d2a0,.15),x,.012,px((W.ROAD_Z0+W.ROAD_Z1)/2),street,false);l.scale.set(1.5,.01,.12);}
  [1566,1610].forEach(z=>{const r=mesh(BOX,lam(0x777c80),(X0+X1)/2,.02,px(z),street,false);r.scale.set(X1-X0,.03,.06);});
  // kerbs
  [W.ROAD_Z0,W.ROAD_Z1].forEach(z=>{const k=mesh(BOX,lam(0x55554d),(X0+X1)/2,.06,px(z),street);k.scale.set(X1-X0,.12,.18);});
  // sea wall railing
  const rail=mesh(BOX,lam(0x8fa6a0),(X0+X1)/2,.95,px(W.PROM_Z1)-.1,street);rail.scale.set(X1-X0,.06,.06);
  for(let x=X0;x<X1;x+=2.2)box(.07,1,.07,lam(0x8fa6a0),x,.5,px(W.PROM_Z1)-.1,street);
})();
// lampposts (a few real lights, the rest emissive)
const lampLights=[];
function lamppost(x,z,lit){box(.12,4.4,.12,lam(0x2b3330),x,2.2,z,street);box(.9,.08,.1,lam(0x2b3330),x+.4,4.35,z,street);
  const bulb=mesh(SPH,glow(0xffd8a0,lit?2:.1),x+.8,4.25,z,street,false);bulb.scale.setScalar(.14);
  if(lit){const l=new THREE.PointLight(0xffc98a,55,18,1.5);l.position.set(x+.8,4.1,z);scene.add(l);lampLights.push({l,bulb,base:55,flick:Math.random()<.35});}}
[[2,1735],[11,1735],[20,1735],[29,1735],[38,1735],[-6,1735]].forEach(([x,z],i)=>lamppost(x,px(z),i<4));
[[6,1445],[24,1445]].forEach(([x,z])=>lamppost(x,px(z),false));

// ---- burnt-out cars, the crash, the horse tram and the coach (all block the grid)
const fires=[];
function car(X,Z,rot,state){
  const g=new THREE.Group();g.position.set(px(X),0,px(Z));g.rotation.y=-rot;street.add(g);
  const burnt=state!=='ok',body=lam(burnt?0x1a1714:pick([0x7a1e1e,0x1e3f7a,0xc9c3b0,0x2f5d3a])),glass=lam(burnt?0x0b0b0b:0x223344);
  box(4.2,.75,1.8,body,0,.62,0,g);box(2.2,.62,1.62,glass,-.2,1.28,0,g);
  [[-1.35,.85],[1.35,.85],[-1.35,-.85],[1.35,-.85]].forEach(([x,z])=>{const w=cyl(.36,.24,lam(0x0d0d0d),x,.36,z,g);w.rotation.x=Math.PI/2;});
  if(!burnt){mesh(SPH,glow(0xfff2c0,2),2.1,.7,.6,g,false).scale.setScalar(.1);mesh(SPH,glow(0xfff2c0,2),2.1,.7,-.6,g,false).scale.setScalar(.1);}
  W.addObstacle(X,Z,4.4/S,2/S,rot);
  if(state==='fire'){const l=new THREE.PointLight(0xff7a2a,70,14,1.5);l.position.set(px(X),1.8,px(Z));scene.add(l);fires.push({x:px(X),z:px(Z),l,t:Math.random()*9});}
  if(state==='smoke')fires.push({x:px(X),z:px(Z),smoke:true,t:0});
}
car(300,1525,.25,'fire');car(760,1575,-.55,'smoke');car(905,1612,2.05,'fire');car(1185,1500,.1,'burnt');car(-140,1650,0,'burnt');car(1240,1765,.9,'fire');car(520,1680,3.1,'ok');
// horse tram (abandoned) on its rails
(function(){const X=60,Z=1588,g=new THREE.Group();g.position.set(px(X),0,px(Z));street.add(g);
  box(6.2,2.2,2.1,lam(0xcfc3a0),0,1.55,0,g);box(6.4,.12,2.3,lam(0x7a1e1e),0,2.72,0,g);box(6.2,.35,2.12,lam(0x7a1e1e),0,.6,0,g);
  for(let k=-2;k<=2;k++)box(.9,.8,2.14,glow(0xffd28a,.35),k*1.15,1.9,0,g);
  W.addObstacle(X,Z,6.4/S,2.3/S,0);})();
// the coach: the evacuation point
const COACH={X:1660,Z:1640,doorX:px(1505),doorZ:px(1530)};
(function(){const g=new THREE.Group();g.position.set(px(COACH.X),0,px(COACH.Z));street.add(g);
  box(11,2.9,2.6,lam(0xe8e2cc),0,1.85,0,g);box(11.02,.6,2.62,lam(0x1f6b4a),0,.75,0,g);
  for(let k=-4;k<=4;k++)box(1,1,2.64,glow(0xfff0c8,.9),k*1.15,2.4,0,g);
  [[-3.6,1.2],[3.6,1.2],[-3.6,-1.2],[3.6,-1.2]].forEach(([x,z])=>{const w=cyl(.5,.3,lam(0x0d0d0d),x,.5,z,g);w.rotation.x=Math.PI/2;});
  box(.9,2.2,.06,glow(0x39ff88,.6),-4.4,1.5,-1.31,g);
  const sc=document.createElement('canvas');sc.width=512;sc.height=64;const c=sc.getContext('2d');c.fillStyle='#0b120e';c.fillRect(0,0,512,64);c.fillStyle='#ffcb5a';c.font='700 40px ui-monospace,Consolas,monospace';c.textAlign='center';c.fillText('06:00 COACH · SAFE',256,46);
  const t=new THREE.CanvasTexture(sc);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Mesh(new THREE.PlaneGeometry(6,.75),new THREE.MeshBasicMaterial({map:t}));s.position.set(.5,3.6,-1.31);s.rotation.y=Math.PI;g.add(s);
  const s2=s.clone();s2.position.z=-1.32;s2.rotation.y=0;s2.position.set(.5,3.6,-1.32);
  W.addObstacle(COACH.X,COACH.Z,11.2/S,2.8/S,0);
  const l=new THREE.PointLight(0x9fffc8,25,9,1.6);l.position.set(COACH.doorX,2.5,COACH.doorZ);scene.add(l);
  const ring=mesh(new THREE.RingGeometry(1.2,1.45,48),new THREE.MeshBasicMaterial({color:0x39ff88,transparent:true,opacity:.8,side:THREE.DoubleSide}),COACH.doorX,.03,COACH.doorZ,scene,false);ring.rotation.x=-Math.PI/2;COACH.ring=ring;})();
// a little street dressing: suitcases, deckchairs, a vacancies board
(function(){for(let i=0;i<10;i++){const x=rnd(-8,46),z=px(rnd(1340,1450));box(.55,.4,.25,lam(pick([0x7a1e1e,0x214a7a,0x3b5a2a,0xb08a3a])),x,.2,z,street,rnd(3));}
  for(let i=0;i<6;i++){const x=rnd(-6,44),z=px(rnd(1760,1860));const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rnd(6);street.add(g);box(.6,.05,1.1,lam(pick([0x2a6fb0,0xd04040,0xe8c040])),0,.35,0,g).rotation.x=.4;}
  const sc=document.createElement('canvas');sc.width=256;sc.height=96;const c=sc.getContext('2d');c.fillStyle='#f4efe0';c.fillRect(0,0,256,96);c.fillStyle='#7a1e1e';c.font='700 34px Georgia,serif';c.textAlign='center';c.fillText('VACANCIES',128,44);c.font='italic 20px Georgia,serif';c.fillText('(as of tonight)',128,78);
  const t=new THREE.CanvasTexture(sc);t.colorSpace=THREE.SRGBColorSpace;const b=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.5),new THREE.MeshLambertMaterial({map:t}));b.position.set(px(450),1.1,px(1345));street.add(b);box(.06,1,.06,lam(0x333),px(450),.5,px(1342),street);})();

// ---- themed furniture per plan room
const roomLights=[];
function freeSpot(r,margin,avoid){
  for(let k=0;k<60;k++){const [x,z]=W.randomCellIn(r,margin);
    if(W.doors.some(d=>Math.hypot(d.x-x,d.z-z)<2.3))continue; // keep doorways and their approach clear
    if(W.FE_POINTS.some(([X,Z])=>Math.hypot(px(X)-x,px(Z)-z)<1))continue;
    if(placed.some(p=>Math.hypot(p[0]-x,p[1]-z)<p[2]+avoid))continue;
    return [x,z];}
  return null;
}
const placed=[];
function prop(r,size,margin,build,block=true,w=size,d=size){const s=freeSpot(r,margin,size);if(!s)return null;const [x,z]=s,rot=Math.random()<.5?0:Math.PI/2;
  if(block){
    const before=W.wall.slice();W.addObstacle(x/S,z/S,w*.85/S,d*.85/S,rot);W.inflate();
    const field=new Uint16Array(W.N);W.flow(W.cellOf(COACH.doorX,COACH.doorZ),field);
    if(W.rooms.some(room=>!room.cells.some(i=>field[i]<65535))){W.wall.set(before);W.obstacles.pop();W.inflate();return null;}
  }
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);g.scale.setScalar(.85);build(g);placed.push([x,z,size]);return g;}
const B={
  table(g){cyl(.5,.05,lam(0xf2efe6),0,.76,0,g);cyl(.06,.74,lam(0x3a2a1e),0,.38,0,g);for(let k=0;k<4;k++){const a=k*Math.PI/2;box(.36,.45,.36,lam(0x5a2a1e),Math.cos(a)*.72,.23,Math.sin(a)*.72,g);box(.36,.5,.06,lam(0x5a2a1e),Math.cos(a)*.9,.65,Math.sin(a)*.9,g,a+Math.PI/2);}
    cyl(.04,.2,glow(0xffd28a,1.5),0,.9,0,g);},
  armchair(g){const c=lam(pick([0x6b2a36,0x2f4a3a,0x6a5a3a]));box(.8,.45,.8,c,0,.23,0,g);box(.8,.55,.18,c,0,.7,-.32,g);box(.16,.35,.8,c,-.36,.55,0,g);box(.16,.35,.8,c,.36,.55,0,g);},
  sofa(g){const c=lam(0x5a2430);box(1.9,.45,.85,c,0,.23,0,g);box(1.9,.6,.2,c,0,.7,-.33,g);},
  piano(g){box(1.5,1.2,.6,lam(0x0d0d0f),0,.6,0,g);box(1.4,.05,.2,lam(0xf0f0f0),0,.75,.38,g);},
  lamp(g){cyl(.04,1.5,lam(0x333),0,.75,0,g);const s=cyl(.22,.3,glow(0xffc277,1.2),0,1.55,0,g);},
  bar(g){box(2.6,1.05,.6,lam(0x4a2a1a),0,.53,0,g);box(2.7,.06,.7,lam(0x8a6a3a),0,1.07,0,g);for(let k=0;k<6;k++)cyl(.04,.28,glow(pick([0x39ff88,0xffcb5a,0xff6a4a,0x9fdcff]),.6),-1.1+k*.44,1.24,-.1,g);},
  stool(g){cyl(.2,.06,lam(0x7a1e1e),0,.72,0,g);cyl(.04,.7,lam(0x777),0,.36,0,g);},
  steel(g){box(2,.9,.75,lam(0x9aa3a6),0,.45,0,g);box(2.02,.04,.77,lam(0xd8dde0),0,.92,0,g);},
  hob(g){box(1.4,.9,.8,lam(0x6a7073),0,.45,0,g);for(let k=0;k<4;k++){const r=mesh(new THREE.TorusGeometry(.13,.025,6,16),glow(0xff3a1a,1.6),-.35+(k%2)*.7,.93,-.18+(k>1?.36:0),g,false);r.rotation.x=Math.PI/2;}},
  boiler(g){cyl(.55,2,lam(0x7a6a50),0,1,0,g);cyl(.08,1,lam(0x555),.6,1.8,0,g).rotation.z=Math.PI/2;mesh(SPH,glow(0xff6a20,2),0,.4,.56,g,false).scale.setScalar(.07);},
  cake(g){cyl(.55,.05,lam(0xf2efe6),0,.76,0,g);cyl(.06,.74,lam(0x3a2a1e),0,.38,0,g);[.36,.27,.18].forEach((r,k)=>cyl(r,.22,lam(0xfff8ee),0,.9+k*.22,0,g));mesh(SPH,lam(0xff8aa0),0,1.6,0,g).scale.setScalar(.06);},
  balloon(g){for(let k=0;k<3;k++){mesh(SPH,glow(pick([0xff8aa0,0xfff0c8,0x9fdcff]),.3),rnd(-.2,.2),2+k*.15,rnd(-.2,.2),g).scale.set(.18,.22,.18);}cyl(.005,2,lam(0xffffff),0,1,0,g);},
  snooker(g){box(2.4,.8,1.3,lam(0x3a2414),0,.4,0,g);box(2.2,.04,1.1,lam(0x0f6a36),0,.82,0,g);for(let k=0;k<6;k++)mesh(SPH,lam(pick([0xd02020,0xf0f0f0,0x101010,0xe0c020])),rnd(-.9,.9),.87,rnd(-.4,.4),g,false).scale.setScalar(.03);
    box(.9,.06,.06,glow(0xffd28a,.8),0,1.9,0,g);},
  treadmill(g){box(.8,.2,1.8,lam(0x222),0,.1,0,g);box(.06,1.2,.06,lam(0x666),-.35,.7,-.8,g);box(.06,1.2,.06,lam(0x666),.35,.7,-.8,g);box(.8,.3,.15,glow(0x39ff88,.5),0,1.3,-.8,g);},
  bench(g){box(1.4,.45,.4,lam(0x333a40),0,.23,0,g);},
  crate(g){const n=1+(Math.random()*3|0);for(let k=0;k<n;k++)box(.7,.6,.7,lam(0x7a5a32),rnd(-.15,.15),.3+k*.6,rnd(-.15,.15),g,rnd(.3));},
  desk(g){box(1.8,1.05,.6,lam(0x3a2a4a),0,.53,0,g);box(1.9,.05,.7,lam(0xc9b48a),0,1.07,0,g);mesh(SPH,lam(0xd8b040),.6,1.13,0,g).scale.set(.08,.05,.08);},
  sink(g){box(.6,.85,.45,lam(0xe8eeee),0,.43,0,g);box(.6,.6,.04,glow(0xcfefff,.4),0,1.4,-.22,g);},
  shelf(g){box(1.6,1.8,.4,lam(0x5a4a32),0,.9,0,g);}
};
function furnish(){
  const R=n=>roomByName(n);
  const add=(name,list,lightColor,li=24)=>{const r=R(name);if(!r)return;list.forEach(([b,n,size,margin,block])=>{for(let k=0;k<n;k++)prop(r,size,margin,B[b],block!==false);});
    if(lightColor){const l=new THREE.PointLight(lightColor,li,11,1.5);l.position.set(r.x,2.3,r.z);scene.add(l);roomLights.push({l,base:li,room:r});}};
  add('Restaurant',[['table',6,1.9,3]],0xffc27a,26);
  add('Residents lounge',[['piano',1,1.6,2],['sofa',1,1.9,2],['armchair',3,1.1,2],['lamp',2,.5,2,false]],0xffb46a,22);
  add('Reception',[['desk',1,1.2,1]],0xffd9a0,10);
  add('Kitchen',[['steel',3,2,2],['hob',1,1.5,2]],0xd8f0ff,26);
  add('Boiler room',[['boiler',2,1.2,2]],0xff7a3a,14);
  add('Function room',[['cake',1,1.4,3],['table',4,1.9,3],['balloon',3,.4,2,false]],0xffd28f,28);
  add('Bar',[['bar',1,2.7,2],['stool',4,.6,2],['table',1,1.9,3]],0xffa860,20);
  add('Second bar',[['bar',1,2.6,1]],0x9ab8ff,14);
  add('WC facilities',[['sink',2,.7,1]],null);
  add('Bargain room',[['snooker',1,2.6,3],['armchair',2,1.1,2]],0xffcf8a,20);
  add('Gym',[['treadmill',2,1.9,2],['bench',1,1.5,2]],0xcfe6ff,18);
  add('Store',[['crate',3,.9,1]],null);
}
furnish();
W.inflate();
// Spawn guests and pickups only on the open-door route network, after furniture is placed.
W.spawnField=new Uint16Array(W.N);W.flow(W.cellOf(COACH.doorX,COACH.doorZ),W.spawnField);

// ================================================================ particles + decals
function radialTex(inner,outer){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,inner);gr.addColorStop(1,outer);g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const TEX={soft:radialTex('rgba(255,255,255,1)','rgba(255,255,255,0)')};
const parts=[];
for(let i=0;i<360;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.soft,transparent:true,depthWrite:false}));s.visible=false;scene.add(s);parts.push({s,life:0});}
let pIdx=0;
function emit(x,y,z,o){const p=parts[pIdx++%parts.length];p.s.visible=true;p.x=x;p.y=y;p.z=z;p.vx=o.vx||0;p.vy=o.vy||0;p.vz=o.vz||0;p.g=o.g||0;p.life=p.max=o.life||.5;p.size=o.size||.2;p.grow=o.grow||0;p.drag=o.drag||0;
  p.s.material.color.set(o.color||0xffffff);p.s.material.blending=o.add?THREE.AdditiveBlending:THREE.NormalBlending;p.alpha=o.alpha||1;p.s.material.opacity=p.alpha;}
function updateParts(dt){for(const p of parts){if(p.life<=0)continue;p.life-=dt;if(p.life<=0){p.s.visible=false;continue;}
  p.vy-=p.g*dt;const dr=Math.max(0,1-p.drag*dt);p.vx*=dr;p.vz*=dr;p.vy*=dr;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<.02){p.y=.02;p.vy=0;p.vx*=.5;p.vz*=.5;}
  const k=p.life/p.max;p.s.position.set(p.x,p.y,p.z);const sz=p.size*(1+p.grow*(1-k));p.s.scale.set(sz,sz,1);p.s.material.opacity=p.alpha*Math.min(1,k*2);}}
function blood(x,z,n=10,dir=[0,0]){if(!PREF.gore)n=Math.min(2,n);else n=Math.round(n*1.8);for(let i=0;i<n;i++)emit(x,rnd(.9,1.4),z,{vx:dir[0]*rnd(1,3)+rnd(-1.4,1.4),vy:rnd(1,3),vz:dir[1]*rnd(1,3)+rnd(-1.4,1.4),g:12,life:rnd(.5,1.15),size:rnd(.045,.12),color:PREF.gore?pick([0x500609,0x8a1010,0x3b0809]):0x58705c});}
const decals=[];const decalGeo=new THREE.PlaneGeometry(2,2);
const bloodTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#fff';for(let i=0;i<45;i++){const a=Math.random()*6.28,r=Math.pow(Math.random(),1.5)*48;g.beginPath();g.ellipse(64+Math.cos(a)*r,64+Math.sin(a)*r,2+Math.random()*12,2+Math.random()*8,a,0,6.28);g.fill();}const t=new THREE.CanvasTexture(c);return t;})();
function splat(x,z,s=.5,color=0x470509){if(!PREF.gore)return;let d=decals.length<70?null:decals.shift();if(!d){d=new THREE.Mesh(decalGeo,new THREE.MeshStandardMaterial({map:bloodTex,color,transparent:true,opacity:.85,roughness:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));d.rotation.x=-Math.PI/2;d.renderOrder=1;scene.add(d);}
  d.visible=true;d.material.color.set(color);d.rotation.z=Math.random()*6.28;d.position.set(x,.025,z);d.scale.set(s*rnd(.7,1.3),s*rnd(.7,1.3),1);decals.push(d);}
// Bounded debris pool: cosmetic only, never part of the navigation grid.
const chunks=[],chunkGeo=new THREE.IcosahedronGeometry(1,0),chunkMat=new THREE.MeshStandardMaterial({color:0x5e1115,roughness:.4});
for(let i=0;i<24;i++){const m=new THREE.Mesh(chunkGeo,chunkMat);m.visible=false;scene.add(m);chunks.push({m,t:0});}let chunkIndex=0;
function goreBurst(x,z,dir,head){if(!PREF.gore)return;for(let i=0;i<(head?6:3);i++){const p=chunks[chunkIndex++%chunks.length];p.t=2.4;p.x=x;p.z=z;p.y=1.2;p.vx=dir[0]*3+rnd(-2,2);p.vz=dir[1]*3+rnd(-2,2);p.vy=rnd(2,4);p.m.scale.set(rnd(.04,.09),rnd(.04,.1),rnd(.04,.09));p.m.visible=true;}}
function updateGore(dt){for(const p of chunks){if(p.t<=0)continue;p.t-=dt;p.m.visible=PREF.gore&&p.t>0;if(!p.m.visible)continue;p.vy-=12*dt;const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;if(W.freeAt(nx,nz,.02)){p.x=nx;p.z=nz;}else{p.vx*=-.2;p.vz*=-.2;}p.y+=p.vy*dt;if(p.y<.04){p.y=.04;p.vy=Math.abs(p.vy)*.2;p.vx*=.85;p.vz*=.85;}p.m.position.set(p.x,p.y,p.z);p.m.rotation.x+=p.vz*dt;p.m.rotation.z+=p.vx*dt;}}
const tracers=[];
function tracer(x1,y1,z1,x2,y2,z2){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1,y1,z1),new THREE.Vector3(x2,y2,z2)]);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xfff1a8,transparent:true,opacity:1}));scene.add(l);tracers.push({l,t:.07});}

// ================================================================ characters (built in people.js)
const ZEYE=PEOPLE.EYE_MAT,LOCKEYE=glow(0x4aa8ff,2),WINDEYE=glow(0xff2a2a,4);
function rig(o){const r=PEOPLE.make(o);scene.add(r.g);return r;}
function animate(e,dt){PEOPLE.pose(e.rig,e,dt);}
function zombify(e){PEOPLE.zombify(e.rig);}
const OUTFIT=PEOPLE.OUTFITS;
OUTFIT.owner=()=>({skin:0xf1b887,shirt:0x79558c,pants:0x343044,hair:0xdddddd,hairStyle:'quiff',tie:0xd8b040,buttons:true,height:1.02,build:1.12});
// ================================================================ game state
const G={state:'title',t:0,night:0,ents:[],player:null,stats:null,outbreak:0,spawnT:0,civSpawnT:0,combo:{n:0,t:0},slow:0,hitstop:0,shake:0,lockedCount:0,version:-1,
  fPlayer:new Uint16Array(W.N),fCoach:new Uint16Array(W.N),fT:0,pCell:-1,seen:{},hold:{down:false,t:0,fired:false},keys:{},room:null,pickups:[]};
const NIGHT_SECONDS=360;
function spawnEnt(kind,x,z,outfit,extra){
  const o=OUTFIT[outfit]();const r=rig(o);
  // collision radius must stay inside the 0.25 m wall clearance the route grid assumes, or bodies jam in doorways
  const [fx,fz]=W.nearestFree(x,z,BODY_R);
  const e=Object.assign({kind,x:fx,z:fz,vx:0,vz:0,face:Math.random()*6.28,rig:r,r:BODY_R,hp:3,state:kind==='z'?'hunt':'idle',t:0,think:Math.random()*.3,outfit,speed:1.5,windup:0,atkCd:0,scared:0,barkT:rnd(2,6),grabT:0},extra||{});
  if(kind==='z')zombify(e);
  r.g.position.set(e.x,0,e.z);G.ents.push(e);return e;
}
const zombies=()=>G.ents.filter(e=>e.kind==='z'&&!e.dead);
const civs=()=>G.ents.filter(e=>e.kind==='c'&&!e.gone);

function newGame(){
  G.ents.forEach(e=>{PEOPLE.dispose(e.rig);scene.remove(e.rig.g);if(e.ring){scene.remove(e.ring);e.ring.geometry.dispose();e.ring.material.dispose();}});G.ents=[];
  indicators.forEach(i=>i.el.remove());indicators.length=0;G.pickups.forEach(p=>scene.remove(p.m));G.pickups=[];
  W.doors.forEach(d=>{if(d.barricaded)W.setDoor(d,false);d.hp=100;d.cool=0;refreshDoor(d);});
  decals.forEach(d=>d.visible=false);chunks.forEach(p=>{p.t=0;p.m.visible=false;});parts.forEach(p=>{p.life=0;p.s.visible=false;});AUDIO.stopEffects();
  Object.assign(G,{t:0,night:0,outbreak:0,spawnT:6,civSpawnT:10,combo:{n:0,t:0},slow:0,hitstop:0,shake:0,lockedCount:0,version:-1,fT:0,pCell:-1,room:null,
    beat:0,ownerNext:2,ownerQuote:0,stats:{pitches:0,saved:0,kills:0,turned:0,rescued:0,close:0,shots:0,hits:0,seals:0,maxLocked:0,chef:false,bride:false,doorsBroken:0,dmg:0,heads:0,blasts:0,lounge:0}});
  const p=G.player=spawnEnt('p',px(615),px(1395),'porter',{hp:100,speed:5.2,inv:0,aim:0,cd:0,ext:0,face:Math.PI});
  G.owner=spawnEnt('o',px(680),px(1390),'owner',{state:'selling',speed:4.6});
  box(.32,.23,.095,new THREE.MeshStandardMaterial({color:0xb99b52,roughness:.4,metalness:.5}),0,-.35,.04,G.owner.rig.elbowL);
  box(.11,.035,.035,lam(0x362d1b),0,-.215,.04,G.owner.rig.elbowL);
  $('#owner-line').textContent="Monty Upsell: The Grand Last Resort! Five stars. Four are still pending.";
  // street: the crash, the running, the grabbing
  for(let i=0;i<12;i++){const c=spawnEnt('c',px(rnd(-150,1400)),px(rnd(1470,1860)),pick(['guest','guest','guest','elderly']),{state:'panic'});}
  for(let i=0;i<5;i++){let X,Z;do{X=rnd(-100,1350);Z=rnd(1480,1850);}while(Math.hypot(px(X)-p.x,px(Z)-p.z)<10);spawnEnt('z',px(X),px(Z),'guest',{speed:1.45});}
  // two zombies already have someone — the first thing the player sees
  // within reach of the porter's first shots, with enough time for a new player to read the ring
  [[420,1470,8],[880,1480,11]].forEach(([X,Z,t])=>{const c=spawnEnt('c',px(X),px(Z),'guest',{state:'panic'});const z=spawnEnt('z',px(X+25),px(Z+20),'guest',{speed:1.45});grab(z,c,t);});
  // inside the hotel: guests in their themed rooms
  const inRoom=(name,n,outfit,extra)=>{const r=roomByName(name);if(!r)return;for(let i=0;i<n;i++){const [x,z]=W.randomCellIn(r,1);spawnEnt('c',x,z,typeof outfit==='function'?outfit(i):outfit,Object.assign({state:'idle',home:r},extra||{}));}};
  inRoom('Restaurant',4,'guest');inRoom('Residents lounge',3,'elderly');inRoom('Reception',1,'staff',{bark0:'Checking in? Now?!'});
  inRoom('Function room',5,i=>i===0?'bride':i===1?'groom':'guest');inRoom('Bar',2,'guest');inRoom('Second bar',1,'staff');
  inRoom('Bargain room',2,'elderly');inRoom('Gym',1,'gym');
  const zin=(name,outfit,extra)=>{const r=roomByName(name);if(!r)return;const [x,z]=W.randomCellIn(r,1);return spawnEnt('z',x,z,outfit,Object.assign({speed:1.35,dormant:true},extra||{}));};
  zin('Kitchen','chef',{hp:9,boss:'chef',speed:1.7,scale:1.25});zin('WC facilities','guest');zin('Steam room','towel');
  G.ents.filter(e=>e.boss).forEach(e=>e.rig.body.scale.setScalar(1.25));
  // Fictional arcade geometry.
  W.FE_POINTS.forEach(([X,Z])=>addPickup('fe',px(X),px(Z)));
  ['Residents lounge','Restaurant','Bargain room','Bar'].forEach(n=>{const r=roomByName(n);if(r){const [x,z]=W.randomCellIn(r,2);addPickup('tea',x,z);}});
  hud.reset();
}
function addPickup(type,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  if(type==='fe'){cyl(.11,.55,lam(0xd01818),0,.4,0,g);cyl(.03,.12,lam(0x222),0,.74,0,g);}
  else{cyl(.28,.03,lam(0xc0c0c0),0,.55,0,g);cyl(.07,.1,lam(0xffffff),-.08,.62,0,g);mesh(SPH,lam(0xc89a5a),.1,.6,.05,g).scale.set(.05,.015,.05);}
  const ring=mesh(new THREE.RingGeometry(.35,.42,24),new THREE.MeshBasicMaterial({color:type==='fe'?0xff4d5e:0xffcb5a,transparent:true,opacity:.8,side:THREE.DoubleSide}),0,.03,0,g,false);ring.rotation.x=-Math.PI/2;
  G.pickups.push({type,x,z,m:g,active:true,t:0});
}

// ================================================================ movement helpers
const BODY_R=.2;
function moveEnt(e,dx,dz){
  const len=Math.hypot(dx,dz);if(len<1e-7)return;const x0=e.x,z0=e.z;
  if(W.freeAt(e.x+dx,e.z,e.r))e.x+=dx;
  if(W.freeAt(e.x,e.z+dz,e.r))e.z+=dz;
  // caught on a corner or door jamb: slide round it instead of stopping dead
  if(Math.hypot(e.x-x0,e.z-z0)<len*.35){const a=Math.atan2(dx,dz);
    for(const o of [.55,-.55,1.1,-1.1]){const nx=Math.sin(a+o)*len*.85,nz=Math.cos(a+o)*len*.85;if(W.freeAt(x0+nx,z0+nz,e.r)){e.x=x0+nx;e.z=z0+nz;break;}}}
}
// NPCs that keep pushing without getting anywhere step onto the next cell of their route
function unstick(e,dt){
  const want=Math.hypot(e.vx,e.vz),moved=Math.hypot(e.x-(e.lx===undefined?e.x:e.lx),e.z-(e.lz===undefined?e.z:e.lz));e.lx=e.x;e.lz=e.z;
  // only walls and furniture count: being held up by other bodies in a crowd is not "stuck"
  const wallAhead=want>.5&&!W.freeAt(e.x+e.vx/want*.12,e.z+e.vz/want*.12,e.r);
  if(wallAhead&&moved<want*dt*.25)e.stuckT=(e.stuckT||0)+dt;else e.stuckT=Math.max(0,(e.stuckT||0)-dt*2);
  if(e.stuckT>.7){const routed=(e.kind==='z'&&e.target===G.player)||e.state==='follow';
    if(!routed){e.stuckT=0;e.wa=Math.atan2(-e.vx,-e.vz)+(Math.random()-.5)*1.6;e.ia=e.wa;e.wt=rnd(1.5,3);e.it=e.wt;e.vx*=-.3;e.vz*=-.3;return;} // wanderers just turn away
    let d=W.stepDir(G.fPlayer,e.x,e.z);
    if(!d){const a=Math.random()*6.283;d=[Math.sin(a),Math.cos(a)];}
    const q=W.nearestFree(e.x+d[0]*.3,e.z+d[1]*.3,e.r);if(Math.hypot(q[0]-e.x,q[1]-e.z)<.45&&W.los(e.x,e.z,q[0],q[1])){moveEnt(e,q[0]-e.x,q[1]-e.z);}e.lx=e.x;e.lz=e.z;e.stuckT=0;e.wa=Math.random()*6.283;e.ia=Math.random()*6.283;G.stats.unstuck=(G.stats.unstuck||0)+1;}
}
function steerTo(e,dirx,dirz,speed,dt){
  const tvx=dirx*speed,tvz=dirz*speed,k=Math.min(1,dt*(e.kind==='p'?18:7));
  e.vx+=(tvx-e.vx)*k;e.vz+=(tvz-e.vz)*k;
}
function faceTo(e,ang,dt,rate=12){let d=ang-e.face;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;e.face+=d*Math.min(1,dt*rate);}
function separate(){
  const L=G.ents.filter(e=>!e.dead&&!e.gone&&e.kind!=='o');
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if((a.grabbing===b)||(b.grabbing===a))continue;
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),m=a.r+b.r;if(d>0&&d<m){const push=(m-d)*.5,ux=dx/d,uz=dz/d;
      // guests give way to the porter completely; zombies can still shove a little
      const pc=(a.kind==='p'&&b.kind==='c')||(b.kind==='p'&&a.kind==='c');
      const wa=a.kind==='p'?(pc?0:.2):(pc?1.6:1),wb=b.kind==='p'?(pc?0:.2):(pc?1.6:1);moveEnt(a,-ux*push*wa,-uz*push*wa);moveEnt(b,ux*push*wb,uz*push*wb);}}
}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
const fieldDir=(f,e)=>W.stepDir(f,e.x,e.z);

// ================================================================ zombies / civilians
function grab(z,c,time=3){z.state='grab';z.grabbing=c;c.state='grabbed';c.grabbedBy=z;c.grabT=c.grabMax=time;c.t=0;
  if(!c.ring){c.ring=mesh(new THREE.RingGeometry(.55,.68,32),new THREE.MeshBasicMaterial({color:0xffcb5a,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}),0,.04,0,scene,false);c.ring.rotation.x=-Math.PI/2;}
  c.ring.visible=true;
  if(G.state==='play'){SFX.scream(c.x,dist(c,G.player),1,c.z,!W.los(c.x,c.z,G.player.x,G.player.z));bark(c,pick(BARK.grab));if(!G.seen.grab&&dist(c,G.player)<14){G.seen.grab=1;hint('GRABBED! SHOOT THE ZOMBIE BEFORE THE RING CLOSES',4);}}
}
function release(c){c.grabbedBy=null;if(c.ring)c.ring.visible=false;}
function turnCivilian(c){
  release(c);c.kind='z';c.state='rise';c.t=0;c.hp=3;c.speed=1.4+G.night*.8;zombify(c);c.follow=false;
  emit(c.x,1.2,c.z,{size:1.4,grow:1,life:.5,color:0x7cff6a,add:true,alpha:.6});
  if(G.state!=='play')return;
  G.stats.turned++;if(c.outfit==='bride')G.stats.bride=true;
  SFX.turned(c.x,dist(c,G.player),c.z,!W.los(c.x,c.z,G.player.x,G.player.z));
  toast(c.outfit==='bride'?'THE BRIDE HAS TURNED':'A GUEST HAS TURNED','THE OUTBREAK GROWS',true);
}
function killZombie(z,dir,head){
  z.dead=true;z.deadT=0;z.fallSide=rnd(-.5,.5);goreBurst(z.x,z.z,dir,head);z.rig.neck.rotation.z=rnd(-.7,.7);z.rig.kneeL.rotation.x=.8;z.rig.armL.rotation.z=-.7;z.rig.armR.rotation.z=.5;z.vx=dir[0]*6;z.vz=dir[1]*6;z.spin=rnd(-6,6);
  if(z.grabbing){const c=z.grabbing;release(c);c.state='panic';c.scared=2;if(c.grabT<.9){slowmo(.6);toast('SAVED IN THE NICK OF TIME','+150');G.stats.close++;}else toast('GUEST RESCUED','+100');G.stats.rescued++;bark(c,pick(BARK.thanks));
    if(dist(c,G.player)<6){c.state='follow';}}
  z.grabbing=null;G.stats.kills++;if(head)G.stats.heads++;if(z.boss==='chef'){G.stats.chef=true;toast('THE CHEF HAS LEFT THE KITCHEN','HEAD CHEF CHECKED OUT');}
  blood(z.x,z.z,head?22:12,dir);splat(z.x+dir[0]*.6,z.z+dir[1]*.6,rnd(.4,.7));SFX.splat(z.x,dist(z,G.player),z.z,!W.los(z.x,z.z,G.player.x,G.player.z));
  G.combo.n=G.combo.t>0?G.combo.n+1:1;G.combo.t=1.6;
  if(G.combo.n>=2){toast(['','','DOUBLE CHECKOUT','TRIPLE CHECKOUT','QUAD CHECKOUT','HOUSEKEEPING!'][Math.min(G.combo.n,5)],'COMBO x'+G.combo.n);SFX.combo(G.combo.n);}
  G.hitstop=.045;G.shake=Math.max(G.shake,.25);
}
function updateZombie(z,dt){
  const p=G.player;
  if(z.dead){z.deadT+=dt;const k=Math.max(0,1-z.deadT*3);z.x+=z.vx*dt*k;z.z+=z.vz*dt*k;if(!W.freeAt(z.x,z.z,.1)){z.x-=z.vx*dt*k;z.z-=z.vz*dt*k;}
    z.rig.body.rotation.z=lerp(z.rig.body.rotation.z,z.fallSide,Math.min(1,dt*8));z.rig.body.rotation.x=lerp(z.rig.body.rotation.x,-Math.PI/2,Math.min(1,dt*10));z.rig.body.position.y=Math.max(.15,z.rig.body.position.y);z.rig.g.rotation.y+=z.spin*dt*k;
    if(z.deadT>5){z.rig.g.position.y-=dt*.4;}if(z.deadT>7){scene.remove(z.rig.g);z.gone=true;}return;}
  if(z.state==='rise'){z.t+=dt;z.rig.hips.rotation.z=Math.sin(z.t*40)*.3*(1-z.t);if(z.t>1.1){z.state='hunt';z.rig.hips.rotation.z=0;}return;}
  if(z.dormant){ // indoor zombies stay in their room until they notice someone
    z.dt2=(z.dt2||0)-dt;if(z.dt2<=0){z.dt2=.3;const dp=dist(z,p);if((dp<6.5&&W.los(z.x,z.z,p.x,p.z))||G.ents.some(c=>c.kind==='c'&&!c.gone&&c.state!=='grabbed'&&c.state!=='idle'&&dist(c,z)<4&&W.los(z.x,z.z,c.x,c.z))){z.dormant=false;SFX.groan(z.x,dp,z.boss?.6:1,z.z,!W.los(z.x,z.z,p.x,p.z));bark(z,pick(z.boss==='chef'?BARK.chef:BARK.zombie),true);}}
    z.rig.neck.rotation.y=Math.sin(G.t*.7+z.rig.phase)*.6;z.vx*=.8;z.vz*=.8;z.locked=W.distAt(G.fPlayer,z.x,z.z)>=65535;return;}
  if(z.stun>0){z.stun-=dt;z.vx*=.9;z.vz*=.9;moveEnt(z,z.vx*dt,z.vz*dt);return;}
  z.atkCd-=dt;z.think-=dt;
  const reach=G.reach;const fd=W.distAt(G.fPlayer,z.x,z.z);z.locked=fd>=65535;
  z.rig.eyes.forEach(e=>e.material=z.windup>0?WINDEYE:z.locked?LOCKEYE:ZEYE); // red eyes = about to swing
  if(z.state==='grab'){const c=z.grabbing;if(!c||c.state!=='grabbed'){z.state='hunt';z.grabbing=null;}else{z.vx=z.vz=0;faceTo(z,Math.atan2(c.x-z.x,c.z-z.z),dt);
      const dx=c.x-z.x,dz=c.z-z.z,d=Math.hypot(dx,dz);if(d>.55){c.x-=dx/d*(d-.55)*.5;c.z-=dz/d*(d-.55)*.5;}return;}}
  // choose target
  if(z.think<=0){z.think=.25+Math.random()*.15;z.target=null;let best=1e9;
    const dp=dist(z,p);if(p.hp>0&&!z.locked&&(dp<14||fd<70)&&(G.t>12||dp<3.5)){best=dp*.85;z.target=p;}
    for(const c of G.ents){if(c.kind!=='c'||c.gone||c.state==='grabbed'||c.state==='saved'||c.state==='boarding')continue;const d=dist(z,c);if(d<8&&d<best&&W.los(z.x,z.z,c.x,c.z)){best=d;z.target=c;}}
    if(!z.target&&z.locked&&dist(z,p)<16){ // locked zombies go for the barricade between them and you
      let bd=null,bdd=8;for(const d of W.doors){if(!d.barricaded)continue;const dd=Math.hypot(d.x-z.x,d.z-z.z);if(dd<bdd){bdd=dd;bd=d;}}z.door=bd;}else z.door=null;
  }
  const T=z.target;
  // lunge: a short burst when prey is close
  const spd=z.speed*(T&&!z.runner&&dist(z,T)<2.6&&dist(z,T)>.9?1.75:1);let dir=null;
  if(T&&!(T.kind==='c'&&(T.gone||T.state==='grabbed'||T.state==='boarding'))){
    const dx=T.x-z.x,dz=T.z-z.z,d=Math.hypot(dx,dz);
    if(T.kind==='p'){
      if(d<(z.runner?1.4:1.05)&&z.atkCd<=0&&z.windup<=0){z.windup=z.runner?.32:.5;}
      if(d<6&&W.los(z.x,z.z,T.x,T.z))dir=[dx/d,dz/d];else dir=fieldDir(G.fPlayer,z)||[dx/d,dz/d];
    }else{dir=[dx/d,dz/d];if(d<.62)grab(z,T,3.5+Math.max(0,20-G.t)*.3);/* grabs in the opening 20 s give extra time to react */}
  }else if(z.door){const dx=z.door.x-z.x,dz=z.door.z-z.z,d=Math.hypot(dx,dz);if(d>.75)dir=[dx/d,dz/d];else{bash(z,z.door,dt);dir=null;}}
  else{z.wt=(z.wt||0)-dt;if(z.wt<=0){z.wt=rnd(1.5,4);z.wa=rnd(6.28);}dir=[Math.sin(z.wa)*.4,Math.cos(z.wa)*.4];}
  // runners keep their momentum through the swing; walkers plant their feet (a readable, dodgeable telegraph)
  if(z.windup>0){z.windup-=dt;if(!z.runner){dir=null;z.vx*=.8;z.vz*=.8;}if(z.windup<=0){z.atkCd=1.25;if(dist(z,p)<(z.runner?1.6:1.4))hurtPlayer(z);}}
  if(dir){steerTo(z,dir[0],dir[1],spd,dt);faceTo(z,Math.atan2(z.vx,z.vz),dt,6);}else{z.vx*=.85;z.vz*=.85;}
  moveEnt(z,z.vx*dt,z.vz*dt);unstick(z,dt);
  z.barkT-=dt;if(z.barkT<=0){z.barkT=rnd(5,12);const d=dist(z,p);if(d<16){SFX.groan(z.x,d,z.boss?.7:1,z.z,!W.los(z.x,z.z,p.x,p.z));if(Math.random()<.25)bark(z,pick(z.boss==='chef'?BARK.chef:BARK.zombie),true);}}
}
function bash(z,d,dt){d.hp-=(z.boss?9:5)*dt;d.mesh.shake=.25;z.bashT=(z.bashT||0)-dt;if(z.bashT<=0){z.bashT=.7;SFX.thud(d.x,dist(G.player,d),d.z,!W.los(d.x,d.z,G.player.x,G.player.z));}
  refreshDoor(d);if(d.hp<=0){W.setDoor(d,false);d.cool=4;refreshDoor(d);G.stats.doorsBroken++;SFX.splinter(d.x,dist(G.player,d),d.z,!W.los(d.x,d.z,G.player.x,G.player.z));for(let i=0;i<14;i++)emit(d.x,rnd(.4,1.8),d.z,{vx:rnd(-3,3),vy:rnd(1,4),vz:rnd(-3,3),g:9,life:.9,size:.12,color:0x8a5a2b});
    toast(d.name.toUpperCase()+' GAVE WAY','THEY ARE OUT',true);G.shake=.4;}}
function hurtPlayer(z){const p=G.player;if(G.state!=='play'||p.inv>0||p.hp<=0)return;const dmg=z.boss?28:16;p.hp-=dmg;G.stats.dmg+=dmg;p.inv=.9;G.shake=.5;SFX.hurt();blood(p.x,p.z,8,[0,0]);
  const dx=p.x-z.x,dz=p.z-z.z,d=Math.hypot(dx,dz)||1;p.vx+=dx/d*6;p.vz+=dz/d*6;
  $('#vignette').style.boxShadow='inset 0 0 200px rgba(255,0,30,.75)';setTimeout(()=>$('#vignette').style.boxShadow='',260);
  if(p.hp<=0)endGame(false);}

function updateCiv(c,dt){
  const p=G.player;c.t+=dt;c.scared=Math.max(0,c.scared-dt);
  if(c.state==='boarding'){c.bt-=dt;const dx=COACH.doorX-c.x,dz=COACH.doorZ+1.3-c.z;c.x+=dx*dt*3;c.z+=dz*dt*3;c.rig.g.position.y=(1-c.bt)*.8;if(c.bt<=0){c.gone=true;scene.remove(c.rig.g);}return;}
  if(c.state==='grabbed'){c.grabT-=dt;c.vx=c.vz=0;if(c.ring){c.ring.position.set(c.x,.04,c.z);const k=c.grabT/c.grabMax;c.ring.scale.setScalar(.35+k*.9);c.ring.material.color.setHSL(.13*k,1,.55);}
    if(c.grabT<=0)turnCivilian(c);return;}
  let threat=null,td=1e9;for(const z of G.ents){if(z.kind!=='z'||z.dead||z.state==='rise')continue;const d=dist(z,c);if(d<td){td=d;threat=z;}}
  const dp=dist(c,p),coachD=Math.hypot(COACH.doorX-c.x,COACH.doorZ-c.z);
  // join the porter
  if(c.state!=='follow'&&dp<3&&p.hp>0&&W.los(c.x,c.z,p.x,p.z)&&G.followers<12){c.state='follow';bark(c,c.bark0||pick(BARK.follow));c.bark0=null;SFX.ui();
    if(!G.seen.follow){G.seen.follow=1;hint('GUESTS FOLLOW YOU — LEAD THEM TO THE COACH (EAST) →',5);}}
  // board the coach
  if((c.state==='follow'||c.state==='panic')&&coachD<1.7){c.state='boarding';c.bt=1;G.stats.saved++;SFX.saved();toast('GUEST SAVED',pick(BARK.saved));return;}
  let dir=null,spd=4.2;
  if(c.state==='follow'){
    if(coachD<9&&W.distAt(G.fCoach,c.x,c.z)<65535){dir=fieldDir(G.fCoach,c)||[(COACH.doorX-c.x)/coachD,(COACH.doorZ-c.z)/coachD];spd=4.6;}
    else if(dp>1.5+c.slot*.25){dir=(dp<5&&W.los(c.x,c.z,p.x,p.z))?[(p.x-c.x)/dp,(p.z-c.z)/dp]:fieldDir(G.fPlayer,c);spd=Math.min(5.1,2.5+dp*.8);}
    if(threat&&td<1.6){const ax=c.x-threat.x,az=c.z-threat.z,l=Math.hypot(ax,az)||1;dir=[ax/l,az/l];c.scared=1;}
    if(dp>22&&!W.los(c.x,c.z,p.x,p.z)){c.state=c.home?'idle':'panic';}
  }else if(c.state==='idle'){
    if(threat&&td<4.5&&W.los(c.x,c.z,threat.x,threat.z)){c.state='panic';c.scared=2;SFX.scream(c.x,dp,1,c.z,!W.los(c.x,c.z,p.x,p.z));bark(c,pick(BARK.panic));}
    else{c.it=(c.it||0)-dt;if(c.it<=0){c.it=rnd(2,5);c.ia=Math.random()<.5?null:rnd(6.28);}if(c.ia!=null){dir=[Math.sin(c.ia)*.25,Math.cos(c.ia)*.25];spd=.8;}}
  }else{ // panic
    if(dp<13&&p.hp>0&&W.los(c.x,c.z,p.x,p.z)&&(!threat||td>1.2)){ // run to the porter
      dir=[(p.x-c.x)/dp,(p.z-c.z)/dp];spd=4.4;
      if(threat&&td<3){const ax=c.x-threat.x,az=c.z-threat.z,l=Math.hypot(ax,az)||1;dir=[dir[0]+ax/l*.6,dir[1]+az/l*.6];const L=Math.hypot(dir[0],dir[1]);dir=[dir[0]/L,dir[1]/L];}}
    else if(threat&&td<6){const ax=c.x-threat.x,az=c.z-threat.z,l=Math.hypot(ax,az)||1;let a=Math.atan2(ax,az)+Math.sin(c.t*2+c.rig.phase)*.6;dir=[Math.sin(a),Math.cos(a)];spd=4.3;}
    else{c.it=(c.it||0)-dt;if(c.it<=0){c.it=rnd(1,3);c.ia=rnd(6.28);}dir=[Math.sin(c.ia)*.5,Math.cos(c.ia)*.5];spd=2.4;}
    c.barkT-=dt;if(c.barkT<=0&&threat&&td<5){c.barkT=rnd(3,7);SFX.scream(c.x,dp,c.outfit==='elderly'?.8:1,c.z,!W.los(c.x,c.z,p.x,p.z));if(Math.random()<.4)bark(c,pick(BARK.panic));}
  }
  if(dir){steerTo(c,dir[0],dir[1],spd,dt);faceTo(c,Math.atan2(c.vx,c.vz),dt,8);}else{c.vx*=.8;c.vz*=.8;}
  moveEnt(c,c.vx*dt,c.vz*dt);unstick(c,dt);
}

// ================================================================ player + shooting + doors
function nearDoor(){const p=G.player;let best=null,bd=1.7;for(const d of W.doors){if(d.cool>0)continue;const dd=Math.hypot(d.x-p.x,d.z-p.z);
  // must be on an open line to the doorway, not a door on the far side of a wall
  if(dd<bd&&(dd<.5||doorVisible(d,p))){bd=dd;best=d;}}return best;}
function doorVisible(d,p){const nx=-Math.sin(d.ang)*.45,nz=Math.cos(d.ang)*.45;for(const s of [1,-1]){const x=d.x+nx*s,z=d.z+nz*s;if(W.los(p.x,p.z,x,z))return true;}return false;}
function zombieClose(r){return zombies().some(z=>z.state!=='rise'&&dist(z,G.player)<r);}
function chooseTarget(){
  const p=G.player;let best=null,bs=1e9;
  for(const z of zombies()){if(z.state==='rise')continue;const d=dist(z,p);if(d>11.5)continue;if(!W.los(p.x,p.z,z.x,z.z))continue;
    let a=Math.atan2(z.x-p.x,z.z-p.z)-p.face;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;
    // in the close views you shoot what you look at: only a small aim-assist cone around the crosshair
    if(VIEW.mode!=='top'&&Math.abs(a)>(VIEW.mode==='first'?.32:.4)*(d<2?2.2:1)*(z.state==='grab'?1.6:1))continue;
    let s=d+Math.abs(a)*2.2;if(z.state==='grab')s-=6;if(z.windup>0)s-=5;if(d<2)s-=4;if(s<bs){bs=s;best=z;}}
  return best;
}
// zombies the extinguisher would actually hit: close, in the spray cone and not behind a wall
function frontCrowd(ang){const p=G.player;return zombies().filter(z=>{if(z.state==='rise')return false;const d=dist(z,p);if(d>4.2)return false;let a=Math.atan2(z.x-p.x,z.z-p.z)-ang;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;return Math.abs(a)<1.1&&W.los(p.x,p.z,z.x,z.z);});}
function fire(){
  const p=G.player;if(p.cd>0||p.hp<=0)return;p.cd=.2;G.stats.shots++;
  const tgt=chooseTarget();let ang=p.face;if(tgt)ang=Math.atan2(tgt.x-p.x,tgt.z-p.z);if(VIEW.mode==='top')p.face=ang;p.aim=.35;
  let gx=p.x+Math.sin(ang)*.55+Math.cos(ang)*.25,gz=p.z+Math.cos(ang)*.55-Math.sin(ang)*.25,gy=1.25;
  if(VIEW.mode==='first'){const m=VIEW.muzzleWorld();gx=m.x;gy=m.y;gz=m.z;VIEW.kick=1;}
  muzzle.position.set(gx,gy,gz);muzzle.intensity=PREF.motion?40:5;
  for(let i=0;i<4;i++)emit(gx,gy,gz,{vx:Math.sin(ang)*rnd(2,5)+rnd(-1,1),vy:rnd(0,1),vz:Math.cos(ang)*rnd(2,5)+rnd(-1,1),life:.12,size:.25,color:0xffd27a,add:true});
  // extinguisher blast when crowded
  const crowd=frontCrowd(ang);
  if(p.ext>0&&crowd.length>=2){p.ext--;G.stats.blasts++;SFX.blast();
    for(let i=0;i<40;i++){const a=ang+rnd(-.6,.6),s=rnd(4,10);emit(gx,gy,gz,{vx:Math.sin(a)*s,vy:rnd(-.3,1),vz:Math.cos(a)*s,drag:2,life:rnd(.6,1.1),size:.35,grow:3,color:0xf4fbff,alpha:.7});}
    crowd.forEach(z=>{{const d=dist(z,p)||1;z.stun=2.4;z.windup=0;z.vx=(z.x-p.x)/d*7;z.vz=(z.z-p.z)/d*7;if(z.grabbing){const c=z.grabbing;release(c);c.state='follow';z.grabbing=null;z.state='hunt';G.stats.rescued++;}}});
    toast('FOAMED!','EXTINGUISHER '+p.ext+' LEFT');G.shake=.3;return;}
  SFX.gun();G.shake=Math.max(G.shake,.08);
  if(tgt){G.stats.hits++;tgt.dormant=false;const dir=[Math.sin(ang),Math.cos(ang)];const head=Math.random()<.2&&!tgt.boss;
    tracer(gx,gy,gz,tgt.x,1.3,tgt.z);tgt.hp-=head?99:1;tgt.stun=.12;tgt.vx+=dir[0]*2.5;tgt.vz+=dir[1]*2.5;tgt.windup=0;
    blood(tgt.x,tgt.z,5,dir);for(let i=0;i<5;i++)emit(tgt.x,1.3,tgt.z,{vx:rnd(-2,2),vy:rnd(0,2),vz:rnd(-2,2),life:.15,size:.15,color:0xfff1a8,add:true});
    if(tgt.hp<=0){killZombie(tgt,dir,head);if(head)popText(tgt,'HEADSHOT');}}
  else{if(VIEW.mode!=='top')ang=p.face;let ex=gx,ez=gz;for(let k=0;k<48;k++){const nx=ex+Math.sin(ang)*.3,nz=ez+Math.cos(ang)*.3;if(W.blocked(W.cellOf(nx,nz)))break;ex=nx;ez=nz;}tracer(gx,gy,gz,ex,gy,ez);for(let i=0;i<4;i++)emit(ex,gy,ez,{vx:rnd(-2,2),vy:rnd(0,2),vz:rnd(-2,2),life:.2,size:.1,color:0xffd27a,add:true});}
}
function toggleDoor(d){
  const on=!d.barricaded;
  if(on){ // push anyone standing in the doorway to their own side first
    const nx=-Math.sin(d.ang),nz=Math.cos(d.ang);
    for(const e of G.ents){if(e.dead||e.gone)continue;const s=(e.x-d.x)*nx+(e.z-d.z)*nz,along=Math.abs((e.x-d.x)*Math.cos(d.ang)+(e.z-d.z)*Math.sin(d.ang));
      if(Math.abs(s)<.45&&along<d.len/2+.3){const k=(s>=0?1:-1)*(.5-Math.abs(s)+.05);e.x+=nx*k;e.z+=nz*k;}}
  }
  W.setDoor(d,on);refreshDoor(d);
  for(const e of G.ents){if(e.dead||e.gone)continue;if(!W.freeAt(e.x,e.z,e.r*.6)){const q=W.nearestFree(e.x,e.z,e.r);e.x=q[0];e.z=q[1];}}
  if(on){SFX.hammer();for(let i=0;i<10;i++)emit(d.x,rnd(.3,1.6),d.z,{vx:rnd(-1.5,1.5),vy:rnd(.5,2),vz:rnd(-1.5,1.5),g:6,life:.6,size:.08,color:0xc8a070});}
  else SFX.creak();
  G.version=-1;
}
function updatePlayer(dt){
  const p=G.player,K=G.keys;p.cd-=dt;p.inv-=dt;p.aim-=dt;
  let ix,iz,l;
  if(VIEW.mode==='top'){ // screen-relative: arrows are compass directions on screen
    ix=(K.ArrowRight?1:0)-(K.ArrowLeft?1:0);iz=(K.ArrowDown?1:0)-(K.ArrowUp?1:0);l=Math.hypot(ix,iz);if(l){ix/=l;iz/=l;}
  }else{ // body-relative: up/down walk, left/right turn (the only way to look round with arrow keys alone)
    const turn=(K.ArrowLeft?1:0)-(K.ArrowRight?1:0);if(p.hp>0){p.face+=turn*VIEW.turnRate*dt;}
    if(VIEW.spin>0){const s=Math.min(VIEW.spin,dt*Math.PI/.22);p.face+=s;VIEW.spin-=s;}
    const fwd=(K.ArrowUp?1:0)-(K.ArrowDown?.55:0);ix=Math.sin(p.face)*fwd;iz=Math.cos(p.face)*fwd;l=Math.abs(fwd);
  }
  if(p.hp<=0){ix=iz=0;}
  steerTo(p,ix,iz,p.speed*((G.hold.down&&G.hold.door)?0:1),dt);
  if(VIEW.mode==='top'&&l&&p.aim<=0)faceTo(p,Math.atan2(ix,iz),dt,16);
  moveEnt(p,p.vx*dt,p.vz*dt);
  // space: tap = fire; hold at a door = barricade / open; hold elsewhere = keep firing
  const H=G.hold,door=nearDoor(),danger=zombieClose(1.5);
  if(H.down&&!H.completed){H.t+=dt;
    if(H.door&&!danger){if(H.t>.22){const prog=clamp((H.t-.22)/.75,0,1);holdBar(prog);if(prog>=1){toggleDoor(H.door);H.door=null;H.completed=true;holdBar(-1);}}}
    else{if(H.door&&danger){H.door=null;holdBar(-1);}if(p.cd<=0&&(!H.fired||H.t>.25)){fire();p.cd=Math.max(p.cd,.3);H.fired=true;}}
  }
  // prompts
  if(door&&!danger)prompt(`HOLD SPACE — ${door.barricaded?'OPEN':'BARRICADE'} ${door.name.toUpperCase()}${door.barricaded?'':' ('+(door.kind==='entrance'?'ENTRANCE':'SC DOOR')+')'}`);
  else if(p.ext>0&&frontCrowd((t=>t?Math.atan2(t.x-p.x,t.z-p.z):p.face)(chooseTarget())).length>=2)prompt('EXTINGUISHER READY — TAP SPACE','warn');
  else prompt('');
  // pickups
  for(const k of G.pickups){if(!k.active){k.t-=dt;if(k.t<=0){k.active=true;k.m.visible=true;}continue;}
    k.m.rotation.y+=dt*1.5;if(Math.hypot(k.x-p.x,k.z-p.z)<.8){
      if(k.type==='fe'){if(p.ext>=6)continue;p.ext=Math.min(6,p.ext+3);toast('FIRE EXTINGUISHER','FE POINT · FOAMS CROWDS');}
      else{if(p.hp>=100)continue;p.hp=Math.min(100,p.hp+35);toast('TEA AND BISCUITS','+35 HEALTH');}
      SFX.pickup();k.active=false;k.m.visible=false;k.t=45;}}
}
function onSpaceDown(){if(G.state!=='play'||G.hold.down)return;const H=G.hold;H.down=true;H.t=0;H.fired=false;H.completed=false;
  const d=nearDoor();H.door=(d&&!zombieClose(1.5))?d:null;
  if(!H.door){fire();H.fired=true;}}
function onSpaceUp(){const H=G.hold;if(!H.down)return;H.down=false;if(H.door&&H.t<=.22)fire();H.door=null;holdBar(-1);}

// ================================================================ spawning + outbreak
function horde(n){const cand=SPAWNS.map(([X,Z])=>[px(X),px(Z)]).filter(([x,z])=>Math.hypot(x-G.player.x,z-G.player.z)>18);const [x,z]=pick(cand.length?cand:[[px(-280),px(1600)]]);
  for(let i=0;i<n&&zombies().length<52;i++)spawnEnt('z',x+rnd(-1.5,1.5),z+rnd(-1.5,1.5),pick(['guest','guest','elderly','staff']),{speed:1.4+G.night*.8+rnd(.3),hp:3});}
const BEATS=[
  [1/7,'MIDNIGHT','THE BARS HAVE EMPTIED',()=>horde(6)],
  [2/7,'01:00 · RUNNERS','SOME OF THEM CAN SPRINT',()=>{}],
  [4/7,'03:00 · THE KITCHEN STIRS','SOMETHING WANTS SERVICE',()=>{G.ents.forEach(z=>{if(z.kind==='z'&&z.dormant)z.dormant=false;});}],
  [6/7,'05:00 · LAST CALL','ONE HOUR TO THE COACH',()=>{horde(6);horde(6);}]
];
const SPAWNS=[[-280,1500],[-280,1690],[1985,1490],[1985,1700],[-250,700],[-250,1100],[1700,820],[1700,1200],[350,180],[800,180]];
function spawnTick(dt){
  const n=G.night,zs=zombies().length;
  G.spawnT-=dt;
  if(G.spawnT<=0){
    const pressure=clamp(.1+n*.75+G.outbreak*.25,0,1.2);G.spawnT=lerp(10,3,clamp(pressure,0,1));
    if(zs<46){const cand=SPAWNS.map(([X,Z])=>[px(X),px(Z)]).filter(([x,z])=>Math.hypot(x-G.player.x,z-G.player.z)>18);
      const [x,z]=pick(cand.length?cand:[[px(-280),px(1600)]]);const k=1+(Math.random()<pressure*.6?1:0)+(Math.random()<n*.4?1:0);
      for(let i=0;i<k;i++){const runner=G.beat>=2&&Math.random()<.18+n*.25;spawnEnt('z',x+rnd(-1,1),z+rnd(-1,1),pick(['guest','guest','elderly','staff','gym']),{speed:runner?4.1:1.3+n*1.1+rnd(.3),runner,hp:runner?2:(n>.5?4:3)});}}
  }
  // stragglers arrive from the side streets early in the night, someone always chasing them
  G.civSpawnT-=dt;if(G.civSpawnT<=0&&n<.55){G.civSpawnT=rnd(9,15);const [X,Z]=pick(SPAWNS.slice(0,8));const c=spawnEnt('c',px(X),px(Z),pick(['guest','elderly','gym']),{state:'panic'});
    const z=spawnEnt('z',px(X)+rnd(-1.5,1.5),px(Z)+rnd(-1.5,1.5),'guest',{speed:1.5+n});}
}

// ================================================================ HUD
const BARK={
  follow:['Right behind you!','Is breakfast still included?','My bags are upstairs!','I want to speak to the manager!','Lead on, porter!','Is this the murder-mystery night?','Mind the three steps!','Do I tip you now or later?'],
  panic:['AAARGH!','HELP!','Not the cardigan!','It\'s eating Gerald!','Call the front desk!','This is NOT four stars!','Who ordered room service?!'],
  grab:['GET IT OFF!','HELP ME!','It\'s got my leg!','Not before my kipper!','PORTER!'],
  thanks:['Bless you!','My hero!','I\'m leaving a review!','Five stars!'],
  saved:['"Lovely sea views."','"Would not barricade again."','"Coach was on time."','"Staff very attentive."'],
  zombie:['Brrraaains…','Kipppers…','Room serrrvice…','Checkkk ouuut…','Late… checkout…','Mmmuuuh…','Do not… disturb…'],
  chef:['SERVICE!','YES CHEF…','Brrrains… à la carte…','WHO TOUCHED MY HOB?']
};
const barksEl=$('#barks');const barkList=[];
function bark(e,text,z){if(G.state!=='play')return;const d=document.createElement('div');d.className='bark'+(z?' z':'');d.textContent=text;barksEl.appendChild(d);barkList.push({d,e,t:2.2});if(barkList.length>6){const o=barkList.shift();o.d.remove();}}
function popText(e,text){bark(e,text,false);}
const V=new THREE.Vector3();
function updateBarks(dt){for(let i=barkList.length-1;i>=0;i--){const b=barkList[i];b.t-=dt;if(b.t<=0||b.e.gone){b.d.remove();barkList.splice(i,1);continue;}
  V.set(b.e.x,2.25*(b.e.rig.sc||1),b.e.z).project(camera);b.d.style.left=((V.x+1)/2*innerWidth)+'px';b.d.style.top=((1-V.y)/2*innerHeight)+'px';b.d.style.opacity=Math.min(1,b.t*2);}}
// guide trail: glowing marks on the floor along the walkable route to whatever matters most right now
const GUIDE={on:true,field:new Uint16Array(W.N),t:0,target:null,cells:[],marks:[]};
(function(){const geo=new THREE.CircleGeometry(.19,14);for(let i=0;i<30;i++){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x39ff88,transparent:true,opacity:0,depthWrite:false,fog:false}));m.rotation.x=-Math.PI/2;m.visible=false;m.renderOrder=2;scene.add(m);GUIDE.marks.push(m);}})();
const GUIDE_COL={coach:0x39ff88,grab:0xffb43a,guest:0xeafff2};
function guideTarget(){
  if(G.followers>0)return {x:COACH.doorX,z:COACH.doorZ,kind:'coach',field:G.fCoach,label:'COACH'};
  let best=null,bs=1e9;
  for(const c of G.ents){if(c.kind!=='c'||c.gone||c.state==='follow'||c.state==='boarding')continue;const d=W.distAt(G.fPlayer,c.x,c.z);if(d>=65535)continue;
    const s=d-(c.state==='grabbed'?80:0);if(s<bs){bs=s;best=c;}}
  return best?{x:best.x,z:best.z,kind:best.state==='grabbed'?'grab':'guest',ent:best,label:best.state==='grabbed'?'GUEST GRABBED':'GUEST TO RESCUE'}:null;
}
function updateGuide(dt){
  const p=G.player,show=GUIDE.on&&G.state==='play';GUIDE.t-=dt;
  if(show&&GUIDE.t<=0){GUIDE.t=.3;const tg=guideTarget();GUIDE.target=tg;GUIDE.cells=[];
    if(tg){let f=tg.field;if(!f){W.flow(W.cellOf(tg.x,tg.z),GUIDE.field);f=GUIDE.field;}
      let i=W.cellOf(p.x,p.z),cur=i>=0?f[i]:65535;
      for(let n=0;n<220&&i>=0;n++){let bi=-1,bv=cur;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(Math.abs(dx)+Math.abs(dz)!==1)continue;const j=i+dz*W.GW+dx;if(Math.abs((j%W.GW)-(i%W.GW))>1)continue;if(j<0||j>=W.N)continue;if(f[j]<bv){bv=f[j];bi=j;}}
        if(bi<0)break;i=bi;cur=bv;GUIDE.cells.push(i);if(cur===0)break;}
      tg.dist=GUIDE.cells.length*W.CELL*S;}}
  const t=performance.now()/1000,col=GUIDE.target?GUIDE_COL[GUIDE.target.kind]:0;
  GUIDE.marks.forEach((m,k)=>{const ci=GUIDE.cells[3+k*3];if(!show||ci===undefined){m.visible=false;return;}const [x,z]=W.centre(ci);m.visible=true;m.position.set(x,.035,z);
    m.material.color.setHex(col);const pulse=Math.max(0,Math.sin(t*6-k*.55));m.material.opacity=(.6+.4*pulse)*Math.min(1,(30-k)/8);m.scale.setScalar(1+.25*pulse);});
}
// edge-of-screen arrows: grabbed guests (with seconds left) and the coach while guests are following
const indicators=[];
function updateIndicators(){
  const want=[];
  if(G.state==='play'){for(const c of G.ents)if(c.kind==='c'&&!c.gone&&c.state==='grabbed')want.push({x:c.x,z:c.z,cls:'grab',label:Math.max(0,c.grabT).toFixed(1)+'s'});
    if(G.followers>0)want.push({x:COACH.doorX,z:COACH.doorZ,cls:'coach',label:'COACH'});}
  while(indicators.length<want.length){const el=document.createElement('div'),arrow=document.createElement('i'),span=document.createElement('span');el.className='ind';el.appendChild(arrow);el.appendChild(span);barksEl.appendChild(el);indicators.push({el,span,arrow});}
  // clamp to the play area inside the HUD panels and minimap
  const L=40,R=innerWidth-40,Tp=innerWidth<760?150:120,Bt=Math.max(Tp+80,innerHeight-(innerWidth<760?170:205)),cx=innerWidth/2,cy=(Tp+Bt)/2;
  indicators.forEach((ind,i)=>{const w=want[i];if(!w){ind.el.style.display='none';return;}
    V.set(w.x,1,w.z).project(camera);let sx=(V.x+1)/2*innerWidth,sy=(1-V.y)/2*innerHeight;const behind=V.z>1;
    if(!behind&&sx>20&&sx<innerWidth-20&&sy>20&&sy<innerHeight-20){ind.el.style.display='none';return;} // on screen: the ring already shows it
    if(behind){sx=2*cx-sx;sy=2*cy-sy;}
    const dx=sx-cx,dy=sy-cy,k=Math.min((R-cx)/Math.max(1e-6,Math.abs(dx)),(cy-Tp)/Math.max(1e-6,Math.abs(dy)));
    ind.el.style.display='';ind.el.className='ind '+w.cls;ind.el.style.left=(cx+dx*k)+'px';ind.el.style.top=(cy+dy*k)+'px';
    ind.arrow.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;ind.span.textContent=w.label;});
}
function toast(title,sub,bad,big){const d=document.createElement('div');d.className='toast'+(bad?' bad':'')+(big?' big':'');d.innerHTML=`${title}<small>${sub||''}</small>`;const box=$('#toasts');box.appendChild(d);while(box.children.length>3)box.firstChild.remove();setTimeout(()=>d.remove(),1900);}
let hintT=0;function hint(text,t){prompt(text,'warn',true);hintT=t;}
let promptLock=false;function prompt(text,cls,lock){if(hintT>0&&!lock)return;const el=$('#prompt');el.textContent=text;el.className='prompt'+(text?' on':'')+(cls?' '+cls:'');}
function holdBar(v){const el=$('#hold');if(v<0){el.classList.remove('on');return;}el.classList.add('on');el.firstElementChild.style.width=(v*100)+'%';}
const mm=$('#minimap'),mctx=mm.getContext('2d'),mbase=document.createElement('canvas');mbase.width=W.GW;mbase.height=W.GH;
(function(){const g=mbase.getContext('2d'),img=g.createImageData(W.GW,W.GH);for(let i=0;i<W.N;i++){let c=[10,16,12];if(W.inside[i])c=[22,34,28];const Z=W.GZ0+((i/W.GW)|0)*W.CELL;if(!W.inside[i]&&Z>W.ROAD_Z0&&Z<W.ROAD_Z1)c=[14,18,22];if(W.wall[i])c=PLAN_WALL[i]?(W.inside[i]||W.room[i]>=0?[110,235,160]:[70,110,90]):[44,58,52];/* drawn walls bright, furniture/cars dim */img.data.set([...c,255],i*4);}g.putImageData(img,0,0);})();
// player-centred, zoomed minimap; in the close views it turns so the porter's facing is always up
function drawMinimap(){
  const Wd=mm.width,Hd=mm.height,Z=2.6,p=G.player,pi=W.cellOf(p.x,p.z);if(pi<0)return;
  const PX=pi%W.GW+.5,PZ=((pi/W.GW)|0)+.5,heading=VIEW.mode!=='top';
  mctx.setTransform(1,0,0,1,0,0);mctx.fillStyle='#070b09';mctx.fillRect(0,0,Wd,Hd);mctx.imageSmoothingEnabled=false;
  mctx.save();mctx.translate(Wd/2,Hd/2+(heading?18:0));
  if(heading)mctx.rotate(-Math.PI/2-Math.atan2(Math.cos(p.face),Math.sin(p.face)));
  mctx.scale(Z,Z);mctx.translate(-PX,-PZ);mctx.drawImage(mbase,0,0);
  mctx.fillStyle='#ff4d5e';W.doors.forEach(d=>{if(d.barricaded)d.cells.forEach(i=>mctx.fillRect(i%W.GW,(i/W.GW)|0,1,1));});
  const ci=W.cellOf(px(COACH.X),px(COACH.Z));mctx.fillStyle='#ffcb5a';mctx.fillRect(ci%W.GW-22,((ci/W.GW)|0)-5,44,10);
  const dot=(x,z,c,s)=>{const i=W.cellOf(x,z);if(i<0)return;mctx.fillStyle=c;mctx.beginPath();mctx.arc(i%W.GW+.5,((i/W.GW)|0)+.5,s/Z,0,6.283);mctx.fill();};
  if(GUIDE.on&&GUIDE.target){mctx.fillStyle='#'+GUIDE_COL[GUIDE.target.kind].toString(16).padStart(6,'0');for(let k=0;k<GUIDE.cells.length;k+=2){const i=GUIDE.cells[k];mctx.fillRect(i%W.GW+.2,((i/W.GW)|0)+.2,.6,.6);}}
  for(const e of G.ents){if(e.dead||e.gone||e.kind==='p')continue;if(e.kind==='z')dot(e.x,e.z,e.locked?'#4aa8ff':'#ff4d5e',3);else dot(e.x,e.z,e.state==='grabbed'?'#ffcb5a':'#f4fff8',2.6);}
  // the porter: an arrow pointing the way they face
  mctx.translate(PX,PZ);mctx.rotate(Math.atan2(Math.cos(p.face),Math.sin(p.face)));mctx.fillStyle='#39ff88';mctx.beginPath();mctx.moveTo(6/Z,0);mctx.lineTo(-4/Z,4/Z);mctx.lineTo(-2/Z,0);mctx.lineTo(-4/Z,-4/Z);mctx.closePath();mctx.fill();
  mctx.restore();mctx.strokeStyle='rgba(57,255,136,.35)';mctx.strokeRect(.5,.5,Wd-1,Hd-1);
}const hud={reset(){['saved','locked','kills','turned'].forEach(k=>$('#s-'+k).textContent='0');},
  update(){const s=G.stats,p=G.player;$('#s-saved').textContent=s.saved;$('#s-locked').textContent=G.lockedCount;$('#s-kills').textContent=s.kills;$('#s-turned').textContent=s.turned;
    $('#health-bar').style.width=Math.max(0,p.hp)+'%';$('#health-bar').style.background=p.hp<35?'var(--danger)':'var(--accent)';
    const mins=23*60+G.night*420,hh=Math.floor(mins/60)%24,mi=Math.floor(mins%60);$('#clock').textContent=String(hh).padStart(2,'0')+':'+String(mi).padStart(2,'0');
    const left=Math.ceil((1-G.night)*7*60);$('#dawn').textContent=Math.floor(left/60)+'h '+(left%60)+'m to dawn';
    $('#outbreak-bar').style.width=(G.outbreak*100)+'%';$('#outbreak-word').textContent=G.outbreak<.2?'CALM':G.outbreak<.45?'UNSETTLED':G.outbreak<.7?'OUTBREAK':G.outbreak<.9?'PANDEMONIUM':'FULLY BOOKED';
    const tg=GUIDE.target,ob=$('#objective');ob.textContent=tg?`→ ${tg.label}${tg.dist?' · '+Math.max(1,Math.round(tg.dist))+' m':''}`:'';ob.className='objective '+(tg?tg.kind:'');
    $('#kit').textContent=(p.ext?`EXTINGUISHER ×${p.ext}  `:'')+(G.followers?`FOLLOWING ×${G.followers}`:'');drawMinimap();}};

const OWNER_PITCHES=[
  "The undead? Repeat customers. Exceptional retention.",
  "That is not a horde. It is an extremely motivated viewing party.",
  "Sea view included. Sea rescue charged separately.",
  "The asking price is negotiable. The zombies are less flexible.",
  "I said open-plan potential. The chef took that personally.",
  "That boarded door? Bespoke timber. Very boutique.",
  "Breakfast is continental. Survival is supplementary.",
  "Free late checkout! Early checkout is now strongly recommended.",
  "A little lively in the bar, but the spirits are excellent.",
  "No chain! Unless you count whatever is holding the boiler together.",
  "Excellent footfall. Regrettable bitefall.",
  "Offers over one bag of biscuits. I know what I have."
];
function ownerPitch(negotiated=false){
  if(G.state!=='play')return;
  const line=OWNER_PITCHES[G.ownerQuote++%OWNER_PITCHES.length];G.stats.pitches++;
  $('#owner-line').textContent='Monty Upsell: '+(negotiated?'Counter-offer! ':'')+line;
  G.ownerNext=8;if(G.owner)bark(G.owner,negotiated?'Let us talk biscuits.':'Rare opportunity!');
}
function updateOwner(dt){
  if(G.state!=='play'||!G.owner)return;const e=G.owner;e.t+=dt;G.ownerNext-=dt;
  const dp=dist(e,G.player);if(dp>3){const dir=fieldDir(G.fPlayer,e);if(dir)steerTo(e,dir[0],dir[1],4.6,dt);}else{e.vx*=.9;e.vz*=.9;}
  moveEnt(e,e.vx*dt,e.vz*dt);faceTo(e,Math.atan2(G.player.x-e.x,G.player.z-e.z),dt);
  if(G.ownerNext<=0)ownerPitch();
}
// ================================================================ simulation tick
let hudT=0,lockT=0;
function simulate(dt){
  const p=G.player;G.t+=dt;G.night=Math.min(1,G.t/NIGHT_SECONDS);
  // flow fields
  G.fT-=dt;const pc=W.cellOf(p.x,p.z);
  if(G.version!==W.version||(G.fT<=0&&pc!==G.pCell)){if(G.version!==W.version)W.flow(W.cellOf(COACH.doorX,COACH.doorZ),G.fCoach);G.version=W.version;G.fT=.2;G.pCell=pc;W.flow(pc,G.fPlayer);}
  updatePlayer(dt);
  let fol=0;for(const e of G.ents)if(e.kind==='c'&&e.state==='follow'&&!e.gone)e.slot=fol++;G.followers=fol;
  for(const e of G.ents){if(e.gone)continue;if(e.kind==='z')updateZombie(e,dt);else if(e.kind==='c')updateCiv(e,dt);else if(e.kind==='o')updateOwner(dt);}
  separate();
  G.ents=G.ents.filter(e=>{if(e.gone&&e.kind!=='p'){PEOPLE.dispose(e.rig);scene.remove(e.rig.g);return false;}return true;});
  // doors
  for(const d of W.doors){d.cool=Math.max(0,d.cool-dt);if(d.mesh.shake>0){d.mesh.shake-=dt;d.mesh.g.position.x=d.x+Math.sin(G.t*60)*.03;}else d.mesh.g.position.x=d.x;}
  // containment & outbreak
  // a zombie only counts as "locked in" when a barricade the porter placed is what cuts it off
  lockT-=dt;if(lockT<=0){lockT=.3;const zs=zombies().filter(z=>z.state!=='rise');const anyBar=W.doors.some(d=>d.barricaded);const locked=anyBar?zs.filter(z=>z.locked):[];
    const fresh=locked.filter(z=>!z.wasLocked);zs.forEach(z=>z.wasLocked=z.locked);
    if(fresh.length&&G.t>1){const gained=fresh.length;const r=W.roomAt(fresh[0].x,fresh[0].z);
      const where=r?(r.theme&&r.theme.label||r.name):'OUTSIDE';toast(`${where} SEALED`,`${gained} ZOMBIE${gained>1?'S':''} LOCKED IN`);SFX.sealed();G.stats.seals+=gained;}
    G.lockedCount=locked.length;G.stats.maxLocked=Math.max(G.stats.maxLocked,locked.length);
    const free=zs.length-locked.length;G.outbreak=clamp((free+.3*locked.length)/40,0,1);}
  spawnTick(dt);
  // the night has a shape: four announced beats so the six minutes build rather than plateau
  if(G.beat<BEATS.length&&G.night>=BEATS[G.beat][0]){const b=BEATS[G.beat++];toast(b[1],b[2],true,true);SFX.bell();b[3]();}
  if(G.combo.t>0)G.combo.t-=dt;
  if(G.night>=1)endGame(true);
  hudT-=dt;if(hudT<=0){hudT=.1;hud.update();}
  if(hintT>0){hintT-=dt;}
}

// ================================================================ presentation tick
const muzzle=new THREE.PointLight(0xffd27a,0,8,2);scene.add(muzzle);
const torch=new THREE.SpotLight(0xfff4dc,110,22,.6,.6,1.3);scene.add(torch,torch.target);
// A soft cool camera fill preserves faces against the warm practical lamps.
const faceFill=new THREE.PointLight(0x9fb8cc,5,7,2);scene.add(faceFill);
const rainGeo=new THREE.CylinderGeometry(.008,.008,.24,3),rainMat=new THREE.MeshBasicMaterial({color:0x9eb4c0,transparent:true,opacity:.22,depthWrite:false});
const rain=new THREE.InstancedMesh(rainGeo,rainMat,96),rainMatrix=new THREE.Matrix4();rain.frustumCulled=false;scene.add(rain);const drops=Array.from({length:96},()=>({x:rnd(-12,12),z:rnd(-12,12),y:rnd(0,8)}));
function weather(dt,p){rain.visible=PREF.motion&&!!p&&G.state==='play';if(!rain.visible)return;drops.forEach((d,i)=>{d.y-=dt*7;if(d.y<0)d.y=8;const x=p.x+d.x,z=p.z+d.z;rainMatrix.makeTranslation(x,W.isInside(x,z)?-8:d.y,z);rain.setMatrixAt(i,rainMatrix);});rain.instanceMatrix.needsUpdate=true;}
const camPos=new THREE.Vector3(10,30,60),camLook=new THREE.Vector3(12,0,30);
let upperFade=1,outerH=2.6,innerH=1.15;
// ---- camera views: 'top' (original diorama), 'third' (over the shoulder), 'first' (the porter's eyes)
const VIEW={mode:'top',camGap:3,pitch:-.06,bob:0,kick:0,spin:0,turnRate:2.9,lastDown:0,lastInner:-1,fov:-1,
  labels:{top:'Top',third:'Shoulder',first:'Eyes'},
  lens(close){const want=VIEW.mode==='first'&&close?74:VIEW.mode==='third'&&close?(62+(PREF.motion?(G.danger||0)*2:0)):(innerWidth<innerHeight?58:42);
    if(want!==VIEW.fov){VIEW.fov=want;camera.fov=want;camera.updateProjectionMatrix();}
    const near=close?(VIEW.mode==='first'?16:20):26,far=close?(VIEW.mode==='first'?58:64):62;scene.fog.near=lerp(scene.fog.near,near,.1);scene.fog.far=lerp(scene.fog.far,far,.1);},
  muzzleWorld(){camera.updateMatrixWorld();return VIEW.tip.getWorldPosition(new THREE.Vector3());},
  updateGun(on,real){const g=VIEW.gun;g.visible=on;if(!on)return;const sp=Math.hypot(G.player.vx,G.player.vz)/5;
    g.position.set(.17+Math.cos(VIEW.bob)*.01*sp,-.17+Math.abs(Math.sin(VIEW.bob))*.012*sp,-.42+VIEW.kick*.05);g.rotation.x=VIEW.kick*.18;},
  cross(lock){const el=$('#crosshair');if(lock!==VIEW.locked){VIEW.locked=lock;if(lock)el.classList.add('lock');else el.classList.remove('lock');}}
};
scene.add(camera);
(function(){ // first-person gun: drawn over the scene so it never clips into walls
  const g=new THREE.Group();camera.add(g);g.visible=false;g.scale.setScalar(.62);VIEW.gun=g;
  // unlit materials: the porter's own torch sits 0.5 m away and would blow lit ones out to white
  const over=(color)=>new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,fog:false});
  const part=(w,h,d,m,x,y,z)=>{const b=new THREE.Mesh(BOX,m);b.scale.set(w,h,d);b.position.set(x,y,z);b.renderOrder=999;g.add(b);return b;};
  part(.07,.1,.46,over(0x26262a),0,0,-.1);part(.072,.02,.44,over(0x3a3a40),0,.05,-.1);part(.05,.05,.2,over(0x1a1a1d),0,.03,-.4);part(.06,.16,.08,over(0x4a3424),0,-.1,.06);
  part(.12,.11,.34,over(0x5e0f1c),.01,-.13,.27);part(.122,.025,.34,over(0x8a2030),.01,-.075,.27); // porter's maroon sleeve, lit edge
  part(.126,.115,.03,over(0xc9a040),.01,-.13,.1); // gold cuff braid
  // gripping hand: palm round the grip, fingers wrapped in front, thumb along the frame
  part(.07,.075,.07,over(0xb98762),0,-.085,.06);part(.074,.05,.03,over(0x9c6e4e),0,-.1,.02);part(.022,.022,.09,over(0xc8957a),-.036,-.03,.02);
  part(.014,.014,.014,over(0x39ff88),0,.075,-.3); // green sight dot
  VIEW.tip=new THREE.Object3D();VIEW.tip.position.set(0,.03,-.52);g.add(VIEW.tip);
})();
function setView(mode,announce){
  if(!VIEW.labels[mode])mode='top';VIEW.mode=mode;VIEW.pitch=-.06;VIEW.spin=0;VIEW.fov=-1;
  const btn=$('#view-toggle');btn.textContent='View: '+VIEW.labels[mode];
  document.querySelectorAll('.view-pick button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.view===mode)));
  if(document.body){if(mode==='top')document.body.classList.remove('immersive');else document.body.classList.add('immersive');}
  $('#howto-move').textContent=mode==='top'?'Move':'↑ ↓ walk · ← → turn';
  if(mode==='top'&&document.exitPointerLock&&document.pointerLockElement)document.exitPointerLock();
  try{localStorage.setItem('checkout-view',mode);}catch(e){}
  if(announce&&G.state==='play')hint(mode==='top'?'TOP-DOWN VIEW':mode==='third'?'OVER THE SHOULDER · ← → TURN · CLICK FOR MOUSE LOOK':'THROUGH THE PORTER’S EYES · ← → TURN · ↓↓ SPIN · CLICK FOR MOUSE LOOK',3);
}
function cycleView(){setView({top:'third',third:'first',first:'top'}[VIEW.mode],true);}
function present(dt,real){
  const p=G.player;
  for(const e of G.ents){if(e.gone)continue;if(!e.dead){e.rig.g.position.set(e.x,e.rig.g.position.y,e.z);e.rig.g.rotation.y=e.face;animate(e,dt);}else e.rig.g.position.set(e.x,e.rig.g.position.y,e.z);
    if(e.kind==='p'&&e.inv>0)e.rig.body.visible=Math.floor(e.inv*20)%2===0;else e.rig.body.visible=true;}
  // camera
  const playing=G.state==='play'||G.state==='end',close=playing&&VIEW.mode!=='top';
  if(playing&&VIEW.mode==='top'){
    const look=new THREE.Vector3(p.x+p.vx*.25,0,p.z+p.vz*.25-.6);
    const inside=W.isInside(p.x,p.z);const off=inside?new THREE.Vector3(0,12.5,6.8):new THREE.Vector3(0,13.5,8.2); // closer and steeper: bigger people, fewer walls in the way
    camLook.lerp(look,Math.min(1,real*5));camPos.lerp(look.clone().add(off),Math.min(1,real*3.5));
  }else if(close){
    const f=p.face,fx=Math.sin(f),fz=Math.cos(f),rx=-fz,rz=fx,sp=Math.hypot(p.vx,p.vz);
    VIEW.bob+=PREF.motion?real*sp*2.2:0;VIEW.kick=Math.max(0,VIEW.kick-real*9);
    if(VIEW.mode==='first'){
      const eyeY=(p.hp>0?1.62:.42)+(PREF.motion?Math.sin(VIEW.bob*2)*.025:0)*Math.min(1,sp/4),cp=Math.cos(VIEW.pitch);
      camPos.set(p.x,eyeY,p.z);
      camLook.set(camPos.x+fx*cp*6,eyeY+Math.sin(VIEW.pitch)*6+VIEW.kick*.12,camPos.z+fz*cp*6);
    }else{
      // over the right shoulder; pull the camera in front of any wall between the porter and it
      const wx=p.x-fx*3.1+rx*.62,wz=p.z-fz*3.1+rz*.62;let t=1;
      for(let k=1;k<=24;k++){const s=k/24;if(W.blocked(W.cellOf(p.x+(wx-p.x)*s,p.z+(wz-p.z)*s))){t=Math.max(.12,(k-2.5)/24);break;}}
      // in a tight room the camera rises over the porter's head instead of pushing into it
      const kk=Math.min(1,real*10);camPos.x=lerp(camPos.x,p.x+(wx-p.x)*t,kk);camPos.z=lerp(camPos.z,p.z+(wz-p.z)*t,kk);camPos.y=lerp(camPos.y,Math.min(2.85,2.05+(1-t)*.85),kk);
      camLook.set(p.x+fx*6+rx*.35,1.3-(1-t)*.6+Math.sin(VIEW.pitch)*6,p.z+fz*6+rz*.35);
      VIEW.camGap=Math.hypot(camPos.x-p.x,camPos.z-p.z);
    }
  }else{const a=performance.now()/9000;camLook.set(px(800),0,px(1200));camPos.set(px(800)+Math.sin(a)*30,22,px(1200)+Math.cos(a)*30);}
  camera.position.copy(camPos);if(G.shake>0){const k=PREF.motion?(close?.12:.4):0;camera.position.x+=rnd(-1,1)*G.shake*k;camera.position.y+=rnd(-1,1)*G.shake*k;G.shake=Math.max(0,G.shake-real*2.5);}
  camera.lookAt(camLook);
  VIEW.lens(close);weather(real,p);faceFill.position.copy(camera.position);faceFill.intensity=close?4:0;
  moon.position.set(camLook.x-14,26,camLook.z+18);moon.target.position.copy(camLook);
  // torch: on the porter's shoulder in top-down; along the line of sight in the close views
  // a hand torch at eye level needs far less power than the overhead one, or a nearby wall blows out the frame
  if(close){let clearance=3;for(let i=1;i<=12;i++){if(!W.los(p.x,p.z,p.x+Math.sin(p.face)*i*.25,p.z+Math.cos(p.face)*i*.25)){clearance=i*.25;break;}}torch.intensity=(VIEW.mode==='first'?7:14)*Math.min(1,clearance*.7);torch.decay=2;torch.angle=.5;
    if(VIEW.mode==='first')torch.position.set(camPos.x,camPos.y-.2,camPos.z);else torch.position.set(p.x+Math.sin(p.face)*.35,1.45,p.z+Math.cos(p.face)*.35); // held at the chest, not lighting the porter's back
    torch.target.position.copy(camLook);}
  else{torch.intensity=110;torch.decay=1.3;torch.angle=.6;torch.position.set(p?p.x:0,2.6,p?p.z:0);if(p)torch.target.position.set(p.x+Math.sin(p.face)*6,0,p.z+Math.cos(p.face)*6);}
  torch.visible=!!p&&G.state!=='title';
  muzzle.intensity=Math.max(0,muzzle.intensity-real*600);
  if(p)p.rig.g.visible=!(playing&&(VIEW.mode==='first'||(VIEW.mode==='third'&&VIEW.camGap<.75)));
  // guests trailing the porter would block the close camera; zombies always stay visible
  for(const e of G.ents)if(e.kind==='c'&&!e.gone)e.rig.g.visible=!(close&&Math.hypot(e.x-camPos.x,e.z-camPos.z)<1.05);
  VIEW.updateGun(playing&&VIEW.mode==='first'&&p.hp>0,real);
  // cutaway (top-down): lower the outline walls and fade the upper floors when the porter is indoors.
  // close views: every wall at full storey height and the floors above as a ceiling.
  const inside=p&&G.state!=='title'&&(W.isInside(p.x,p.z)||p.z<px(1300));
  upperFade=lerp(upperFade,(inside&&!close)?0:1,Math.min(1,real*4));
  outerH=lerp(outerH,close?3.04:inside?1.15:2.8,Math.min(1,real*5));innerH=lerp(innerH,close?3.04:1.15,Math.min(1,real*5));
  upper.visible=upperFade>.02;upper.userData.mats.forEach(m=>{m.opacity=upperFade;m.transparent=upperFade<.99;});
  upper.children[0].castShadow=!(close&&inside); // the ceiling must not black out the moonlit rooms below
  outerWalls.children.forEach(g=>{g.children[0].scale.y=outerH;g.children[0].position.y=outerH/2;g.children[1].position.y=outerH+.01;});
  if(Math.abs(innerH-VIEW.lastInner)>.002){VIEW.lastInner=innerH;innerWalls.children.forEach(g=>{g.children[0].scale.y=innerH;g.children[0].position.y=innerH/2;g.children[1].position.y=innerH+.01;});
    const ds=Math.min(1,(innerH+.05)/2.1);W.doors.forEach(d=>{d.mesh.g.scale.y=ds;});} // doors never stand taller than the cut-down walls
  if(close&&G.state==='play'){const t=chooseTarget();VIEW.cross(!!t);}
  // flicker
  const t=performance.now()/1000;
  fires.forEach(f=>{f.t+=real;if(f.l)f.l.intensity=60+Math.sin(t*13+f.t)*14+rnd(14);if(Math.random()<(f.smoke?.25:.6))emit(f.x+rnd(-.8,.8),f.smoke?1:1.2,f.z+rnd(-.5,.5),f.smoke?{vy:rnd(.6,1.2),vx:.3,life:2.5,size:.6,grow:3,color:0x222222,alpha:.5}:{vy:rnd(1,2.5),vx:rnd(-.2,.2),life:rnd(.4,.8),size:rnd(.4,.8),grow:-.5,color:pick([0xff7a2a,0xffb03a,0xff4a1a]),add:true,alpha:.9});
    if(!f.smoke&&Math.random()<.2)emit(f.x+rnd(-.5,.5),2,f.z,{vy:1,vx:.4,life:2.2,size:.8,grow:2.5,color:0x1a1a1a,alpha:.45});});
  lampLights.forEach(L=>{if(L.flick){const on=!PREF.motion||Math.sin(t*1.3+L.base)>-.92;L.l.intensity=on?L.base:2;}});
  const steam=roomByName('Steam room');if(steam&&Math.random()<.3)emit(steam.x+rnd(-.4,.4),.3,steam.z+rnd(-.6,.6),{vy:.5,life:2,size:.7,grow:2,color:0xe8f4f4,alpha:.35});
  const boiler=roomByName('Boiler room');if(boiler&&Math.random()<.08)emit(boiler.x+rnd(-1,1),1.5,boiler.z,{vy:.6,life:2,size:.5,grow:2,color:0xcccccc,alpha:.25});
  if(COACH.ring){const s=1+Math.sin(t*3)*.08;COACH.ring.scale.set(s,s,1);}
  if(upper.userData.win&&Math.random()<.05){const w=upper.userData.win,i=(Math.random()*w.count)|0,c=new THREE.Color();const r=Math.random();c.set(r<.45?0xffc277:r<.55?0x9fdcff:r<.6?0xff3a3a:0x10161a);w.setColorAt(i,c);w.instanceColor.needsUpdate=true;}
  for(let i=tracers.length-1;i>=0;i--){const tr=tracers[i];tr.t-=real;tr.l.material.opacity=tr.t/.07;if(tr.t<=0){scene.remove(tr.l);tr.l.geometry.dispose();tr.l.material.dispose();tracers.splice(i,1);}}
  updateParts(dt);updateGore(dt);updateBarks(real);updateIndicators();updateGuide(real);
  // room tag
  if(p&&G.state==='play'){const r=W.roomAt(p.x,p.z)||(p.z>px(W.ROAD_Z0-40)?W.street:null);if(r!==G.room){G.room=r;const el=$('#room-tag');if(r){el.textContent=r.theme&&r.theme.label||r.name.toUpperCase();el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2600);}}}
  // audio mix
  if(p){const face=VIEW.mode==='top'?Math.PI:p.face;AUDIO.setListener(p.x,p.z,face);let near=30;for(const e of G.ents)if(e.kind==='z'&&!e.dead&&!e.dormant)near=Math.min(near,dist(e,p));const danger=clamp(1-near/8,0,1);G.danger=lerp(G.danger||0,danger,Math.min(1,real*2));AUDIO.setScene({danger,health:p.hp,indoors:W.isInside(p.x,p.z)});
    if(G.state==='play'){p.footT=(p.footT||0)-dt;if(Math.hypot(p.vx,p.vz)>1&&p.footT<=0){p.footT=.34;SFX.footstep(p.x,p.z,W.isInside(p.x,p.z)?'carpet':'street');}if(danger>.72&&!G.dangerLatched){SFX.stinger();G.dangerLatched=true;}if(danger<.25)G.dangerLatched=false;}
    $('#threat-readout').textContent=G.state==='play'&&danger>.7?'DANGER CLOSE':G.state==='play'&&danger>.35?'FOOTSTEPS NEARBY':'';AUDIO.setIntensity(G.state==='play'?clamp(G.outbreak*.85+G.night*.25,0,1):.1);let fd=99;fires.forEach(f=>{if(!f.smoke)fd=Math.min(fd,Math.hypot(f.x-p.x,f.z-p.z));});AUDIO.setFire(clamp(1-fd/14,0,1));AUDIO.setSiren(G.night<.15?1-G.night/.15:0);}
}
function slowmo(t){G.slow=t;}

// ================================================================ end of run: stars + the guest review
function endGame(won){
  if(G.state!=='play')return;G.state='end';clearInput();
  const s=G.stats,alive=civs().filter(c=>c.kind==='c'&&!c.gone&&c.state!=='grabbed').length;
  const score=Math.max(0,s.saved*100+s.rescued*60+G.lockedCount*50+s.kills*10+(won?500:0)-s.turned*40);
  // stars: surviving earns one; the rest are for guests saved, rooms sealed, and not letting the outbreak spread
  const stars=clamp((won?1:0)+(s.saved>=10?1:0)+(s.saved>=22?1:0)+(s.seals>=3||G.lockedCount>=3?1:0)+(won&&s.turned<=6?1:0),0,5);
  if(won)SFX.dawn();else SFX.dead();AUDIO.duck(.15);setTimeout(()=>AUDIO.duck(.42),4000);
  const lines=[];
  if(won)lines.push(pick(['Arrived for a quiet weekend. Left on the 06:00 coach.','Checked in Friday. Checked out at dawn, which I did not request.']));
  else lines.push(pick(['The porter was very brave, right up until the end.','Our porter has… checked out.','Service ended abruptly at '+$('#clock').textContent+'.']));
  if(s.chef)lines.push('The head chef was memorable. The porter dealt with him.');
  else if(G.t>60)lines.push('Kitchen closed early. Something was still banging on the door.');
  if(G.lockedCount>=3)lines.push(`Excellent door security — ${G.lockedCount} other guests are still locked in.`);
  if(s.bride)lines.push('The wedding went ahead, sort of.');
  if(s.turned>=8)lines.push('Half the coach party never came back from dinner.');
  if(s.blasts>0)lines.push('Fire extinguishers fully stocked and enthusiastically used.');
  if(s.heads>=5)lines.push('Porter is a crack shot. Tips accordingly.');
  if(s.doorsBroken>=2)lines.push('Self-closing doors could be stronger.');
  lines.push(pick(['Lift too small. Fits exactly one zombie.','Lovely sea views.','Would not barricade again.','Breakfast was not included, or served.','Three steps in every corridor. Zombies hated them.']));
  const reviewer=pick(['M. from Nowhere','A coach party regular','Gerald (formerly)','Anonymous, room 204','A frequent complaint flyer','Mrs P., Nowhere-on-Sea']);
  $('#end-kicker').textContent=won?'06:00 · THE COACH LEAVES · GUEST REVIEW':'YOU HAVE BEEN CHECKED OUT · GUEST REVIEW';
  $('#end-title').textContent=won?'You made it to dawn.':'The porter has fallen.';
  $('#end-stars').innerHTML='★'.repeat(stars)+`<span class="off">${'★'.repeat(5-stars)}</span>`;
  $('#end-review').innerHTML=`“${lines.join(' ')}”<cite>— ${reviewer} · ${stars} star${stars===1?'':'s'}</cite>`;
  $('#end-stats').innerHTML=[['SAVED',s.saved],['RESCUED',s.rescued],['LOCKED IN',G.lockedCount],['CHECKED OUT',s.kills],['TURNED',s.turned],['SCORE',score],['SALES PITCHES',s.pitches]].map(([k,v])=>`<div><b>${v}</b>${k}</div>`).join('')
    +`<ul class="crit">${[[won,'Reach 06:00'],[s.saved>=10,'Save 10 guests'],[s.saved>=22,'Save 22 guests'],[s.seals>=3||G.lockedCount>=3,'Lock 3 zombies in'],[won&&s.turned<=6,'Reach dawn with 6 or fewer turned']].map(([ok,t])=>`<li class="${ok?'ok':''}">${ok?'★':'☆'} ${t}</li>`).join('')}</ul>`;
  try{const best=+localStorage.getItem('checkout-time-fictional-best')||0;if(score>best)localStorage.setItem('checkout-time-fictional-best',score);}catch(e){}
  setTimeout(()=>{$('#end').hidden=false;},won?1200:1600);
}

// ================================================================ input + loop
function clearInput(){G.keys={};Object.assign(G.hold,{down:false,t:0,fired:false,door:null,completed:false});holdBar(-1);}
function syncSound(){const s=AUDIO.status();$('#mute').textContent=s.available?(s.muted?'Sound off':'Sound on'):'Sound unavailable';$('#mute').setAttribute('aria-pressed',String(s.muted));$('#audio-status').textContent=s.available?'Sound '+(s.muted?'muted':'enabled'):'Audio unavailable; game can be played silently.';}
function toggleSound(){AUDIO.toggleMute();syncSound();}
function setPaused(paused){if(G.state!=='play'&&G.state!=='pause')return;clearInput();if(paused&&document.exitPointerLock&&document.pointerLockElement)document.exitPointerLock();G.state=paused?'pause':'play';$('#pause').hidden=!paused;AUDIO.setPaused(paused);if(!paused)canvas.focus({preventScroll:true});}
function start(){clearInput();AUDIO.start();syncPrefs();syncSound();$('#title').hidden=true;$('#end').hidden=true;$('#pause').hidden=true;$('#hud').hidden=false;newGame();G.state='play';G.seen={};canvas.focus({preventScroll:true});VIEW.pitch=-.06;VIEW.spin=0;hint(VIEW.mode==='top'?'ARROWS MOVE · TAP SPACE FIRES · C CHANGES VIEW':'↑ ↓ WALK · ← → TURN · SPACE FIRES · C CHANGES VIEW',5);SFX.bell();
  $('#touch').hidden=!(matchMedia('(pointer:coarse)').matches||innerWidth<760);}
addEventListener('keydown',e=>{
  if(e.key===' '&&document.activeElement?.matches('button,a')&&!['start','again'].includes(document.activeElement.id))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  if(e.key===' '){if(e.repeat)return;if(G.state==='title'||(G.state==='end'&&!$('#end').hidden)){start();return;}if(G.state==='play')onSpaceDown();return;}
  if(e.key==='p'||e.key==='P'||e.key==='Escape'){if(!e.repeat)setPaused(G.state==='play');return;}
  if(e.key==='n'||e.key==='N'){if(!e.repeat)ownerPitch(true);return;}
  if(e.key==='m'||e.key==='M'){if(!e.repeat)toggleSound();return;}
  if(e.key==='c'||e.key==='C'||e.key==='v'||e.key==='V'){if(!e.repeat)cycleView();return;}
  if(e.key==='g'||e.key==='G'){if(!e.repeat){GUIDE.on=!GUIDE.on;GUIDE.t=0;if(G.state==='play')hint(GUIDE.on?'GUIDE TRAIL ON':'GUIDE TRAIL OFF',1.5);}return;}
  if(e.key==='ArrowDown'&&!e.repeat&&VIEW.mode!=='top'&&G.state==='play'){const t=performance.now();if(t-VIEW.lastDown<300){VIEW.spin=Math.PI;VIEW.lastDown=0;}else VIEW.lastDown=t;}
  G.keys[e.key]=true;
});
addEventListener('keyup',e=>{G.keys[e.key]=false;if(e.key===' '&&G.state==='play')onSpaceUp();});
addEventListener('blur',()=>{clearInput();if(G.state==='play')setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play')setPaused(true);});
$('#negotiate').onclick=()=>{ownerPitch(true);if(G.state==='play')canvas.focus({preventScroll:true});};
$('#start').onclick=start;$('#again').onclick=start;
$('#view-toggle').onclick=()=>{cycleView();canvas.focus({preventScroll:true});};
document.querySelectorAll('.view-pick button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
// optional mouse look in the close views (arrow keys alone still do everything)
canvas.addEventListener('click',()=>{if(VIEW.mode!=='top'&&G.state==='play'&&canvas.requestPointerLock&&document.pointerLockElement!==canvas){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}});
addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas||G.state!=='play'||VIEW.mode==='top'||G.player.hp<=0)return;G.player.face-=e.movementX*.0026;VIEW.pitch=clamp(VIEW.pitch-e.movementY*.0022,-.6,.45);});
addEventListener('mousedown',e=>{if(document.pointerLockElement===canvas&&e.button===0&&G.state==='play')onSpaceDown();});
addEventListener('mouseup',e=>{if(document.pointerLockElement===canvas&&e.button===0&&G.state==='play')onSpaceUp();});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&G.state==='play'&&VIEW.mode!=='top'&&VIEW.hadLock)setPaused(true);VIEW.hadLock=document.pointerLockElement===canvas;});
$('#gore-toggle').onclick=()=>{PREF.gore=!PREF.gore;if(!PREF.gore){decals.forEach(d=>d.visible=false);chunks.forEach(p=>{p.t=0;p.m.visible=false;});}syncPrefs();};
$('#motion-toggle').onclick=()=>{PREF.motion=!PREF.motion;syncPrefs();};
$('#mix-toggle').onclick=()=>{PREF.mix=PREF.mix==='quiet'?'cinema':'quiet';syncPrefs();};
$('#sound-check').onclick=async()=>{try{await AUDIO.soundCheck();syncSound();const s=AUDIO.status();$('#sound-report').textContent=s.available?'Audio '+s.state+' · '+s.errors+' errors':'Audio unavailable';setTimeout(()=>{if(G.state==='pause')AUDIO.setPaused(true);},2000);}catch(e){$('#sound-report').textContent='Audio unavailable: '+e.message;}};
syncPrefs();
$('#pause-toggle').onclick=()=>setPaused(true);$('#resume').onclick=()=>setPaused(false);$('#mute').onclick=toggleSound;
document.querySelectorAll('#touch [data-k]').forEach(b=>{const k=b.dataset.k;
  b.setAttribute('aria-label',k===' '?'Fire or hold to barricade':({ArrowUp:'Move up',ArrowDown:'Move down',ArrowLeft:'Move left',ArrowRight:'Move right'})[k]);
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(G.state!=='play')return;b.setPointerCapture?.(e.pointerId);if(k===' ')onSpaceDown();else G.keys[k]=true;});
  b.addEventListener('pointerup',()=>{if(k===' ')onSpaceUp();else G.keys[k]=false;});b.addEventListener('pointercancel',clearInput);});
try{const best=+localStorage.getItem('checkout-time-fictional-best');if(best)$('#best').textContent='Best score '+best;}catch(e){}

// attract mode: populate the street for the title screen
try{setView(localStorage.getItem('checkout-view')||'top');}catch(e){setView('top');}
newGame();G.state='title';
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let real=Math.min(.05,(now-last)/1000);last=now;
  let dt=real;
  if(G.hitstop>0){G.hitstop-=real;dt=0;}
  if(G.slow>0){G.slow-=real;dt*=.3;}
  if(G.state==='play')simulate(dt);
  else if(G.state==='title'||G.state==='end'){ // world keeps living behind the menus
    G.fT-=real;if(G.fT<=0){G.fT=.4;W.flow(W.cellOf(G.player.x,G.player.z),G.fPlayer);}
    for(const e of G.ents){if(e.gone)continue;if(e.kind==='z')updateZombie(e,dt*(G.state==='end'?.4:1));else if(e.kind==='c')updateCiv(e,dt);}separate();G.ents=G.ents.filter(e=>{if(e.gone&&e.kind!=='p'){PEOPLE.dispose(e.rig);scene.remove(e.rig.g);return false;}return true;});}
  if(G.state!=='pause')present(dt,real);
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){ // test hooks, local only
  window.__inspect=()=>({mode:VIEW.mode,gore:PREF.gore,motion:PREF.motion,mix:PREF.mix,guide:GUIDE.cells.slice(),target:GUIDE.target?.kind,chunks:chunks.filter(p=>p.m.visible).length,decals:decals.filter(d=>d.visible).length});
  window.__G=G;window.__step=(sec,keys)=>{const n=Math.round(sec*60);for(let i=0;i<n;i++){if(G.state==='play')simulate(1/60);present(1/60,1/60);}renderer.render(scene,camera);return {t:G.t,hp:G.player.hp,locked:G.lockedCount,saved:G.stats.saved,kills:G.stats.kills,turned:G.stats.turned,outbreak:+G.outbreak.toFixed(2),state:G.state};};}
})();

