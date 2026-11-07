// Checkout Time — people. Jointed figures built procedurally (no external models).
// Each body segment is merged into ONE vertex-coloured mesh, so a detailed person costs multiple draw calls.
(function(){
'use strict';
const THREE=window.THREE;
const BODY_MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});
const EYE_MAT=new THREE.MeshBasicMaterial({color:0xd8ff4a});
const SHADOW_MAT=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false});
const G={sph:new THREE.SphereGeometry(1,14,10),sphLo:new THREE.SphereGeometry(1,8,6),cyl:new THREE.CylinderGeometry(1,1,1,12),box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,16,1,true),
  taper:(t,b)=>{const k=t+'_'+b;return G[k]||(G[k]=new THREE.CylinderGeometry(t,b,1,12));}};
const SHADOW_GEO=new THREE.CircleGeometry(.32,16);
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_c=new THREE.Color();

// ---------------------------------------------------------------- tiny geometry builder
function Builder(){this.p=[];this.n=[];this.c=[];}
Builder.prototype.add=function(geo,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,opts={}){
  const g=geo.index?geo.toNonIndexed():geo.clone();
  _m.compose(new THREE.Vector3(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));g.applyMatrix4(_m);
  const P=g.attributes.position.array,Nn=g.attributes.normal.array,n=P.length/3;
  const base=_c.set(color).clone(),stain=opts.stain||0,grain=opts.grain===undefined?.05:opts.grain,tint=opts.stainColor?new THREE.Color(opts.stainColor):null;
  for(let t=0;t<n;t+=3){ // per triangle: fabric grain, and blood/dirt stains on zombies
    let col=base.clone();const r=Math.random();
    if(tint&&r<stain)col.lerp(tint,.55+Math.random()*.35);
    const f=1+(Math.random()*2-1)*grain;col.multiplyScalar(f);
    for(let k=0;k<3;k++){this.c.push(col.r,col.g,col.b);}
  }
  for(let i=0;i<P.length;i++){this.p.push(P[i]);this.n.push(Nn[i]);}
  g.dispose();return this;
};
Builder.prototype.mesh=function(mat=BODY_MAT){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
  const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m;
};

// ---------------------------------------------------------------- palette helpers
const hex=c=>new THREE.Color(c);
function mix(a,b,t){return hex(a).lerp(hex(b),t).getHex();}
function shade(a,f){return hex(a).multiplyScalar(f).getHex();}

// ---------------------------------------------------------------- one person
// o: {skin,shirt,pants,hair,shoes,hat,dress,tie,apron,buttons,sleeves:'long'|'short',hairStyle,height,build,stoop,gun}
function make(o){
  o=Object.assign({shoes:0x1c1a18,hairStyle:'short',sleeves:'long',height:1,build:1,stoop:0},o);
  const rig={o,phase:Math.random()*9,sc:o.height,zombie:false,parts:{}};
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);body.scale.set(o.build,o.height,o.build);
  const pelvis=new THREE.Group();pelvis.position.y=.94;body.add(pelvis);
  const spine=new THREE.Group();spine.position.y=.04;pelvis.add(spine);
  const neck=new THREE.Group();neck.position.y=.5;spine.add(neck);
  const sh=[-1,1].map(s=>{const a=new THREE.Group();a.position.set(s*.2,.43,0);spine.add(a);const e=new THREE.Group();e.position.y=-.29;a.add(e);return {a,e};});
  const hp=[-1,1].map(s=>{const a=new THREE.Group();a.position.set(s*.092,0,0);pelvis.add(a);const k=new THREE.Group();k.position.y=-.45;a.add(k);return {a,k};});
  Object.assign(rig,{g,body,pelvis,hips:pelvis,spine,torso:spine,neck,armL:sh[0].a,armR:sh[1].a,elbowL:sh[0].e,elbowR:sh[1].e,legL:hp[0].a,legR:hp[1].a,kneeL:hp[0].k,kneeR:hp[1].k});
  const shadow=new THREE.Mesh(SHADOW_GEO,SHADOW_MAT);shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;g.add(shadow);
  build(rig);
  if(o.gun){const gun=new THREE.Group();const gm=new THREE.MeshStandardMaterial({color:0x1d1d20,roughness:.45,metalness:.6});
    // pivot sits in the hand so the barrel can follow the forearm when aiming
    const b1=new THREE.Mesh(G.box,gm);b1.scale.set(.045,.065,.3);b1.position.set(0,0,.12);const b2=new THREE.Mesh(G.box,gm);b2.scale.set(.04,.11,.05);b2.position.set(0,-.03,-.01);
    [b1,b2].forEach(m=>{m.castShadow=true;gun.add(m);});gun.position.set(0,-.31,0);sh[1].e.add(gun);rig.gun=gun;}
  return rig;
}

