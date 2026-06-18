const STORAGE_KEY = 'manga-characters';

const ROLES = [
  {value:'protagonist',label:'Protagonist'},{value:'deuteragonist',label:'Deuteragonist'},
  {value:'antagonist',label:'Antagonist'},{value:'supporting',label:'Supporting'},
  {value:'mentor',label:'Mentor'},{value:'side',label:'Side Character'},
  {value:'comic-relief',label:'Comic Relief'},{value:'other',label:'Other'},
];
const ROLE_MAP = Object.fromEntries(ROLES.map(r=>[r.value,r]));

const STATS = [
  {key:'power',label:'Power'},{key:'speed',label:'Speed'},
  {key:'intelligence',label:'Intelligence'},{key:'defense',label:'Defense'},{key:'technique',label:'Technique'},
];

const REL_TYPES = [
  {value:'family',label:'Family',badge:'badge-family',color:'#2C3454'},
  {value:'ally',label:'Ally',badge:'badge-ally',color:'#4C9A6B'},
  {value:'rival',label:'Rival',badge:'badge-rival',color:'#FFC23C'},
  {value:'romance',label:'Romance',badge:'badge-romance',color:'#E8748A'},
  {value:'enemy',label:'Enemy',badge:'badge-enemy',color:'#E63946'},
  {value:'mentor',label:'Mentor',badge:'badge-mentor',color:'#6E5AA8'},
  {value:'other',label:'Other',badge:'badge-other',color:'#C9C2AE'},
];
const REL_TYPE_MAP = Object.fromEntries(REL_TYPES.map(r=>[r.value,r]));

