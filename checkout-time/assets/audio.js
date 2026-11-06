// Checkout Time — procedural audio. Everything is synthesised with WebAudio; no sample files.
(function(){
'use strict';
const A={ctx:null,master:null,sfx:null,music:null,amb:null,muted:false,intensity:0,started:false};
let noiseBuf=null,listenerX=0;

function init(){
  if(A.ctx)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=A.ctx=new AC();
  A.master=c.createGain();A.master.gain.value=A.muted?0:.9;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
  A.master.connect(comp);comp.connect(c.destination);
  A.sfx=gain(1,A.master);A.music=gain(.42,A.master);A.amb=gain(.5,A.master);
  noiseBuf=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // reverb-ish room send
  A.verb=c.createConvolver();const ir=c.createBuffer(2,c.sampleRate*1.6,c.sampleRate);
  for(let ch=0;ch<2;ch++){const x=ir.getChannelData(ch);for(let i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/x.length,3);}
  A.verb.buffer=ir;A.verbIn=gain(.22,A.verb);A.verb.connect(A.master);
}
function gain(v,to){const g=A.ctx.createGain();g.gain.value=v;if(to)g.connect(to);return g;}
function now(){return A.ctx.currentTime;}
function noise(dur){const s=A.ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.loopStart=Math.random();s.start(now(),Math.random()*1.5);s.stop(now()+dur+.05);return s;}
function env(g,t,a,peak,dec,end=0.0001){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(end,t+a+dec);}
function out(pan=0,vol=1,verb=0){
  const p=A.ctx.createStereoPanner?A.ctx.createStereoPanner():null,g=gain(vol);
  if(p){p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(A.sfx);}else g.connect(A.sfx);
  if(verb){const v=gain(verb,A.verbIn);g.connect(v);}
  return g;
}
// pan/volume from world position relative to listener
function spatial(x,dist){return {pan:(x-listenerX)/12,vol:Math.max(0,1-dist/30)};}

const S={
  gun(){const t=now(),o=out(0,.55,.3);
    const n=noise(.3),f=A.ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(5000,t);f.frequency.exponentialRampToValueAtTime(300,t+.18);
    const g=gain(0);env(g,t,.002,1,.2);n.connect(f);f.connect(g);g.connect(o);
    const th=A.ctx.createOscillator();th.type='sine';th.frequency.setValueAtTime(150,t);th.frequency.exponentialRampToValueAtTime(40,t+.12);
    const g2=gain(0);env(g2,t,.002,.9,.14);th.connect(g2);g2.connect(o);th.start(t);th.stop(t+.2);
    const cl=A.ctx.createOscillator();cl.type='square';cl.frequency.value=2400;const g3=gain(0);env(g3,t+.09,.001,.05,.03);cl.connect(g3);g3.connect(o);cl.start(t+.09);cl.stop(t+.14);
  },
  blast(){const t=now(),o=out(0,.6,.4),n=noise(1.1),f=A.ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(1800,t);f.frequency.exponentialRampToValueAtTime(600,t+1);f.Q.value=.6;
    const g=gain(0);env(g,t,.02,1,1);n.connect(f);f.connect(g);g.connect(o);},
  splat(x,d){const sp=spatial(x,d);if(!sp.vol)return;const t=now(),o=out(sp.pan,.5*sp.vol),n=noise(.25),f=A.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
    const g=gain(0);env(g,t,.003,.9,.18);n.connect(f);f.connect(g);g.connect(o);
    const b=A.ctx.createOscillator();b.frequency.setValueAtTime(110,t);b.frequency.exponentialRampToValueAtTime(45,t+.15);const g2=gain(0);env(g2,t,.003,.6,.16);b.connect(g2);g2.connect(o);b.start(t);b.stop(t+.2);},
  thud(x,d){const sp=spatial(x,d);if(!sp.vol)return;const t=now(),o=out(sp.pan,.55*sp.vol,.25),b=A.ctx.createOscillator();b.type='triangle';b.frequency.setValueAtTime(95,t);b.frequency.exponentialRampToValueAtTime(38,t+.25);
    const g=gain(0);env(g,t,.004,1,.3);b.connect(g);g.connect(o);b.start(t);b.stop(t+.35);
    const n=noise(.12),f=A.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=500;const g2=gain(0);env(g2,t,.002,.5,.1);n.connect(f);f.connect(g2);g2.connect(o);},
  hammer(){const t=now(),o=out(0,.5,.3);for(let i=0;i<3;i++){const s=t+i*.13,n=noise(.08),f=A.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1200+i*200;f.Q.value=3;
    const g=gain(0);env(g,s,.001,1,.07);n.connect(f);f.connect(g);g.connect(o);
    const k=A.ctx.createOscillator();k.frequency.setValueAtTime(220,s);k.frequency.exponentialRampToValueAtTime(90,s+.06);const g2=gain(0);env(g2,s,.001,.6,.07);k.connect(g2);g2.connect(o);k.start(s);k.stop(s+.1);}},
  creak(){const t=now(),o=out(0,.35,.3),c=A.ctx.createOscillator();c.type='sawtooth';c.frequency.setValueAtTime(90,t);c.frequency.linearRampToValueAtTime(140,t+.4);
    const f=A.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=8;const g=gain(0);env(g,t,.05,.6,.4);c.connect(f);f.connect(g);g.connect(o);c.start(t);c.stop(t+.5);},
  splinter(x,d){const sp=spatial(x,d);const t=now(),o=out(sp.pan,.8*Math.max(.3,sp.vol),.4);for(let i=0;i<6;i++){const s=t+Math.random()*.15,n=noise(.1),f=A.ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1500+Math.random()*2500;
    const g=gain(0);env(g,s,.001,.7,.08);n.connect(f);f.connect(g);g.connect(o);}S.thud(x,d);},
  groan(x,d,pitch=1){const sp=spatial(x,d);if(sp.vol<.05)return;const t=now(),len=.8+Math.random()*.7,o=out(sp.pan,.32*sp.vol,.35);
    const c=A.ctx.createOscillator();c.type='sawtooth';const base=(70+Math.random()*40)*pitch;c.frequency.setValueAtTime(base*1.25,t);c.frequency.linearRampToValueAtTime(base,t+len);
    const lfo=A.ctx.createOscillator();lfo.frequency.value=5+Math.random()*4;const lg=gain(base*.06);lfo.connect(lg);lg.connect(c.frequency);
    const f1=A.ctx.createBiquadFilter();f1.type='bandpass';f1.frequency.setValueAtTime(500,t);f1.frequency.linearRampToValueAtTime(320,t+len);f1.Q.value=4;
    const f2=A.ctx.createBiquadFilter();f2.type='bandpass';f2.frequency.value=1100;f2.Q.value=6;const mix=gain(1);
    const g=gain(0);env(g,t,.12,1,len);c.connect(f1);c.connect(f2);f1.connect(mix);f2.connect(mix);mix.connect(g);g.connect(o);
    c.start(t);lfo.start(t);c.stop(t+len+.2);lfo.stop(t+len+.2);},
  scream(x,d,high=1){const sp=spatial(x,d);if(sp.vol<.05)return;const t=now(),len=.6+Math.random()*.5,o=out(sp.pan,.26*sp.vol,.4);
    const c=A.ctx.createOscillator();c.type='triangle';const b=(520+Math.random()*260)*high;c.frequency.setValueAtTime(b*.8,t);c.frequency.exponentialRampToValueAtTime(b*1.5,t+.12);c.frequency.exponentialRampToValueAtTime(b*.9,t+len);
    const lfo=A.ctx.createOscillator();lfo.frequency.value=7+Math.random()*3;const lg=gain(b*.05);lfo.connect(lg);lg.connect(c.frequency);
    const f=A.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=b*2.2;f.Q.value=1.4;
    const n=noise(len),nf=A.ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=2600;const ng=gain(.15);n.connect(nf);nf.connect(ng);
    const g=gain(0);env(g,t,.04,1,len);c.connect(f);f.connect(g);ng.connect(g);g.connect(o);c.start(t);lfo.start(t);c.stop(t+len+.1);lfo.stop(t+len+.1);},
  hurt(){const t=now(),o=out(0,.55,.2),c=A.ctx.createOscillator();c.type='sawtooth';c.frequency.setValueAtTime(190,t);c.frequency.exponentialRampToValueAtTime(95,t+.25);
    const f=A.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;const g=gain(0);env(g,t,.01,.9,.28);c.connect(f);f.connect(g);g.connect(o);c.start(t);c.stop(t+.35);S.splat(listenerX,0);},
  pickup(){const t=now(),o=out(0,.35,.3);[660,880,1320].forEach((f,i)=>{const c=A.ctx.createOscillator();c.type='square';c.frequency.value=f;const g=gain(0);env(g,t+i*.06,.005,.4,.12);const lp=A.ctx.createBiquadFilter();lp.frequency.value=3000;c.connect(lp);lp.connect(g);g.connect(o);c.start(t+i*.06);c.stop(t+i*.06+.2);});},
  saved(){const t=now(),o=out(.3,.5,.3);[[392,523],[523,659]].forEach((pair,i)=>pair.forEach(f=>{const c=A.ctx.createOscillator();c.type='square';c.frequency.value=f;const lp=A.ctx.createBiquadFilter();lp.frequency.value=1600;const g=gain(0);env(g,t+i*.22,.01,.25,.2,.0001);c.connect(lp);lp.connect(g);g.connect(o);c.start(t+i*.22);c.stop(t+i*.22+.32);}));
    [784,988,1175,1568].forEach((f,i)=>{const c=A.ctx.createOscillator();c.type='sine';c.frequency.value=f;const g=gain(0);env(g,t+.45+i*.07,.005,.25,.4);c.connect(g);g.connect(o);c.start(t+.45+i*.07);c.stop(t+1.2+i*.07);});},
  sealed(){const t=now(),o=out(0,.45,.5);[196,247,294,392].forEach((f,i)=>{const c=A.ctx.createOscillator();c.type='sawtooth';c.frequency.value=f;const lp=A.ctx.createBiquadFilter();lp.frequency.setValueAtTime(400,t);lp.frequency.exponentialRampToValueAtTime(2400,t+.5);const g=gain(0);env(g,t+i*.03,.02,.18,.9);c.connect(lp);lp.connect(g);g.connect(o);c.start(t);c.stop(t+1.1);});},
  turned(x,d){const sp=spatial(x,d);const t=now(),o=out(sp.pan,.45*Math.max(.25,sp.vol),.4),c=A.ctx.createOscillator();c.type='sawtooth';c.frequency.setValueAtTime(400,t);c.frequency.exponentialRampToValueAtTime(60,t+.9);
    const f=A.ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(200,t+.9);const g=gain(0);env(g,t,.02,.8,.9);c.connect(f);f.connect(g);g.connect(o);c.start(t);c.stop(t+1);},
  combo(n){const t=now(),o=out(0,.3,.3);for(let i=0;i<Math.min(n,5);i++){const c=A.ctx.createOscillator();c.type='triangle';c.frequency.value=523*Math.pow(1.26,i);const g=gain(0);env(g,t+i*.05,.004,.4,.15);c.connect(g);g.connect(o);c.start(t+i*.05);c.stop(t+i*.05+.2);}},
  bell(){const t=now(),o=out(0,.3,.6);[1318,2637,3951].forEach((f,i)=>{const c=A.ctx.createOscillator();c.type='sine';c.frequency.value=f;const g=gain(0);env(g,t,.002,.35/(i+1),1.4);c.connect(g);g.connect(o);c.start(t);c.stop(t+1.5);});},
  dawn(){const t=now(),o=out(0,.4,.6);[262,330,392,523,659].forEach((f,i)=>{const c=A.ctx.createOscillator();c.type='triangle';c.frequency.value=f;const g=gain(0);env(g,t+i*.18,.05,.3,2.2);c.connect(g);g.connect(o);c.start(t+i*.18);c.stop(t+3);});},
  dead(){const t=now(),o=out(0,.6,.5),c=A.ctx.createOscillator();c.type='sawtooth';c.frequency.setValueAtTime(220,t);c.frequency.exponentialRampToValueAtTime(30,t+1.6);const f=A.ctx.createBiquadFilter();f.frequency.value=700;const g=gain(0);env(g,t,.02,.9,1.6);c.connect(f);f.connect(g);g.connect(o);c.start(t);c.stop(t+1.8);},
  ui(){const t=now(),o=out(0,.25),c=A.ctx.createOscillator();c.type='square';c.frequency.value=1046;const g=gain(0);env(g,t,.002,.3,.06);c.connect(g);g.connect(o);c.start(t);c.stop(t+.1);}
};

// ---- ambience: sea, fire crackle, distant siren
function startAmbience(){
  const c=A.ctx,t=now();
  const sea=c.createBufferSource();sea.buffer=noiseBuf;sea.loop=true;const sf=c.createBiquadFilter();sf.type='lowpass';sf.frequency.value=500;
  const sg=gain(.0,A.amb);const lfo=c.createOscillator();lfo.frequency.value=.11;const lg=gain(.16);lfo.connect(lg);lg.connect(sg.gain);sg.gain.value=.2;
  sea.connect(sf);sf.connect(sg);sea.start();lfo.start();
  A.fireGain=gain(0,A.amb);
  setInterval(()=>{if(!A.ctx||A.ctx.state!=='running')return;const n=2+Math.random()*4|0;for(let i=0;i<n;i++){const s=now()+Math.random()*.25,b=c.createBufferSource();b.buffer=noiseBuf;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1800+Math.random()*3000;const g=gain(0);env(g,s,.001,.5,.03+Math.random()*.04);b.connect(f);f.connect(g);g.connect(A.fireGain);b.start(s,Math.random());b.stop(s+.1);}},120);
  const siren=c.createOscillator();siren.type='triangle';const sl=c.createOscillator();sl.frequency.value=.35;const slg=gain(170);sl.connect(slg);slg.connect(siren.frequency);siren.frequency.value=720;
  const sirf=c.createBiquadFilter();sirf.type='lowpass';sirf.frequency.value=1400;A.sirenGain=gain(0,A.amb);siren.connect(sirf);sirf.connect(A.sirenGain);siren.start();sl.start();
}

// ---- adaptive music: a minor-key drone with a sequencer whose density and tempo follow the outbreak
const SCALE=[0,3,5,7,10,12];let nextNote=0,step=0;
function startMusic(){
  const c=A.ctx;
  A.pad=gain(.0,A.music);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.connect(A.pad);A.padFilter=lp;
  [55,55*1.005,82.4,110.2].forEach(f=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;const g=gain(.12);o.connect(g);g.connect(lp);o.start();});
  A.pad.gain.setTargetAtTime(.5,now(),3);
  nextNote=now()+.1;setInterval(schedule,25);
}
function schedule(){
  if(!A.ctx||A.ctx.state!=='running'||!A.started)return;
  const I=A.intensity,bpm=84+I*70,sp=60/bpm/4;
  while(nextNote<now()+.12){
    const t=nextNote,s=step%16;
    if(s%4===0||(I>.55&&s%8===6))kick(t,I);
    if(I>.15&&s%2===1)hat(t,.05+I*.1);
    if(I>.35&&(s===4||s===12))snare(t,.25+I*.25);
    if(s%4===2||(I>.7&&s%2===0)){const root=s<8?0:(step%32<16?-2:3);bass(t,root+SCALE[(step*7)%3===0?0:(step%5===0?3:0)],sp*1.6,.18+I*.12);}
    if(I>.45&&s%3===0&&Math.random()<.5)arp(t,SCALE[(Math.random()*SCALE.length)|0]+12,sp,.04+I*.05);
    nextNote+=sp;step++;
  }
  if(A.padFilter)A.padFilter.frequency.setTargetAtTime(500+I*1600,now(),.5);
}
function kick(t,I){const c=A.ctx,o=c.createOscillator();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);const g=gain(0,A.music);env(g,t,.002,.55+I*.3,.2);o.connect(g);o.start(t);o.stop(t+.25);}
function hat(t,v){const c=A.ctx,b=c.createBufferSource();b.buffer=noiseBuf;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const g=gain(0,A.music);env(g,t,.001,v,.04);b.connect(f);f.connect(g);b.start(t,Math.random());b.stop(t+.06);}
function snare(t,v){const c=A.ctx,b=c.createBufferSource();b.buffer=noiseBuf;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;const g=gain(0,A.music);env(g,t,.001,v,.14);b.connect(f);f.connect(g);b.start(t,Math.random());b.stop(t+.2);}
function bass(t,semi,len,v){const c=A.ctx,o=c.createOscillator();o.type='sawtooth';o.frequency.value=55*Math.pow(2,semi/12);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(160,t+len);const g=gain(0,A.music);env(g,t,.005,v,len);o.connect(f);f.connect(g);o.start(t);o.stop(t+len+.05);}
function arp(t,semi,len,v){const c=A.ctx,o=c.createOscillator();o.type='square';o.frequency.value=220*Math.pow(2,semi/12);const f=c.createBiquadFilter();f.frequency.value=2200;const g=gain(0,A.music);env(g,t,.003,v,len*1.5);o.connect(f);f.connect(g);o.start(t);o.stop(t+len*2);}

