(() => {
'use strict';
const $ = s => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_CENTER = [144.9631, -37.8136]; // Melbourne
const BRUSH_M = 12;            // half-width of the "erased" strip, metres (≈ a street's width in total)
const CELL = 1e4;              // explored grid: 1e-4 degree cells (~11 m)

/* ---------- icons ---------- */
const ICONS = {
  poop:{d:'M5.5 19.5h13c1.9 0 2.7-2.6 1.1-3.6 1-1.9-.4-3.6-2.3-3.5.4-2-1.2-3.5-3.1-3.2.2-1.9-1.3-3.4-3.3-3.7.6 1.5-.5 2.8-2.1 3.1-1.8.4-2.8 1.9-2.4 3.6-1.9.1-2.9 2-1.8 3.4-1.4 1-.9 3.9.9 3.9z',x:'M9.7 14.6v.4M14.3 14.6v.4M10.6 17c.9.6 1.9.6 2.8 0'},
  pee:{d:'M12 3.5c3.2 4.6 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.4 6-11z',x:'M9.3 15a2.8 2.8 0 0 0 2.4 2.8'},
  water:{d:'M3.5 12.5h17c-.3 4-3.8 7-8.5 7s-8.2-3-8.5-7z',x:'M6.5 9.3c1.7-1.2 3.4 1.2 5.5 0s3.8 1.2 5.5 0'},
  food:{d:'M3.5 13h17c-.3 3.8-3.8 6.5-8.5 6.5S3.8 16.8 3.5 13z',x:'M7 11a1.5 1.2 0 1 0 3 0a1.5 1.2 0 1 0-3 0M10.6 9.4a1.5 1.2 0 1 0 3 0a1.5 1.2 0 1 0-3 0M14 11a1.5 1.2 0 1 0 3 0a1.5 1.2 0 1 0-3 0'},
  heart:{d:'M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',x:'M7.6 10.2a2.2 2.2 0 0 1 1.8-2'},
  paw:{d:'M12 12.3c-3 0-5.5 2.6-5.5 4.8 0 1.6 1.3 2.4 2.8 2.2 1-.1 1.8-.6 2.7-.6s1.7.5 2.7.6c1.5.2 2.8-.6 2.8-2.2 0-2.2-2.5-4.8-5.5-4.8zM3.7 10.4a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0zM7.4 6.5a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0zM13.2 6.5a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0zM16.9 10.4a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0z'},
  locate:{d:'M7.2 12a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0-9.6 0z',x:'M12 3.5v3.2M12 17.3v3.2M3.5 12h3.2M17.3 12h3.2M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0'},
  map:{d:'M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z',x:'M8.5 4.5v13M15.5 6.5v13'},
  book:{d:'M5.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11z',x:'M8.5 3.5v17M11.2 8h4.5M11.2 11.2h4.5'},
  dog:{d:'M7 9c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5v4.5c0 3-2.2 5.5-5 5.5s-5-2.5-5-5.5z',x:'M7 8.5C4.5 8 3.5 11 4.5 13.5c1.1.1 2.1-.9 2.5-2M17 8.5c2.5-.5 3.5 2.5 2.5 5-1.1.1-2.1-.9-2.5-2M10 11v.6M14 11v.6M11 14.5h2l-1 1z'},
  camera:{d:'M4 8.5h3l1.6-2.3h6.8L17 8.5h3v10H4z',x:'M8.6 13.2a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0-6.8 0'},
  scale:{d:'M5 7.5h14l-1.5 12h-11z',x:'M9 11.5l3 2.5 3-2.5M12 4.5v3'},
  sun:{d:'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0z',x:'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8'},
  moon:{d:'M15.5 4.5a7.5 7.5 0 1 0 4 12.5 6.5 6.5 0 0 1-4-12.5z'},
  star:{d:'M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7z'},
  cloud:{d:'M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z'}
};
function icon(name, fill){
  const I = ICONS[name];
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${I.d}" style="fill:${fill || 'none'}"/>${I.x ? `<path class="dt" d="${I.x}"/>` : ''}</svg>`;
}
const TYPES = {
  poop:{label:'拉屎', log:'便便', icon:'poop', color:'poop'},
  pee:{label:'尿尿', log:'尿尿', icon:'pee', color:'sun'},
  drink:{label:'喝水', log:'喝水', icon:'water', color:'sky'},
  eat:{label:'吃饭', log:'吃饭', icon:'food', color:'clay'},
  friend:{label:'狗友', log:'遇到狗友', icon:'heart', color:'rose'},
  photo:{label:'拍照', log:'拍照打卡', icon:'camera', color:'sky'},
  meet:{label:'相遇', log:'遇到狗友', icon:'heart', color:'rose'},
  walk:{label:'遛狗', log:'遛狗', icon:'paw', color:'grass'}
};
const STOOL = {ok:'成形', soft:'偏软', hard:'偏硬', loose:'拉稀'};
const STOOL_ORDER = ['ok','soft','hard','loose'];

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const hm = t => { const d = new Date(t); return `${d.getHours()}:${pad(d.getMinutes())}`; };
const WK = '日一二三四五六';
function dayLabel(key){
  const today = dayKey(Date.now()), yest = dayKey(Date.now()-864e5);
  const d = new Date(key + 'T00:00');
  const full = `${d.getMonth()+1}月${d.getDate()}日 周${WK[d.getDay()]}`;
  return key === today ? ['今天', full] : key === yest ? ['昨天', full] : [full, ''];
}
function fmtSince(ms){
  const m = Math.max(0, Math.floor(ms/6e4));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m/60);
  if (h < 24) return m % 60 ? `${h} 小时 ${m%60} 分` : `${h} 小时`;
  return `${Math.floor(h/24)} 天`;
}
const fmtDist = m => m < 1000 ? `${Math.round(m)} 米` : `${(m/1000).toFixed(2)} km`;
function ageText(b){
  if (!b) return '';
  const d = new Date(b + 'T00:00'), n = new Date();
  let m = (n.getFullYear()-d.getFullYear())*12 + n.getMonth()-d.getMonth();
  if (n.getDate() < d.getDate()) m--;
  if (m < 0 || isNaN(m)) return '';
  const y = Math.floor(m/12), mm = m % 12;
  return y ? (mm ? `${y} 岁 ${mm} 个月` : `${y} 岁`) : `${mm} 个月`;
}
function daysUntil(dateStr){
  const t = new Date(dateStr + 'T00:00').getTime();
  const today = new Date(dayKey(Date.now()) + 'T00:00').getTime();
  return Math.round((t - today) / 864e5);
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
function haversine(aLng,aLat,bLng,bLat){
  const R=6371008.8, r=Math.PI/180, dLat=(bLat-aLat)*r, dLng=(bLng-aLng)*r;
  const s=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function isoWeek(t){ // Monday-start week, e.g. 2026-W43, in the phone's local time
  const d=new Date(t); d.setHours(12,0,0,0); d.setDate(d.getDate()+3-((d.getDay()+6)%7));
  const w1=new Date(d.getFullYear(),0,4,12);
  const n=1+Math.round(((d-w1)/864e5-3+((w1.getDay()+6)%7))/7);
  return `${d.getFullYear()}-W${pad(n)}`;
}
const lsGet = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(_){ return d; } };
const lsSet = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };

/* ---------- colours ---------- */
let C = {};
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
let SFX = darkMQ.matches ? 'd' : 'l';
function readColors(){
  const cs = getComputedStyle(document.documentElement), t = n => cs.getPropertyValue('--'+n).trim();
  C = {paper:t('paper'), paper2:t('paper-2'), ink:t('graphite'), muted:t('muted'), grass:t('grass'), sky:t('sky'), sun:t('sun'), rose:t('rose'), clay:t('clay'), poop:t('poop')};
}
function rgba(hex, a){ const m=hex.replace('#',''); const v=m.length===3?m.split('').map(c=>c+c).join(''):m; return `rgba(${parseInt(v.slice(0,2),16)},${parseInt(v.slice(2,4),16)},${parseInt(v.slice(4,6),16)},${a})`; }

/* ---------- pencil drawing on canvas ---------- */
function sketch(g, pts, o){
  const {color, w=1.6, alpha=.75, passes=2, amp=1, closed=false, rnd} = o;
  g.save(); g.strokeStyle=color; g.lineCap='round'; g.lineJoin='round';
  const P = closed ? pts.concat([pts[0]]) : pts;
  for (let p=0;p<passes;p++){
    g.beginPath(); let first=true;
    for (let i=0;i<P.length-1;i++){
      const a=P[i], b=P[i+1], len=Math.hypot(b[0]-a[0], b[1]-a[1]), steps=Math.max(1,Math.ceil(len/12));
      for (let k=(i===0?0:1);k<=steps;k++){
        const t=k/steps, x=a[0]+(b[0]-a[0])*t+(rnd()-.5)*2*amp, y=a[1]+(b[1]-a[1])*t+(rnd()-.5)*2*amp;
        if (first){ g.moveTo(x,y); first=false; } else g.lineTo(x,y);
      }
    }
    g.globalAlpha=alpha*(.65+.35*rnd()); g.lineWidth=w*(.75+.5*rnd()); g.stroke();
  }
  g.restore();
}
function hatchPoly(g, pts, o){
  const {color, rnd, angle=-.85, gap=3.4, alpha=.5, w=1.1, cross=.4, base=.18} = o;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for (const p of pts){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
  g.save(); g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.clip();
  if (base){ g.globalAlpha=base; g.fillStyle=color; g.fill(); }
  g.strokeStyle=color; g.lineCap='round';
  const cx=(x0+x1)/2, cy=(y0+y1)/2, R=Math.hypot(x1-x0,y1-y0)/2+3;
  const layer=(a,al,gp)=>{ const dx=Math.cos(a), dy=Math.sin(a), nx=-dy, ny=dx;
    for (let off=-R; off<=R; off+=gp*(.75+.5*rnd())){
      const sx=cx+nx*off-dx*R, sy=cy+ny*off-dy*R, ex=cx+nx*off+dx*R, ey=cy+ny*off+dy*R;
      g.beginPath(); g.moveTo(sx,sy); g.quadraticCurveTo((sx+ex)/2+(rnd()-.5)*2,(sy+ey)/2+(rnd()-.5)*2,ex,ey);
      g.globalAlpha=al*(.5+.5*rnd()); g.lineWidth=w*(.7+.6*rnd()); g.stroke(); } };
  layer(angle,alpha,gap); if (cross) layer(angle+.55,alpha*cross,gap*1.4);
  g.restore();
}
function circlePts(cx,cy,r,n,rnd,j=.05){ const o=[]; for(let i=0;i<n;i++){const a=i/n*Math.PI*2, rr=r*(1+(rnd()-.5)*2*j); o.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr]);} return o; }
function fillPoly(g,pts){ g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.fill(); }
function grainErode(g, w, h, lo=.5, seed=1){
  const id=g.getImageData(0,0,w,h), d=id.data, rnd=mulberry32(seed);
  for (let i=3;i<d.length;i+=4) if (d[i]) d[i]=d[i]*(lo+(1-lo)*rnd());
  g.putImageData(id,0,0); return id;
}

/* ---------- map images (patterns, stickers) made on demand ---------- */
function makeImage(id){
  const parts=id.split('-'); // kind-...-sfx
  const kind=parts.slice(0,-1).join('-');
  const cv=document.createElement('canvas'), g=cv.getContext('2d');
  const pat=(T)=>{ cv.width=cv.height=T; };
  const diag=(T,gap,color,alpha,w,dir=1)=>{ g.strokeStyle=color; g.globalAlpha=alpha; g.lineWidth=w; g.lineCap='butt';
    for (let x=-T;x<T*2;x+=gap){ g.beginPath(); if (dir>0){ g.moveTo(x,T); g.lineTo(x+T,0); } else { g.moveTo(x,0); g.lineTo(x+T,T); } g.stroke(); } g.globalAlpha=1; };
  const base=(T,color,a)=>{ g.fillStyle=rgba(color,a); g.fillRect(0,0,T,T); };
  let T=64, lo=.45;
  switch (kind){
    case 'p-res':   pat(T); diag(T,16,C.muted,.18,1.6); lo=.35; break;
    case 'p-warm':  pat(T); base(T,C.clay,.06); diag(T,8,C.clay,.32,1.8); break;
    case 'p-civic': pat(T); base(T,C.rose,.06); diag(T,8,C.rose,.3,1.8); break;
    case 'p-grass': pat(T); base(T,C.grass,.16); diag(T,8,C.grass,.62,2.2); diag(T,16,C.grass,.25,1.6,-1); break;
    case 'p-wood':  pat(T); base(T,C.grass,.26); diag(T,6,C.grass,.8,2.2); diag(T,8,C.grass,.45,1.8,-1); break;
    case 'p-sand':  pat(T); base(T,C.sun,.12); { const r=mulberry32(7); g.fillStyle=rgba(C.sun,.8); for(let i=0;i<70;i++){ g.fillRect(r()*T|0,r()*T|0,2,2);} } break;
    case 'p-bldg':  pat(T); base(T,C.clay,.10); diag(T,8,C.clay,.38,1.6); diag(T,16,C.ink,.10,1.4,-1); break;
    case 'p-water': pat(T); base(T,C.sky,.22); g.strokeStyle=C.sky; g.lineWidth=2;
      for (let y=4;y<T;y+=8){ g.globalAlpha=.65; g.beginPath(); for (let x=0;x<=T;x+=2){ const yy=y+Math.sin(x/T*Math.PI*2+(y/8))*2; x?g.lineTo(x,yy):g.moveTo(x,yy);} g.stroke(); } g.globalAlpha=1; break;
    case 'p-pencil': { cv.width=64; cv.height=16; const r=mulberry32(3); for(let y=0;y<16;y++) for(let x=0;x<64;x++){ const edge=Math.min(y,15-y)<5; if (edge && r()<.85){ g.fillStyle=rgba(C.ink,.35+.5*r()); g.fillRect(x,y,1,1);} } return {width:64,height:16,data:g.getImageData(0,0,64,16).data}; }
    case 'paw': { cv.width=cv.height=40; g.translate(20,20); g.rotate(Math.PI/2); g.scale(1.45,1.45); g.translate(-12,-12);
      g.fillStyle=rgba(C.grass,.85); g.fill(new Path2D(ICONS.paw.d)); const id2=grainErode(g,40,40,.55,5); return {width:40,height:40,data:id2.data}; }
    case 'dogpark': { cv.width=cv.height=56; g.scale(2,2); const rnd=mulberry32(9); const c=circlePts(14,14,12,18,rnd,.04);
      g.fillStyle=C.paper; fillPoly(g,c); hatchPoly(g,c,{color:C.sun,rnd,alpha:.8,gap:2.2,base:.4});
      sketch(g,c,{color:C.ink,w:1.1,alpha:.6,rnd,closed:true,amp:.3});
      g.translate(14-12*.75,14-12*.75); g.scale(.75,.75); g.fillStyle=C.clay; g.fill(new Path2D(ICONS.paw.d)); g.strokeStyle=C.ink; g.lineWidth=1.4; g.stroke(new Path2D(ICONS.paw.d));
      return {width:56,height:56,data:g.getImageData(0,0,56,56).data}; }
    default:
      if (kind.startsWith('ev-')){
        const type=kind.slice(3), Ty=TYPES[type]; if (!Ty) return null;
        cv.width=cv.height=64; g.scale(2,2);
        const rnd=mulberry32(type.length*7+3), col=C[Ty.color], c=circlePts(16,16,13.5,20,rnd,.03);
        g.fillStyle=C.paper; fillPoly(g,c);
        hatchPoly(g,c,{color:col,rnd,alpha:.4,gap:2.4,base:.18,cross:.3});
        sketch(g,c,{color:C.ink,w:1.2,alpha:.65,rnd,closed:true,passes:2,amp:.35});
        const I=ICONS[Ty.icon], s=.82; g.save(); g.translate(16-12*s,16-12*s); g.scale(s,s);
        g.fillStyle=col; g.fill(new Path2D(I.d)); g.strokeStyle=C.ink; g.lineWidth=1.6; g.lineJoin='round'; g.lineCap='round';
        g.stroke(new Path2D(I.d)); if (I.x) g.stroke(new Path2D(I.x)); g.restore();
        return {width:64,height:64,data:g.getImageData(0,0,64,64).data};
      }
      return null;
  }
  const id2=grainErode(g,cv.width,cv.height,lo,kind.length*13);
  return {width:cv.width,height:cv.height,data:id2.data};
}