const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`;
const PLACEHOLDER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

const ROLE_COLORS = {
  protagonist:'#E63946',antagonist:'#1A1A1F',deuteragonist:'#2C3454',
  supporting:'#4C9A6B',mentor:'#6E5AA8',side:'#C9C2AE','comic-relief':'#FFC23C',other:'#C9C2AE'
};

let state = { characters:[], view:'cast', search:'', roleFilter:null, editingId:null, highlightId:null };

// ── Storage (localStorage for GitHub) ──────────────────────────────────────
function loadCharacters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.characters = JSON.parse(raw);
  } catch(e) { state.characters = []; }
}
function saveCharacters() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.characters)); }
  catch(e) { showToast('Could not save — storage full?'); }
}

// ── Utilities ───────────────────────────────────────────────────────────────
function uid(p){ return p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function esc(str){ return String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let toastTimer;
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,2200); }

function newCharacter(){ return { id:uid('char'),name:'',imageUrl:'',age:'',gender:'',role:'supporting',occupation:'',tagline:'',height:'',hair:'',eyes:'',appearance:'',tags:[],personality:'',likes:'',dislikes:'',backstory:'',goals:'',flaws:'',stats:{power:50,speed:50,intelligence:50,defense:50,technique:50},abilities:[],relationships:[],designNotes:'',createdAt:Date.now() }; }
function isBlank(c){ return !c.name.trim()&&!c.imageUrl.trim()&&!c.tagline.trim()&&!c.occupation.trim()&&!c.appearance.trim()&&!c.personality.trim()&&!c.backstory.trim()&&!c.designNotes.trim()&&!c.abilities.length&&!c.relationships.length&&!c.tags.length; }
function getEditing(){ return state.characters.find(x=>x.id===state.editingId); }

// ── View switching ──────────────────────────────────────────────────────────
function setView(v){
  state.view=v;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.getElementById('castView').classList.toggle('active',v==='cast');
  document.getElementById('mapView').classList.toggle('active',v==='map');
  if(v==='map') renderMap();
}

// ── Gallery ─────────────────────────────────────────────────────────────────
function renderRoleFilters(){
  const wrap=document.getElementById('roleFilters');
  const used=new Set(state.characters.map(c=>c.role));
  let html=`<button class="chip ${state.roleFilter===null?'active':''}" data-role="">All (${state.characters.length})</button>`;
  ROLES.forEach(r=>{ if(!used.has(r.value)) return; const n=state.characters.filter(c=>c.role===r.value).length; html+=`<button class="chip ${state.roleFilter===r.value?'active':''}" data-role="${r.value}">${esc(r.label)} (${n})</button>`; });
  wrap.innerHTML=html;
  wrap.querySelectorAll('.chip').forEach(chip=>chip.addEventListener('click',()=>{ state.roleFilter=chip.dataset.role||null; renderRoleFilters(); renderGallery(); }));
}

function getFiltered(){
  let list=state.characters;
  if(state.roleFilter) list=list.filter(c=>c.role===state.roleFilter);
  if(state.search.trim()){ const q=state.search.trim().toLowerCase(); list=list.filter(c=>(c.name||'').toLowerCase().includes(q)||(c.tagline||'').toLowerCase().includes(q)||(c.occupation||'').toLowerCase().includes(q)||(c.tags||[]).some(t=>t.toLowerCase().includes(q))); }
  return list;
}

function renderGallery(){
  const grid=document.getElementById('castGrid'), empty=document.getElementById('emptyState'), list=getFiltered();
  if(!list.length){ grid.innerHTML=''; empty.hidden=false; empty.innerHTML=state.characters.length?'<strong>No matches</strong>Try a different search or filter.':'<strong>No characters yet</strong>Start your cast with the New Character button above.'; return; }
  empty.hidden=true;
  grid.innerHTML=list.map(c=>{
    const idx=state.characters.findIndex(x=>x.id===c.id), num=String(idx+1).padStart(3,'0'), ri=ROLE_MAP[c.role]||ROLE_MAP.other;
    const img=c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="" onerror="this.style.display='none'">`:'';
    const ph=`<svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"></path></svg>`;
    const tags=(c.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
    return `<div class="character-card" data-id="${c.id}"><div class="card-number">No. ${num}</div><div class="card-portrait">${ph}${img}</div><div class="card-body"><div class="card-name">${esc(c.name)||'Unnamed'}</div><div class="card-meta"><span class="role-pill role-${c.role}">${esc(ri.label)}</span><span>${c.age?'Age '+esc(c.age):''}</span></div><div class="card-tagline">${esc(c.tagline)}</div><div class="card-tags">${tags}</div></div></div>`;
  }).join('');
  grid.querySelectorAll('.character-card').forEach(card=>card.addEventListener('click',()=>openEditor(card.dataset.id)));
}

// ── Editor ──────────────────────────────────────────────────────────────────
let saveTimer;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveCharacters,500); }

function openEditor(id){
  const c=state.characters.find(x=>x.id===id); if(!c) return;
  state.editingId=id;
  const idx=state.characters.findIndex(x=>x.id===id);
  document.getElementById('modalNumber').textContent='No. '+String(idx+1).padStart(3,'0');
  const fields=[['charName','name'],['charImage','imageUrl'],['charAge','age'],['charGender','gender'],['charRole','role'],['charOccupation','occupation'],['charTagline','tagline'],['charHeight','height'],['charHair','hair'],['charEyes','eyes'],['charAppearance','appearance'],['charPersonality','personality'],['charLikes','likes'],['charDislikes','dislikes'],['charBackstory','backstory'],['charGoals','goals'],['charFlaws','flaws'],['charDesignNotes','designNotes']];
  fields.forEach(([el,key])=>document.getElementById(el).value=c[key]||'');
  document.getElementById('charTags').value=(c.tags||[]).join(', ');
  updatePortrait(); renderStatRows(c); renderAbilities(c); renderRelationships(c); switchTab('profile');
  document.getElementById('charModalOverlay').hidden=false;
  document.getElementById('charName').focus();
}

function closeEditor(){
  clearTimeout(saveTimer);
  const c=getEditing();
  document.getElementById('charModalOverlay').hidden=true;
  if(c&&isBlank(c)) state.characters=state.characters.filter(x=>x.id!==c.id);
  state.editingId=null;
  renderRoleFilters(); renderGallery();
  if(state.view==='map') renderMap();
  saveCharacters();
}