window.SFX=new Proxy({},{get(_,k){return (...a)=>{try{if(A.ctx&&A.ctx.state==='running'&&!A.muted&&S[k])S[k](...a);}catch(e){}};}});
window.AUDIO={
  start(){try{init();if(!A.ctx)return false;A.ctx.resume().catch(()=>{});if(!A.started){A.started=true;startAmbience();startMusic();}return true;}catch(e){return false;}},
  setPaused(paused){if(!A.ctx)return;const p=paused?A.ctx.suspend():A.ctx.resume();if(p&&p.catch)p.catch(()=>{});},
  status(){return {available:!!A.ctx,state:A.ctx?.state||'unavailable',muted:A.muted};},
  setIntensity(v){A.intensity=Math.max(0,Math.min(1,v));},
  setListener(x){listenerX=x;},
  setFire(v){if(A.fireGain)A.fireGain.gain.setTargetAtTime(v*.35,now(),.3);},
  setSiren(v){if(A.sirenGain)A.sirenGain.gain.setTargetAtTime(v*.05,now(),.5);},
  toggleMute(){A.muted=!A.muted;if(A.master)A.master.gain.setTargetAtTime(A.muted?0:.9,now(),.05);return A.muted;},
  duck(v){if(A.music)A.music.gain.setTargetAtTime(v,now(),.2);}
};
})();