function build(rig){
  const o=rig.o,z=rig.zombie;
  // old segment meshes out
  for(const k in rig.parts){const m=rig.parts[k];m.parent&&m.parent.remove(m);m.geometry.dispose();if(m.material!==BODY_MAT&&m.material!==EYE_MAT)m.material.dispose();}rig.parts={};
  const skin=z?mix(o.skin,0x6d8758,.72):o.skin,skinDark=shade(skin,.86),lips=z?0x3a2a22:mix(o.skin,0x9a4a4a,.45);
  const shirt=z?shade(o.shirt,.72):o.shirt,pants=z?shade(o.pants,.75):o.pants,hair=z?shade(o.hair,.7):o.hair;
  const zs=z?{stain:.22,stainColor:0x4a0c08}:{},zsHeavy=z?{stain:.35,stainColor:0x3a0806}:{};
  const B=()=>new Builder();
  // ---- torso (on the spine)
  const t=B();
  t.add(G.sph,pants,0,-.02,0,.165,.11,.115,0,0,0,zs);                        // hips
  if(!o.dress){t.add(G.cyl,0x1a1614,0,.06,0,.158,.035,.112,0,0,0,{grain:.02});} // belt
  t.add(G.taper(.135,.152),shirt,0,.17,0,1,.24,.74,0,0,0,zsHeavy);         // abdomen
  t.add(G.sph,shirt,0,.36,0,.19,.165,.12,0,0,0,zsHeavy);                     // chest
  t.add(G.sph,shirt,-.17,.43,0,.07,.065,.07,0,0,0,zs);t.add(G.sph,shirt,.17,.43,0,.07,.065,.07,0,0,0,zs); // shoulders
  t.add(G.cyl,o.collar||shade(shirt,1.15),0,.505,0,.062,.04,.062);           // collar
  if(o.tie)t.add(G.box,o.tie,0,.37,.118,.038,.2,.012,.08,0,0);
  if(o.buttons){for(let i=0;i<4;i++)t.add(G.sphLo,0xd6b046,0,.24+i*.075,.118,.012,.012,.008,0,0,0,{grain:0});
    t.add(G.box,shade(shirt,.82),0,.02,.0,.34,.1,.24,0,0,0,zs);}              // jacket hem
  if(o.apron)t.add(G.box,0xf2f2ee,0,.13,.118,.27,.44,.012,-.05,0,0,zs);
  if(o.stripe)t.add(G.box,o.stripe,0,.36,.121,.03,.3,.01);
  if(o.towelChest)t.add(G.cyl,0xf4f4f0,0,-.02,0,.175,.16,.125);
  rig.parts.torso=t.mesh();rig.spine.add(rig.parts.torso);
  if(o.dress){const d=B();d.add(G.cone,o.shirt,0,-.42,0,.46,.92,.42,0,0,0,zs);d.add(G.cyl,o.shirt,0,.02,0,.16,.06,.12);rig.parts.dress=d.mesh();rig.pelvis.add(rig.parts.dress);
    rig.parts.dress.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});}
  // ---- head and face (on the neck pivot)
  const h=B(),hy=0;
  h.add(G.cyl,skinDark,0,.045,0,.048,.11,.048);                               // neck
  h.add(G.sph,skin,0,.19,0,.104,.124,.114,0,0,0,{grain:.025});                // cranium
  h.add(G.sph,skin,0,z?.1:.118,.022,.082,.058,.088,0,0,0,{grain:.025});      // jaw (hangs open on zombies)
  h.add(G.box,skinDark,0,.178,.112,.024,.046,.03,-.15,0,0,{grain:.02});      // nose
  h.add(G.sph,skinDark,-.104,.18,0,.02,.034,.014);h.add(G.sph,skinDark,.104,.18,0,.02,.034,.014); // ears
  if(!z){[-1,1].forEach(s=>{h.add(G.sphLo,0xf4f1ea,s*.04,.198,.095,.019,.014,.012,0,0,0,{grain:0});h.add(G.sphLo,0x2a1c12,s*.04,.198,.106,.009,.009,.004,0,0,0,{grain:0});});}
  else{[-1,1].forEach(s=>h.add(G.sphLo,0x14110e,s*.04,.198,.094,.024,.019,.012,0,0,0,{grain:0}));} // sunken sockets
  [-1,1].forEach(s=>h.add(G.box,hair,s*.042,.228,.104,.046,.01,.012,0,0,s*-.08,{grain:0}));         // brows
  h.add(G.box,lips,0,z?.097:.138,.101,.042,z?.022:.009,.012,0,0,0,{grain:0});                         // mouth
  hairstyle(h,o,hair);hat(h,o,z);
  rig.parts.head=h.mesh();rig.neck.add(rig.parts.head);
  const ey=B();[-1,1].forEach(s=>ey.add(G.sphLo,0xffffff,s*.04,.198,.1,.011,.011,.008,0,0,0,{grain:0}));
  rig.parts.eyes=ey.mesh(EYE_MAT);rig.parts.eyes.castShadow=false;rig.parts.eyes.visible=z;rig.neck.add(rig.parts.eyes);
  rig.eyes=[rig.parts.eyes];
  // ---- arms
  const sleeveLong=o.sleeves==='long';
  [['L',-1],['R',1]].forEach(([k,s])=>{
    const torn=z&&Math.random()<.45;
    const u=B();u.add(G.taper(.05,.044),sleeveLong||!o.towel?shirt:skin,0,-.14,0,1,.28,1,0,0,0,zs);u.add(G.sph,shirt,0,-.005,0,.055,.055,.055,0,0,0,zs);
    rig.parts['upper'+k]=u.mesh();rig['arm'+k].add(rig.parts['upper'+k]);
    const f=B(),fc=(sleeveLong&&!torn)?shirt:skin;
    f.add(G.taper(.043,.034),fc,0,-.125,0,1,.25,1,0,0,0,fc===shirt?zs:{grain:.03});
    if(sleeveLong&&!torn&&o.cuff)f.add(G.cyl,o.cuff,0,-.235,0,.04,.025,.04,0,0,0,{grain:0});
    f.add(G.box,skin,0,-.3,0,.058,.085,.028,0,0,0,{grain:.02});                       // palm
    f.add(G.box,skin,s*-.032,-.285,.012,.018,.045,.02,0,0,s*.35,{grain:.02});          // thumb
    f.add(G.box,skinDark,0,-.355,0,.052,.035,.024,.15,0,0,{grain:.02});                // curled fingers
    rig.parts['fore'+k]=f.mesh();rig['elbow'+k].add(rig.parts['fore'+k]);
  });
  // ---- legs
  [['L',-1],['R',1]].forEach(([k,s])=>{
    const th=B();th.add(G.taper(.074,.058),o.towel?skin:pants,0,-.22,0,1,.44,1,0,0,0,zs);
    if(o.towel)th.add(G.taper(.08,.075),0xf4f4f0,0,-.08,0,1,.16,1);
    rig.parts['thigh'+k]=th.mesh();rig['leg'+k].add(rig.parts['thigh'+k]);
    const sn=B();sn.add(G.taper(.054,.042),o.towel?skin:pants,0,-.21,0,1,.42,1,0,0,0,zs);
    sn.add(G.box,o.towel?skin:o.shoes,0,-.455,.045,.088,.065,.235,0,0,0,{grain:.03});    // shoe (bare feet in the steam room)
    sn.add(G.box,shade(o.towel?skin:o.shoes,.7),0,-.487,.045,.09,.012,.24,0,0,0,{grain:0}); // sole
    rig.parts['shin'+k]=sn.mesh();rig['knee'+k].add(rig.parts['shin'+k]);
  });
}
function hairstyle(h,o,hair){
  const st=o.hat==='chef'||o.hat==='cap'||o.hat==='towel'?'cropped':o.hairStyle;
  if(st==='bald'){h.add(G.sph,hair,0,.17,-.028,.108,.04,.11,0,0,0,{grain:.08});return;}
  h.add(G.sph,hair,0,.236,-.008,.112,.082,.122,0,0,0,{grain:.08});            // crown
  h.add(G.sph,hair,0,.19,-.04,.108,.1,.1,0,0,0,{grain:.08});                  // back
  if(st==='cropped')return;
  [-1,1].forEach(s=>h.add(G.sph,hair,s*.092,.2,-.01,.03,.06,.08,0,0,0,{grain:.08})); // sides
  if(st==='long'){h.add(G.box,hair,0,.09,-.065,.2,.24,.07,.1,0,0,{grain:.1});[-1,1].forEach(s=>h.add(G.box,hair,s*.1,.11,-.01,.03,.18,.09,0,0,0,{grain:.1}));}
  if(st==='bun')h.add(G.sph,hair,0,.27,-.1,.05,.05,.05,0,0,0,{grain:.08});
  if(st==='quiff')h.add(G.sph,hair,0,.29,.05,.07,.035,.07,-.3,0,0,{grain:.08});
}
function hat(h,o,z){
  if(o.hat==='chef'){h.add(G.cyl,0xf4f4f2,0,.33,0,.11,.15,.11);h.add(G.sph,0xf4f4f2,0,.44,0,.15,.08,.15,0,0,0,{grain:.03});}
  if(o.hat==='cap'){h.add(G.cyl,o.capColor||0x7a1424,0,.29,0,.118,.075,.122);h.add(G.cyl,0xd6b046,0,.265,0,.12,.016,.124,0,0,0,{grain:0});
    h.add(G.box,0x111111,0,.258,.12,.15,.012,.07,.12,0,0);h.add(G.cyl,shade(o.capColor||0x7a1424,.8),0,.33,0,.124,.012,.128);}
  if(o.hat==='veil'){h.add(G.cone,0xf6f4ee,0,.1,-.08,.22,.55,.14,.18,0,0,{grain:.02});h.add(G.sph,0xf6f4ee,0,.27,-.02,.06,.02,.06);}
  if(o.hat==='towel'){h.add(G.sph,0xf4f4f0,0,.27,-.01,.125,.08,.13,0,0,0,{grain:.06});}
}