function switchTab(s){
  document.querySelectorAll('.modal-tab').forEach(t=>t.classList.toggle('active',t.dataset.section===s));
  document.querySelectorAll('.modal-section').forEach(s2=>s2.classList.toggle('active',s2.dataset.section===s));
}

function updatePortrait(){
  const wrap=document.getElementById('portraitPreview'), url=document.getElementById('charImage').value.trim();
  wrap.innerHTML='';
  if(url){ const img=document.createElement('img'); img.src=url; img.alt=''; img.onerror=()=>wrap.innerHTML=PLACEHOLDER_SVG; wrap.appendChild(img); }
  else wrap.innerHTML=PLACEHOLDER_SVG;
}

// ── Stats ───────────────────────────────────────────────────────────────────
function renderStatRows(c){
  const wrap=document.getElementById('statRows');
  wrap.innerHTML=STATS.map(s=>{ const v=(c.stats||{})[s.key]??50; return `<div class="stat-row"><span class="stat-label">${esc(s.label)}</span><div class="stat-track"><div class="stat-fill" id="fill_${s.key}" style="width:${v}%"></div></div><input class="stat-input" type="number" min="0" max="100" value="${v}" data-stat="${s.key}"/></div>`; }).join('');
  wrap.querySelectorAll('.stat-input').forEach(inp=>inp.addEventListener('input',()=>{ const c=getEditing(); if(!c) return; const v=Math.max(0,Math.min(100,parseInt(inp.value)||0)); c.stats[inp.dataset.stat]=v; document.getElementById('fill_'+inp.dataset.stat).style.width=v+'%'; scheduleSave(); }));
}

// ── Abilities ────────────────────────────────────────────────────────────────
function renderAbilities(c){
  const wrap=document.getElementById('abilityList');
  if(!(c.abilities||[]).length){ wrap.innerHTML='<div class="list-empty">No abilities added yet.</div>'; return; }
  wrap.innerHTML=c.abilities.map((a,i)=>`<div class="list-block"><div class="list-block-head"><input class="inline-input" type="text" placeholder="Ability name" value="${esc(a.name)}" data-abl-name="${i}"/><button class="icon-btn" data-abl-del="${i}">${ICON_TRASH}</button></div><textarea class="inline-textarea" placeholder="Description…" data-abl-desc="${i}">${esc(a.description)}</textarea></div>`).join('');
  wrap.querySelectorAll('[data-abl-name]').forEach(el=>el.addEventListener('input',()=>{ const c=getEditing(); if(c) c.abilities[el.dataset.ablName].name=el.value; scheduleSave(); }));
  wrap.querySelectorAll('[data-abl-desc]').forEach(el=>el.addEventListener('input',()=>{ const c=getEditing(); if(c) c.abilities[el.dataset.ablDesc].description=el.value; scheduleSave(); }));
  wrap.querySelectorAll('[data-abl-del]').forEach(btn=>btn.addEventListener('click',()=>{ const c=getEditing(); if(!c) return; c.abilities.splice(parseInt(btn.dataset.ablDel),1); renderAbilities(c); scheduleSave(); }));
}

