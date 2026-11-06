// Checkout Time — fictional hotel navigation.
(function(){
'use strict';
const T=window.ARCADE_LEVEL;
const S=0.025;              // metres per plan pixel
const CELL=10;              // layout units per grid cell (0.25 m)
const GX0=-300,GZ0=150,GW=230,GH=176; // grid covers plan x -300..2000, z 150..1910
const N=GW*GH;
const FRONT_Z=1330,ROAD_Z0=1460,ROAD_Z1=1720,PROM_Z1=1885;

// Fictional game geometry.
const OUTLINE=T.outline;
let WALLS=[OUTLINE.concat([OUTLINE[0]]),...T.lines];
// Fictional game geometry.
const DOORS=T.doors;
// Fictional game geometry.
const EXTRA_WALLS=[];
const ROOM_THEME={
 'Restaurant':{floor:'wood',tint:'#6b4a2f',light:0xffc27a,label:'THE BUFFET OF REGRET'},
 'Residents lounge':{floor:'carpet',tint:'#5a2430',light:0xffb46a,label:'RESIDENTS LOUNGE'},
 'Reception':{floor:'carpet',tint:'#3c2a4a',light:0xffd9a0,label:'RECEPTION'},
 'Kitchen':{floor:'tile',tint:'#c9cfcc',light:0xd8f0ff,label:'KITCHEN'},
 'Boiler room':{floor:'concrete',tint:'#3b3d3a',light:0xff7a3a,label:'BOILER ROOM'},
 'Function room':{floor:'parquet',tint:'#7a5a36',light:0xffd28f,label:'FUNCTION ROOM · WEDDING PARTY'},
 'Bar':{floor:'carpet',tint:'#4a1d22',light:0xffa860,label:'BAR'},
 'Second bar':{floor:'carpet',tint:'#23304a',light:0x9ab8ff,label:'SECOND BAR'},
 'WC facilities':{floor:'tile',tint:'#9fb6b0',light:0xe6fff6,label:'WC FACILITIES'},
 'Bargain room':{floor:'carpet',tint:'#1f4030',light:0xffcf8a,label:'BARGAIN ROOM'},
 'Gym':{floor:'rubber',tint:'#2b2f33',light:0xcfe6ff,label:'GYM'},
 'Steam room':{floor:'tile',tint:'#6f8c90',light:0xbfefff,label:'STEAM ROOM'},
 'Store':{floor:'concrete',tint:'#4a4538',light:0xffe0a8,label:'STORE'}
};
const FE_POINTS=T.pickups;

// ---------------------------------------------------------------- grid
const wall=new Uint8Array(N);   // static blocking (walls, furniture, cars, bounds)
const doorBlock=new Uint8Array(N); // count of barricaded doors covering a cell
const navStatic=new Uint8Array(N); // inflated static
const navDoor=new Uint8Array(N);
const inside=new Uint8Array(N);  // cell centre inside the building outline
const room=new Int16Array(N).fill(-1);
const cx=i=>i%GW, cz=i=>(i/GW)|0;
function cellPx(X,Z){const gx=Math.floor((X-GX0)/CELL),gz=Math.floor((Z-GZ0)/CELL);if(gx<0||gz<0||gx>=GW||gz>=GH)return -1;return gz*GW+gx;}
function cellOf(x,z){return cellPx(x/S,z/S);}
function centre(i){return [(GX0+(cx(i)+.5)*CELL)*S,(GZ0+(cz(i)+.5)*CELL)*S];}
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;let t=L?((px-ax)*dx+(pz-az)*dz)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-ax-t*dx,pz-az-t*dz);}
function rasterSeg(ax,az,bx,bz,half,fn){
  const x0=Math.min(ax,bx)-half-CELL,x1=Math.max(ax,bx)+half+CELL,z0=Math.min(az,bz)-half-CELL,z1=Math.max(az,bz)+half+CELL;
  for(let Z=z0;Z<=z1;Z+=CELL)for(let X=x0;X<=x1;X+=CELL){const i=cellPx(X,Z);if(i<0)continue;const [px,pz]=[GX0+(cx(i)+.5)*CELL,GZ0+(cz(i)+.5)*CELL];if(segDist(px,pz,ax,az,bx,bz)<=half)fn(i);}
}
function pointInPoly(x,z,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c;}return c;}
function rasterRect(X,Z,w,d,rot,pad,fn){ // oriented rectangle in layout units
  const c=Math.cos(rot),s=Math.sin(rot),R=Math.hypot(w,d)/2+pad+CELL;
  for(let z=Z-R;z<=Z+R;z+=CELL/2)for(let x=X-R;x<=X+R;x+=CELL/2){const dx=x-X,dz=z-Z,u=dx*c+dz*s,v=-dx*s+dz*c;if(Math.abs(u)<=w/2+pad&&Math.abs(v)<=d/2+pad){const i=cellPx(x,z);if(i>=0)fn(i);}}
}