// ---------------------------------------------------------------- turning
function zombify(rig){if(rig.zombie)return;rig.zombie=true;build(rig);}

// ---------------------------------------------------------------- animation
const S=Math.sin,C=Math.cos,L=(a,b,t)=>a+(b-a)*t;
function pose(rig,e,dt){
  const sp=Math.hypot(e.vx,e.vz),z=e.kind==='z',k=Math.min(1,dt*12);
  const run=sp>3,A=Math.min(1,sp/(z?1.8:4.2));
  rig.phase+=dt*(z?(e.runner?7.5:2.6+sp*1.4):(3.2+sp*1.75));
  const ph=rig.phase,s=S(ph),c=C(ph);
  let thL=-s*.55*A,thR=s*.55*A,knL=A*(.12+.95*Math.max(0,c)),knR=A*(.12+.95*Math.max(0,-c));
  let shL=s*.45*A,shR=-s*.45*A,elL=-(.22+.45*A),elR=-(.22+.45*A),shZL=.06,shZR=-.06;
  let lean=(run?.2:.05)*A+rig.o.stoop,tilt=0,twist=s*.12*A,headX=0,headZ=0,headY=0;
  let bob=Math.abs(c)*.045*A-.02*A;
  const t=performance.now()/1000;
  if(z){
    const drag=.35; // the right leg drags: short, stiff steps
    thL=-s*.5*A;thR=s*.5*A*drag;knL=A*(.15+.8*Math.max(0,c));knR=.12;
    let arm=-1.35,armE=-.18;
    if(e.state==='grab'){arm=-1.65;armE=-.7;}if(e.windup>0){arm=-2.7;armE=-.15;}
    if(e.dormant){arm=-.15;armE=-.2;thL=thR=0;knL=knR=.05;}
    shL=arm+S(ph*.7)*.14;shR=arm+C(ph*.8)*.14;elL=armE+S(ph*1.3)*.08;elR=armE;shZL=.12;shZR=-.12;
    lean=e.runner?.45:.3;tilt=S(ph*.5)*.12+.06;twist=S(ph*.5)*.18;
    headX=.28;headZ=S(t*.9+rig.phase)*.35;bob=Math.abs(c)*.06*A-.04;
    if(e.dormant){lean=.12;headY=S(t*.6+rig.phase)*.7;headZ=.25;}
  }else if(e.state==='grabbed'){
    const q=t*28;shL=-2.5+S(q)*.5;shR=-2.3+C(q*1.1)*.5;shZL=.6;shZR=-.6;elL=elR=-.8;tilt=S(q*.9)*.15;lean=-.15;knL=.3;knR=.1;thL=-.2+S(q)*.3;
  }else if(e.kind==='c'&&(e.state==='panic'||e.scared>0)){
    shL=-2.6+S(ph*2)*.45;shR=-2.6+C(ph*2)*.45;shZL=.45;shZR=-.45;elL=elR=-.55;lean=.18*A;headX=-.15;
  }else if(e.kind==='p'&&e.aim>0){
    shR=-1.5;elR=-.05;shL=-1.3;shZL=-.45;elL=-.55;twist=.12;lean=.05;
  }else if(sp<.3){ // idle: breathe, shift weight, look about
    thL=S(t*.7+rig.phase)*.04;thR=-thL;knL=knR=.06;shL=shR=.04;elL=elR=-.18;tilt=S(t*.5+rig.phase)*.03;headY=S(t*.4+rig.phase*2)*.4;
  }
  const r=rig;
  r.legL.rotation.x=L(r.legL.rotation.x,thL,k);r.legR.rotation.x=L(r.legR.rotation.x,thR,k);
  r.kneeL.rotation.x=L(r.kneeL.rotation.x,knL,k);r.kneeR.rotation.x=L(r.kneeR.rotation.x,knR,k);
  r.armL.rotation.x=L(r.armL.rotation.x,shL,k);r.armR.rotation.x=L(r.armR.rotation.x,shR,k);
  r.armL.rotation.z=L(r.armL.rotation.z,shZL,k);r.armR.rotation.z=L(r.armR.rotation.z,shZR,k);
  r.elbowL.rotation.x=L(r.elbowL.rotation.x,elL,k);r.elbowR.rotation.x=L(r.elbowR.rotation.x,elR,k);
  r.spine.rotation.x=L(r.spine.rotation.x,lean,k);r.spine.rotation.z=L(r.spine.rotation.z,tilt,k);r.spine.rotation.y=L(r.spine.rotation.y,-twist*.6,k);
  r.pelvis.rotation.y=L(r.pelvis.rotation.y,twist,k);
  r.neck.rotation.x=L(r.neck.rotation.x,headX-lean*.5,k);r.neck.rotation.z=L(r.neck.rotation.z,headZ,k);r.neck.rotation.y=L(r.neck.rotation.y,headY,k*.5);
  r.pelvis.position.y=.94+bob-(Math.max(knL,knR)*.04);
  const br=1+S(t*1.6+rig.phase)*.012;r.parts.torso.scale.set(1,1,br);
  if(r.gun)r.gun.rotation.x=L(r.gun.rotation.x,e.aim>0?1.5:0,k);
}

