// Original procedural sound design. No recordings, speech services or remote assets.
(function(){
'use strict';
const A={ctx:null,muted:false,started:false,intensity:0,danger:0,health:100,indoors:false,mix:'cinema',errors:0,voices:new Set(),listener:{x:0,z:0,face:Math.PI}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let noiseBuffer,beat=0;
function init(){
  if(A.ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  const c=A.ctx=new AC();A.master=c.createGain();A.master.gain.value=A.muted?0:.72;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=12;limiter.ratio.value=7;limiter.attack.value=.004;limiter.release.value=.18;
  A.master.connect(limiter);limiter.connect(c.destination);
  for(const [k,v]of [['sfx',.85],['music',.25],['amb',.32]]){A[k]=c.createGain();A[k].gain.value=v;A[k].connect(A.master);}
  noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const ir=c.createBuffer(2,c.sampleRate*1.25,c.sampleRate);for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3.6)*.4;}
  A.verb=c.createConvolver();A.verb.buffer=ir;A.verb.connect(A.master);return true;
}
function spatial(x,z,occluded=false){
  const l=A.listener,dx=x-l.x,dz=z-l.z,d=Math.hypot(dx,dz);
  return {pan:clamp((-Math.cos(l.face)*dx+Math.sin(l.face)*dz)/Math.max(2,d),-1,1),vol:1/(1+(d/7)**2)*(occluded?.38:1),cutoff:occluded?650:17000,d};
}
function voice(vol=.3,pan=0,verb=.08,bus='sfx',cutoff=17000){
  if(!A.ctx||A.ctx.state!=='running'||A.muted||A.voices.size>=28)return null;
  const c=A.ctx,nodes=[],sources=[],t=c.currentTime;
  const node=n=>(nodes.push(n),n),g=node(c.createGain());g.gain.value=vol;
  const lp=node(c.createBiquadFilter());lp.type='lowpass';lp.frequency.value=cutoff;g.connect(lp);
  const p=c.createStereoPanner?node(c.createStereoPanner()):null;if(p){p.pan.value=pan;lp.connect(p);p.connect(A[bus]);}else lp.connect(A[bus]);
  if(verb){const send=node(c.createGain());send.gain.value=verb;lp.connect(send);send.connect(A.verb);}
  let pending=0,closed=false;const v={stop(){if(closed)return;closed=true;for(const s of sources)try{s.stop();}catch(e){}for(const n of nodes)n.disconnect();A.voices.delete(v);}};A.voices.add(v);
  function source(s,at,dur){sources.push(s);pending++;s.onended=()=>{if(--pending===0)v.stop();};s.start(at);s.stop(at+dur+.025);}
  function envelope(gain,at,dur,attack=.006,peak=1){gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+Math.max(attack+.01,dur));}
  return {t,node,stop:v.stop,
    tone(type,hz,end,dur,amp=1,delay=0,filter=0){const at=t+delay,o=node(c.createOscillator()),e=node(c.createGain());o.type=type;o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),at+dur);envelope(e,at,dur,.008,amp);o.connect(e);if(filter){const f=node(c.createBiquadFilter());f.type='bandpass';f.frequency.value=filter;f.Q.value=2.4;e.connect(f);f.connect(g);}else e.connect(g);source(o,at,dur);},
    noise(dur,amp=1,hz=1400,type='lowpass',delay=0){const at=t+delay,s=node(c.createBufferSource()),f=node(c.createBiquadFilter()),e=node(c.createGain());s.buffer=noiseBuffer;s.loop=true;f.type=type;f.frequency.value=hz;f.Q.value=.7;envelope(e,at,dur,.003,amp);s.connect(f);f.connect(e);e.connect(g);source(s,at,dur);}
  };
}
function local(vol=.3,verb=.1,bus='sfx'){return voice(vol,0,verb,bus);}
function at(x,z,vol=.3,blocked=false){const p=spatial(x,z,blocked);return voice(vol*p.vol,p.pan,A.indoors?.2:.035,'sfx',p.cutoff);}
function impact(x,d,z=A.listener.z,blocked=false){const v=at(x,z,.4,blocked);if(!v)return;v.noise(.19,.8,700);v.tone('sine',105,34,.21,.7);v.noise(.09,.3,2100,'bandpass',.04);}
const S={
  gun(){const v=local(.56,A.indoors?.25:.07);if(!v)return;v.noise(.18,.8,3200);v.tone('sine',160,38,.16,.8);v.noise(.045,.22,6500,'highpass',.01);v.noise(.07,.12,1900,'bandpass',.12);},
  blast(){const v=local(.48,.2);if(!v)return;v.noise(1.1,.7,1900,'bandpass');v.noise(.7,.3,500);},
  splat:impact,thud(x,d,z=A.listener.z,blocked=false){const v=at(x,z,.4,blocked);if(!v)return;v.tone('sine',85,30,.23,.8);v.noise(.11,.55,650);},
  hammer(){const v=local(.35,.15);if(!v)return;for(let i=0;i<3;i++){v.noise(.07,.8,1900,'bandpass',i*.13);v.tone('triangle',230,70,.09,.4,i*.13);}},
  creak(){const v=local(.22,.18);if(v){v.tone('sawtooth',75,130,.6,.4,0,780);v.noise(.4,.2,900,'bandpass');}},
  splinter(x,d,z=A.listener.z,blocked=false){const v=at(x,z,.45,blocked);if(!v)return;for(let i=0;i<5;i++)v.noise(.09,.4,1700+Math.random()*2100,'highpass',i*.025);v.tone('sine',90,30,.28,.8);},
  groan(x,d,pitch=1,z=A.listener.z,blocked=false){const v=at(x,z,.21,blocked);if(!v)return;const b=(65+Math.random()*30)*pitch;v.tone('sawtooth',b*1.2,b*.8,1.1,.8,0,420);v.tone('triangle',b*2.02,b*1.6,.9,.3,.08,1050);v.noise(.7,.2,700,'bandpass',.1);},
  scream(x,d,pitch=1,z=A.listener.z,blocked=false){const v=at(x,z,.23,blocked);if(!v)return;const b=(300+Math.random()*90)*pitch;v.tone('sawtooth',b,b*1.4,.32,.45,0,1800);v.tone('triangle',b*1.4,b*.7,.7,.65,.22,1400);v.noise(.8,.25,2200,'bandpass');},
  hurt(){const v=local(.32,.08);if(v){v.tone('triangle',180,75,.25,.7,0,700);v.noise(.25,.6,800);}},
  turned(x,d,z=A.listener.z,blocked=false){const v=at(x,z,.35,blocked);if(v){v.tone('sawtooth',170,39,1.2,.6,0,600);v.noise(.65,.6,760);}},
  footstep(x,z,surface='street',blocked=false){const v=at(x,z,.13,blocked);if(!v)return;const carpet=surface==='carpet';v.noise(carpet?.1:.07,carpet?.35:.7,carpet?380:1700,'lowpass');v.tone('sine',carpet?62:95,40,.08,.35);},
  breath(panic=0){const v=local(.04+panic*.055,0);if(v){v.noise(.55,.5,800,'bandpass');v.noise(.35,.3,1200,'bandpass',.65);}},
  stinger(){const v=local(.18,.12,'music');if(v){v.tone('sawtooth',190,37,1.1,.5,0,650);v.tone('sine',58,28,1.2,.65);}},
  pickup(){const v=local(.2,.15);if(v){v.tone('sine',660,660,.28,.5);v.tone('sine',990,990,.4,.35,.08);}},
  saved(){const v=local(.24,.18);if(v){[392,523,659].forEach((f,i)=>v.tone('sine',f,f,.8,.4,i*.1));}},
  sealed(){const v=local(.23,.1);if(v){v.noise(.12,.8,900);v.tone('triangle',196,196,.5,.4,.08);}},
  combo(n){const v=local(.14,.1);if(v)v.tone('sine',440*Math.min(n,5),660,.2,.4);},
  bell(){const v=local(.22,.3);if(v)[1318,2637,3951].forEach((f,i)=>v.tone('sine',f,f,1.5,.5/(i+1)));},
  dawn(){const v=local(.24,.3,'music');if(v)[262,330,392,523].forEach((f,i)=>v.tone('sine',f,f,2.8,.4,i*.18));},
  dead(){const v=local(.3,.2,'music');if(v){v.tone('triangle',100,27,1.8,.7);v.noise(1.2,.3,500);}},
  ui(){const v=local(.09,0);if(v)v.tone('sine',880,660,.09,.3);}
};
function ambience(){const c=A.ctx;
  const sea=c.createBufferSource(),lp=c.createBiquadFilter();sea.buffer=noiseBuffer;sea.loop=true;lp.type='lowpass';lp.frequency.value=450;A.sea=c.createGain();A.sea.gain.value=.16;sea.connect(lp);lp.connect(A.sea);A.sea.connect(A.amb);sea.start();
  A.drone=c.createGain();A.drone.gain.value=.08;A.drone.connect(A.music);
  for(const f of [43.65,65.4,87.5]){const o=c.createOscillator(),filter=c.createBiquadFilter();o.type='triangle';o.frequency.value=f;filter.type='lowpass';filter.frequency.value=260;o.connect(filter);filter.connect(A.drone);o.start();}
  setInterval(()=>{if(c.state!=='running'||A.muted)return;beat++;const t=c.currentTime;
    A.drone.gain.setTargetAtTime(.08+A.intensity*.16,t,1.5);A.sea.gain.setTargetAtTime(A.indoors?.06:.16,t,.8);
    if(beat%2===0&&A.danger>.2){const v=local(.08+A.danger*.13,0,'music');if(v){v.tone('sine',65,36,.12,.7);v.tone('sine',58,31,.1,.4,.18);}}
    if(beat%6===0)S.breath(Math.max(A.danger,1-A.health/100));
    if(A.fire>.05&&beat%2===0){const v=local(A.fire*.08,0,'amb');if(v)v.noise(.1,.6,2700,'highpass');}
    if(A.siren>.05&&beat%4===0){const v=local(A.siren*.035,.2,'amb');if(v)v.tone('sine',640,420,1.5,.45);}
  },500);
}
window.SFX=new Proxy({},{get(_,key){return(...args)=>{try{if(S[key])S[key](...args);}catch(e){A.errors++;A.lastError=String(e.message||e);}};}});
window.AUDIO={
  start(){try{if(!init())return false;A.ctx.resume().catch(e=>{A.errors++;A.lastError=e.message;});if(!A.started){A.started=true;ambience();}return true;}catch(e){A.errors++;A.lastError=e.message;return false;}},
  setPaused(v){if(A.ctx){const p=v?A.ctx.suspend():A.ctx.resume();p?.catch(e=>{A.errors++;A.lastError=e.message;});}},
  status(){return{available:!!A.ctx,state:A.ctx?.state||'unavailable',muted:A.muted,mix:A.mix,voices:A.voices.size,errors:A.errors,lastError:A.lastError||null};},
  setListener(x,z=0,face=Math.PI){A.listener={x,z,face};},
  setIntensity(v){A.intensity=clamp(v,0,1);},setScene({danger,health,indoors}){A.danger=clamp(danger,0,1);A.health=health;A.indoors=!!indoors;},
  setMix(mode){A.mix=mode==='quiet'?'quiet':'cinema';if(A.sfx){const t=A.ctx.currentTime;A.sfx.gain.setTargetAtTime(A.mix==='quiet'?.55:.85,t,.1);A.music.gain.setTargetAtTime(A.mix==='quiet'?.14:.25,t,.1);}},
  setFire(v){A.fire=clamp(v,0,1);},setSiren(v){A.siren=clamp(v,0,1);},
  toggleMute(){A.muted=!A.muted;if(A.master)A.master.gain.setTargetAtTime(A.muted?0:.72,A.ctx.currentTime,.04);return A.muted;},
  duck(v){if(A.music)A.music.gain.setTargetAtTime(v*.6,A.ctx.currentTime,.3);},
  async soundCheck(){if(!this.start())return false;await A.ctx.resume();S.bell();S.footstep(A.listener.x-2,A.listener.z);S.groan(A.listener.x+3,3,.8,A.listener.z);return true;},
  stopEffects(){for(const v of [...A.voices])v.stop();},spatial
};
})();