/* ---------- map style: OpenStreetMap data, drawn in pencil ---------- */
function roadW(add){
  const m=(a,b,c,d)=>['+',add,['match',['get','class'],['motorway','trunk','primary'],a,['secondary','tertiary'],b,'minor',c,d]];
  return ['interpolate',['exponential',1.6],['zoom'], 11,m(1.8,1.1,.5,.3), 14,m(5,4,2.6,1.4), 16,m(12,9,6.5,3.5), 19,m(42,34,24,14)];
}
function mapStyle(){
  const s=SFX, ROADS=['motorway','trunk','primary','secondary','tertiary','minor','service'];
  const name=['coalesce',['get','name:zh'],['get','name']];
  const halo={'text-halo-color':C.paper,'text-halo-width':1.6,'text-halo-blur':.5};
  return {
    version:8,
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{omt:{type:'vector', url:'https://tiles.openfreemap.org/planet',
      attribution:'<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}},
    layers:[
      {id:'bg', type:'background', paint:{'background-color':C.paper}},
      {id:'lu-res', type:'fill', source:'omt', 'source-layer':'landuse', filter:['match',['get','class'],['residential','suburb','neighbourhood'],true,false], paint:{'fill-pattern':`p-res-${s}`}},
      {id:'lu-warm', type:'fill', source:'omt', 'source-layer':'landuse', filter:['match',['get','class'],['commercial','retail','industrial','railway'],true,false], paint:{'fill-pattern':`p-warm-${s}`,'fill-opacity':.8}},
      {id:'lu-civic', type:'fill', source:'omt', 'source-layer':'landuse', filter:['match',['get','class'],['school','university','college','hospital','kindergarten'],true,false], paint:{'fill-pattern':`p-civic-${s}`,'fill-opacity':.8}},
      {id:'lc-grass', type:'fill', source:'omt', 'source-layer':'landcover', filter:['match',['get','class'],['grass','farmland','wetland'],true,false], paint:{'fill-pattern':`p-grass-${s}`,'fill-opacity':.85}},
      {id:'lc-sand', type:'fill', source:'omt', 'source-layer':'landcover', filter:['==',['get','class'],'sand'], paint:{'fill-pattern':`p-sand-${s}`}},
      {id:'lu-green', type:'fill', source:'omt', 'source-layer':'landuse', filter:['match',['get','class'],['pitch','playground','cemetery','stadium'],true,false], paint:{'fill-pattern':`p-grass-${s}`,'fill-opacity':.75}},
      {id:'park', type:'fill', source:'omt', 'source-layer':'park', paint:{'fill-pattern':`p-grass-${s}`}},
      {id:'lc-wood', type:'fill', source:'omt', 'source-layer':'landcover', filter:['==',['get','class'],'wood'], paint:{'fill-pattern':`p-wood-${s}`}},
      {id:'park-edge', type:'line', source:'omt', 'source-layer':'park', minzoom:12, paint:{'line-color':C.grass,'line-width':['interpolate',['linear'],['zoom'],12,.6,17,2],'line-opacity':.75}},
      {id:'water', type:'fill', source:'omt', 'source-layer':'water', filter:['!=',['get','brunnel'],'tunnel'], paint:{'fill-pattern':`p-water-${s}`}},
      {id:'water-edge', type:'line', source:'omt', 'source-layer':'water', filter:['!=',['get','brunnel'],'tunnel'], paint:{'line-color':C.sky,'line-width':['interpolate',['linear'],['zoom'],10,.6,17,2.2],'line-opacity':.85}},
      {id:'waterway', type:'line', source:'omt', 'source-layer':'waterway', paint:{'line-color':C.sky,'line-width':['interpolate',['linear'],['zoom'],10,.8,17,4],'line-opacity':.85}},
      {id:'building', type:'fill', source:'omt', 'source-layer':'building', minzoom:13, paint:{'fill-pattern':`p-bldg-${s}`,'fill-opacity':['interpolate',['linear'],['zoom'],13,0,14.5,1]}},
      {id:'building-edge', type:'line', source:'omt', 'source-layer':'building', minzoom:15, paint:{'line-color':C.ink,'line-opacity':.32,'line-width':.8}},
      {id:'rail', type:'line', source:'omt', 'source-layer':'transportation', minzoom:12, filter:['match',['get','class'],['rail','transit'],true,false], paint:{'line-color':C.ink,'line-opacity':.55,'line-width':1.4,'line-dasharray':[1,2.5]}},
      {id:'road-case', type:'line', source:'omt', 'source-layer':'transportation', filter:['match',['get','class'],ROADS,true,false], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-pattern':`p-pencil-${s}`,'line-width':roadW(3)}},
      {id:'road', type:'line', source:'omt', 'source-layer':'transportation', filter:['match',['get','class'],ROADS,true,false], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':C.paper2,'line-width':roadW(0)}},
      {id:'road-mid', type:'line', source:'omt', 'source-layer':'transportation', minzoom:14, filter:['match',['get','class'],['primary','secondary','trunk'],true,false], paint:{'line-color':C.sun,'line-width':1.4,'line-dasharray':[4,4],'line-opacity':.8}},
      {id:'path', type:'line', source:'omt', 'source-layer':'transportation', minzoom:13, filter:['match',['get','class'],['path','track','pier'],true,false], layout:{'line-cap':'round'}, paint:{'line-color':C.clay,'line-width':['interpolate',['linear'],['zoom'],13,.8,18,3],'line-dasharray':[1.5,1.8],'line-opacity':.9}},
      {id:'water-name', type:'symbol', source:'omt', 'source-layer':'water_name', layout:{'text-field':name,'text-font':['Noto Sans Italic'],'text-size':13}, paint:Object.assign({'text-color':C.sky},halo)},
      {id:'road-name', type:'symbol', source:'omt', 'source-layer':'transportation_name', minzoom:14, layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,10.5,18,13.5],'text-max-angle':30}, paint:Object.assign({'text-color':C.ink,'text-opacity':.78},halo)},
      {id:'park-name', type:'symbol', source:'omt', 'source-layer':'poi', minzoom:14, filter:['match',['get','class'],['park','garden'],true,false], layout:{'text-field':name,'text-font':['Noto Sans Italic'],'text-size':12.5,'text-max-width':8}, paint:Object.assign({'text-color':C.grass},halo)},
      {id:'dog-park', type:'symbol', source:'omt', 'source-layer':'poi', minzoom:13, filter:['==',['get','subclass'],'dog_park'], layout:{'icon-image':`dogpark-${s}`,'icon-size':.9,'text-field':['coalesce',['get','name'],'狗狗公园'],'text-font':['Noto Sans Bold'],'text-size':12,'text-offset':[0,1.6],'text-anchor':'top','text-optional':true}, paint:Object.assign({'text-color':C.clay},halo)},
      {id:'place', type:'symbol', source:'omt', 'source-layer':'place', filter:['match',['get','class'],['city','town','village','suburb','neighbourhood','quarter'],true,false],
        layout:{'text-field':name,'text-font':['Noto Sans Bold'],'text-size':['match',['get','class'],['city'],18,['town','suburb'],14,12],'text-transform':'uppercase','text-letter-spacing':.08,'text-max-width':8},
        paint:Object.assign({'text-color':C.muted},halo)}
    ]
  };
}

/* ---------- storage: IndexedDB on this phone ---------- */
const DB = {
  db:null,
  open(){ return new Promise((res,rej)=>{ const r=indexedDB.open('pawdiary',1);
    r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if(!d.objectStoreNames.contains('events')) d.createObjectStore('events',{keyPath:'id'}); };
    r.onsuccess=()=>{ this.db=r.result; res(); }; r.onerror=()=>rej(r.error); }); },
  tx(store, mode, fn){ return new Promise((res,rej)=>{ if(!this.db) return res(undefined); const t=this.db.transaction(store,mode), s=t.objectStore(store); const req=fn(s); t.oncomplete=()=>res(req&&req.result); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); },
  get(k){ return this.tx('kv','readonly',s=>s.get(k)); },
  set(k,v){ return this.tx('kv','readwrite',s=>s.put(v,k)); },
  all(){ return this.tx('events','readonly',s=>s.getAll()); },
  put(ev){ return this.tx('events','readwrite',s=>s.put(ev)); },
  del(id){ return this.tx('events','readwrite',s=>s.delete(id)); },
  async clearAll(){ await this.tx('events','readwrite',s=>s.clear()); await this.tx('kv','readwrite',s=>s.clear()); }
};
const saveFail = () => showToast('没能保存到手机里，可能是存储空间满了');

/* ---------- state ---------- */
const S = {
  view:'map', dog:null, events:[], walk:lsGet('pawdiary.walk',null), filter:'day',
  gps:null, gpsState:'wait', follow:true, fog:false, // fog only shows inside the 足迹 view
  explored:new Set(), last:lsGet('pawdiary.lastfix',null), logLimit:60
};

/* ---------- map ---------- */
readColors();
const startCenter = S.last ? [S.last.lng, S.last.lat] : DEFAULT_CENTER;
const map = new maplibregl.Map({
  container:'map', style:mapStyle(), center:startCenter, zoom:S.last?16:12.5,
  attributionControl:false, dragRotate:false, pitchWithRotate:false, touchPitch:false, maxZoom:19, minZoom:3, fadeDuration:150
});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-left');
map.on('styleimagemissing', e => { if (map.hasImage(e.id)) return; const img=makeImage(e.id); if (img) map.addImage(e.id, img, {pixelRatio:2}); });
map.on('error', e => { if (e && e.error && /Failed to fetch|NetworkError/i.test(String(e.error.message))) showToast('地图加载不出来，检查一下网络'); });

const EMPTY = {type:'FeatureCollection', features:[]};
function addRuntimeLayers(){
  const s=SFX;
  if (!map.getSource('acc')){
    map.addSource('acc',{type:'geojson',data:EMPTY});
    map.addSource('trails',{type:'geojson',data:EMPTY});
    map.addSource('live',{type:'geojson',data:EMPTY});
    map.addSource('events',{type:'geojson',data:EMPTY});
    map.addSource('focus',{type:'geojson',data:EMPTY});
  }
  map.addLayer({id:'acc-fill',type:'fill',source:'acc',paint:{'fill-color':C.sky,'fill-opacity':.1}});
  map.addLayer({id:'acc-line',type:'line',source:'acc',paint:{'line-color':C.sky,'line-opacity':.5,'line-width':1.2,'line-dasharray':[2,2]}});
  map.addLayer({id:'trail-line',type:'line',source:'trails',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':C.grass,'line-opacity':.35,'line-width':['interpolate',['linear'],['zoom'],12,2,17,5]}});
  map.addLayer({id:'trail-paws',type:'symbol',source:'trails',minzoom:14,layout:{'symbol-placement':'line','symbol-spacing':26,'icon-image':`paw-${s}`,'icon-size':['interpolate',['linear'],['zoom'],14,.4,18,.75],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-rotation-alignment':'map'}});
  map.addLayer({id:'focus-case',type:'line',source:'focus',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':C.paper,'line-width':['interpolate',['linear'],['zoom'],12,6,17,12]}});
  map.addLayer({id:'focus-line',type:'line',source:'focus',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':C.rose,'line-width':['interpolate',['linear'],['zoom'],12,3,17,7]}});
  map.addLayer({id:'live-line',type:'line',source:'live',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':C.rose,'line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],12,2.5,17,6],'line-dasharray':[.2,1.6]}});
  map.addLayer({id:'ev',type:'symbol',source:'events',layout:{'icon-image':['concat','ev-',['get','type'],`-${s}`],'icon-size':['interpolate',['linear'],['zoom'],11,.45,16,.95],'icon-allow-overlap':true,'icon-ignore-placement':true}});
}
map.on('style.load', () => { addRuntimeLayers(); renderMap(); updateAcc(); });
map.on('click','ev', e => { const f=e.features&&e.features[0]; if (!f) return; const ev=S.events.find(x=>x.id===f.properties.id); if (ev) showInfo(ev); });
map.on('mouseenter','ev',()=>{ map.getCanvas().style.cursor='pointer'; });
map.on('mouseleave','ev',()=>{ map.getCanvas().style.cursor=''; });
map.on('click', e => { if (!map.getLayer('ev')) return; const hits=map.queryRenderedFeatures(e.point,{layers:['ev']}); if (!hits.length) hideInfo(); });
map.on('dragstart', () => { if (S.follow){ S.follow=false; renderFollow(); } });

/* dog marker */
const dogEl=document.createElement('div');
dogEl.className='dogpin';
dogEl.innerHTML='<div class="pulse"></div><div class="shadow"></div><div class="body"><div class="nm"></div><div class="ring pb"></div><div class="tail"></div></div>';
const dogMarker=new maplibregl.Marker({element:dogEl, anchor:'bottom'}).setLngLat(startCenter);
let dogOnMap=false;
if (S.last){ dogMarker.addTo(map); dogOnMap=true; }
function renderDogPin(){
  const d=dogInfo();
  dogEl.querySelector('.nm').textContent=d.name||'狗狗';
  dogEl.querySelector('.ring').innerHTML = d.photo ? `<img src="${d.photo}" alt="">` : `<div class="face">${icon('dog','var(--clay)')}</div>`;
  dogEl.classList.toggle('manual', S.gpsState!=='ok');
}

/* ---------- fog of war: grey until walked, then erased ---------- */
const fog=document.createElement('canvas');
fog.style.cssText='position:absolute;left:0;top:0;pointer-events:none';
map.getCanvas().after(fog);
const expPts=[]; // [lng,lat] of every explored cell, for fast drawing
const fg=fog.getContext('2d');
let fogPat=null, brush=null, fogDirty=true;
function buildFogArt(){
  const p=document.createElement('canvas'); p.width=p.height=64; const g=p.getContext('2d');
  g.fillStyle = SFX==='d' ? 'rgba(14,15,13,.62)' : 'rgba(150,152,144,.58)'; g.fillRect(0,0,64,64);
  g.strokeStyle = SFX==='d' ? 'rgba(236,231,218,.10)' : 'rgba(51,52,46,.16)'; g.lineWidth=1.3;
  for (let x=-64;x<128;x+=6){ g.beginPath(); g.moveTo(x,64); g.lineTo(x+64,0); g.stroke(); }
  grainErode(g,64,64,.7,4);
  fogPat=fg.createPattern(p,'repeat');
  const b=document.createElement('canvas'); b.width=b.height=128; const h=b.getContext('2d');
  const gr=h.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(.6,'rgba(0,0,0,.95)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  h.fillStyle=gr; h.fillRect(0,0,128,128); grainErode(h,128,128,.35,8);
  brush=b; fogDirty=true;
}
function drawFog(){
  const box=map.getContainer(), w=box.clientWidth, h=box.clientHeight, dpr=Math.min(2,devicePixelRatio||1);
  if (fog.width!==Math.round(w*dpr) || fog.height!==Math.round(h*dpr)){ fog.width=Math.round(w*dpr); fog.height=Math.round(h*dpr); fog.style.width=w+'px'; fog.style.height=h+'px'; }
  fg.setTransform(1,0,0,1,0,0); fg.clearRect(0,0,fog.width,fog.height);
  if (!S.fog || !fogPat) return;
  fg.setTransform(dpr,0,0,dpr,0,0);
  const anchor=map.project(DEFAULT_CENTER);
  fogPat.setTransform(new DOMMatrix().translateSelf(((anchor.x%64)+64)%64, ((anchor.y%64)+64)%64));
  fg.globalCompositeOperation='source-over'; fg.fillStyle=fogPat; fg.fillRect(0,0,w,h);
  if (!expPts.length) return;
  const lat=map.getCenter().lat, mpp=40075016.686*Math.cos(lat*Math.PI/180)/(512*Math.pow(2,map.getZoom()));
  const r=Math.max(2.5, BRUSH_M/mpp), b=map.getBounds();
  const pad=(r*mpp)/111320*1.6, west=b.getWest()-pad*1.6, east=b.getEast()+pad*1.6, south=b.getSouth()-pad, north=b.getNorth()+pad;
  fg.globalCompositeOperation='destination-out';
  const step = r < 4 ? 3 : 1;
  for (let i=0;i<expPts.length;i+=step){
    const lo=expPts[i][0], la=expPts[i][1];
    if (la<south||la>north||lo<west||lo>east) continue;
    const p=map.project([lo,la]); fg.drawImage(brush,p.x-r,p.y-r,r*2,r*2);
  }
  fg.globalCompositeOperation='source-over';
}
function addExplored(key){
  if (S.explored.has(key)) return false;
  S.explored.add(key); const c=key.indexOf(','); expPts.push([+key.slice(c+1)/CELL, +key.slice(0,c)/CELL]); return true;
}
map.on('render', drawFog);
// Only real movement rubs the map clean: standing still (GPS drift), poor fixes, and riding in a car or tram don't count.
const EXP_STEP_M = 15, EXP_MAX_ACC = 25, EXP_MAX_SPEED = 6; // metres, metres, metres/second
function exploreAt(raw){
  if (raw.acc > EXP_MAX_ACC || !Cloud.isHolder()) return;
  // average the last three good fixes so random GPS wobble cancels out before we measure movement
  const buf=(S._expBuf||[]).filter(f=>raw.t-f.t < 30000); buf.push(raw); while (buf.length>3) buf.shift(); S._expBuf=buf;
  if (buf.length<3) return;
  const fix={lng:buf.reduce((s,f)=>s+f.lng,0)/3, lat:buf.reduce((s,f)=>s+f.lat,0)/3, t:raw.t};
  const a=S._expAnchor;
  if (!a || fix.t-a.t > 5*6e4){ S._expAnchor={lng:fix.lng, lat:fix.lat, t:fix.t}; return; } // first fix or after a long gap: just remember where we are
  const d=haversine(a.lng,a.lat,fix.lng,fix.lat);
  if (d < EXP_STEP_M) return;                                       // not moved yet
  const dt=Math.max(1,(fix.t-a.t)/1000);
  if (d/dt > EXP_MAX_SPEED){ S._expAnchor={lng:fix.lng, lat:fix.lat, t:fix.t}; return; } // too fast for paws
  const fresh=[];
  const add=(lo,la)=>{ const k=`${Math.round(la*CELL)},${Math.round(lo*CELL)}`; if (addExplored(k)) fresh.push(k); };
  const n=Math.ceil(d/5); for (let i=0;i<=n;i++) add(a.lng+(fix.lng-a.lng)*i/n, a.lat+(fix.lat-a.lat)*i/n);
  S._expAnchor={lng:fix.lng, lat:fix.lat, t:fix.t};
  if (fresh.length){ saveExploredSoon(); Cloud.queueCells(fresh); if (S.fog){ map.triggerRepaint(); renderFootprintCard(); } }
}
let expTimer=null;
function saveExploredSoon(){ clearTimeout(expTimer); expTimer=setTimeout(()=>{ DB.set('explored2',[...S.explored]).catch(()=>{}); },4000); }
// each ~10 m grid cell on the path stands for about 10 m of path with a strip 2×BRUSH_M wide
const litArea = () => S.explored.size*10*2*BRUSH_M;
const litKm = () => S.explored.size*10/1000;

/* ---------- GPS ---------- */
let wakeLock=null;
async function keepAwake(on){
  try{
    if (on && 'wakeLock' in navigator && !wakeLock){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{ wakeLock=null; }); }
    if (!on && wakeLock){ await wakeLock.release(); wakeLock=null; }
  }catch(_){}
}
function startGps(){
  if (!('geolocation' in navigator)){ S.gpsState='unsupported'; renderGpsNote(); return; }
  navigator.geolocation.watchPosition(onFix, onGpsErr, {enableHighAccuracy:true, maximumAge:4000, timeout:30000});
}
function onFix(p){
  const c=p.coords, fix={lng:c.longitude, lat:c.latitude, acc:c.accuracy||999, t:p.timestamp||Date.now()};
  const first=S.gpsState!=='ok' || !S.gps;
  S.gps=fix; S.gpsState='ok'; S.last={lng:fix.lng,lat:fix.lat,t:fix.t};
  lsSet('pawdiary.lastfix', S.last);
  const holding=Cloud.isHolder();
  if (holding){ dogMarker.setLngLat([fix.lng,fix.lat]); if (!dogOnMap){ dogMarker.addTo(map); dogOnMap=true; } }
  updateAcc();
  exploreAt(fix);
  if (S.walk && holding) addWalkPoint(fix);
  if (holding){
    if (first){ map.flyTo({center:[fix.lng,fix.lat], zoom:Math.max(map.getZoom(),16.3), duration:REDUCED?0:1600}); }
    else if (S.follow){ map.easeTo({center:[fix.lng,fix.lat], duration:REDUCED?0:600}); }
  } else if (first && !Cloud.dogPos()){ map.flyTo({center:[fix.lng,fix.lat], zoom:Math.max(map.getZoom(),15), duration:REDUCED?0:1600}); }
  renderGpsNote(); renderDogPin();
  loadWeather();
}
function onGpsErr(e){
  if (e.code===1) S.gpsState='denied';
  else if (e.code===2) S.gpsState='unavail';
  else if (S.gpsState!=='ok') S.gpsState='slow';
  renderGpsNote(); renderDogPin();
}
function circlePoly(lng,lat,m){
  const pts=[]; for (let i=0;i<=40;i++){ const a=i/40*Math.PI*2; pts.push([lng+(m*Math.cos(a))/(111320*Math.cos(lat*Math.PI/180)), lat+(m*Math.sin(a))/110540]); }
  return {type:'Feature',geometry:{type:'Polygon',coordinates:[pts]},properties:{}};
}
function updateAcc(){
  const src=map.getSource('acc'); if (!src) return;
  src.setData(S.gps && S.gps.acc>8 ? {type:'FeatureCollection',features:[circlePoly(S.gps.lng,S.gps.lat,Math.min(S.gps.acc,400))]} : EMPTY);
}
function currentFix(){
  if (S.gps && Date.now()-S.gps.t < 5*6e4) return S.gps;
  if (S.last && Date.now()-S.last.t < 10*6e4) return S.last;
  return null;
}

/* ---------- place names (OpenStreetMap Nominatim, cached, 1 req/s) ---------- */
const placeCache=lsGet('pawdiary.places',{});
let geoQueue=Promise.resolve();
function placeAt(lng,lat){
  const key=`${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (placeCache[key]) return Promise.resolve(placeCache[key]);
  geoQueue=geoQueue.then(()=>new Promise(r=>setTimeout(r,1100))).then(async()=>{
    if (placeCache[key]) return placeCache[key];
    const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&accept-language=zh-CN,zh,en`);
    if (!res.ok) throw new Error('geo');
    const j=await res.json(), a=j.address||{};
    const spot=a.park||a.leisure||a.dog_park||a.garden||a.nature_reserve||j.name||a.road||a.pedestrian||a.footway||a.path||a.cycleway||'';
    const area=a.suburb||a.neighbourhood||a.quarter||a.city_district||a.town||a.city||'';
    const label=[spot,area].filter((v,i,arr)=>v && arr.indexOf(v)===i).join(' · ') || '路上';
    placeCache[key]=label;
    const keys=Object.keys(placeCache); if (keys.length>400) delete placeCache[keys[0]];
    lsSet('pawdiary.places', placeCache);
    return label;
  });
  const p=geoQueue; geoQueue=geoQueue.catch(()=>{}); return p;
}
function fillPlace(id, lng, lat){
  placeAt(lng,lat).then(label=>{ const ev=S.events.find(e=>e.id===id); if (ev && !ev.place) updateEvent(id,{place:label}); }).catch(()=>{});
}

/* ---------- data actions ---------- */
const dogInfo = () => S.dog || {name:'我的狗狗'};
// Every change is saved on this phone first and queued for the shared diary on the server.
function addEvent(ev){
  const full=Object.assign({id:uid(), by:Cloud.role()}, ev);
  S.events=[full, ...S.events].sort((a,b)=>b.t-a.t);
  DB.put(full).catch(saveFail); Cloud.queueEvent(full);
  renderAll(); renderMap(); checkStickers();
  return full.id;
}
function updateEvent(id, patch){
  let full=null;
  S.events=S.events.map(e=>{ if (e.id!==id) return e; full=Object.assign({},e,patch); return full; });
  if (full){ DB.put(full).catch(saveFail); Cloud.queueEvent(full); }
  renderAll(); renderMap();
}
function deleteEvent(id){
  const e=S.events.find(x=>x.id===id);
  S.events=S.events.filter(e=>e.id!==id);
  DB.del(id).catch(saveFail); Cloud.queueDelete(id, e&&e.t);
  renderAll(); renderMap();
}
function saveDog(d){
  const prev=S.dog;
  S.dog=d; DB.set('dog',d).catch(saveFail);
  renderTop(); renderDogPin(); renderDogView(); renderOnboard();
  Cloud.pushDog(d, prev);
}

function logEvent(type, extra){
  if (!Cloud.isHolder()){ Cloud.showAway(true); return null; }
  const T=TYPES[type], f=currentFix();
  const ev=Object.assign({type, t:Date.now()}, extra||{});
  if (f){ ev.lng=+f.lng.toFixed(6); ev.lat=+f.lat.toFixed(6); }
  if (S.walk) ev.onWalk=true;
  if (type==='poop') ev.status='ok';
  const id=addEvent(ev);
  if (f) fillPlace(id, ev.lng, ev.lat);
  const where = f ? '' : '（还没定位，只记了时间）';
  const undo=`<button class="undo" data-undo="${id}">撤销</button>`;
  if (type==='poop'){
    showToast(`<div>记下了：<b>便便</b> · ${hm(ev.t)}${where}${undo}</div><div class="chips">${STOOL_ORDER.map(k=>`<button class="chip pb" data-st="${k}" aria-pressed="${k==='ok'}">${STOOL[k]}</button>`).join('')}</div>`, 7000, el=>{
      el.querySelectorAll('[data-st]').forEach(b=>b.addEventListener('click',()=>{
        updateEvent(id,{status:b.dataset.st});
        el.querySelectorAll('[data-st]').forEach(x=>x.setAttribute('aria-pressed', String(x===b)));
        armToastHide(1800);
      }));
    });
  } else {
    showToast(`记下了：<b>${T.log}</b> · ${hm(ev.t)}${where}${undo}`, 4000);
  }
  if (navigator.vibrate) try{ navigator.vibrate(12); }catch(_){}
  return id;
}

function startWalk(){
  if (!Cloud.isHolder()){ Cloud.showAway(true); return; }
  const f=currentFix();
  S.walk={start:Date.now(), pts:f?[[+f.lng.toFixed(6), +f.lat.toFixed(6)]]:[], dist:0, exp0:S.explored.size};
  lsSet('pawdiary.walk', S.walk); keepAwake(true);
  S.follow=true; renderFollow(); if (f) map.easeTo({center:[f.lng,f.lat], zoom:Math.max(map.getZoom(),16.5)});
  renderWalkUI(); renderMap(); Cloud.syncSoon();
  showToast(S.gpsState==='ok' ? '出发！锁屏后浏览器会暂停定位，遛狗时尽量亮着屏。' : '出发！正在等定位，拿到信号后开始画路线。', 5200);
}
function addWalkPoint(fix){
  if (fix.acc>35) return;
  const w=S.walk, last=w.pts[w.pts.length-1];
  if (last){
    const d=haversine(last[0],last[1],fix.lng,fix.lat);
    if (d<6) return;
    const dt=(fix.t-(w.lastT||w.start))/1000;
    if (dt>0 && d/dt>12) return; // faster than a sprinting dog: GPS jump
    w.dist+=d;
  }
  w.pts.push([+fix.lng.toFixed(6), +fix.lat.toFixed(6)]); w.lastT=fix.t;
  lsSet('pawdiary.walk', w); renderWalkUI(); renderLive();
}
function endWalk(){
  const w=S.walk; if (!w) return;
  S.walk=null; lsSet('pawdiary.walk', null); keepAwake(false);
  const end=Date.now();
  let pts=w.pts; if (pts.length>600){ const st=pts.length/600; pts=Array.from({length:600},(_,i)=>pts[Math.floor(i*st)]).concat([w.pts[w.pts.length-1]]); }
  const ev={type:'walk', t:w.start, end, dist:Math.round(w.dist), path:pts.flat()};
  if (pts.length){ const l=pts[pts.length-1]; ev.lng=l[0]; ev.lat=l[1]; }
  const id=addEvent(ev);
  if (pts.length) fillPlace(id, ev.lng, ev.lat);
  renderWalkUI(); renderLive();
  Cloud.walkEnded(Math.round(w.dist));
  const freshM=Math.max(0,S.explored.size-(w.exp0??S.explored.size))*10;
  const poops=S.events.filter(e=>e.type==='poop' && e.t>=w.start).length, pees=S.events.filter(e=>e.type==='pee' && e.t>=w.start).length;
  showToast(`<div>这次遛了 <b>${Math.max(1,Math.round((end-w.start)/6e4))} 分钟</b> · ${fmtDist(w.dist)}</div><div style="font-size:13px;margin-top:2px">${freshM>=10?`其中 ${fmtDist(freshM)} 是没走过的新路`:'都是走过的老路'}${poops||pees?` · 便便 ${poops} · 尿尿 ${pees}`:''}</div>`, 6500);
}

/* ---------- map rendering of records ---------- */
const photoMarkers=new Map();
function visibleEvents(){
  const cut=Date.now()-864e5;
  return S.filter==='day' ? S.events.filter(e=>e.t>=cut || (e.end && e.end>=cut)) : S.events.slice(0,800);
}
function renderMap(){
  if (!map.getSource('events')) return;
  const evs=visibleEvents();
  map.getSource('events').setData({type:'FeatureCollection', features:evs.filter(e=>e.type!=='walk' && e.type!=='photo' && e.lng!=null).map(e=>({type:'Feature',geometry:{type:'Point',coordinates:[e.lng,e.lat]},properties:{id:e.id,type:e.type}}))});
  map.getSource('trails').setData({type:'FeatureCollection', features:evs.filter(e=>e.type==='walk' && e.path && e.path.length>=4).map(e=>{ const c=[]; for (let i=0;i<e.path.length;i+=2) c.push([e.path[i],e.path[i+1]]); return {type:'Feature',geometry:{type:'LineString',coordinates:c},properties:{id:e.id}}; })});
  const want=new Set(evs.filter(e=>e.type==='photo' && e.photo && e.lng!=null).map(e=>e.id));
  for (const [id,m] of photoMarkers){ if (!want.has(id)){ m.remove(); photoMarkers.delete(id); } }
  evs.forEach(e=>{
    if (!want.has(e.id) || photoMarkers.has(e.id)) return;
    const el=document.createElement('button'); el.className='photopin'; el.setAttribute('aria-label','打开照片');
    el.innerHTML=`<img src="${e.photo}" alt="">`;
    el.addEventListener('click',ev=>{ ev.stopPropagation(); openLightbox(e.id); });
    photoMarkers.set(e.id, new maplibregl.Marker({element:el, anchor:'bottom'}).setLngLat([e.lng,e.lat]).addTo(map));
  });
  renderLive();
}
function renderLive(){
  const src=map.getSource('live'); if (!src) return;
  const pts=S.walk?S.walk.pts.slice():[];
  if (S.walk && S.gps && pts.length) pts.push([S.gps.lng,S.gps.lat]);
  src.setData(pts.length>=2 ? {type:'Feature',geometry:{type:'LineString',coordinates:pts},properties:{}} : EMPTY);
}

/* ---------- UI bits ---------- */
let toastTimer=null;
function showToast(html, ms=2600, after){
  const el=$('#toast'); el.innerHTML=html; el.hidden=false;
  requestAnimationFrame(()=>el.classList.remove('out'));
  if (after) after(el);
  armToastHide(ms);
}
function armToastHide(ms){
  const el=$('#toast'); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>{ if (el.classList.contains('out')) el.hidden=true; },300); }, ms);
}
$('#toast').addEventListener('click',e=>{ const u=e.target.closest('[data-undo]'); if (u){ deleteEvent(u.dataset.undo); showToast('已撤销'); } });

function showInfo(e){
  const T=TYPES[e.type], el=$('#info');
  const when = dayKey(e.t)===dayKey(Date.now()) ? hm(e.t) : `${dayLabel(dayKey(e.t))[0]} ${hm(e.t)}`;
  el.innerHTML=`${icon(T.icon,`var(--${T.color})`)}<div><b>${e.type==='meet'&&e.friend?`遇到 ${esc(e.friend)}`:T.log}</b>${e.status?` · ${STOOL[e.status]}`:''}<br>${when}${e.place?` · ${esc(e.place)}`:''}${e.note?`<br>${esc(e.note)}`:''}</div><button class="x" aria-label="关闭">×</button>`;
  el.querySelector('.x').onclick=hideInfo;
  el.hidden=false;
}
function hideInfo(){ $('#info').hidden=true; clearRoute(); }

function renderFollow(){ $('#recenter').classList.toggle('follow', S.follow); }
function renderGpsNote(){
  const el=$('#gpsNote');
  const msg={
    wait:'正在找你的位置…第一次打开会问你要不要允许定位，选「允许」。',
    slow:'定位信号弱，走到开阔一点的地方试试。',
    denied:'没有定位权限，狗狗没法出现在地图上。<br>iPhone：设置 → 隐私与安全性 → 定位服务 → Safari 网站 → 使用 App 期间；然后刷新这一页。',
    unavail:'暂时拿不到定位，确认手机的定位服务开着。',
    unsupported:'这个浏览器不支持定位，换 Safari 或 Chrome 打开。'
  }[S.gpsState];
  el.hidden=!msg; if (msg) el.innerHTML=msg;
}
function renderOnboard(){
  const el=$('#onboard');
  const show=!lsGet('pawdiary.onboarded',false) && (!S.dog || !S.events.length);
  el.hidden=!show; if (!show) return;
  el.innerHTML=`<b>三步开始</b><ol><li>${S.dog&&S.dog.photo?'✓ ':''}在「狗狗」页上传照片，它就是地图上的头像</li><li>${S.gpsState==='ok'?'✓ ':''}允许定位，狗狗跟着你的 GPS 走</li><li>出门点「开始遛狗」，回来点右上角「足迹」看走过的地方被擦亮</li></ol><div class="row2"><button class="btn small pb" id="obDog" style="--fill:var(--rose)">设置狗狗</button><button class="btn small pb" id="obOk" style="--fill:var(--paper-2)">知道了</button></div>`;
  $('#obDog').onclick=()=>setView('dog');
  $('#obOk').onclick=()=>{ lsSet('pawdiary.onboarded',true); renderOnboard(); };
}
function renderTop(){
  const d=dogInfo();
  $('#topAva').innerHTML = d.photo ? `<img src="${d.photo}" alt="">` : icon('dog','var(--clay)');
  $('#topName').textContent = d.name || '我的狗狗';
  const sub=[Cloud.familyLine(), d.breed, ageText(d.birthday)].filter(Boolean).join(' · ');
  $('#topSub').textContent = sub;
  const today=dayKey(Date.now()), poops=S.events.filter(e=>e.type==='poop');
  $('#topPoop').textContent = poops.filter(e=>dayKey(e.t)===today).length;
  $('#topSince').textContent = poops[0] ? `距上次便便 ${fmtSince(Date.now()-poops[0].t)}` : '还没有便便记录';
}
function renderWalkUI(){
  const b=$('#walkBtn'), p=$('#walkPanel');
  if (S.walk){
    const s=Math.floor((Date.now()-S.walk.start)/1000);
    b.classList.add('on');
    b.innerHTML=`${icon('paw','var(--paper)')}结束遛狗 · ${Math.floor(s/60)}:${pad(s%60)}`;
    p.hidden=false;
    const pace = S.walk.dist>50 ? `${Math.round((Date.now()-S.walk.start)/6e4/(S.walk.dist/1000))} 分钟/公里` : '';
    const sk=streaks(), todayMin=sk.today+s/60, left=Math.ceil(sk.goal-todayMin);
    p.innerHTML=`${icon('paw','var(--rose)')}<div><b>遛狗中</b> <span class="num">${fmtDist(S.walk.dist)}</span><br><span style="font-size:12.5px">${left>0?`离今天目标还差 ${left} 分钟`:'今天的目标达成了'}${pace?` · ${pace}`:''}<br>${S.gpsState==='ok'?`GPS 精度 ±${Math.round(S.gps.acc)} 米`:'等待定位…'}</span></div>`;
  } else {
    b.classList.remove('on');
    b.innerHTML=`${icon('paw','var(--paper)')}开始遛狗`;
    p.hidden=true;
  }
}

/* ---------- diary ---------- */
function chartSvg(vals, labels, {pat, fmt, floor}){
  const Wd=320, Hd=132, top=20, bot=24, n=vals.length, slot=(Wd-8)/n, bw=slot*.56;
  const max=Math.max(floor, ...vals), ph=Hd-top-bot;
  let out=`<svg viewBox="0 0 ${Wd} ${Hd}" role="img"><g style="filter:url(#wobble)">`;
  out+=`<line x1="2" x2="${Wd-2}" y1="${Hd-bot}" y2="${Hd-bot}" style="stroke:var(--graphite);stroke-width:1.6;opacity:.6"/>`;
  out+=`<line x1="2" x2="${Wd-2}" y1="${top}" y2="${top}" style="stroke:var(--graphite);stroke-width:1;opacity:.18;stroke-dasharray:3 5"/>`;
  vals.forEach((v,i)=>{ const h=v/max*ph, x=4+i*slot+(slot-bw)/2, y=Hd-bot-h;
    if (v>0) out+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" style="fill:url(#${pat});stroke:var(--graphite);stroke-width:1.3;stroke-opacity:.7"/>`; });
  out+='</g>';
  vals.forEach((v,i)=>{ const h=v/max*ph, cx=4+i*slot+slot/2;
    out+=`<text x="${cx.toFixed(1)}" y="${(Hd-bot-h-5).toFixed(1)}" text-anchor="middle">${v?fmt(v):''}</text>`;
    out+=`<text class="lb" x="${cx.toFixed(1)}" y="${Hd-6}" text-anchor="middle">${labels[i]}</text>`; });
  return out+`<text class="lb" x="${Wd-2}" y="${top-6}" text-anchor="end">${fmt(max)}</text></svg>`;
}
function renderLog(){
  if (S.view!=='log') return;
  const evs=S.events, now=Date.now(), today=dayKey(now), d=dogInfo();
  const td=evs.filter(e=>dayKey(e.t)===today), walksT=td.filter(e=>e.type==='walk'), cnt=t=>td.filter(e=>e.type===t).length;
  const meters=walksT.reduce((s,e)=>s+(e.dist||0),0), mins=walksT.reduce((s,e)=>s+Math.round(((e.end||e.t)-e.t)/6e4),0);
  const poops=evs.filter(e=>e.type==='poop'), last=poops[0];
  const tile=(c,ic,k,v,u)=>`<div class="tile pb" style="--c:var(--${c})"><span class="k">${icon(ic,`var(--${c})`)}${k}</span><span class="v">${v}<small>${u}</small></span></div>`;
  const alerts=healthAlerts(), sk=streaks();
  let h=alerts.length?`<div class="sec"><h2 style="--hl:var(--rose)">需要留意</h2><div class="alerts">${alerts.map(a=>`<div class="alert pb ${a.lvl}">${esc(a.text)}</div>`).join('')}</div></div>`:'';
  h+=`<div class="sec"><h2>今天</h2>
    <div class="goal">${goalRing(sk.today, sk.goal)}<div><strong>${Math.round(sk.today)} / ${sk.goal} 分钟</strong><br><span class="muted">${sk.today>=sk.goal?'今天的遛狗目标完成了':`还差 ${Math.ceil(sk.goal-sk.today)} 分钟`}${sk.cur?` · 连续 ${sk.cur} 天达标`:''}${sk.best>sk.cur?` · 最长 ${sk.best} 天`:''}</span></div></div>
    <div class="tiles">${tile('poop','poop','便便',cnt('poop'),'次')}${tile('sun','pee','尿尿',cnt('pee'),'次')}${tile('grass','paw','遛狗距离',meters<1000?Math.round(meters):(meters/1000).toFixed(2),meters<1000?'米':'km')}${tile('sky','water','遛狗时长',mins,'分钟')}</div>
    <p class="lead">${last?`距离上次便便 <strong>${fmtSince(now-last.t)}</strong>${last.place?` · ${esc(last.place)}`:''} · ${STOOL[last.status]||''}`:'还没有便便记录。在地图页点「拉屎」就会记在这里。'}</p></div>`;

  const area=litArea();
  const spots={}; evs.forEach(e=>{ if (e.place){ const k=e.place.split(' · ')[0]; spots[k]=(spots[k]||0)+1; } });
  const top=Object.entries(spots).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const walks=evs.filter(e=>e.type==='walk'), totalKm=walks.reduce((s,e)=>s+(e.dist||0),0)/1000;
  h+=`<div class="sec"><h2 style="--hl:var(--grass)">足迹</h2><p class="lead" style="margin-top:0">${area>0?`走过 <strong>${fmtDist(litKm()*1000)}</strong> 新路，擦亮了 ${areaText(area)}。`:'还没有足迹。出门走一走，足迹地图就会亮起来。'}${walks.length?` 一共遛了 ${walks.length} 次，${totalKm.toFixed(1)} 公里。`:''}</p>
    ${top.length?`<p class="lead">常去：${top.map(([k,n])=>`${esc(k)} <span class="muted">×${n}</span>`).join('，')}</p>`:''}
    <div class="btnrow"><button class="btn pb" id="openFp" style="--fill:var(--grass)">打开足迹地图</button></div></div>`;

  const rem=[];
  [['worm','驱虫'],['vax','打疫苗']].forEach(([k,n])=>{ if (d[k]){ const dd=daysUntil(d[k]); rem.push(`<span class="rchip pb ${dd<0?'late':''}">${n} · ${dd>0?`还有 ${dd} 天`:dd===0?'就是今天':`已过 ${-dd} 天`}</span>`); } });
  h+=`<div class="sec"><h2 style="--hl:var(--sky)">健康提醒</h2>${rem.length?`<div class="remind">${rem.join('')}</div>`:`<p class="muted">在「狗狗」页填上下次驱虫和打疫苗的日期，这里会帮你倒数。</p>`}</div>`;

  const days=[...Array(7)].map((_,i)=>dayKey(now-(6-i)*864e5));
  const labels=days.map((k,i)=>i===6?'今':WK[new Date(k+'T00:00').getDay()]);
  const pv=days.map(k=>evs.filter(e=>e.type==='poop'&&dayKey(e.t)===k).length);
  const wv=days.map(k=>evs.filter(e=>e.type==='walk'&&dayKey(e.t)===k).reduce((s,e)=>s+(e.dist||0),0)/1000);
  const wk=evs.filter(e=>e.type==='poop'&&dayKey(e.t)>=days[0]);
  const byS=STOOL_ORDER.map(k=>[k,wk.filter(e=>(e.status||'ok')===k).length]).filter(x=>x[1]);
  h+=`<div class="sec"><h2 style="--hl:var(--clay)">这一周</h2>
    <div class="charts"><div class="chart"><h3>便便（次）</h3>${chartSvg(pv,labels,{pat:'h-poop',fmt:v=>String(v),floor:3})}</div>
    <div class="chart"><h3>遛狗（km）</h3>${chartSvg(wv,labels,{pat:'h-grass',fmt:v=>v.toFixed(1),floor:1})}</div></div>
    <p class="lead">${wk.length?`7 天里便便 <strong>${wk.length} 次</strong>：${byS.map(([k,n])=>`${STOOL[k]} ${n}`).join(' · ')}${byS.some(([k])=>k==='loose')?'。拉稀超过一天，记得问问兽医。':''}`:'这 7 天还没有便便记录。'}</p></div>`;

  const sx=stickerCtx(), got=STICKERS.filter(s=>s.ok(sx)).length;
  h+=`<div class="sec"><h2 style="--hl:var(--sun)">贴纸册 <span class="muted">${got}/${STICKERS.length}</span></h2><div class="stickers">${STICKERS.map(s=>{ const ok=s.ok(sx);
    return `<div class="sticker ${ok?'':'locked'}"><span class="badge pb" style="--c:var(--${ok?s.c:'paper-2'})">${icon(s.ic, ok?`var(--${s.c})`:'none')}</span><b>${s.name}</b><small>${s.desc}</small></div>`; }).join('')}</div></div>`;

  h+=`<div class="sec"><h2 style="--hl:var(--rose)">时间线</h2>`;
  if (!evs.length) h+=`<p class="muted">还没有记录。地图页下面那排按钮，点一下就记一条。</p>`;
  let cur='';
  evs.slice(0,S.logLimit).forEach(e=>{
    const k=dayKey(e.t);
    if (k!==cur){ cur=k; const [a,b]=dayLabel(k); h+=`<h3 class="day">${a}${b?`<small>${b}</small>`:''}</h3>`; }
    const T=TYPES[e.type]||TYPES.pee;
    let txt=`<b>${T.log}</b>`, meta=esc(e.place||(e.lng==null?'没有位置':'查找地名中…'));
    if (e.type==='walk'){ txt+=` ${Math.max(1,Math.round(((e.end||e.t)-e.t)/6e4))} 分钟 · ${fmtDist(e.dist||0)}`; meta=`${hm(e.t)}–${hm(e.end||e.t)}${e.place?` · 走到 ${esc(e.place)}`:''}`;
      if (e.path && e.path.length>=4) txt+=`<button class="tag pb" data-route="${e.id}" style="--fill:var(--grass)">看路线</button>`; }
    if (e.type==='poop'){ const st=e.status||'ok'; txt+=`<button class="tag pb ${st}" data-cycle="${e.id}" title="点一下换状态">${STOOL[st]}</button>`; }
    if (e.type==='meet' && e.friend) txt=`<b>遇到 ${esc(e.friend)}</b>`;
    if (e.onWalk) meta+=' · 遛狗途中';
    if (e.by && Cloud.members().length>=2) meta+=` · ${esc(e.by)}记的`;
    const extra=(e.type==='photo'&&e.photo?`<img class="thumb" src="${e.photo}" alt="打卡照片" data-photo="${e.id}">`:'')+(e.note?`<div class="note">${esc(e.note)}</div>`:'');
    h+=`<div class="row"><time>${hm(e.t)}</time><span class="rico pb" style="--c:var(--${T.color})">${icon(T.icon,`var(--${T.color})`)}</span><div class="rtxt">${txt}<small>${meta}</small>${extra}</div><button class="del" data-del="${e.id}" aria-label="删除这条">×</button></div>`;
  });
  if (evs.length>S.logLimit) h+=`<button class="more pb" id="more">显示更早的记录</button>`;
  h+='</div>';
  $('#logInner').innerHTML=h;
}
$('#logInner').addEventListener('click',e=>{
  const del=e.target.closest('[data-del]'), cyc=e.target.closest('[data-cycle]'), ph=e.target.closest('[data-photo]');
  if (e.target.id==='more'){ S.logLimit+=60; renderLog(); return; }
  if (e.target.closest('#openFp')){ enterFootprint(); return; }
  const rt=e.target.closest('[data-route]'); if (rt){ showRoute(rt.dataset.route); return; }
  if (ph){ openLightbox(ph.dataset.photo); return; }
  if (cyc){ const ev=S.events.find(x=>x.id===cyc.dataset.cycle); if (!ev) return; const i=STOOL_ORDER.indexOf(ev.status||'ok'); updateEvent(ev.id,{status:STOOL_ORDER[(i+1)%4]}); return; }
  if (del){
    if (del.classList.contains('armed')){ deleteEvent(del.dataset.del); return; }
    del.classList.add('armed'); del.textContent='删除';
    setTimeout(()=>{ if (del.isConnected){ del.classList.remove('armed'); del.textContent='×'; } },3000);
  }
});

/* ---------- dog page ---------- */
let formDirty=false;
function renderDogView(){
  const d=dogInfo();
  $('#bigAva').innerHTML = d.photo ? `<img src="${d.photo}" alt="狗狗照片">` : icon('dog','var(--clay)');
  const age=ageText(d.birthday);
  $('#ageBig').textContent = S.dog ? `${d.name}${age?` · ${age}`:''}${d.weight?` · ${d.weight} kg`:''}` : '';
  renderWeights(); Cloud.renderFamily();
  if (formDirty) return;
  const r=S.dog||{};
  $('#f-name').value=r.name||''; $('#f-breed').value=r.breed||''; $('#f-bday').value=r.birthday||'';
  $('#f-weight').value=r.weight??''; $('#f-worm').value=r.worm||''; $('#f-vax').value=r.vax||''; $('#f-goal').value=r.goal||'';
  $('#f-sex-f').checked=r.sex==='f'; $('#f-sex-m').checked=r.sex==='m';
}
function renderWeights(){
  const ws=((S.dog&&S.dog.weights)||[]).slice().sort((a,b)=>a.d<b.d?-1:1);
  let chart='';
  if (ws.length>=2){
    const Wd=320,Hd=120,pl=6,pr=6,pt=18,pb=22, t0=new Date(ws[0].d).getTime(), t1=new Date(ws[ws.length-1].d).getTime()||t0+1;
    const lo=Math.min(...ws.map(w=>w.kg)), hi=Math.max(...ws.map(w=>w.kg)), span=Math.max(.5,hi-lo);
    const X=w=>pl+(new Date(w.d).getTime()-t0)/Math.max(1,t1-t0)*(Wd-pl-pr), Y=w=>pt+(1-(w.kg-lo+span*.15)/(span*1.3))*(Hd-pt-pb);
    const path=ws.map((w,i)=>`${i?'L':'M'}${X(w).toFixed(1)} ${Y(w).toFixed(1)}`).join(' ');
    chart=`<div class="chart"><svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="体重变化"><g style="filter:url(#wobble)"><path d="${path} L${X(ws[ws.length-1]).toFixed(1)} ${Hd-pb} L${X(ws[0]).toFixed(1)} ${Hd-pb}Z" style="fill:url(#h-sky);opacity:.5"/><path d="${path}" style="fill:none;stroke:var(--sky);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/>${ws.map(w=>`<circle cx="${X(w).toFixed(1)}" cy="${Y(w).toFixed(1)}" r="3.2" style="fill:var(--paper);stroke:var(--graphite);stroke-width:1.3"/>`).join('')}<line x1="0" x2="${Wd}" y1="${Hd-pb}" y2="${Hd-pb}" style="stroke:var(--graphite);stroke-width:1.4;opacity:.55"/></g>
      <text x="${X(ws[ws.length-1]).toFixed(1)}" y="${(Y(ws[ws.length-1])-8).toFixed(1)}" text-anchor="end">${ws[ws.length-1].kg} kg</text><text class="lb" x="${pl}" y="${Hd-5}">${ws[0].d.slice(5)}</text><text class="lb" x="${Wd-pr}" y="${Hd-5}" text-anchor="end">${ws[ws.length-1].d.slice(5)}</text></svg></div>`;
  }
  $('#weightSec').innerHTML=`<h2 style="--hl:var(--sun)">体重记录</h2>${chart || `<p class="muted">${ws.length?`记了 1 次：${ws[0].d} · ${ws[0].kg} kg。再记一次就能看到曲线。`:'每次称完体重记一笔，这里会画出变化曲线。'}</p>`}
    <div class="wform"><div class="field"><label for="w-date">日期</label><input id="w-date" type="date" value="${dayKey(Date.now())}"></div><div class="field"><label for="w-kg">体重（kg）</label><input id="w-kg" type="number" step="0.1" min="0" inputmode="decimal" placeholder="10.5"></div><button class="btn small pb" id="w-add" style="--fill:var(--sun)">记一笔</button></div>`;
  $('#w-add').onclick=()=>{
    const kg=parseFloat($('#w-kg').value), dd=$('#w-date').value;
    if (!(kg>0) || !dd){ showToast('填上日期和体重'); return; }
    const base=Object.assign({name:'我的狗狗'}, S.dog||{});
    const list=(base.weights||[]).filter(w=>w.d!==dd).concat([{d:dd, kg:Math.round(kg*10)/10}]);
    const latest=list.slice().sort((a,b)=>a.d<b.d?-1:1).pop();
    saveDog(Object.assign(base,{weights:list, weight:latest.kg}));
    showToast(`记下了 ${dd} · ${Math.round(kg*10)/10} kg`);
  };
}
function renderNote(){ $('#storeNote').textContent='地图数据 © OpenStreetMap 贡献者 · 地名查询来自 OpenStreetMap Nominatim'; }
function renderAll(){ renderTop(); renderLog(); renderHealthBadge(); }

$('#dogForm').addEventListener('input',()=>{ formDirty=true; });
$('#dogForm').addEventListener('submit',e=>{
  e.preventDefault();
  const sex=document.querySelector('input[name="sex"]:checked'), w=parseFloat($('#f-weight').value);
  const d=Object.assign({}, S.dog||{}, {
    name:$('#f-name').value.trim()||(S.dog&&S.dog.name)||'狗狗', breed:$('#f-breed').value.trim(), birthday:$('#f-bday').value,
    weight:isNaN(w)?null:Math.round(w*10)/10, sex:sex?sex.value:'', worm:$('#f-worm').value, vax:$('#f-vax').value,
    goal:Math.max(5,Math.min(300,parseInt($('#f-goal').value,10)||40))
  });
  formDirty=false; saveDog(d); renderAll(); showToast('已保存');
});

function readImage(file, size, square, quality=.82){
  return new Promise((res,rej)=>{
    const rd=new FileReader();
    rd.onload=()=>{ const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas'), g=c.getContext('2d');
        if (square){ const m=Math.min(img.width,img.height); c.width=c.height=size; g.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,size,size); }
        else { const k=Math.min(1,size/Math.max(img.width,img.height)); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); g.drawImage(img,0,0,c.width,c.height); }
        res(c.toDataURL('image/jpeg',quality));
      };
      img.onerror=()=>rej(new Error('img')); img.src=rd.result; };
    rd.onerror=()=>rej(new Error('read')); rd.readAsDataURL(file);
  });
}
$('#photoIn').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if (!f) return;
  try{
    const url=await readImage(f,360,true);
    const name=$('#f-name').value.trim()||(S.dog&&S.dog.name)||'我的狗狗';
    saveDog(Object.assign({}, S.dog||{}, {name, photo:url}));
    showToast('照片换好了，地图上的头像也换了');
  }catch(_){ showToast('这张图片打不开，换一张试试'); }
});
$('#momentIn').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if (!f) return;
  // kept small so the photo fits in the shared diary
  try{ const url=await readImage(f,720,false,.7); const id=logEvent('photo',{photo:url}); if (id) openLightbox(id); }
  catch(_){ showToast('这张图片打不开，换一张试试'); }
});