// ---------------------------------------------------------------- outfits
const SKIN=[0xf1c9a5,0xe6b48c,0xd29a6c,0xb07448,0x8a5638,0x5e3a26];
const HAIR=[0x2a1a10,0x4a2c18,0x6b4426,0xc9a46a,0xe0c890,0x111111,0x8a3a1a];
const pick=a=>a[(Math.random()*a.length)|0],rnd=(a,b)=>a+Math.random()*(b-a);
const base=()=>({skin:pick(SKIN),height:rnd(.93,1.07),build:rnd(.9,1.12)});
const OUTFITS={
  guest:()=>Object.assign(base(),{shirt:pick([0xc84a4a,0x2a6fb0,0xe2bc3e,0x3a8a5a,0xd87aa8,0xeeeeea,0x6a4ab0,0xf08a3a,0x2f4f6f,0x8a6a4a]),pants:pick([0x262a36,0x3a3a3a,0x4a3a2a,0x1e2a4a,0x8a7a5a,0x5a6a7a]),
    hair:pick(HAIR),hairStyle:pick(['short','short','long','bun','quiff','bald']),sleeves:Math.random()<.35?'short':'long',shoes:pick([0x1c1a18,0x3a2a1c,0xe8e8e8,0x2a2a40])}),
  elderly:()=>Object.assign(base(),{shirt:pick([0x8a6a8a,0x6a7a5a,0xb8a080,0x7a8aa0]),pants:pick([0x4a4a4a,0x6a5a4a]),hair:pick([0xdddddd,0xbcbcbc,0xeeeeee]),hairStyle:pick(['short','bald','bun']),height:rnd(.9,.97),stoop:.12,collar:0xf0f0ea}),
  bride:()=>Object.assign(base(),{shirt:0xf6f4ee,pants:0xf6f4ee,hair:pick(HAIR.slice(0,5)),hairStyle:'bun',dress:true,hat:'veil',sleeves:'short',shoes:0xf0f0f0,height:rnd(.94,1)}),
  groom:()=>Object.assign(base(),{shirt:0x16161c,pants:0x16161c,hair:pick(HAIR),hairStyle:'quiff',tie:0xb0b0b8,collar:0xf6f6f6,cuff:0xf6f6f6}),
  chef:()=>Object.assign(base(),{shirt:0xf4f4f2,pants:0x2a2a2a,hair:0x2a1a10,hat:'chef',apron:true,collar:0xffffff,build:1.15}),
  staff:()=>Object.assign(base(),{shirt:0x1e2a4a,pants:0x111111,hair:pick(HAIR),hairStyle:pick(['short','bun','long']),tie:0x7a1424,collar:0xeeeeee}),
  gym:()=>Object.assign(base(),{shirt:pick([0x39c0ff,0xff3a8a,0x2a2a2a]),pants:0x222222,hair:pick(HAIR),hairStyle:pick(['short','bun']),sleeves:'short',stripe:0xffffff,shoes:0xf4f4f4}),
  towel:()=>Object.assign(base(),{shirt:0,pants:0xf4f4f0,hair:0x2a1a10,hat:'towel',sleeves:'short',towel:true,towelChest:false,shoes:0}),
  porter:()=>({skin:0xe0ac80,shirt:0x7a1424,pants:0x15151a,hair:0x2a1a10,hat:'cap',gun:true,buttons:true,collar:0xd6b046,cuff:0xd6b046,height:1.02,build:1.04})
};
// the steam-room guest: bare torso in skin tone, towel at the waist
const _towel=OUTFITS.towel;OUTFITS.towel=()=>{const o=_towel();o.shirt=o.skin;return o;};

function dispose(rig){const geometries=new Set(Object.values(rig.parts).map(m=>m.geometry)),materials=new Set();rig.g.traverse(m=>{if(!m.isMesh)return;if(m.material!==BODY_MAT&&m.material!==EYE_MAT&&m.material!==SHADOW_MAT)materials.add(m.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
window.PEOPLE={dispose,make,pose,zombify,OUTFITS,EYE_MAT};
})();