// ── Relationships ────────────────────────────────────────────────────────────
function renderRelationships(c){
  const wrap=document.getElementById('relationshipList'), others=state.characters.filter(x=>x.id!==c.id);
  if(!(c.relationships||[]).length){ wrap.innerHTML='<div class="list-empty">No relationships added yet.</div>'; return; }
  wrap.innerHTML=c.relationships.map((r,i)=>{
    const typeOpts=REL_TYPES.map(t=>`<option value="${t.value}" ${r.type===t.value?'selected':''}>${t.label}</option>`).join('');
    const charOpts=others.length?others.map(x=>`<option value="${x.id}" ${r.targetId===x.id?'selected':''}>${esc(x.name||'Unnamed')}</option>`).join(''):`<option value="">-- No other characters --</option>`;
    const rt=REL_TYPE_MAP[r.type]||REL_TYPE_MAP.other;
    return `<div class="list-block"><div class="list-block-head" style="flex-wrap:wrap;gap:6px;"><span class="badge ${rt.badge}" data-rel-badge="${i}">${esc(rt.label)}</span><select data-rel-type="${i}" style="font-family:var(--font-mono);font-size:.72rem;border:2px solid var(--ink);background:var(--paper);padding:4px 6px;">${typeOpts}</select><select data-rel-target="${i}" style="flex:1;font-family:var(--font-body);font-size:.85rem;border:2px solid var(--ink);background:var(--paper);padding:4px 6px;">${charOpts}</select><button class="icon-btn" data-rel-del="${i}">${ICON_TRASH}</button></div><textarea class="inline-textarea" placeholder="Notes…" data-rel-desc="${i}">${esc(r.description)}</textarea></div>`;
  }).join('');
  wrap.querySelectorAll('[data-rel-type]').forEach(sel=>sel.addEventListener('change',()=>{ const c=getEditing(); if(!c) return; const idx=parseInt(sel.dataset.relType); c.relationships[idx].type=sel.value; const rt=REL_TYPE_MAP[sel.value]||REL_TYPE_MAP.other; const b=wrap.querySelector(`[data-rel-badge="${idx}"]`); b.className='badge '+rt.badge; b.textContent=rt.label; scheduleSave(); }));
  wrap.querySelectorAll('[data-rel-target]').forEach(sel=>sel.addEventListener('change',()=>{ const c=getEditing(); if(c) c.relationships[parseInt(sel.dataset.relTarget)].targetId=sel.value; scheduleSave(); }));
  wrap.querySelectorAll('[data-rel-desc]').forEach(ta=>ta.addEventListener('input',()=>{ const c=getEditing(); if(c) c.relationships[parseInt(ta.dataset.relDesc)].description=ta.value; scheduleSave(); }));
  wrap.querySelectorAll('[data-rel-del]').forEach(btn=>btn.addEventListener('click',()=>{ const c=getEditing(); if(!c) return; c.relationships.splice(parseInt(btn.dataset.relDel),1); renderRelationships(c); scheduleSave(); }));
}

// ── Confirm modal ────────────────────────────────────────────────────────────
let confirmCb=null;
function openConfirm(msg,cb){ document.getElementById('confirmMessage').textContent=msg; confirmCb=cb; document.getElementById('confirmOverlay').hidden=false; }
function closeConfirm(){ document.getElementById('confirmOverlay').hidden=true; confirmCb=null; }