/* lightbox */
let lbId=null;
function openLightbox(id){
  const e=S.events.find(x=>x.id===id); if (!e) return;
  lbId=id; $('#lbImg').src=e.photo||''; $('#lbNote').value=e.note||'';
  $('#lbMeta').textContent=`${dayLabel(dayKey(e.t))[0]} ${hm(e.t)}${e.place?` · ${e.place}`:''}`;
  $('#lbx').hidden=false; $('#lbDel').textContent='删除'; $('#lbDel').dataset.armed='';
}
function closeLightbox(){ $('#lbx').hidden=true; lbId=null; }
$('#lbClose').onclick=closeLightbox;
$('#lbx').addEventListener('click',e=>{ if (e.target.id==='lbx') closeLightbox(); });
$('#lbSave').onclick=()=>{ if (lbId) updateEvent(lbId,{note:$('#lbNote').value.trim()}); closeLightbox(); showToast('保存好了'); };
$('#lbDel').onclick=e=>{ const b=e.currentTarget; if (!b.dataset.armed){ b.dataset.armed='1'; b.textContent='确认删除'; return; } if (lbId) deleteEvent(lbId); closeLightbox(); };
document.addEventListener('keydown',e=>{ if (e.key==='Escape' && !$('#lbx').hidden) closeLightbox(); });