for(let i=0;i<N;i++){const X=GX0+(cx(i)+.5)*CELL,Z=GZ0+(cz(i)+.5)*CELL;inside[i]=pointInPoly(X,Z,OUTLINE)?1:0;
  if(cx(i)===0||cz(i)===0||cx(i)===GW-1||Z>=PROM_Z1)wall[i]=1;}
WALLS=WALLS.concat(EXTRA_WALLS);
for(const poly of WALLS)for(let k=0;k<poly.length-1;k++)rasterSeg(poly[k][0],poly[k][1],poly[k+1][0],poly[k+1][1],7,i=>wall[i]=1);
// cut entrances through the outline
for(const d of DOORS){const [,ax,az,bx,bz,k]=d,L=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/L,uz=(bz-az)/L,sh=k==='entrance'?0:4;rasterSeg(ax+ux*sh,az+uz*sh,bx-ux*sh,bz-uz*sh,k==='entrance'?12:8,i=>wall[i]=0);}

// ---------------------------------------------------------------- doors
const doors=DOORS.map((d,id)=>{
  const [name,ax,az,bx,bz,kind]=d,cells=[],nav=[];
  const ex=(bx-ax),ez=(bz-az),len=Math.hypot(ex,ez),ux=ex/len,uz=ez/len;
  rasterSeg(ax-ux*8,az-uz*8,bx+ux*8,bz+uz*8,8,i=>cells.push(i));
  const navSet=new Set();cells.forEach(i=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const j=i+dz*GW+dx;if(j>=0&&j<N)navSet.add(j);}});
  return {id,name,kind,ax,az,bx,bz,cells,nav:[...navSet],x:(ax+bx)/2*S,z:(az+bz)/2*S,len:len*S,ang:Math.atan2(ez,ex),barricaded:false,hp:100,cool:0,mesh:null};
});
function setDoor(d,on){
  if(d.barricaded===on)return;d.barricaded=on;d.hp=100;
  for(const i of d.cells)doorBlock[i]+=on?1:-1;
  for(const i of d.nav)navDoor[i]+=on?1:-1;
  WORLD.version++;
}

// ---------------------------------------------------------------- static obstacles (furniture, cars) + inflation
const obstacles=[];
function addObstacle(X,Z,w,d,rot){rasterRect(X,Z,w,d,rot,0,i=>wall[i]=1);obstacles.push([X,Z,w,d,rot]);}
function inflate(){
  navStatic.fill(0);
  for(let i=0;i<N;i++)if(wall[i]){const x=cx(i),z=cz(i);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Z=z+dz;if(X>=0&&Z>=0&&X<GW&&Z<GH)navStatic[Z*GW+X]=1;}}
}
function blocked(i){return i<0||wall[i]||doorBlock[i]>0;}
function navBlocked(i){return i<0||navStatic[i]||navDoor[i]>0;}