// ── Relationship Map ─────────────────────────────────────────────────────────
function renderMap(){
  const svg=document.getElementById('relSvg'), detail=document.getElementById('mapDetail'), chars=state.characters;
  if(!chars.length){ svg.innerHTML=`<text x="300" y="300" text-anchor="middle" font-family="monospace" font-size="13" fill="#C9C2AE">No characters yet.</text>`; detail.innerHTML='<h4>Relationship Map</h4><p style="margin:0">Add characters to see them here.</p>'; return; }
  const n=chars.length, CX=300, CY=300, r=n<=6?180:n<=14?210:n<=25?230:250;
  const pos=chars.map((_,i)=>{ const a=(2*Math.PI*i/n)-Math.PI/2; return {x:CX+r*Math.cos(a),y:CY+r*Math.sin(a)}; });
  const edges=[]; const seen=new Set();
  chars.forEach((c,ci)=>{ (c.relationships||[]).forEach(rel=>{ const ti=chars.findIndex(x=>x.id===rel.targetId); if(ti===-1) return; const key=[Math.min(ci,ti),Math.max(ci,ti),rel.type].join('_'); if(seen.has(key)) return; seen.add(key); edges.push({from:ci,to:ti,type:rel.type}); }); });
  const hlIdx=state.highlightId?chars.findIndex(x=>x.id===state.highlightId):-1;
  const edgesHtml=edges.map(e=>{ const p1=pos[e.from],p2=pos[e.to],rt=REL_TYPE_MAP[e.type]||REL_TYPE_MAP.other; const dim=hlIdx!==-1&&e.from!==hlIdx&&e.to!==hlIdx; const hi=hlIdx!==-1&&(e.from===hlIdx||e.to===hlIdx); const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,dx=p2.x-p1.x,dy=p2.y-p1.y; return `<path class="map-edge${dim?' dim':hi?' highlight':''}" stroke="${rt.color}" d="M${p1.x},${p1.y} Q${mx-dy*.2},${my+dx*.2} ${p2.x},${p2.y}"/>`; }).join('');
  const nodesHtml=chars.map((c,i)=>{ const p=pos[i],dim=hlIdx!==-1&&i!==hlIdx,hi=i===hlIdx,rc=ROLE_COLORS[c.role]||'#C9C2AE'; return `<g class="map-node${dim?' dim':hi?' highlight':''}" data-map-id="${c.id}" transform="translate(${p.x},${p.y})"><circle r="22" fill="var(--paper)" stroke="${rc}" stroke-width="3"/><circle r="18" fill="${rc}" opacity=".18"/><text dy="4">${esc((c.name||'?').slice(0,10))}</text></g>`; }).join('');
  svg.innerHTML=edgesHtml+nodesHtml;
  svg.querySelectorAll('.map-node').forEach(node=>node.addEventListener('click',()=>{ const id=node.dataset.mapId; state.highlightId=state.highlightId===id?null:id; renderMap(); if(state.highlightId){ const c=chars.find(x=>x.id===state.highlightId); if(c) showMapDetail(c,chars); } else detail.innerHTML='<h4>Relationship Map</h4><p style="margin:0">Click a node to see connections.</p>'; }));
  if(hlIdx!==-1) showMapDetail(chars[hlIdx],chars);
}

function showMapDetail(c,chars){
  const detail=document.getElementById('mapDetail');
  const rels=(c.relationships||[]).map(r=>{ const t=chars.find(x=>x.id===r.targetId); if(!t) return ''; const rt=REL_TYPE_MAP[r.type]||REL_TYPE_MAP.other; return `<div class="conn-row"><span><span class="badge ${rt.badge}" style="font-size:.6rem">${esc(rt.label)}</span> ${esc(t.name||'Unnamed')}</span></div>`; }).filter(Boolean).join('');
  const rev=chars.flatMap(ch=>{ if(ch.id===c.id) return []; return (ch.relationships||[]).filter(r=>r.targetId===c.id).map(r=>{ const rt=REL_TYPE_MAP[r.type]||REL_TYPE_MAP.other; return `<div class="conn-row" style="opacity:.7"><span><span class="badge ${rt.badge}" style="font-size:.6rem">${esc(rt.label)}</span> ← ${esc(ch.name||'Unnamed')}</span></div>`; }); }).join('');
  detail.innerHTML=`<h4>${esc(c.name||'Unnamed')}</h4><p style="margin:0 0 10px;font-size:.82rem;opacity:.8">${esc(c.tagline||c.occupation||'')}</p>${rels||'<div style="opacity:.5;font-size:.8rem;font-family:var(--font-mono)">No outgoing relationships.</div>'}${rev}<div style="margin-top:12px"><button class="btn btn-sm" onclick="openEditor('${c.id}')">Open Character</button></div>`;
}

// ── Relationship legend ──────────────────────────────────────────────────────
function renderRelLegend(){
  document.getElementById('relLegend').innerHTML=REL_TYPES.map(t=>`<div class="legend-row"><span class="legend-swatch" style="background:${t.color}"></span><span>${esc(t.label)}</span></div>`).join('');
}