/* backup */
$('#exportBtn').addEventListener('click',()=>{
  const data={app:'pawdiary', version:1, exported:new Date().toISOString(), dog:S.dog, events:S.events, explored:[...S.explored]};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`爪印日记备份-${dayKey(Date.now())}.json`;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000);
  showToast('备份文件已生成，存到「文件」或网盘里');
});
$('#importIn').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if (!f) return;
  try{
    const j=JSON.parse(await f.text());
    if (j.app!=='pawdiary' || !Array.isArray(j.events)) throw new Error('bad');
    const have=new Set(S.events.map(x=>x.id)); let n=0;
    for (const ev of j.events){ if (ev && ev.id && !have.has(ev.id)){ S.events.push(ev); await DB.put(ev); n++; } }
    S.events.sort((a,b)=>b.t-a.t);
    if (j.dog && !S.dog){ S.dog=j.dog; await DB.set('dog',S.dog); }
    (j.explored||[]).forEach(k=>{ if (typeof k==='string') addExplored(k); }); await DB.set('explored2',[...S.explored]);
    renderAll(); renderMap(); renderDogView(); renderDogPin(); map.triggerRepaint();
    showToast(`恢复了 ${n} 条记录`);
  }catch(_){ showToast('这个文件不是爪印日记的备份'); }
});