// Fictional game geometry.
function assignRooms(){
  const shut=new Uint8Array(N);doors.forEach(d=>d.nav.forEach(i=>shut[i]=1));
  const rooms=[];
  T.rooms.forEach(([name,X,Z,type])=>{
    let s=cellPx(X,Z);if(s<0)return;
    if(navStatic[s]||shut[s]){let best=-1,bd=1e9;for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++){const j=s+dz*GW+dx;if(j>=0&&j<N&&!navStatic[j]&&!shut[j]&&dx*dx+dz*dz<bd){bd=dx*dx+dz*dz;best=j;}}s=best;}
    if(s<0)return;
    const id=rooms.length;
    rooms.push({id,name,type,cells:[],seed:s,lx:X*S,lz:Z*S,theme:ROOM_THEME[name]||{floor:'carpet',tint:'#333',label:name.toUpperCase()}});
  });
  // flood each enclosed region once; where one region holds several plan labels (open-plan spaces),
  // split its cells by nearest label so each named room keeps its own floor and theme.
  const region=new Int32Array(N).fill(-1);let rid=0;
  rooms.forEach(r=>{
    if(region[r.seed]>=0){return;}
    const q=[r.seed],cells=[];region[r.seed]=rid;
    while(q.length){const i=q.pop();cells.push(i);for(const o of [1,-1,GW,-GW]){const j=i+o;if(j>=0&&j<N&&region[j]<0&&!navStatic[j]&&!shut[j]&&inside[j])q.push(j),region[j]=rid;}}
    const members=rooms.filter(o=>region[o.seed]===rid);
    for(const i of cells){const [x,z]=centre(i);let b=members[0],bd=1e9;for(const m of members){const d=(m.lx-x)**2+(m.lz-z)**2;if(d<bd){bd=d;b=m;}}room[i]=b.id;b.cells.push(i);}
    members.forEach(m=>m.region=rid);rid++;
  });
  rooms.forEach(r=>{let sx=0,sz=0;r.cells.forEach(i=>{const c=centre(i);sx+=c[0];sz+=c[1];});r.x=sx/r.cells.length;r.z=sz/r.cells.length;});
  // walls/door cells inside rooms take the nearest neighbour's room so floors paint fully
  for(let pass=0;pass<2;pass++)for(let i=0;i<N;i++)if(room[i]<0&&inside[i]&&(navStatic[i]||shut[i])){for(const o of [1,-1,GW,-GW]){const j=i+o;if(j>=0&&j<N&&room[j]>=0&&!wall[i]){room[i]=room[j];break;}}}
  return rooms;
}

