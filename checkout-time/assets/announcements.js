/* Consented synthetic Dom clips. No microphone, browser TTS or generation at runtime. */
(() => {
  'use strict';
  const button=document.querySelector('#voice-toggle'),status=document.querySelector('#voice-status');
  const pack=window.DOM_VOICE;
  let enabled=false,muted=false,paused=true,failed=false,current=null,queue=[],timer=null;
  const recent=new Map(),familyTimes=new Map(),rotation=new Map();
  let defeatSpoken=false;
  const variants={
    turned:['turned','turned-1','turned-2'],
    hurt:['hurt-0','hurt-1','hurt-2','hurt-3','hurt-4','hurt-5'],
    'hurt-low':['hurt-low-0','hurt-low-1'],defeat:['defeat-0','defeat-1']
  };
  try{enabled=localStorage.getItem('checkout-dom-voice')==='on';}catch{}
  const available=!!pack?.complete;
  const active=()=>enabled&&!muted&&!failed&&available;
  function sync(){
    const on=active();
    button.disabled=!available;
    document.body.classList.toggle('spoken-announcements',on);
    button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on?'Dom voice 1.8× on. Click for text announcements.':'Enable Dom voice 1.8× announcements');
    button.title=on?'Synthetic Dom voice · 1.8× · click for text':'Enable synthetic Dom voice · 1.8×';
    button.dataset.on=String(on);
    status.textContent=!available?'Dom voice pack not ready. Text announcements on.':failed?'Dom audio unavailable. Text announcements restored.':on?'Synthetic Dom announcements on at 1.8 times speed. Text appears if an announcement cannot be spoken.':muted&&enabled?'Sound muted. Text announcements restored.':'Text announcements on. Dom voice off.';
  }
  function cancel(){
    const pending=queue;queue=[];clearTimeout(timer);timer=null;
    window.AUDIO?.setNarrating?.(false);
    if(current){const old=current;current=null;old.audio.onended=old.audio.onerror=null;old.audio.pause();old.audio.removeAttribute('src');old.audio.load();old.onDrop?.();}
    pending.forEach(item=>item.onDrop?.());
  }
  function fail(){failed=true;enabled=false;cancel();sync();}
  function next(){
    if(current||!active()||paused)return;
    const now=performance.now();queue=queue.filter(item=>{if(now-item.at<item.ttl)return true;item.onDrop?.();return false;});
    const item=queue.shift();if(!item)return;
    try{
      const audio=new Audio(pack.clips[item.id].file);audio.playbackRate=1.8;audio.preservesPitch=true;
      const playing=current={audio,priority:item.priority,onDrop:item.onDrop};
      window.AUDIO?.setNarrating?.(true);
      const finish=()=>{if(current!==playing)return;clearTimeout(timer);current=null;window.AUDIO?.setNarrating?.(false);next();};
      audio.onended=finish;audio.onerror=()=>{if(current===playing)fail();};
      timer=setTimeout(()=>{if(current===playing)fail();},15000);
      const result=audio.play();if(result&&result.catch)result.catch(()=>{if(current===playing)fail();});
    }catch{if(!current)item.onDrop?.();fail();}
  }
  function enqueue(id,priority,onDrop,{repeat=false,ttl=4500}={}){
    if(!active()||paused||!pack.clips[id])return false;
    const now=performance.now();if(!repeat&&now-(recent.get(id)??-Infinity)<2500)return false;
    // Time-sensitive notices replace sales chatter; never build a stale speech backlog.
    if(current&&priority>current.priority)cancel();
    if(priority===0&&(current||queue.length))return false;
    const item={id,priority,at:now,ttl,onDrop};queue.push(item);queue.sort((a,b)=>b.priority-a.priority);
    queue.splice(2).forEach(dropped=>dropped.onDrop?.());
    if(!queue.includes(item))return false;
    recent.set(id,now);next();return active();
  }
  function varied(family,priority,onDrop,options){
    const ids=variants[family].filter(id=>pack?.clips[id]);if(!ids.length)return false;
    const index=rotation.get(family)||0,accepted=enqueue(ids[index%ids.length],priority,onDrop,options);
    if(accepted)rotation.set(family,index+1);return accepted;
  }
  function say(id,priority=1,onDrop){
    const ambientPitch=id.startsWith('pitch-')&&priority===0,now=performance.now();
    if(ambientPitch&&now-(familyTimes.get('pitch')??-Infinity)<20000)return false;
    const accepted=enqueue(id,priority,onDrop);if(accepted&&ambientPitch)familyTimes.set('pitch',now);return accepted;
  }
  const events={
    'THE BRIDE HAS TURNED':'bride','A GUEST HAS TURNED':'turned','SAVED IN THE NICK OF TIME':'close','GUEST RESCUED':'rescued',
    'THE CHEF HAS LEFT THE KITCHEN':'chef','DOUBLE CHECKOUT':'double','TRIPLE CHECKOUT':'triple','QUAD CHECKOUT':'quad',
    'HOUSEKEEPING!':'housekeeping','GUEST SAVED':'saved','FOAMED!':'foam','FIRE EXTINGUISHER':'extinguisher','TEA AND BISCUITS':'tea',
    'MIDNIGHT':'midnight','01:00 · RUNNERS':'runners','03:00 · THE KITCHEN STIRS':'kitchen','05:00 · LAST CALL':'lastcall'
  };
  window.ANNOUNCEMENTS={
    say,
    event(title,bad,big,onDrop){const id=events[title]||(title.endsWith(' GAVE WAY')?'door':title.endsWith(' SEALED')?'sealed':null),priority=big?3:bad?2:1;
      // Each new turn is a distinct occurrence, even when several happen together.
      if(id==='turned')return varied('turned',3,onDrop,{repeat:true,ttl:2500});
      if(id==='bride')return enqueue(id,3,onDrop,{repeat:true,ttl:2500});
      // Critical event text remains visible instead of entering a lossy queue.
      if(!id||(current&&priority<=current.priority))return false;
      const family=['double','triple','quad','housekeeping'].includes(id)?'combo':id;
      const cooldown=id==='saved'?6000:['rescued','close','foam','extinguisher','tea','sealed','double','triple','quad','housekeeping'].includes(id)?4000:0;
      const now=performance.now();if(cooldown&&now-(familyTimes.get(family)??-Infinity)<cooldown)return false;
      const accepted=say(id,priority,onDrop);if(accepted)familyTimes.set(family,now);return accepted;},
    hurt({health=100}={}){
      const now=performance.now();
      if(!active()||paused||(current&&current.priority>=2)||now-(familyTimes.get('hurt')??-Infinity)<4000)return false;
      const accepted=varied(health<=32?'hurt-low':'hurt',2,undefined,{ttl:1200});
      if(accepted)familyTimes.set('hurt',now);return accepted;
    },
    defeat(){
      if(!active()||defeatSpoken)return false;defeatSpoken=true;cancel();
      // One explicit final line may play; ordinary menu/event speech stays latched off.
      paused=false;try{return varied('defeat',2,undefined,{repeat:true});}finally{paused=true;}
    },
    reset(){cancel();recent.clear();familyTimes.clear();defeatSpoken=false;paused=false;sync();},
    stop(){paused=true;cancel();recent.clear();},
    setPaused(value){paused=value;if(value)cancel();},
    setMuted(value){muted=value;if(value)cancel();sync();},
    active,
    toggle(){cancel();recent.clear();enabled=!enabled;failed=false;try{localStorage.setItem('checkout-dom-voice',enabled?'on':'off');}catch{}sync();if(active()&&!paused)say('enabled',2);}
  };
  button.onclick=()=>{window.ANNOUNCEMENTS.toggle();document.querySelector('#view').focus({preventScroll:true});};
  sync();
})();