// ── Event bindings ───────────────────────────────────────────────────────────
function bindEvents(){
  document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.getElementById('searchInput').addEventListener('input',e=>{ state.search=e.target.value; renderGallery(); });
  document.getElementById('newCharBtn').addEventListener('click',()=>{ const c=newCharacter(); state.characters.push(c); renderRoleFilters(); renderGallery(); saveCharacters(); openEditor(c.id); });

  const simple=[['charName','name'],['charImage','imageUrl'],['charAge','age'],['charGender','gender'],['charRole','role'],['charOccupation','occupation'],['charTagline','tagline'],['charHeight','height'],['charHair','hair'],['charEyes','eyes'],['charAppearance','appearance'],['charPersonality','personality'],['charLikes','likes'],['charDislikes','dislikes'],['charBackstory','backstory'],['charGoals','goals'],['charFlaws','flaws'],['charDesignNotes','designNotes']];
  simple.forEach(([elId,key])=>{ const el=document.getElementById(elId); el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{ const c=getEditing(); if(!c) return; c[key]=el.value; if(elId==='charImage') updatePortrait(); if(['charName','charTagline','charRole','charAge'].includes(elId)) renderGallery(); scheduleSave(); }); });
  document.getElementById('charTags').addEventListener('input',e=>{ const c=getEditing(); if(c){ c.tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean); scheduleSave(); } });

  document.querySelectorAll('.modal-tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.section)));
  document.getElementById('closeModalBtn').addEventListener('click',closeEditor);
  document.getElementById('charModalOverlay').addEventListener('click',e=>{ if(e.target.id==='charModalOverlay') closeEditor(); });
  document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(!document.getElementById('confirmOverlay').hidden){ closeConfirm(); return; } if(!document.getElementById('charModalOverlay').hidden) closeEditor(); });

  document.getElementById('deleteCharBtn').addEventListener('click',()=>{ const c=getEditing(); if(!c) return; openConfirm(`Delete "${c.name||'this character'}"? This can't be undone.`,()=>{ const id=c.id; state.characters=state.characters.filter(x=>x.id!==id); state.characters.forEach(ch=>{ ch.relationships=(ch.relationships||[]).filter(r=>r.targetId!==id); }); document.getElementById('charModalOverlay').hidden=true; state.editingId=null; renderRoleFilters(); renderGallery(); if(state.view==='map') renderMap(); saveCharacters(); showToast('Character deleted.'); }); });
  document.getElementById('confirmCancel').addEventListener('click',closeConfirm);
  document.getElementById('confirmOk').addEventListener('click',()=>{ if(confirmCb) confirmCb(); closeConfirm(); });
  document.getElementById('confirmOverlay').addEventListener('click',e=>{ if(e.target.id==='confirmOverlay') closeConfirm(); });

  document.getElementById('addAbilityBtn').addEventListener('click',()=>{ const c=getEditing(); if(!c) return; c.abilities.push({id:uid('abl'),name:'',description:''}); renderAbilities(c); scheduleSave(); });
  document.getElementById('addRelationshipBtn').addEventListener('click',()=>{ const c=getEditing(); if(!c) return; const other=state.characters.find(x=>x.id!==c.id); c.relationships.push({id:uid('rel'),targetId:other?other.id:'',type:'ally',description:''}); renderRelationships(c); scheduleSave(); });

  document.getElementById('exportBtn').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(state.characters,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='characters.json'; a.click(); showToast('Exported characters.json'); });
  document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ try{ const p=JSON.parse(ev.target.result); if(!Array.isArray(p)) throw 0; openConfirm(`Import ${p.length} characters? This replaces your current cast.`,()=>{ state.characters=p; saveCharacters(); renderRoleFilters(); renderGallery(); if(state.view==='map') renderMap(); showToast(`Imported ${p.length} characters.`); }); }catch{ showToast('Import failed — invalid file.'); } }; r.readAsText(f); e.target.value=''; });
}

// ── Init ─────────────────────────────────────────────────────────────────────
function init(){
  loadCharacters();
  renderRoleFilters();
  renderGallery();
  renderRelLegend();
  bindEvents();
}
init();