// ---------------------------------------------------------------- queries
function los(x1,z1,x2,z2){ // walls + barricades
  const d=Math.hypot(x2-x1,z2-z1),n=Math.ceil(d/(CELL*S*.5));
  for(let k=1;k<n;k++){const t=k/n,i=cellOf(x1+(x2-x1)*t,z1+(z2-z1)*t);if(blocked(i))return false;}
  return true;
}
const QUEUE=new Int32Array(N);
function flow(target,dist){ // 8-way BFS-ish (Dijkstra with 10/14 costs via bucket queue simplification)
  dist.fill(65535);if(target<0)return dist;
  if(navBlocked(target)){let best=-1,bd=1e9;for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){const j=target+dz*GW+dx;if(j>=0&&j<N&&!navBlocked(j)&&dx*dx+dz*dz<bd){bd=dx*dx+dz*dz;best=j;}}if(best<0)return dist;target=best;}
  let h=0,t=0;QUEUE[t++]=target;dist[target]=0;
  while(h<t){const i=QUEUE[h++],x=i%GW,dv=dist[i]+1;
    for(let k=0;k<8;k++){const dx=DX[k],dz=DZ[k],X=x+dx;if(X<0||X>=GW)continue;const j=i+dz*GW+dx;if(j<0||j>=N||dist[j]<=dv||navBlocked(j))continue;
      if(dx&&dz&&(navBlocked(i+dx)||navBlocked(i+dz*GW)))continue;dist[j]=dv;QUEUE[t++]=j;}}
  return dist;
}
const DX=[1,-1,0,0,1,1,-1,-1],DZ=[0,0,1,-1,1,-1,1,-1];
function stepDir(dist,x,z){ // direction (unit) to descend the field from world point
  let i=cellOf(x,z);if(i<0)return null;
  let best=dist[i],bi=-1;
  for(let k=0;k<8;k++){const X=cx(i)+DX[k];if(X<0||X>=GW)continue;const j=i+DZ[k]*GW+DX[k];if(j<0||j>=N)continue;if(DX[k]&&DZ[k]&&(navBlocked(i+DX[k])||navBlocked(i+DZ[k]*GW)))continue;if(dist[j]<best){best=dist[j];bi=j;}}
  if(bi<0)return null;
  // look one further for smoother diagonals
  let bj=bi,b2=best;for(let k=0;k<8;k++){const X=cx(bi)+DX[k];if(X<0||X>=GW)continue;const j=bi+DZ[k]*GW+DX[k];if(j<0||j>=N)continue;if(dist[j]<b2&&!(DX[k]&&DZ[k]&&(navBlocked(bi+DX[k])||navBlocked(bi+DZ[k]*GW)))){b2=dist[j];bj=j;}}
  const tgt=(bj!==bi&&los(x,z,...centre(bj)))?bj:bi;const [tx,tz]=centre(tgt);const dx=tx-x,dz=tz-z,L=Math.hypot(dx,dz)||1;return [dx/L,dz/L];
}
function distAt(dist,x,z){const i=cellOf(x,z);if(i<0)return 65535;let d=dist[i];if(d===65535){for(let k=0;k<8;k++){const j=i+DZ[k]*GW+DX[k];if(j>=0&&j<N&&dist[j]<d)d=dist[j]+1;}}return d;}
function freeAt(x,z,r){ // circle vs grid
  if(blocked(cellOf(x,z)))return false;
  for(let k=0;k<8;k++){const a=k*Math.PI/4;if(blocked(cellOf(x+Math.cos(a)*r,z+Math.sin(a)*r)))return false;}
  return true;
}
function nearestFree(x,z,r){if(freeAt(x,z,r))return [x,z];for(let rad=.25;rad<3;rad+=.25)for(let k=0;k<16;k++){const a=k*Math.PI/8,X=x+Math.cos(a)*rad,Z=z+Math.sin(a)*rad;if(freeAt(X,Z,r))return [X,Z];}return [x,z];}
function roomAt(x,z){const i=cellOf(x,z);if(i<0)return null;const r=room[i];if(r>=0)return WORLD.rooms[r];if(inside[i])return WORLD.hall;return null;}
function isInside(x,z){const i=cellOf(x,z);return i>=0&&inside[i]===1;}
function randomCellIn(r,minWall=2){
  const candidates=r.cells.filter(i=>!navBlocked(i)&&(!WORLD.spawnField||WORLD.spawnField[i]<65535));
  for(let k=0;k<200;k++){const i=candidates[(Math.random()*candidates.length)|0];if(i===undefined)break;let ok=true;for(let dz=-minWall;dz<=minWall&&ok;dz++)for(let dx=-minWall;dx<=minWall;dx++){const j=i+dz*GW+dx;if(j<0||j>=N||wall[j]){ok=false;break;}}if(ok)return centre(i);}
  if(candidates.length)return centre(candidates[0]);
  return nearestFree(r.x,r.z,.3);
}

window.WORLD={S,CELL,GX0,GZ0,GW,GH,N,FRONT_Z,ROAD_Z0,ROAD_Z1,PROM_Z1,OUTLINE,WALLS,doors,FE_POINTS,wall,doorBlock,inside,room,obstacles,
  rooms:[],hall:{name:'Hall',label:'HALL / CORRIDOR',theme:{label:'HALL'}},street:{name:'Seafront',theme:{label:'THE FICTITIOUS SEAFRONT'}},version:0,
  cellOf,cellPx,centre,blocked,navBlocked,flow,stepDir,distAt,freeAt,nearestFree,los,roomAt,isInside,setDoor,addObstacle,inflate,assignRooms,randomCellIn,rasterSeg,segDist};
})();