/* ---------- walk weather (Open-Meteo, no key) ---------- */
const WX = {data:null, at:0, where:null, open:false, busy:false};
const WX_TEXT = c => c===0?'晴':c<=2?'晴间多云':c===3?'阴':c<=48?'有雾':c<=57?'毛毛雨':c<=67?'下雨':c<=77?'下雪':c<=82?'阵雨':c<=86?'阵雪':'雷雨';
const isWet = c => (c>=51 && c<=67) || (c>=80 && c<=82);
function wxAdvice(d){
  const c=d.current, t=c.temperature_2m, code=c.weather_code;
  const h=d.hourly, rain2=Math.max(...(h.precipitation_probability||[0]).slice(0,3).map(v=>v||0));
  const uv=(h.uv_index||[0])[0]||0;
  if (code>=95) return {lvl:'bad', tip:'有雷雨，先别出门'};
  if (t>=32) return {lvl:'bad', tip:'太热了，地面会烫爪子，等傍晚凉下来再遛'};
  if (t>=27) return {lvl:'warn', tip:'地面可能烫脚。用手背贴地面 5 秒，烫手就别走柏油路，挑树荫和草地'};
  if (isWet(code)) return {lvl:'warn', tip:'在下雨，短遛一圈，回来擦干爪子'};
  if (rain2>=70) return {lvl:'warn', tip:`接下来两小时 ${rain2}% 会下雨，抓紧时间或者带毛巾`};
  if (t<=2) return {lvl:'warn', tip:'很冷，短毛狗和小型犬穿件衣服'};
  if (uv>=8 && c.is_day) return {lvl:'warn', tip:'紫外线很强，避开正午，多走阴凉处'};
  return {lvl:'good', tip:'很适合遛狗'};
}
function wxBestHour(d){
  const h=d.hourly, now=Date.now(); let best=null;
  for (let i=0;i<Math.min(15,h.time.length);i++){
    const ts=new Date(h.time[i]).getTime(); if (ts<now-36e5) continue;
    const t=h.temperature_2m[i], p=(h.precipitation_probability||[])[i]||0, uv=(h.uv_index||[])[i]||0, hr=new Date(h.time[i]).getHours();
    let s=0; if (t>24) s+=(t-24)*3; if (t<8) s+=(8-t)*2; s+=p*.25; if (uv>6) s+=(uv-6)*3; if ((h.weather_code||[])[i]>=95) s+=60;
    if (hr<6 || hr>=22) s+=12;
    if (!best || s<best.s) best={s, hr, t, i};
  }
  return best;
}
async function loadWeather(force){
  const f=S.gps||S.last; if (!f || WX.busy) return;
  const moved = WX.where ? haversine(WX.where[0],WX.where[1],f.lng,f.lat) : 1e9;
  if (!force && WX.data && Date.now()-WX.at<30*6e4 && moved<3000) return;
  WX.busy=true;
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${f.lat.toFixed(3)}&longitude=${f.lng.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,is_day&hourly=temperature_2m,precipitation_probability,weather_code,uv_index&forecast_hours=15&timezone=auto`;
    const r=await fetch(u); if (!r.ok) throw new Error('wx');
    const d=await r.json(); if (!d.current || !d.hourly) throw new Error('wx');
    // hourly times come back in the location's local time without an offset; shift them to real instants
    const off=(d.utc_offset_seconds||0)*1000;
    d.hourly.time=d.hourly.time.map(s=>new Date(Date.parse(s+'Z')-off).toISOString());
    WX.data=d; WX.at=Date.now(); WX.where=[f.lng,f.lat];
    renderWeather();
  }catch(_){ /* weather is a nice-to-have; stay quiet */ }
  finally{ WX.busy=false; }
}
function renderWeather(){
  const el=$('#wx'), d=WX.data; if (!d){ el.hidden=true; return; }
  const c=d.current, a=wxAdvice(d), best=wxBestHour(d);
  const rain2=Math.max(...(d.hourly.precipitation_probability||[0]).slice(0,3).map(v=>v||0)), uv=Math.round((d.hourly.uv_index||[0])[0]||0);
  el.dataset.lvl=a.lvl; el.hidden=false;
  const ic = isWet(c.weather_code)||c.weather_code>=95 ? 'pee' : c.weather_code>=3 ? 'cloud' : c.is_day ? 'sun' : 'moon';
  el.innerHTML=`<span class="wxrow">${icon(ic, ic==='sun'?'var(--sun)':ic==='pee'?'var(--sky)':'none')}<span class="wxt">${Math.round(c.temperature_2m)}°</span><span>${WX_TEXT(c.weather_code)} · ${a.lvl==='good'?'很适合遛狗':a.lvl==='bad'?'先别出门':'留意一下'}</span></span>`+
    (WX.open?`<span class="wxmore">${a.tip}<br>体感 ${Math.round(c.apparent_temperature)}° · 两小时内降雨 ${rain2}% · 紫外线 ${uv}${best && a.lvl!=='good'?`<br>今天最佳遛狗时间：<b>${best.hr}:00</b> 左右，${Math.round(best.t)}°`:''}</span>`:'');
}
$('#wx').addEventListener('click',()=>{ WX.open=!WX.open; renderWeather(); });

/* ---------- daily goal, streaks, sticker book ---------- */
const goalMin = () => Math.max(5, Math.min(300, +(S.dog&&S.dog.goal) || 40));
function walkMinutesByDay(){
  const m={}; S.events.forEach(e=>{ if (e.type==='walk'){ const k=dayKey(e.t); m[k]=(m[k]||0)+Math.max(0,((e.end||e.t)-e.t)/6e4); } });
  return m;
}
function streaks(){
  const m=walkMinutesByDay(), g=goalMin(), met=k=>(m[k]||0)>=g;
  let cur=0, t=Date.now();
  if (!met(dayKey(t))) t-=864e5;            // today isn't over yet: count from yesterday
  while (met(dayKey(t))){ cur++; t-=864e5; }
  let best=0, run=0; const keys=Object.keys(m).sort();
  if (keys.length){
    for (let d=new Date(keys[0]+'T12:00').getTime(); d<=Date.now(); d+=864e5){ if (met(dayKey(d))){ run++; best=Math.max(best,run); } else run=0; }
  }
  return {cur, best:Math.max(best,cur), today:m[dayKey(Date.now())]||0, goal:g};
}
const STICKERS = [
  {id:'first', name:'第一步', desc:'完成第一次遛狗', ic:'paw', c:'grass', ok:x=>x.walks>=1},
  {id:'early', name:'早起鸟', desc:'早上 7 点前出门遛狗', ic:'sun', c:'sun', ok:x=>x.early},
  {id:'night', name:'夜游神', desc:'晚上 9 点后出门遛狗', ic:'moon', c:'sky', ok:x=>x.night},
  {id:'long3', name:'长途旅行', desc:'一次走满 3 公里', ic:'map', c:'clay', ok:x=>x.maxKm>=3},
  {id:'km10', name:'十公里', desc:'累计遛狗 10 公里', ic:'paw', c:'clay', ok:x=>x.km>=10},
  {id:'km100', name:'百公里', desc:'累计遛狗 100 公里', ic:'star', c:'sun', ok:x=>x.km>=100},
  {id:'streak7', name:'一周不落', desc:'连续 7 天达成遛狗目标', ic:'star', c:'rose', ok:x=>x.best>=7},
  {id:'explorer', name:'探险家', desc:'足迹里走过 10 公里新路', ic:'locate', c:'grass', ok:x=>x.newKm>=10},
  {id:'places', name:'到处逛逛', desc:'在 10 个不同的地方留下记录', ic:'map', c:'sky', ok:x=>x.places>=10},
  {id:'social', name:'社交达人', desc:'在路上遇到狗友 5 次', ic:'heart', c:'rose', ok:x=>x.meets>=5},
  {id:'photo', name:'摄影师', desc:'拍 10 张打卡照片', ic:'camera', c:'sky', ok:x=>x.photos>=10},
  {id:'poop50', name:'便便侦探', desc:'记录 50 次便便', ic:'poop', c:'poop', ok:x=>x.poops>=50}
];
function stickerCtx(){
  const walks=S.events.filter(e=>e.type==='walk'), hrs=walks.map(e=>new Date(e.t).getHours());
  const places=new Set(S.events.filter(e=>e.place).map(e=>e.place.split(' · ')[0]));
  return {walks:walks.length, early:hrs.some(h=>h>=4&&h<7), night:hrs.some(h=>h>=21||h<3),
    km:walks.reduce((s,e)=>s+(e.dist||0),0)/1000, maxKm:Math.max(0,...walks.map(e=>(e.dist||0)/1000)),
    best:streaks().best, newKm:litKm(), places:places.size,
    meets:S.events.filter(e=>e.type==='meet').length, photos:S.events.filter(e=>e.type==='photo').length,
    poops:S.events.filter(e=>e.type==='poop').length};
}
let stickerTimer=null;
function checkStickers(){
  const x=stickerCtx(), have=STICKERS.filter(s=>s.ok(x)).map(s=>s.id);
  const known=lsGet('pawdiary.stickers',null);
  lsSet('pawdiary.stickers', have);
  if (!known) return; // first run: don't celebrate badges earned before this feature existed
  const fresh=STICKERS.filter(s=>have.includes(s.id) && !known.includes(s.id));
  if (!fresh.length) return;
  clearTimeout(stickerTimer);
  stickerTimer=setTimeout(()=>{ showToast(`解锁贴纸：<b>${fresh.map(s=>s.name).join('、')}</b><br><span style="font-size:13px">在「日记」页的贴纸册里</span>`, 5000); if (navigator.vibrate) try{ navigator.vibrate([15,40,15]); }catch(_){} }, 4300);
}
function goalRing(min, goal){
  const r=30, C2=2*Math.PI*r, k=Math.min(1,min/goal);
  return `<svg class="ring" viewBox="0 0 76 76" aria-hidden="true"><g style="filter:url(#wobble)"><circle cx="38" cy="38" r="${r}" style="fill:none;stroke:var(--paper-2);stroke-width:9"/><circle cx="38" cy="38" r="${r}" style="fill:none;stroke:url(#h-grass);stroke-width:9;stroke-linecap:round;stroke-dasharray:${(C2*k).toFixed(1)} ${C2.toFixed(1)};transform:rotate(-90deg);transform-origin:38px 38px"/><circle cx="38" cy="38" r="${r}" style="fill:none;stroke:var(--graphite);stroke-width:1;opacity:.35"/></g><text x="38" y="42" text-anchor="middle">${Math.round(k*100)}%</text></svg>`;
}

/* ---------- health alerts ---------- */
function healthAlerts(){
  const out=[], now=Date.now(), d=S.dog||{};
  const loose=S.events.filter(e=>e.type==='poop' && e.status==='loose' && e.t>now-864e5).length;
  if (loose>=2) out.push({lvl:'bad', text:`24 小时内拉稀 ${loose} 次。留意精神、食欲和喝水；持续超过一天、带血或者呕吐，尽快看兽医。`});
  const poops=S.events.filter(e=>e.type==='poop');
  if (poops.length>=5 && now-poops[0].t>48*36e5) out.push({lvl:'warn', text:`已经 ${fmtSince(now-poops[0].t)}没记到便便了。是忘了记，还是真的没拉？没拉的话留意一下。`});
  [['worm','驱虫'],['vax','打疫苗']].forEach(([k,n])=>{ if (!d[k]) return; const dd=daysUntil(d[k]);
    if (dd<0) out.push({lvl:'warn', text:`${n}已经过期 ${-dd} 天了，记得安排，做完在「狗狗」页更新下次日期。`});
    else if (dd<=3) out.push({lvl:'info', text:dd===0?`今天该${n}了。`:`${dd} 天后该${n}了。`}); });
  return out;
}
function renderHealthBadge(){ $('#logBadge').hidden=!healthAlerts().some(a=>a.lvl!=='info'); }

/* ---------- walk replay ---------- */
function showRoute(id){
  const e=S.events.find(x=>x.id===id); if (!e || !e.path || e.path.length<4) { showToast('这次遛狗没有记到路线'); return; }
  const c=[]; for (let i=0;i<e.path.length;i+=2) c.push([e.path[i],e.path[i+1]]);
  setView('map'); S.follow=false; renderFollow();
  const go=()=>{
    if (!map.getSource('focus')) return setTimeout(go,200);
    map.getSource('focus').setData({type:'Feature',geometry:{type:'LineString',coordinates:c},properties:{}});
    let a=180,b=90,cc=-180,dd=-90; c.forEach(([x,y])=>{ a=Math.min(a,x); b=Math.min(b,y); cc=Math.max(cc,x); dd=Math.max(dd,y); });
    map.fitBounds([[a,b],[cc,dd]],{padding:{top:150,bottom:230,left:50,right:50}, maxZoom:17, duration:REDUCED?0:900});
  };
  go();
  const mins=Math.max(1,Math.round(((e.end||e.t)-e.t)/6e4)), [day]=dayLabel(dayKey(e.t));
  const el=$('#info');
  el.innerHTML=`${icon('paw','var(--rose)')}<div><b>${day} ${hm(e.t)} 的遛狗</b><br>${mins} 分钟 · ${fmtDist(e.dist||0)}${e.dist>50?` · ${Math.round(mins/(e.dist/1000))} 分钟/公里`:''}${e.place?`<br>走到 ${esc(e.place)}`:''}</div><button class="x" aria-label="关闭">×</button>`;
  el.querySelector('.x').onclick=()=>{ hideInfo(); clearRoute(); };
  el.hidden=false;
}
function clearRoute(){ const s=map.getSource('focus'); if (s) s.setData(EMPTY); }

/* ---------- 云端：家庭、谁带着狗狗、共享日记、狗友 ---------- */
const Cloud = (() => {
  const ROLES=['爸爸','妈妈','哥哥','姐姐','外公','外婆','爷爷','奶奶'];
  const st = {
    member: lsGet('pawdiary.member', null),          // {id, token, dogId, role}
    dog: lsGet('pawdiary.cloudDog', null),           // the family view of the dog (no photo)
    outbox: [], cellsOut: [], dogPending: false,
    evCursor: lsGet('pawdiary.evCursor', 0), cellCursor: lsGet('pawdiary.cellCursor', 0),
    friends: [], myWeek: 0, share: lsGet('pawdiary.share', true),
    timer: null, busy: false, walkEnded: null, markers: new Map(), seenWalking: new Set(),
    askedThisOpen: false, hiddenAt: 0, lastErr: null, pendingFriend: null, setupMode: null
  };
  const me = () => st.member;
  const dogName = () => (S.dog && S.dog.name) || (st.dog && st.dog.name) || '狗狗';
  const members = () => (st.dog && st.dog.members) || [];
  const isHolder = () => !st.member || !st.dog || members().length < 2 || st.dog.holder === st.member.id;
  const roleOf = id => (members().find(m => m.id === id) || {}).role || '家人';
  const holderRole = () => st.dog ? roleOf(st.dog.holder) : '';
  const other = () => members().find(m => !st.member || m.id !== st.member.id);
  const friendName = f => f ? (f.dog || '狗友') : '狗友';
  const avatarUrl = f => f.hasAvatar ? `/api/avatar/${f.id}?v=${f.pv}` : '';

  async function api(path, data, method){
    const headers = {'content-type': 'application/json'};
    if (st.member){ headers['x-paw-id'] = st.member.id; headers['x-paw-token'] = st.member.token; }
    const res = await fetch(path, method === 'GET' ? {headers, cache: 'no-store'} : {method: 'POST', headers, body: JSON.stringify(data || {})});
    let j = {}; try { j = await res.json(); } catch (_){}
    if (!res.ok){ const e = new Error(j.error || 'http'); e.status = res.status; e.code = j.error; throw e; }
    return j;
  }
  function thumb(dataUrl, size, q){
    return new Promise(res => {
      if (!dataUrl) return res(null);
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const m = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size); res(c.toDataURL('image/jpeg', q)); };
      img.onerror = () => res(null); img.src = dataUrl;
    });
  }
  const profileOf = d => ({breed: d.breed || '', birthday: d.birthday || '', sex: d.sex || '', weight: d.weight ?? null,
    goal: d.goal || 40, worm: d.worm || '', vax: d.vax || '', weights: d.weights || []});

  /* ---- local queue of changes waiting for the server ---- */
  function persistQueue(){ DB.set('outbox', st.outbox).catch(() => {}); DB.set('cellsOut', st.cellsOut).catch(() => {}); }
  function queueEvent(full){
    if (!st.member) return;
    const {id, by, ...data} = full;
    st.outbox = st.outbox.filter(x => x.id !== id).concat([{id, t: full.t, data, v: Date.now() + Math.random()}]);
    persistQueue(); syncSoon(900);
  }
  function queueDelete(id, t){
    if (!st.member) return;
    st.outbox = st.outbox.filter(x => x.id !== id).concat([{id, t: t || Date.now(), deleted: true, v: Date.now() + Math.random()}]);
    persistQueue(); syncSoon(900);
  }
  function queueCells(keys){ if (!st.member || !keys.length) return; st.cellsOut.push(...keys); persistQueue(); }

  /* ---- the dog's profile ---- */
  async function pushDog(d, prev){
    if (!st.member) return;
    const payload = {profile: profileOf(d)};
    if (!prev || prev.name !== d.name) payload.name = d.name;
    if (!prev || prev.photo !== d.photo){ payload.photo = d.photo || null; payload.avatar = await thumb(d.photo, 112, .72); }
    try {
      const r = await api('/api/dog/update', payload);
      if (st.dog){ st.dog.pv = r.pv || st.dog.pv; if (payload.name) st.dog.name = d.name; lsSet('pawdiary.cloudDog', st.dog); }
      st.dogPending = false;
    } catch (e){
      if (e.code === 'name_taken'){
        S.dog = Object.assign({}, S.dog, {name: prev ? prev.name : st.dog && st.dog.name});
        DB.set('dog', S.dog).catch(() => {}); renderTop(); renderDogPin(); renderDogView();
        showToast(`「${esc(d.name)}」这个名字已经有别的狗狗用了，换一个吧`, 4000);
      } else { st.dogPending = true; }
    }
  }
  function applyDog(dd){
    const prevHolder = st.dog && st.dog.holder, wasHolder = isHolder(), prevCount = members().length;
    const photo = dd.photo; delete dd.photo;
    st.dog = dd; lsSet('pawdiary.cloudDog', st.dog);
    if (!formDirty && !st.dogPending){
      S.dog = Object.assign({}, S.dog || {}, dd.profile, {name: dd.name});
      if (photo !== undefined) S.dog.photo = photo || '';
      DB.set('dog', S.dog).catch(() => {});
      renderTop(); renderDogPin(); renderDogView();
    }
    if (prevCount && members().length > prevCount) showToast(`<b>${esc(dogName())}${esc(roleOf(other() && other().id))}</b> 加入了，现在两个人一起照顾${esc(dogName())}`, 5000);
    if (prevHolder && prevHolder !== dd.holder){
      if (wasHolder && !isHolder()){
        if (S.walk) endWalk();
        showToast(`${esc(dogName())}现在跟<b>${esc(dogName())}${esc(holderRole())}</b>在一起了。这台手机先只看不记。`, 5000);
      }
    }
    renderAway();
  }

  /* ---- incoming shared diary + footprints ---- */
  async function applyEvents(list){
    if (!list.length) return;
    const pending = new Set(st.outbox.map(x => x.id));
    let changed = false;
    for (const e of list){
      if (pending.has(e.id)) continue;
      const idx = S.events.findIndex(x => x.id === e.id);
      if (e.deleted){
        if (idx >= 0){ S.events.splice(idx, 1); changed = true; DB.del(e.id).catch(() => {}); }
        continue;
      }
      const full = Object.assign({}, e.data, {id: e.id, t: e.t, by: e.by});
      if (idx >= 0) S.events[idx] = full; else S.events.push(full);
      DB.put(full).catch(() => {}); changed = true;
    }
    if (changed){ S.events.sort((a, b) => b.t - a.t); renderAll(); renderMap(); }
  }
  function applyCells(keys){
    let n = 0; keys.forEach(k => { if (addExplored(k)) n++; });
    if (n){ saveExploredSoon(); map.triggerRepaint(); if (S.fog) renderFootprintCard(); }
  }

  /* ---- the periodic sync ---- */
  function interval(){ return (S.walk || !isHolder() || st.friends.some(f => f.walking)) ? 5000 : 20000; }
  function schedule(ms){ clearTimeout(st.timer); st.timer = setTimeout(sync, ms ?? interval()); }
  function syncSoon(ms){ if (st.member) schedule(ms ?? 300); }
  async function sync(){
    if (!st.member || st.busy) return schedule();
    if (document.hidden) return;
    st.busy = true;
    try {
      const holding = isHolder(), f = currentFix();
      const sentOut = st.outbox.slice(0, 40), sentCells = st.cellsOut.slice(0, 2000);
      const payload = {evCursor: st.evCursor, cellCursor: st.cellCursor, pv: st.dog ? st.dog.pv : 0, outbox: sentOut, cells: sentCells,
        share: st.share, week: isoWeek(Date.now())};
      if (holding && S.gps && Date.now() - S.gps.t < 2 * 6e4) payload.pos = {lat: +S.gps.lat.toFixed(6), lng: +S.gps.lng.toFixed(6), acc: Math.round(S.gps.acc)};
      if (holding && S.walk && f && st.share) payload.walk = {lat: +f.lat.toFixed(6), lng: +f.lng.toFixed(6), start: S.walk.start, dist: Math.round(S.walk.dist)};
      if (st.walkEnded != null) payload.walkEnded = {dist: st.walkEnded};
      if (st.dogPending && S.dog) pushDog(S.dog, null);
      const r = await api('/api/sync', payload);
      // drop what the server took, unless it was edited again meanwhile
      const took = new Set(r.accepted || []);
      st.outbox = st.outbox.filter(x => !(took.has(x.id) && sentOut.some(s => s.id === x.id && s.v === x.v)));
      st.cellsOut = st.cellsOut.slice(sentCells.length);
      persistQueue();
      if (payload.walkEnded) st.walkEnded = null;
      st.lastErr = null;
      applyDog(r.dog);
      await applyEvents(r.events || []);
      st.evCursor = r.evCursor || st.evCursor; lsSet('pawdiary.evCursor', st.evCursor);
      applyCells(r.cells || []); st.cellCursor = r.cellCursor || st.cellCursor; lsSet('pawdiary.cellCursor', st.cellCursor);
      st.friends = r.friends || []; st.myWeek = r.myWeek || 0;
      (r.meets || []).forEach(onMeet);
      (r.pokes || []).forEach(onPoke);
      renderFriendPins(); renderLiveChip(); if (S.view === 'friends') renderPage(); if (S.view === 'dog') renderFamily();
      const walkingNow = st.friends.filter(x => x.walking), newly = walkingNow.filter(x => !st.seenWalking.has(x.id));
      st.seenWalking = new Set(walkingNow.map(x => x.id));
      if (newly.length && S.view !== 'friends') $('#friendBadge').hidden = false;
      maybeAsk();
      st.busy = false;
      schedule(r.more || st.outbox.length || st.cellsOut.length ? 400 : undefined);
    } catch (e){
      st.lastErr = e; st.busy = false;
      if (e.status === 401){ clearTimeout(st.timer); removedFromFamily(); return; }
      schedule();
    }
  }

  /* ---- "年糕跟你在一起吗？" ---- */
  function maybeAsk(){
    if (st.askedThisOpen || members().length < 2 || !$('#setup').hidden || !$('#recoverBox').hidden) return;
    st.askedThisOpen = true;
    const box = $('#holdAsk'), d = S.dog || {};
    box.querySelector('.ava').innerHTML = d.photo ? `<img src="${d.photo}" alt="">` : icon('dog', 'var(--clay)');
    box.querySelector('h2').textContent = `${dogName()}跟你在一起吗？`;
    box.querySelector('p').textContent = isHolder()
      ? `上次是你带着${dogName()}。两台手机同时记录，${dogName()}会出现在两个地方。`
      : `现在${dogName()}跟${dogName()}${holderRole()}在一起。两台手机同时记录，${dogName()}会出现在两个地方。`;
    box.hidden = false;
  }
  $('#holdYes').addEventListener('click', async () => {
    $('#holdAsk').hidden = true;
    try { const r = await api('/api/dog/hold'); st.dog.holder = r.holder; lsSet('pawdiary.cloudDog', st.dog); renderAway();
      const f = S.gps || S.last; if (f){ dogMarker.setLngLat([f.lng, f.lat]); if (!dogOnMap){ dogMarker.addTo(map); dogOnMap = true; } map.easeTo({center: [f.lng, f.lat]}); }
      showToast(`好，${esc(dogName())}跟你在一起，这台手机来记录`); syncSoon(); }
    catch (_){ showToast('没连上服务器，稍后再试'); st.askedThisOpen = false; }
  });
  $('#holdNo').addEventListener('click', async () => {
    $('#holdAsk').hidden = true;
    if (isHolder() && members().length >= 2){
      try { const r = await api('/api/dog/release'); st.dog.holder = r.holder; lsSet('pawdiary.cloudDog', st.dog); } catch (_){}
    }
    if (S.walk) endWalk();
    renderAway(); syncSoon();
  });

  /* ---- when the dog is with the other person ---- */
  function dogPos(){ return !isHolder() && st.dog && st.dog.holderPos ? st.dog.holderPos : null; }
  function renderAway(){
    const away = !isHolder(), card = $('#awayCard');
    $('#v-map').classList.toggle('away', away);
    card.hidden = !away;
    if (away){
      const p = st.dog.holderPos, ago = p ? Math.round((Date.now() - p.at) / 6e4) : null;
      card.innerHTML = `<div><b>${esc(dogName())}现在跟${esc(dogName())}${esc(holderRole())}在一起</b><br><span class="muted">${p ? (ago < 1 ? '位置刚刚更新' : `位置 ${fmtSince(Date.now() - p.at)}前更新`) : '还没收到位置'} · 这台手机只看不记</span></div><button class="btn small pb" id="takeDog" style="--fill:var(--rose)">${esc(dogName())}在我身边了</button>`;
      $('#takeDog').onclick = () => $('#holdYes').click();
      if (p){ dogMarker.setLngLat([p.lng, p.lat]); if (!dogOnMap){ dogMarker.addTo(map); dogOnMap = true; }
        if (S.follow && S.view === 'map') map.easeTo({center: [p.lng, p.lat], duration: REDUCED ? 0 : 600}); }
    }
    renderDogPin(); renderTop();
  }
  function showAway(flash){
    renderAway();
    if (flash){ showToast(`${esc(dogName())}现在跟${esc(dogName())}${esc(holderRole())}在一起，由那台手机记录。${esc(dogName())}到你身边了，点「${esc(dogName())}在我身边了」。`, 5000);
      const c = $('#awayCard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  }

  /* ---- friends: meets, pokes, pins ---- */
  function onMeet(en){
    const f = st.friends.find(x => x.id === en.friend), name = friendName(f);
    if (isHolder()){
      const ev = {type: 'meet', t: en.t, friend: name, friendId: en.friend, lng: +(+en.lng).toFixed(6), lat: +(+en.lat).toFixed(6)};
      if (S.walk) ev.onWalk = true;
      if (!S.events.some(e => e.type === 'meet' && e.friendId === en.friend && Math.abs(e.t - en.t) < 6e4)){ const id = addEvent(ev); fillPlace(id, ev.lng, ev.lat); }
    }
    showToast(`<b>${esc(dogName())}</b> 遇到了 <b>${esc(name)}</b>！${f && f.together > 1 ? `<br><span style="font-size:13px">你们一起遛过 ${f.together} 次</span>` : ''}`, 6000);
    if (navigator.vibrate) try { navigator.vibrate([30, 60, 30]); } catch (_){}
  }
  function onPoke(p){
    const f = st.friends.find(x => x.id === p.from);
    showToast(`<b>${esc(friendName(f))}${p.role ? `（${esc(p.role)}）` : ''}</b> 碰了碰 ${esc(dogName())} 的爪子`, 4500);
    if (navigator.vibrate) try { navigator.vibrate(20); } catch (_){}
  }
  function walkLabel(w){ return `遛狗中 · ${Math.max(1, Math.round((Date.now() - w.start) / 6e4))} 分钟`; }
  function renderFriendPins(){
    const want = new Set();
    st.friends.forEach(f => {
      if (!f.walking) return; want.add(f.id);
      let m = st.markers.get(f.id);
      if (!m){
        const el = document.createElement('div'); el.className = 'dogpin friend';
        el.innerHTML = '<div class="pulse"></div><div class="shadow"></div><div class="body"><div class="nm"></div><div class="ring pb"></div><div class="tail"></div></div>';
        el.addEventListener('click', ev => { ev.stopPropagation(); showFriendCard(f.id); });
        m = new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([f.walking.lng, f.walking.lat]).addTo(map);
        st.markers.set(f.id, m);
      }
      m.setLngLat([f.walking.lng, f.walking.lat]);
      const el = m.getElement(); el.querySelector('.nm').textContent = friendName(f);
      const ring = el.querySelector('.ring'), url = avatarUrl(f);
      if (ring.dataset.src !== url){ ring.dataset.src = url; ring.innerHTML = url ? `<img src="${url}" alt="">` : `<div class="face">${icon('dog', 'var(--sky)')}</div>`; }
    });
    for (const [id, m] of st.markers){ if (!want.has(id)){ m.remove(); st.markers.delete(id); } }
  }
  function distTo(f){
    const p = S.gps || S.last; if (!p || !f.walking) return '';
    const d = haversine(p.lng, p.lat, f.walking.lng, f.walking.lat);
    return d < 1000 ? `离你 ${Math.round(d)} 米` : `离你 ${(d / 1000).toFixed(1)} 公里`;
  }
  function showFriendCard(id){
    const f = st.friends.find(x => x.id === id); if (!f) return;
    const el = $('#info');
    el.innerHTML = `<span class="fava pb on">${f.hasAvatar ? `<img src="${avatarUrl(f)}" alt="">` : icon('dog', 'var(--sky)')}</span><div><b>${esc(friendName(f))}</b><br>${f.walking ? walkLabel(f.walking) : '没在遛狗'}${f.walking ? ` · ${distTo(f)}` : ''}${f.together ? `<br>一起遛过 ${f.together} 次` : ''}<div class="row2"><button class="btn small pb" data-poke="${f.id}" style="--fill:var(--rose)">碰爪</button></div></div><button class="x" aria-label="关闭">×</button>`;
    el.querySelector('.x').onclick = hideInfo;
    el.querySelector('[data-poke]').onclick = () => poke(f.id);
    el.hidden = false;
  }
  function renderLiveChip(){
    const el = $('#liveChip'), w = st.friends.filter(f => f.walking);
    el.hidden = !w.length || S.fog; if (!w.length) return;
    el.innerHTML = `${icon('paw', 'var(--sky)')}${w.length === 1 ? `${esc(friendName(w[0]))} 正在遛狗` : `${w.length} 位狗友正在遛狗`}`;
  }
  $('#liveChip').addEventListener('click', () => {
    const w = st.friends.filter(f => f.walking); if (!w.length) return;
    S.follow = false; renderFollow();
    if (w.length === 1){ map.easeTo({center: [w[0].walking.lng, w[0].walking.lat], zoom: Math.max(map.getZoom(), 15.5)}); showFriendCard(w[0].id); return; }
    const pts = w.map(f => [f.walking.lng, f.walking.lat]); const p = S.gps || S.last; if (p) pts.push([p.lng, p.lat]);
    let a = 180, b = 90, c = -180, d = -90; pts.forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); });
    map.fitBounds([[a, b], [c, d]], {padding: {top: 120, bottom: 220, left: 60, right: 60}, maxZoom: 16});
  });
  async function poke(id){
    try { await api('/api/poke', {to: id}); showToast(`碰了碰 <b>${esc(friendName(st.friends.find(x => x.id === id)))}</b> 的爪子`); }
    catch (e){ showToast(e.status === 429 ? '碰得太快啦，歇一会儿' : '没碰到，检查一下网络'); }
  }
  async function copyText(t){ try { await navigator.clipboard.writeText(t); showToast('已复制'); } catch (_){ showToast('复制不了，长按文字手动复制'); } }
  async function shareLink(url, text){
    if (navigator.share){ try { await navigator.share({title: '爪印日记', text, url}); } catch (_){} return; }
    copyText(`${text} ${url}`);
  }

  /* ---- 狗友 page ---- */
  function lastWalkText(f){ return f.lastWalk ? `上次遛狗 ${fmtSince(Date.now() - f.lastWalk)}前${f.lastWalkDist ? ` · ${fmtDist(f.lastWalkDist)}` : ''}` : '还没遛过'; }
  function renderPage(){
    const box = $('#friendsInner');
    if (!st.member || !st.dog){ box.innerHTML = `<div class="sec"><h2 style="--hl:var(--rose)">狗友</h2><p class="muted">正在连接…</p></div>`; return; }
    const fr = st.friends.slice().sort((a, b) => (b.walking ? 1 : 0) - (a.walking ? 1 : 0) || (b.lastWalk || 0) - (a.lastWalk || 0));
    const code = st.dog.code;
    box.innerHTML = `
      <div class="sec"><h2 style="--hl:var(--rose)">${esc(dogName())}的狗友码</h2>
        <div class="codecard pb"><span class="code">${esc(code)}</span>
          <span class="muted">把码或邀请链接发给别的狗狗的主人。加上之后两只狗狗互为狗友，你们家两个人都能看到。</span>
          <div class="btnrow" style="margin-top:0"><button class="btn small pb" id="shareInvite" style="--fill:var(--rose)">发邀请链接</button><button class="btn small pb" id="copyCode" style="--fill:var(--paper-2)">复制狗友码</button><button class="btn small pb" id="resetCode" style="--fill:var(--paper-2)">换一个码</button></div>
        </div>
        <div class="addrow"><div class="field"><label for="addCode">输入别的狗狗的狗友码</label><input id="addCode" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="比如 K7QH2M"></div><button class="btn small pb" id="addBtn" style="--fill:var(--grass)">加狗友</button></div>
      </div>
      <div class="sec"><h2 style="--hl:var(--sky)">狗友 ${fr.length ? `<span class="muted">${fr.length}</span>` : ''}</h2>
        ${fr.length ? fr.map(f => `<div class="frow"><span class="fava pb ${f.walking ? 'on' : ''}">${f.hasAvatar ? `<img src="${avatarUrl(f)}" alt="">` : icon('dog', 'var(--sky)')}</span>
          <div class="ftxt"><b>${esc(friendName(f))}</b>
            ${f.walking ? `<span class="wk">${walkLabel(f.walking)}${distTo(f) ? ` · ${distTo(f)}` : ''}</span>` : `<small>${lastWalkText(f)}</small>`}
            <small>${f.together ? `一起遛过 ${f.together} 次` : '还没在路上遇到过'}</small></div>
          <div class="fbtns">${f.walking ? `<button class="btn pb" data-see="${f.id}" style="--fill:var(--sky)">看看</button>` : ''}<button class="btn pb" data-poke="${f.id}" style="--fill:var(--rose)">碰爪</button><button class="del" data-unfriend="${f.id}" aria-label="删除狗友">×</button></div></div>`).join('')
        : `<p class="muted">还没有狗友。把上面的邀请链接发给一起遛狗的朋友吧。</p>`}
      </div>
      ${fr.length ? (() => { const rows = [{me: true, name: dogName(), d: st.myWeek || 0}].concat(fr.map(f => ({name: friendName(f), d: f.weekDist || 0}))).sort((a, b) => b.d - a.d); const max = Math.max(1, ...rows.map(r => r.d));
        return `<div class="sec"><h2 style="--hl:var(--sun)">本周遛狗排行</h2><div class="rank">${rows.map((r, i) => `<div class="rrow ${r.me ? 'me' : ''}"><span class="rn">${i + 1}</span><span class="rname">${esc(r.name)}</span><span class="rbar"><i style="width:${(r.d / max * 100).toFixed(1)}%"></i></span><span class="rkm">${(r.d / 1000).toFixed(1)} km</span></div>`).join('')}</div><p class="muted" style="margin-top:8px">每周一重新开始，结束遛狗时计入。</p></div>`; })() : ''}
      <div class="sec"><h2 style="--hl:var(--grass)">位置分享</h2>
        <label class="switch" for="shareToggle"><span>遛狗时让狗友看到${esc(dogName())}在哪<br><span class="muted">只在点了「开始遛狗」之后分享，结束就停。只有加了的狗友看得到。</span></span><input type="checkbox" id="shareToggle" ${st.share ? 'checked' : ''}></label>
        <p class="muted" style="margin-top:10px">两只狗友同时在遛狗、走到 45 米以内，就算「相遇」，会自动记进双方的日记。</p>
      </div>
      ${st.lastErr ? `<p class="note">上次同步没成功，稍后会自动重试</p>` : ''}`;
  }
  $('#friendsInner').addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'copyCode') return copyText(st.dog.code);
    if (t.id === 'shareInvite') return shareLink(`${location.origin}/?add=${st.dog.code}`, `来爪印日记，让我们家${dogName()}和你家狗狗做狗友！狗友码 ${st.dog.code}`);
    if (t.id === 'resetCode'){
      if (!t.dataset.armed){ t.dataset.armed = '1'; t.textContent = '确认换码？旧码失效'; return; }
      try { const r = await api('/api/reset-code'); st.dog.code = r.code; lsSet('pawdiary.cloudDog', st.dog); renderPage(); showToast('换好了，旧码不能再用'); } catch (_){ showToast('没换成，检查一下网络'); }
      return;
    }
    if (t.id === 'addBtn') return addFriend($('#addCode').value);
    if (t.dataset.poke) return poke(t.dataset.poke);
    if (t.dataset.see){ setView('map'); const f = st.friends.find(x => x.id === t.dataset.see); if (f && f.walking){ S.follow = false; renderFollow(); map.easeTo({center: [f.walking.lng, f.walking.lat], zoom: 16}); showFriendCard(f.id); } return; }
    if (t.dataset.unfriend){
      if (!t.classList.contains('armed')){ t.classList.add('armed'); t.textContent = '删除'; setTimeout(() => { if (t.isConnected){ t.classList.remove('armed'); t.textContent = '×'; } }, 3000); return; }
      try { await api('/api/friends/remove', {id: t.dataset.unfriend}); st.friends = st.friends.filter(x => x.id !== t.dataset.unfriend); renderPage(); renderFriendPins(); renderLiveChip(); } catch (_){ showToast('没删掉，检查一下网络'); }
    }
  });
  $('#friendsInner').addEventListener('change', e => {
    if (e.target.id === 'shareToggle'){ st.share = e.target.checked; lsSet('pawdiary.share', st.share); syncSoon(); showToast(st.share ? '遛狗时狗友能看到你们' : '已关闭，遛狗时狗友看不到位置'); }
  });
  $('#friendsInner').addEventListener('keydown', e => { if (e.target.id === 'addCode' && e.key === 'Enter') addFriend(e.target.value); });
  async function addFriend(code){
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)){ showToast('狗友码是 6 位字母和数字'); return; }
    try { const r = await api('/api/friends/add', {code}); showToast(`加上了！<b>${esc(friendName(r.friend))}</b> 现在是${esc(dogName())}的狗友`); await sync(); }
    catch (e){ showToast(e.code === 'no_such_code' ? '没找到这个狗友码，核对一下' : e.code === 'self' ? '这是你们自己的码' : '没加上，检查一下网络'); }
  }

  /* ---- family section on the 狗狗 page ---- */
  let famSig = '';
  function renderFamily(){
    const box = $('#familySec'); if (!box) return;
    if (!st.member || !st.dog){ box.innerHTML = ''; famSig = ''; const dz = $('#dangerSec'); if (dz) dz.innerHTML = ''; renderRecover(); return; }
    const ms = members(), name = dogName();
    // only redraw when something changed, so a half-confirmed button isn't reset by a background sync
    const sig = JSON.stringify([ms, st.dog.holder, st.dog.famCode, name, st.member.id]);
    if (sig === famSig && box.firstChild) return;
    famSig = sig;
    box.innerHTML = `<h2 style="--hl:var(--rose)">${esc(name)}的家人</h2>
      <div class="fam">${ms.map(m => `<div class="frow"><span class="fava pb ${st.dog.holder === m.id ? 'on' : ''}">${icon('heart', 'var(--rose)')}</span>
        <div class="ftxt"><b>${esc(name)}${esc(m.role)}</b>${m.id === st.member.id ? ' <span class="muted">（这台手机）</span>' : ''}<small>${st.dog.holder === m.id ? `${esc(name)}现在跟着` : '不在身边'}</small></div>
        <div class="fbtns">${m.id !== st.member.id ? `<button class="del" data-kick="${m.id}" aria-label="移出">移出</button>` : ''}</div></div>`).join('')}</div>
      ${st.dog.famCode ? `<div class="codecard pb" style="margin-top:12px;--fill:var(--rose)"><b>邀请家人一起照顾${esc(name)}</b><span class="code">${esc(st.dog.famCode)}</span>
        <span class="muted">把链接发给家人，对方打开后选自己的身份（比如${esc(name)}妈妈）。一只狗狗最多绑定两台手机。</span>
        <div class="btnrow" style="margin-top:0"><button class="btn small pb" id="famShare" style="--fill:var(--rose)">发家庭邀请链接</button><button class="btn small pb" id="famCopy" style="--fill:var(--paper-2)">复制家庭码</button></div></div>`
        : `<p class="muted" style="margin-top:8px">已经绑定两台手机了。换手机或者手机丢了，可以先把旧的那台「移出」，再重新邀请。</p>`}`;
    renderRecover();
    const danger = $('#dangerSec');
    if (danger) danger.innerHTML = `<button class="btn small pb dangerbtn" id="leaveFam">${ms.length > 1 ? `这台手机退出${esc(name)}的家庭` : `删除${esc(name)}`}</button>`;
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('#famShare,#famCopy,#leaveFam,[data-kick]'); if (!t) return;
    if (t.id === 'famShare') return shareLink(`${location.origin}/?family=${st.dog.famCode}`, `来爪印日记和我一起照顾${dogName()}！家庭码 ${st.dog.famCode}`);
    if (t.id === 'famCopy') return copyText(st.dog.famCode);
    if (t.dataset.kick){
      const who = `${dogName()}${roleOf(t.dataset.kick)}`;
      if (!await askConfirm({title: `移出${who}？`, text: `那台手机就不能再看和记录${dogName()}了。之后可以重新邀请。`, ok: '移出'})) return;
      try { await api('/api/dog/remove-member', {id: t.dataset.kick}); showToast('已移出，那台手机不能再记录了'); sync(); } catch (_){ showToast('没移出成功，检查一下网络'); }
      return;
    }
    if (t.id === 'leaveFam'){
      const last = members().length <= 1, name = dogName();
      const first = last
        ? {title: `删除${name}？`, text: `${name}的所有日记、足迹和狗友都会清空，不能恢复。`, ok: '确认删除'}
        : {title: `退出${name}的家庭？`, text: `退出后这台手机不能再看和记录${name}。${name}的记录还会留在${name}${roleOf(other() && other().id)}那里。`, ok: '确认退出'};
      if (!await askConfirm(first)) return;
      const second = last
        ? {title: '你确定吗？', text: `这是最后一次确认。删除后${name}的记录全部消失，「${name}」这个名字也会被别人用。`, ok: `确定删除${name}`}
        : {title: '你确定吗？', text: '这是最后一次确认。', ok: '确定退出'};
      if (!await askConfirm(second)) return;
      try { const r = await api('/api/dog/leave'); await resetLocal(); showToast(r.dogDeleted ? '已删除' : '已退出'); renderSetup('start'); } catch (_){ showToast('没成功，检查一下网络'); }
    }
  });

  function askConfirm({title, text, ok}){
    return new Promise(resolve => {
      const box = $('#confirmBox');
      box.querySelector('h2').textContent = title;
      box.querySelector('p').textContent = text;
      const yes = $('#confirmOk'), no = $('#confirmCancel');
      yes.textContent = ok || '确认';
      const done = v => { box.hidden = true; yes.onclick = no.onclick = box.onclick = null; resolve(v); };
      yes.onclick = () => done(true); no.onclick = () => done(false);
      box.onclick = e => { if (e.target === box) done(false); };
      box.hidden = false; no.focus();
    });
  }

  /* ---- first run: create or join ---- */
  let nameTimer = null, nameOk = false, chosenRole = null, joinInfo = null, setupPhoto = null;
  async function resetLocal(){
    st.member = null; st.dog = null; st.outbox = []; st.cellsOut = []; st.evCursor = 0; st.cellCursor = 0; st.friends = [];
    ['pawdiary.member', 'pawdiary.cloudDog', 'pawdiary.evCursor', 'pawdiary.cellCursor', 'pawdiary.recover'].forEach(k => lsSet(k, null));
    S.events = []; S.dog = null; S.explored.clear(); expPts.length = 0;
    await DB.clearAll().catch(() => {});
    renderAll(); renderMap(); renderDogPin(); renderDogView(); map.triggerRepaint();
    $('#v-map').classList.remove('away'); $('#awayCard').hidden = true;
  }
  function removedFromFamily(){
    resetLocal().then(() => renderSetup('start', '这台手机已经被移出了狗狗的家庭。可以重新建一只狗狗，或者让家人再邀请你一次。'));
  }
  const hasLegacy = () => !st.member && (S.events.length > 0 || (S.dog && S.dog.name));
  function roleChips(taken){
    return `<div class="roles">${ROLES.map(r => `<button type="button" class="rolechip pb" data-role="${r}" ${taken && taken.includes(r) ? 'disabled' : ''} aria-pressed="${chosenRole === r}">${r}</button>`).join('')}</div>`;
  }
  function renderSetup(mode, note){
    st.setupMode = mode;
    const box = $('#setup'), card = $('#setupCard');
    box.hidden = false; $('#holdAsk').hidden = true;
    if (mode === 'start'){
      card.innerHTML = `<div class="logo">${icon('paw', 'var(--rose)')}</div><h1>爪印日记</h1>
        ${note ? `<p class="setnote pb">${esc(note)}</p>` : ''}
        <p class="muted">每只狗狗有一个独一无二的名字。一只狗狗最多绑定两台手机，比如爸爸和妈妈，一起记录。</p>
        <button class="btn primary pb" id="goCreate">新建我的狗狗</button>
        <button class="btn pb" id="goJoin" style="--fill:var(--sky)">家人已经建好了，我要加入</button>
        <button class="linkbtn" id="goRecover">换了手机、删了 App？用找回码找回我的狗狗</button>`;
      $('#goCreate').onclick = () => renderSetup('create');
      $('#goJoin').onclick = () => renderSetup('join');
      $('#goRecover').onclick = () => renderSetup('recover');
      return;
    }
    if (mode === 'create'){
      const legacy = hasLegacy(), preName = (S.dog && S.dog.name && S.dog.name !== '我的狗狗') ? S.dog.name : '';
      if (setupPhoto === null && S.dog && S.dog.photo) setupPhoto = S.dog.photo;
      card.innerHTML = `<button class="back" id="setBack" aria-label="返回">‹ 返回</button><h1>新建狗狗</h1>
        <label class="setava pb" for="setupPhotoIn">${setupPhoto ? `<img src="${setupPhoto}" alt="">` : `${icon('camera', 'var(--sky)')}<span>选照片</span>`}</label>
        <input id="setupPhotoIn" type="file" accept="image/*" hidden>
        <div class="field"><label for="setName">狗狗的名字（不能和别的狗狗重名）</label><input id="setName" maxlength="16" placeholder="比如：年糕" value="${esc(preName)}"></div>
        <p class="namestat" id="nameStat"></p>
        <div class="field"><label>你是${'它的'}…</label>${roleChips()}</div>
        ${legacy ? `<p class="muted">这台手机上已有的 ${S.events.length} 条记录会一起带过去。</p>` : ''}
        <button class="btn primary pb" id="doCreate" disabled>创建</button>`;
      $('#setBack').onclick = () => renderSetup('start');
      $('#setName').addEventListener('input', checkName); if (preName) checkName();
      $('#setupPhotoIn').addEventListener('change', async ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
        try { setupPhoto = await readImage(f, 360, true); renderSetup('create'); $('#setName').value && checkName(); } catch (_){ showToast('这张图片打不开，换一张试试'); } });
      $('#doCreate').onclick = create;
      updateCreateBtn();
      return;
    }
    if (mode === 'recover'){
      card.innerHTML = `<button class="back" id="setBack" aria-label="返回">‹ 返回</button><h1>找回我的狗狗</h1>
        <p class="muted">输入你保存的找回码（在原来那台手机「狗狗」页最下面）。找回后，旧手机上的这个身份会自动退出。</p>
        <div class="field"><label for="recIn">找回码</label><input id="recIn" maxlength="16" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX"></div>
        <p class="namestat" id="recStat"></p>
        <button class="btn primary pb" id="doRecover">找回</button>`;
      $('#setBack').onclick = () => renderSetup('start');
      $('#doRecover').onclick = recover;
      $('#recIn').addEventListener('keydown', ev => { if (ev.key === 'Enter') recover(); });
      return;
    }
    if (mode === 'join'){
      card.innerHTML = `<button class="back" id="setBack" aria-label="返回">‹ 返回</button><h1>加入家人的狗狗</h1>
        <p class="muted">让已经建好狗狗的家人在「狗狗」页点「发家庭邀请链接」，或者告诉你 6 位家庭码。</p>
        <div class="addrow"><div class="field"><label for="famCodeIn">家庭码</label><input id="famCodeIn" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="比如 Q7MH2K" value="${esc(st.pendingFamily || '')}"></div><button class="btn small pb" id="famFind" style="--fill:var(--sky)">查找</button></div>
        <div id="joinBox"></div>
        ${hasLegacy() ? `<p class="muted">注意：加入后，这台手机上原来的 ${S.events.length} 条记录不会带过去。</p>` : ''}`;
      $('#setBack').onclick = () => renderSetup('start');
      $('#famFind').onclick = findFamily;
      $('#famCodeIn').addEventListener('keydown', ev => { if (ev.key === 'Enter') findFamily(); });
      if (st.pendingFamily) findFamily();
    }
  }
  $('#setupCard').addEventListener('click', e => {
    const b = e.target.closest('[data-role]'); if (!b || b.disabled) return;
    chosenRole = b.dataset.role;
    $('#setupCard').querySelectorAll('[data-role]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    updateCreateBtn();
    const jb = $('#doJoin'); if (jb) jb.disabled = !chosenRole;
  });
  function updateCreateBtn(){ const b = $('#doCreate'); if (b) b.disabled = !(nameOk && chosenRole); }
  function checkName(){
    nameOk = false; updateCreateBtn();
    const v = $('#setName').value.trim(), stat = $('#nameStat');
    clearTimeout(nameTimer);
    if (!v){ stat.textContent = ''; return; }
    stat.textContent = '查一下有没有重名…'; stat.dataset.ok = '';
    nameTimer = setTimeout(async () => {
      try { const r = await api('/api/name-check?name=' + encodeURIComponent(v), null, 'GET');
        if ($('#setName') && $('#setName').value.trim() !== v) return;
        nameOk = !!r.available; stat.textContent = r.available ? `「${v}」可以用` : `「${v}」已经有别的狗狗用了，换一个吧`; stat.dataset.ok = r.available ? '1' : '0'; updateCreateBtn(); }
      catch (_){ stat.textContent = '连不上服务器，检查一下网络'; }
    }, 450);
  }
  async function create(){
    const btn = $('#doCreate'); btn.disabled = true; btn.textContent = '创建中…';
    const name = $('#setName').value.trim();
    const prof = profileOf(S.dog || {});
    try {
      const r = await api('/api/dog/create', {name, role: chosenRole, profile: prof, photo: setupPhoto, avatar: await thumb(setupPhoto, 112, .72)});
      const legacy = hasLegacy();
      st.member = r.member; lsSet('pawdiary.member', st.member);
      S.dog = Object.assign({}, S.dog || {}, r.dog.profile, {name: r.dog.name, photo: setupPhoto || ''});
      DB.set('dog', S.dog).catch(() => {});
      delete r.dog.photo; st.dog = r.dog; lsSet('pawdiary.cloudDog', st.dog);
      if (legacy){ // bring this phone's records along
        S.events.forEach(ev => { const {id, by, ...data} = ev; st.outbox.push({id, t: ev.t, data, v: Math.random()}); });
        st.cellsOut.push(...S.explored); persistQueue();
      }
      st.askedThisOpen = true;
      finishSetup(`${esc(name)}建好了！你是${esc(name)}${esc(chosenRole)}。`);
    } catch (e){
      btn.disabled = false; btn.textContent = '创建';
      if (e.code === 'name_taken'){ nameOk = false; $('#nameStat').textContent = `「${name}」刚刚被别的狗狗用了，换一个吧`; $('#nameStat').dataset.ok = '0'; }
      else showToast('没建成，检查一下网络再试');
    }
  }
  async function findFamily(){
    const code = ($('#famCodeIn').value || '').trim().toUpperCase(), box = $('#joinBox');
    if (!/^[A-Z0-9]{6}$/.test(code)){ box.innerHTML = '<p class="namestat" data-ok="0">家庭码是 6 位字母和数字</p>'; return; }
    box.innerHTML = '<p class="muted">查找中…</p>';
    try {
      joinInfo = await api('/api/family/' + code, null, 'GET'); joinInfo.code = code;
      if (joinInfo.full){ box.innerHTML = `<p class="namestat" data-ok="0">${esc(joinInfo.name)}已经绑定两台手机了。请家人先在「狗狗」页把不用的那台移出。</p>`; return; }
      chosenRole = null;
      box.innerHTML = `<div class="joindog"><span class="setava small pb">${joinInfo.hasAvatar ? `<img src="/api/avatar/${joinInfo.dogId}?v=${joinInfo.pv}" alt="">` : icon('dog', 'var(--clay)')}</span><b>${esc(joinInfo.name)}</b></div>
        <div class="field"><label>你是${esc(joinInfo.name)}的…</label>${roleChips(joinInfo.taken)}</div>
        <button class="btn primary pb" id="doJoin" disabled>加入</button>`;
      $('#doJoin').onclick = join;
    } catch (e){ box.innerHTML = `<p class="namestat" data-ok="0">${e.code === 'no_such_code' ? '没找到这个家庭码，核对一下' : '连不上服务器，检查一下网络'}</p>`; }
  }
  async function join(){
    const btn = $('#doJoin'); btn.disabled = true; btn.textContent = '加入中…';
    try {
      const r = await api('/api/dog/join', {code: joinInfo.code, role: chosenRole});
      await resetLocal();
      st.member = r.member; lsSet('pawdiary.member', st.member);
      const photo = r.dog.photo; delete r.dog.photo; st.dog = r.dog; lsSet('pawdiary.cloudDog', st.dog);
      S.dog = Object.assign({}, r.dog.profile, {name: r.dog.name, photo: photo || ''}); DB.set('dog', S.dog).catch(() => {});
      st.askedThisOpen = false;
      finishSetup(`欢迎！你是${esc(r.dog.name)}${esc(chosenRole)}。`);
    } catch (e){
      btn.disabled = false; btn.textContent = '加入';
      showToast(e.code === 'role_taken' ? '这个身份已经被选了，换一个' : e.code === 'family_full' ? '已经绑定两台手机了' : '没加入成功，检查一下网络');
      if (e.code === 'role_taken') findFamily();
    }
  }
  async function recover(){
    const raw = ($('#recIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), stat = $('#recStat'), btn = $('#doRecover');
    if (raw.length !== 12){ stat.textContent = '找回码是 12 位字母和数字'; stat.dataset.ok = '0'; return; }
    btn.disabled = true; btn.textContent = '找回中…';
    try {
      const r = await api('/api/recover', {code: raw});
      await resetLocal();
      st.member = r.member; lsSet('pawdiary.member', st.member);
      lsSet('pawdiary.recover', raw.match(/.{4}/g).join('-'));
      const photo = r.dog.photo; delete r.dog.photo; st.dog = r.dog; lsSet('pawdiary.cloudDog', st.dog);
      S.dog = Object.assign({}, r.dog.profile, {name: r.dog.name, photo: photo || ''}); DB.set('dog', S.dog).catch(() => {});
      st.askedThisOpen = false;
      finishSetup(`找回来了！欢迎回来，${esc(r.dog.name)}${esc(r.member.role)}。记录正在同步…`, true);
    } catch (e){
      btn.disabled = false; btn.textContent = '找回';
      stat.textContent = e.code === 'no_such_code' ? '这个找回码不对，核对一下（换过码的话，旧码就不能用了）' : '连不上服务器，检查一下网络'; stat.dataset.ok = '0';
    }
  }

  /* ---- 找回码 ---- */
  function showRecoverBox(code, intro){
    const box = $('#recoverBox');
    box.querySelector('h2').textContent = intro ? '新功能：找回码' : '保存好你的找回码';
    box.querySelector('.code').textContent = code;
    box.querySelector('p').textContent = `换手机、删了 App 或者清理了浏览器，用这个码就能找回${dogName()}和所有记录。请截图或者记在备忘录里，不要发给别人。`;
    $('#recoverCopy').onclick = () => copyText(code);
    $('#recoverOk').onclick = () => { box.hidden = true; maybeAsk(); };
    box.hidden = false;
  }
  async function newRecoveryCode(show, intro){
    try {
      const r = await api('/api/recovery-code');
      lsSet('pawdiary.recover', r.code); renderRecover();
      if (show) showRecoverBox(r.code, intro);
    } catch (_){ /* try again next time the app opens */ }
  }
  function renderRecover(){
    const box = $('#recoverSec'); if (!box) return;
    const code = lsGet('pawdiary.recover', null);
    if (!st.member){ box.innerHTML = ''; return; }
    box.innerHTML = `<h2 style="--hl:var(--sky)">找回码</h2>
      <p class="muted">换手机、删了 App 或者清理了浏览器，在开始页面点「用找回码找回我的狗狗」，输入这个码就能找回${esc(dogName())}和所有记录。请截图保存，不要发给别人。</p>
      ${code ? `<div class="reccode pb"><span class="code">${esc(code)}</span></div>
        <div class="btnrow"><button class="btn small pb" id="recCopy" style="--fill:var(--sky)">复制找回码</button><button class="btn small pb" id="recNew" style="--fill:var(--paper-2)">换一个</button></div>`
        : `<div class="btnrow"><button class="btn small pb" id="recNew" style="--fill:var(--sky)">生成找回码</button></div>`}`;
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('#recCopy,#recNew'); if (!t) return;
    if (t.id === 'recCopy') return copyText(lsGet('pawdiary.recover', ''));
    if (lsGet('pawdiary.recover', null) && !await askConfirm({title: '换一个找回码？', text: '换了以后旧的找回码就不能用了，要重新截图保存新的。', ok: '换一个'})) return;
    newRecoveryCode(true);
  });

  function finishSetup(msg, recovered){
    $('#setup').hidden = true; st.pendingFamily = null; setupPhoto = null; chosenRole = null;
    lsSet('pawdiary.onboarded', false);
    renderTop(); renderDogPin(); renderDogView(); renderAll(); renderOnboard();
    showToast(msg, 4500);
    if (!recovered) newRecoveryCode(true);
    sync().then(() => { if (st.pendingFriend){ addFriend(st.pendingFriend); st.pendingFriend = null; } });
  }

  /* ---- boot ---- */
  async function boot(){
    lsSet('pawdiary.me', null);
    try { st.outbox = (await DB.get('outbox')) || []; st.cellsOut = (await DB.get('cellsOut')) || []; } catch (_){}
    const q = new URLSearchParams(location.search), fam = q.get('family'), add = q.get('add');
    if (fam || add) history.replaceState(null, '', location.pathname);
    if (add) st.pendingFriend = add;
    if (!st.member){
      if (fam){ st.pendingFamily = fam.toUpperCase(); renderSetup('join'); }
      else renderSetup('start');
      return;
    }
    if (fam) showToast(`这台手机已经在${esc(dogName())}的家庭里了`);
    renderAway();
    if (!lsGet('pawdiary.recover', null)) newRecoveryCode(true, true);
    await sync();
    if (st.pendingFriend){ addFriend(st.pendingFriend); st.pendingFriend = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden){ st.hiddenAt = Date.now(); return; }
    if (st.hiddenAt && Date.now() - st.hiddenAt > 20 * 6e4) st.askedThisOpen = false; // back after a while: ask again
    if (st.member) syncSoon();
  });

  return {
    boot, isHolder, dogPos, role: () => st.member ? st.member.role : '', holderRole, members,
    queueEvent, queueDelete, queueCells, pushDog, syncSoon, showAway, renderFamily, renderLiveChip,
    walkEnded(dist){ st.walkEnded = dist; syncSoon(); },
    open(){ $('#friendBadge').hidden = true; renderPage(); if (st.member) sync(); },
    familyLine(){ return members().length >= 2 && st.dog ? `跟${dogName()}${holderRole()}在一起` : ''; }
  };
})();
function renderLiveChip(){ Cloud.renderLiveChip(); }

/* ---------- wiring ---------- */
function setView(v){
  S.view=v;
  if (v!=='map' && S.fog) exitFootprint();
  ['map','log','friends','dog'].forEach(k=>{ $('#v-'+k).hidden = k!==v; });
  if (v==='friends') Cloud.open();
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected', String(t.dataset.v===v)));
  if (v==='map') requestAnimationFrame(()=>map.resize());
  if (v==='log') renderLog();
  if (v==='dog') renderDogView();
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setView(t.dataset.v)));
document.querySelectorAll('[data-ic]').forEach(s=>{ s.outerHTML=icon(s.dataset.ic, s.dataset.ic==='dog'?'var(--clay)':s.dataset.ic==='heart'?'var(--rose)':'none'); });
$('#dogChip').addEventListener('click',()=>setView('dog'));
$('#recenter').innerHTML=icon('locate','none');
$('#camIc').outerHTML=icon('camera','var(--sky)');
$('#topPoopIc').outerHTML=icon('poop','var(--poop)');
$('#recenter').addEventListener('click',()=>{
  const f=Cloud.isHolder() ? (S.gps||S.last) : Cloud.dogPos();
  if (!f){ showToast(Cloud.isHolder()?'还没拿到定位':'还没收到狗狗的位置'); return; }
  S.follow=true; renderFollow(); map.easeTo({center:[f.lng,f.lat], zoom:Math.max(map.getZoom(),16), duration:REDUCED?0:700});
});
$('#filterBtn').addEventListener('click',e=>{
  S.filter = S.filter==='day' ? 'all' : 'day';
  e.currentTarget.textContent = S.filter==='day' ? '24 小时' : '全部记录';
  hideInfo(); renderMap();
});
/* 足迹 view: a separate mode — grey everywhere, walked areas rubbed clean */
const fogBtn=document.createElement('button');
fogBtn.className='pill pb live'; fogBtn.id='fogBtn'; fogBtn.style.setProperty('--fill','var(--grass)');
fogBtn.textContent='足迹'; fogBtn.setAttribute('aria-label','打开足迹地图');
$('.mside').appendChild(fogBtn);
function renderFogBtn(){}
let fpReturn=null;
function areaText(a){ return a<1e6 ? `${Math.round(a).toLocaleString()} 平方米` : `${(a/1e6).toFixed(2)} 平方公里`; }
function renderFootprintCard(){
  const el=$('#fpCard'), a=litArea(), walks=S.events.filter(e=>e.type==='walk');
  const km=walks.reduce((s,e)=>s+(e.dist||0),0)/1000;
  el.innerHTML=`<div><b>足迹</b><br>${a>0?`走过 <span class="num">${fmtDist(litKm()*1000)}</span> 新路 · 擦亮 ${areaText(a)}`:'灰色是还没走过的地方'}<br><span class="muted">${walks.length?`遛了 ${walks.length} 次 · ${km.toFixed(1)} 公里`:'出门走一走，走过的路会被擦亮。站着不动不算。'}</span></div><button class="btn small pb" id="fpClose" style="--fill:var(--paper-2)">返回</button>`;
  $('#fpClose').onclick=exitFootprint;
}
function enterFootprint(){
  if (S.view!=='map') setView('map');
  fpReturn={center:map.getCenter(), zoom:map.getZoom(), follow:S.follow};
  S.fog=true; S.follow=false; renderFollow();
  $('#v-map').classList.add('fp'); hideInfo();
  ['ev','acc-fill','acc-line'].forEach(id=>{ if (map.getLayer(id)) map.setLayoutProperty(id,'visibility','none'); });
  photoMarkers.forEach(m=>{ m.getElement().style.display='none'; });
  $('#liveChip').hidden=true;
  renderFootprintCard();
  if (expPts.length){
    let w=180,e=-180,s=90,n=-90; expPts.forEach(([lo,la])=>{ w=Math.min(w,lo); e=Math.max(e,lo); s=Math.min(s,la); n=Math.max(n,la); });
    map.fitBounds([[w,s],[e,n]], {padding:{top:140,bottom:60,left:40,right:40}, maxZoom:16, duration:REDUCED?0:1200});
  } else {
    const f=S.gps||S.last; if (f) map.easeTo({center:[f.lng,f.lat], zoom:14.5, duration:REDUCED?0:900});
  }
  map.triggerRepaint();
}
function exitFootprint(){
  S.fog=false; $('#v-map').classList.remove('fp');
  ['ev','acc-fill','acc-line'].forEach(id=>{ if (map.getLayer(id)) map.setLayoutProperty(id,'visibility','visible'); });
  photoMarkers.forEach(m=>{ m.getElement().style.display=''; });
  if (fpReturn){ map.easeTo({center:fpReturn.center, zoom:fpReturn.zoom, duration:REDUCED?0:800}); S.follow=fpReturn.follow; renderFollow(); fpReturn=null; }
  map.triggerRepaint(); renderLiveChip();
}
fogBtn.addEventListener('click',enterFootprint);
$('#walkBtn').addEventListener('click',()=>{ S.walk?endWalk():startWalk(); });
$('#tray').innerHTML=['poop','pee','drink','eat','friend','photo'].map(k=>{ const T=TYPES[k]; return `<button class="act" data-log="${k}"><span class="dot pb" style="--c:var(--${T.color})">${icon(T.icon,`var(--${T.color})`)}</span>${T.label}</button>`; }).join('');
$('#tray').addEventListener('click',e=>{ const b=e.target.closest('[data-log]'); if (!b) return; if (b.dataset.log==='photo'){ $('#momentIn').click(); return; } logEvent(b.dataset.log); });

new ResizeObserver(()=>{ document.documentElement.style.setProperty('--mb', $('.mbottom').offsetHeight+'px'); }).observe($('.mbottom'));

darkMQ.addEventListener('change',()=>{
  SFX=darkMQ.matches?'d':'l'; readColors(); buildFogArt();
  map.setStyle(mapStyle(), {diff:false});
});
document.addEventListener('visibilitychange',()=>{ if (document.hidden) return; if (S.walk) keepAwake(true); map.resize(); map.triggerRepaint(); });
setInterval(()=>{ if (S.walk) renderWalkUI(); },1000);
setInterval(renderTop, 60000);
setInterval(()=>{ if (!document.hidden) loadWeather(); }, 10*60000);

/* ---------- boot ---------- */
(async function boot(){
  buildFogArt();
  renderFogBtn(); renderFollow(); renderWalkUI(); renderGpsNote(); renderNote(); renderTop(); renderDogPin();
  try{
    await DB.open();
    // 'explored2': footprints recorded with the stricter movement rules (the first version counted GPS drift)
    const [dog, events, explored]=await Promise.all([DB.get('dog'), DB.all(), DB.get('explored2')]);
    S.dog=dog||null; S.events=(events||[]).sort((a,b)=>b.t-a.t);
    (explored||[]).forEach(addExplored);
  }catch(_){ showToast('这个浏览器不让存数据（可能开了无痕模式），记录关掉就会丢', 6000); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  renderAll(); renderDogPin(); renderDogView(); renderOnboard(); renderMap(); map.triggerRepaint();
  checkStickers();
  startGps();
  if (S.last) loadWeather();
  if (S.walk) keepAwake(true);
  // fill any missing place names left from an offline moment
  S.events.filter(e=>!e.place && e.lng!=null).slice(0,5).forEach(e=>fillPlace(e.id,e.lng,e.lat));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  Cloud.boot();
})();
})();
