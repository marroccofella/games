import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const source=fs.readFileSync(new URL('assets/announcements.js',import.meta.url),'utf8');
const catalog=JSON.parse(fs.readFileSync(new URL('assets/voice-catalog.json',import.meta.url),'utf8'));
function setup({complete=true,stored='off',rejectPlayback=false,started=true,extraIds=[]}={}){
  const elements=new Map(),classes=new Set(),audios=[],timers=new Map(),ducking=[];let now=0,serial=0;
  const element=()=>({attrs:{},dataset:{},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}});
  for(const id of ['#voice-toggle','#voice-status','#view'])elements.set(id,element());
  class Audio{
    constructor(src){this.src=src;audios.push(this);}
    play(){this.played=true;return rejectPlayback?Promise.reject(new Error('Playback denied')):Promise.resolve();}
    pause(){this.stopped=true;}
    removeAttribute(){this.src='';}
    load(){}
    end(){this.onended?.();}
  }
  const storage=new Map([['checkout-dom-voice',stored]]);
  const c={console,Audio,performance:{now:()=>now},document:{body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k);}}},querySelector:id=>elements.get(id)},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:(fn)=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),DOM_VOICE:{complete,clips:Object.fromEntries([...catalog.clips.map(e=>e.id),...extraIds].map(id=>[id,{file:'assets/voice/'+id+'.wav'}]))}};
  c.AUDIO={setNarrating:value=>ducking.push(value)};c.window=c;vm.runInNewContext(source,c);
  if(started)c.ANNOUNCEMENTS.reset();
  return {api:c.ANNOUNCEMENTS,classes,elements,audios,storage,timers,ducking,advance(ms){now+=ms;}};
}
test('independent voice icon toggles captions and plays consented audio at exactly 1.8×',()=>{
  const s=setup();assert.equal(s.api.active(),false);s.elements.get('#voice-toggle').onclick();
  assert.equal(s.api.active(),true);assert.ok(s.classes.has('spoken-announcements'));
  assert.equal(s.audios[0].playbackRate,1.8);assert.equal(s.audios[0].preservesPitch,true);
  assert.equal(s.ducking.at(-1),true,'game effects duck under speech');
  assert.equal(s.storage.get('checkout-dom-voice'),'on');assert.equal(s.elements.get('#view').focused,true);
  s.api.toggle();assert.ok(s.audios[0].stopped);assert.equal(s.classes.size,0);assert.equal(s.elements.get('#voice-toggle').attrs['aria-pressed'],'false');
  assert.equal(s.ducking.at(-1),false,'effects recover when narration stops');
});
test('mute restores text; pause cancels; resume and restart do not replay stale announcements',()=>{
  const s=setup({stored:'on'});s.api.say('pitch-0');s.api.setPaused(true);assert.ok(s.audios[0].stopped);
  assert.equal(s.api.say('turned'),false);s.api.setPaused(false);assert.equal(s.audios.length,1);
  s.api.say('pitch-1');s.api.setMuted(true);assert.equal(s.api.active(),false);assert.equal(s.classes.size,0);
  s.api.setMuted(false);s.api.reset();s.api.say('pitch-1');assert.equal(s.audios.length,3);
  s.api.stop();assert.ok(s.audios.at(-1).stopped);
});
test('urgent announcements interrupt sales chatter and duplicate alerts are bounded',()=>{
  const s=setup({stored:'on'});s.api.say('pitch-0',0);s.api.event('MIDNIGHT',true,true);
  assert.ok(s.audios[0].stopped);assert.match(s.audios[1].src,/midnight/);
  s.api.event('MIDNIGHT',true,true);assert.equal(s.audios.length,2);
  s.api.say('saved');s.advance(5000);s.audios[1].end();assert.equal(s.audios.length,2,'expired queued speech is discarded');
});
test('failed playback or missing pack restores text instead of silently hiding announcements',()=>{
  const missing=setup({complete:false,stored:'on'});assert.equal(missing.api.active(),false);assert.equal(missing.elements.get('#voice-toggle').disabled,true);
  const s=setup({stored:'on'});s.api.say('enabled');s.audios[0].onerror();
  assert.equal(s.api.active(),false);assert.equal(s.classes.size,0);assert.match(s.elements.get('#voice-status').textContent,/Text announcements restored/);
  s.api.toggle();assert.equal(s.api.active(),true,'one click retries after failure');
  [...s.timers.values()][0]();assert.equal(s.api.active(),false,'hung audio fails visibly');
});
test('browser playback refusal restores text and normal effects volume',async()=>{
  const s=setup({stored:'on',rejectPlayback:true});s.api.say('enabled');await Promise.resolve();
  assert.equal(s.api.active(),false);assert.equal(s.classes.size,0);assert.equal(s.ducking.at(-1),false);
});
test('all event families have a voiced clip; dynamic room and door names use clear generic announcements',()=>{
  const s=setup({stored:'on'});
  const cases=[['THE BRIDE HAS TURNED','bride'],['A GUEST HAS TURNED','turned'],['SAVED IN THE NICK OF TIME','close'],['GUEST RESCUED','rescued'],['THE CHEF HAS LEFT THE KITCHEN','chef'],['DOUBLE CHECKOUT','double'],['TRIPLE CHECKOUT','triple'],['QUAD CHECKOUT','quad'],['HOUSEKEEPING!','housekeeping'],['GUEST SAVED','saved'],['FOAMED!','foam'],['FIRE EXTINGUISHER','extinguisher'],['TEA AND BISCUITS','tea'],['MIDNIGHT','midnight'],['01:00 · RUNNERS','runners'],['03:00 · THE KITCHEN STIRS','kitchen'],['05:00 · LAST CALL','lastcall'],['BAR SEALED','sealed'],['KITCHEN DOOR GAVE WAY','door']];
  for(const [title,id] of cases){s.api.reset();assert.equal(s.api.event(title),true,title);assert.equal(s.audios.at(-1).src,'assets/voice/'+id+'.wav',title);}
  assert.equal(s.api.event('UNKNOWN EVENT'),false);
});
test('startup and game over keep speech stopped until reset',()=>{
  const s=setup({stored:'on',started:false});assert.equal(s.api.say('turned'),false);
  s.api.reset();assert.equal(s.api.say('enabled'),true);s.api.stop();assert.equal(s.api.say('turned'),false);
  s.api.reset();assert.equal(s.api.say('welcome'),true);
});
test('busy event captions stay visible and interrupted event captions are restored',()=>{
  const s=setup({stored:'on'});s.api.say('enabled',2);s.api.say('door',2);s.api.say('chef',2);
  assert.equal(s.api.event('GUEST SAVED'),false,'the game must display text for a rejected event');
  s.api.reset();let restored=0;s.api.event('GUEST SAVED',false,false,()=>restored++);
  s.api.event('MIDNIGHT',true,true);assert.equal(restored,1);assert.ok(s.audios.at(-2).stopped);
});
test('a suppressed sales pitch may retry as soon as speech is free',()=>{
  const s=setup({stored:'on'});s.api.say('enabled',2);assert.equal(s.api.say('pitch-0',0),false);
  s.audios[0].end();assert.equal(s.api.say('pitch-0',0),true);assert.equal(s.audios.length,2);
});
test('Monty audio catalog matches the actual game pitches in order',()=>{
  const game=fs.readFileSync(new URL('assets/game.js',import.meta.url),'utf8');
  const pitches=JSON.parse(game.match(/const OWNER_PITCHES=(\[[\s\S]*?\]);/)[1]);
  assert.equal(catalog.clips.filter(c=>c.id.startsWith('pitch-')).length,pitches.length);
  pitches.forEach((text,i)=>assert.equal(catalog.clips.find(c=>c.id==='pitch-'+i)?.text,text));
});

