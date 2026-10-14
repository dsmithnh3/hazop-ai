'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const styles = {
  equipment: ['#16815b','Equipment'], valve: ['#a344bc','Valves'],
  instrument: ['#195ee6','Instruments'], nozzle: ['#bc790d','Nozzles'],
  'off-page': ['#d15c39','Off-page'], junction: ['#998027','Junctions'],
  'dead-end': ['#a57979','Dead ends'], solid: ['#16815b','Pipes'],
  dashed: ['#218da8','Signals'], internal: ['#8592a3','Nozzle links'],
};
const visible = new Set(['equipment','valve','instrument','nozzle','off-page','solid','dashed','internal']);
let data, page, mode = 'overlay', selected = null, view, requestSeq = 0;
let showLabels = false;
const nodeName = n => n.full_tag || n.tag || n.nozzle_label || (n.labels || []).join(', ') || `${n.kind} #${n.id}`;
const edgeName = (e,i) => (e.line_numbers || []).join(', ') || `Route #${i + 1}`;
const nodeMap = () => new Map(data.topology.nodes.map(n => [n.id,n]));
function el(tag, attrs = {}, text) { const e = document.createElement(tag); for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); if(text !== undefined) e.textContent = text; return e; }
function svg(tag, attrs) { const e = document.createElementNS(NS,tag); for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); return e; }
function button(text, callback) { const b=el('button',{},text); b.onclick=callback; return b; }
for(const [key,[color,title]] of Object.entries(styles)) {
  const label=el('label'); const input=el('input',{type:'checkbox'}); input.checked=visible.has(key);
  input.onchange=()=>{input.checked ? visible.add(key):visible.delete(key); renderGeometry();};
  const sw=el('span',{class:'swatch'});sw.style.background=color;label.append(input,sw,document.createTextNode(title));$('layers').append(label);
}
const labelToggle=el('label'); const labelInput=el('input',{type:'checkbox'});labelInput.onchange=()=>{showLabels=labelInput.checked;renderGeometry();};labelToggle.append(labelInput,document.createTextNode('Tags'));$('layers').append(labelToggle);
function updateView(){ $('canvas').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`); $('zoomValue').textContent=Math.round(data.width/view.w*100)+'%'; }
function fit(){ if(!data)return; const r=$('viewport').getBoundingClientRect(), ratio=r.width/r.height;let w=data.width+40,h=data.height+40; if(w/h<ratio)w=h*ratio;else h=w/ratio;view={x:(data.width-w)/2,y:(data.height-h)/2,w,h};updateView(); }
function zoom(factor,px=.5,py=.5){ if(!data)return;const w=view.w*factor,h=view.h*factor;if(w<data.width/30||w>data.width*5)return;view={x:view.x+(view.w-w)*px,y:view.y+(view.h-h)*py,w,h};updateView(); }
function focusPoints(points){if(!points.length)return;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]); const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(180,Math.max(...xs)-x+100),h=Math.max(130,Math.max(...ys)-y+100);const r=$('viewport').getBoundingClientRect(),ratio=r.width/r.height;const vw=Math.max(w,h*ratio),vh=vw/ratio;view={x:(x+Math.max(...xs)-vw)/2,y:(y+Math.max(...ys)-vh)/2,w:vw,h:vh};updateView();}
function renderGeometry(){
 if(!data)return; const t=data.topology;const connectedNodes=new Set(),connectedEdges=new Set();
 if(selected?.type==='node'){connectedNodes.add(selected.id); t.edges.forEach((e,i)=>{if(e.a===selected.id||e.b===selected.id){connectedEdges.add(i);connectedNodes.add(e.a);connectedNodes.add(e.b);}});}
 if(selected?.type==='edge'){connectedEdges.add(selected.id);const e=t.edges[selected.id];connectedNodes.add(e.a);connectedNodes.add(e.b);}
 $('source').style.opacity=mode==='overlay'?.25:mode==='source'?1:0;
 $('edges').replaceChildren();$('nodes').replaceChildren();$('labels').replaceChildren();
 if(mode==='source')return;
 t.edges.forEach((e,i)=>{
  if(!visible.has(e.style))return;
  const points=(e.points||[]);if(!points.length)return;
  const coords=points.map(p=>p.join(',')).join(' '),g=svg('g',{}),p=svg('polyline',{points:coords,stroke:(styles[e.style]||styles.solid)[0],class:'route'});
  if(e.style!=='solid')p.setAttribute('stroke-dasharray',e.style==='dashed'?'6 4':'2 4');
  if(!e.direction_conflict&&e.direction==='ab')p.setAttribute('marker-end','url(#arrow)');
  if(!e.direction_conflict&&e.direction==='ba')p.setAttribute('marker-start','url(#arrow)');
  if(selected&&!connectedEdges.has(i))g.classList.add('faded');
  if(selected?.type==='edge'&&selected.id===i)p.classList.add('selected');
  const hit=svg('polyline',{points:coords,class:'hit'});const title=svg('title',{});title.textContent=edgeName(e,i);hit.append(title);hit.onclick=()=>select('edge',i);
  g.append(p,hit);$('edges').append(g);
 });
 t.nodes.forEach(n=>{
  if(!visible.has(n.kind)||!n.xy)return;
  const color=(styles[n.kind]||styles.junction)[0];let shape;
  if(n.bbox)shape=svg('rect',{x:n.bbox[0],y:n.bbox[1],width:n.bbox[2]-n.bbox[0],height:n.bbox[3]-n.bbox[1],rx:2});
  else shape=svg('circle',{cx:n.xy[0],cy:n.xy[1],r:['junction','dead-end'].includes(n.kind)?3:8});
  shape.setAttribute('stroke',color);shape.setAttribute('fill',color+'18');shape.setAttribute('class','node');shape.dataset.id=n.id;
  if(selected&&!connectedNodes.has(n.id))shape.classList.add('faded');
  if(selected?.type==='node'&&selected.id===n.id)shape.classList.add('selected');
  const title=svg('title',{});title.textContent=nodeName(n);shape.append(title);shape.onclick=()=>select('node',n.id);$('nodes').append(shape);
  if(showLabels&&(n.full_tag||n.tag)){const label=svg('text',{x:n.xy[0]+11,y:n.xy[1]-11});label.textContent=nodeName(n);$('labels').append(label);}
 });
}
function renderList(){
 if(!data)return;const q=$('search').value.toLowerCase(),category=$('category').value;const rows=[];
 if(category==='edges')data.topology.edges.forEach((e,i)=>rows.push({type:'edge',id:i,name:edgeName(e,i),sub:`${styles[e.style]?.[1]||e.style} · ${e.a} ↔ ${e.b} · ${e.direction_conflict?'Direction conflict':e.direction?'Directed':'Direction unknown'}`,raw:e}));
 else data.topology.nodes.filter(n=>category==='all'||(category==='dead-end'?n.kind==='dead-end':['equipment','valve','instrument','off-page'].includes(n.kind))).sort((a,b)=>nodeName(a).localeCompare(nodeName(b))).forEach(n=>rows.push({type:'node',id:n.id,name:nodeName(n),sub:`${n.kind}${n.subclass?' / '+n.subclass:''} · #${n.id}`,raw:n}));
 const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));$('count').textContent=`${filtered.length} of ${rows.length} results on sheet ${page}`;$('items').replaceChildren();
 for(const r of filtered){const b=button('',()=>select(r.type,r.id,true));b.className='result';b.dataset.type=r.type;b.dataset.id=r.id;if(selected?.type===r.type&&selected.id===r.id)b.classList.add('selected');b.append(el('strong',{},r.name),el('small',{},r.sub));$('items').append(b);}
 if(!filtered.length)$('items').append(el('p',{class:'muted'},'No matching results on this sheet.'));
}
function field(dl,title,value){dl.append(el('dt',{},title),el('dd',{},String(value)));}
function select(type,id,focus=false){
 selected={type,id};const t=data.topology,map=nodeMap(),r=type==='node'?map.get(id):t.edges[id];
 const layer=type==='node'?r.kind:r.style;visible.add(layer);syncLayers();
 if(mode==='source')setMode('overlay');
 renderGeometry();renderList();const panel=$('detail');panel.replaceChildren();panel.append(el('p',{class:'eyebrow'},type==='node'?r.kind:'CONNECTION'),el('h3',{},type==='node'?nodeName(r):edgeName(r,id)));
 const dl=el('dl');panel.append(dl);
 if(type==='node'){
  field(dl,'Node ID',r.id);field(dl,'Position · PDF points',r.xy.map(v=>v.toFixed(1)).join(', '));if(r.bbox)field(dl,'Bounding box',r.bbox.join(', '));if(r.subclass)field(dl,'Valve subclass',r.subclass);
  const connections=t.edges.map((e,i)=>({e,i})).filter(({e})=>e.a===id||e.b===id);field(dl,'Connected routes',connections.length);
  panel.append(button('Zoom to object',()=>focusPoints(r.bbox?[[r.bbox[0],r.bbox[1]],[r.bbox[2],r.bbox[3]]]:[r.xy])));
  connections.forEach(({e,i})=>panel.append(button(`${edgeName(e,i)} → ${nodeName(map.get(e.a===id?e.b:e.a)||{kind:'node',id:e.a===id?e.b:e.a})}`,()=>select('edge',i))));
  if(focus)focusPoints(r.bbox?[[r.bbox[0],r.bbox[1]],[r.bbox[2],r.bbox[3]]]:[r.xy]);
 }else{
  field(dl,'Line style',r.style);field(dl,'Path vertices',r.points?.length||0);if(r.length!==undefined)field(dl,'Length · PDF points',r.length);
  field(dl,'Flow direction',r.direction_conflict?'Conflict - unresolved':r.direction==='ab'?`${r.a} → ${r.b}`:r.direction==='ba'?`${r.b} → ${r.a}`:'Unknown');field(dl,'Direction evidence',r.direction_source||'No saved evidence');
  panel.append(button('Zoom to route',()=>focusPoints(r.points||[])));
  [r.a,r.b].forEach(n=>{if(map.has(n))panel.append(button(`Endpoint #${n} · ${nodeName(map.get(n))}`,()=>select('node',n)));});if(focus)focusPoints(r.points||[]);
 }
 const details=el('details'),summary=el('summary',{},'Saved extraction record');details.append(summary,el('pre',{},JSON.stringify(r,null,2)));panel.append(details);
}
function syncLayers(){[...$('layers').querySelectorAll('input')].forEach((input,i)=>{const key=Object.keys(styles)[i];if(key)input.checked=visible.has(key);});}
function setMode(value){mode=value;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});renderGeometry();}
function clearSelection(){selected=null;$('detail').replaceChildren(el('div',{class:'empty-symbol'},'⌖'),el('h3',{},'Explore the geometry'),el('p',{class:'muted'},'Choose an object or a pipe route to see its coordinates, connected elements and extraction evidence.'));renderGeometry();renderList();}
async function loadSheet(){
 const seq=++requestSeq;page=Number($('page').value);$('notice').textContent='Loading sheet…';
 try{const response=await fetch(`/geometry/api/sheets/${page}`);if(!response.ok)throw Error(`Cannot load sheet (${response.status})`);const result=await response.json();if(seq!==requestSeq)return;data=result;selected=null;
 $('source').removeAttribute('href');if(data.source)$('source').setAttribute('href',data.source);$('source').setAttribute('width',data.width);$('source').setAttribute('height',data.height);
 $('notice').textContent=data.source?'':'Source PDF unavailable. Showing saved geometry only.';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=!data.source&&b.dataset.mode!=='geometry';});if(!data.source)setMode('geometry');
 $('download').href=`/geometry/download/${page}`;const edges=data.topology.edges.filter(e=>e.style==='solid');const directed=edges.filter(e=>e.direction&&!e.direction_conflict).length;const conflicts=edges.filter(e=>e.direction_conflict).length;
 $('directionStats').textContent=`Sheet ${page} · ${directed} / ${edges.length} pipe routes directed (${edges.length?Math.round(directed/edges.length*100):0}%) · ${conflicts} conflicts`;
 clearSelection();fit();history.replaceState(null,'',`?page=${page}`);
 }catch(error){if(seq===requestSeq){data=null;$('nodes').replaceChildren();$('edges').replaceChildren();$('labels').replaceChildren();$('source').removeAttribute('href');$('items').replaceChildren();$('notice').textContent=error.message;}}
}
$('page').onchange=loadSheet;$('category').onchange=renderList;$('search').oninput=renderList;$('clear').onclick=clearSelection;$('fit').onclick=fit;$('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
let drag=null;
$('viewport').onpointerdown=e=>{if(!data||e.button!==0)return;drag={x:e.clientX,y:e.clientY,view:{...view},moved:false};};
window.addEventListener('pointermove',e=>{if(!data)return;const r=$('viewport').getBoundingClientRect();if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved){$('viewport').classList.add('dragging');view={...drag.view,x:drag.view.x-dx/r.width*view.w,y:drag.view.y-dy/r.height*view.h};updateView();}}if(e.target.closest?.('#viewport'))$('coordinates').textContent=`x ${(view.x+(e.clientX-r.left)/r.width*view.w).toFixed(1)} · y ${(view.y+(e.clientY-r.top)/r.height*view.h).toFixed(1)} pt`;});
let suppressClick=false;window.addEventListener('pointerup',()=>{suppressClick=!!drag?.moved;drag=null;$('viewport').classList.remove('dragging');});
$('viewport').addEventListener('click',e=>{if(suppressClick){e.stopImmediatePropagation();suppressClick=false;}},true);
$('viewport').addEventListener('wheel',e=>{e.preventDefault();const r=$('viewport').getBoundingClientRect();zoom(e.deltaY>0?1.12:1/1.12,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});
window.addEventListener('keydown',e=>{if(e.target.closest('input,select,button'))return;if(e.key==='Escape')clearSelection();if(e.key==='f')fit();});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,100);}).observe($('viewport'));
(async()=>{try{const response=await fetch('/geometry/api/sheets');if(!response.ok)throw Error('Cannot load saved results');const sheets=await response.json();if(!sheets.length)throw Error('No saved process sheets found.');sheets.forEach(s=>$('page').append(el('option',{value:s.page},`Sheet ${s.page} · ${s.nodes} nodes`)));const requested=Number(new URLSearchParams(location.search).get('page'));if(sheets.some(s=>s.page===requested))$('page').value=requested;$('totals').textContent=`${sheets.length} sheets · ${sheets.reduce((n,s)=>n+s.nodes,0).toLocaleString()} nodes · ${sheets.reduce((n,s)=>n+s.edges,0).toLocaleString()} connections`;await loadSheet();}catch(error){$('notice').textContent=error.message;}})();