const expressiveIds=['turned-1','turned-2','hurt-0','hurt-1','hurt-2','hurt-3','hurt-4','hurt-5','hurt-low-0','hurt-low-1','defeat-0','defeat-1'];
test('each quick guest turn gets a brief rotating callout without the ordinary duplicate cooldown',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});
 assert.equal(s.api.event('A GUEST HAS TURNED',true),true);assert.equal(s.api.event('A GUEST HAS TURNED',true),true);
 s.audios[0].end();assert.equal(s.audios.length,2);assert.notEqual(s.audios[0].src,s.audios[1].src);
 s.audios[1].end();assert.equal(s.api.event('A GUEST HAS TURNED',true),true);assert.equal(s.audios.length,3);
});
test('turn alerts preempt sales chatter and still restore captions when the short queue overflows',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});s.api.say('pitch-0',0);let dropped=0;
 for(let i=0;i<5;i++)s.api.event('A GUEST HAS TURNED',true,false,()=>dropped++);
 assert.ok(s.audios[0].stopped);assert.ok(dropped>=2,'overflow retains text fallback rather than an unbounded speech queue');
});
test('porter hurt reactions rotate, interrupt a sales pitch, and have a shared cooldown',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});s.api.say('pitch-0',0);assert.equal(s.api.hurt({health:84}),true);assert.ok(s.audios[0].stopped);
 const first=s.audios.at(-1);assert.match(first.src,/hurt-0/);first.end();assert.equal(s.api.hurt({health:68}),false);
 s.advance(4100);assert.equal(s.api.hurt({health:52}),true);assert.notEqual(s.audios.at(-1).src,first.src);
 s.audios.at(-1).end();s.advance(4100);assert.equal(s.api.hurt({health:20}),true);assert.match(s.audios.at(-1).src,/hurt-low-/);
});
test('essential turn speech outranks porter jokes, and pause or mute prevents reactions',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});s.api.event('A GUEST HAS TURNED',true);assert.equal(s.api.hurt({health:80}),false);
 s.api.setPaused(true);assert.equal(s.api.hurt({health:80}),false);s.api.setPaused(false);s.api.setMuted(true);assert.equal(s.api.hurt({health:80}),false);
});
test('defeat allows one final porter line while ordinary end-screen speech stays stopped',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});s.api.stop();assert.equal(s.api.defeat(),true);assert.match(s.audios.at(-1).src,/defeat-/);
 assert.equal(s.api.say('turned'),false);assert.equal(s.api.defeat(),false);const final=s.audios.at(-1);s.api.reset();assert.ok(final.stopped);
 s.api.setMuted(true);s.api.stop();assert.equal(s.api.defeat(),false);
});
test('routine confirmations and unattended sales chatter leave breathing room, while haggle is immediate',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});s.api.event('GUEST SAVED');s.audios.at(-1).end();s.advance(2600);assert.equal(s.api.event('GUEST SAVED'),false);
 assert.equal(s.api.event('A GUEST HAS TURNED',true),true);s.audios.at(-1).end();assert.equal(s.api.say('pitch-0',0),true);s.audios.at(-1).end();
 s.advance(3000);assert.equal(s.api.say('pitch-1',0),false);assert.equal(s.api.say('pitch-1',1),true);
});

test('a delayed guest-turn callout expires quickly and restores its caption',()=>{
 const s=setup({stored:'on',extraIds:expressiveIds});let restored=0;s.api.event('A GUEST HAS TURNED',true);
 assert.equal(s.api.event('A GUEST HAS TURNED',true,false,()=>restored++),true);s.advance(2600);s.audios[0].end();
 assert.equal(s.audios.length,1);assert.equal(restored,1);
});
