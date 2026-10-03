/* Band Quest — a 16-bit-style band-hero platformer. No backend, no accounts; game progress lives in localStorage. */
(async () => {
'use strict';

// ---------- Worlds: loaded from pieces.json (one world per concert piece) ----------
const DRAFT_KEY = 'practiceQuest.piecesDraft';   // teacher "preview on this phone" override
function ytId(u){
  u = String(u || '').trim(); if (/^[\w-]{11}$/.test(u)) return u;
  const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return m ? m[1] : '';
}
const clean = v => typeof v === 'string' ? v.replace(/[<>"]/g, '').trim() : v;
const WORLD_DEFAULTS = { valkyrie:['snow','imp','valkyrie'], chickens:['farm','chicken','cluckzilla'], santa:['candy','ginger','santa'], infinite:['castle','wisp','dragon'], ghosts:['haunted','ghost','spectro'] };
function normWorld(w, id){
  w = (w && typeof w === 'object') ? w : {}; const d = WORLD_DEFAULTS[id] || ['meadow','gremlin','golem'];
  const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : undefined, c = w.colors || {};
  const colors = {}; for (const k of ['sky','ground','groundTop','accent']) if (hex(c[k])) colors[k] = c[k];
  return { theme:w.theme || d[0], enemy:w.enemy || d[1], boss:w.boss || d[2], colors };
}
function normPieces(raw){
  return (raw.pieces || []).filter(x => x && x.id && x.title).map(o => {
    const x = {}; for (const k in o) x[k] = (o[k] && typeof o[k] === 'object') ? Object.fromEntries(Object.entries(o[k]).map(([a,b]) => [a, clean(b)])) : clean(o[k]);
    x.id = String(x.id).toLowerCase().replace(/[^a-z0-9-]/g, ''); if (!/^#[0-9a-f]{3,8}$/i.test(x.color || '')) x.color = '#ffd23f';
    return x;
  }).filter(x => x.id).map((x, i) => ({ id:String(x.id), lv:i+1, title:x.title, composer:x.composer || '', publisher:x.publisher || '',
      boss:x.boss || `The ${x.title} Boss`, face:x.bossEmoji || '👾', color:x.color || '#ffd23f',
      blurb:x.blurb || '', yt:ytId(x.youtube), ytChannel:x.channel || 'YouTube',
      badge:{ name:(x.badge && x.badge.name) || `${x.title} Champion`, emoji:(x.badge && x.badge.emoji) || '🏅' },
      world:normWorld(x.world, x.id) }));
}
let RAW = null, USING_DRAFT = false;
async function loadPieces(){
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (d && d.pieces && d.pieces.length){ RAW = d; USING_DRAFT = true; return; } } catch(e){}
  const r = await fetch('pieces.json', { cache:'no-cache' }); RAW = await r.json();
}
try { await loadPieces(); }
catch(e){ document.body.innerHTML = '<p style="color:#fff;padding:24px;font:700 18px system-ui">😕 Couldn’t load the worlds list (pieces.json). Check your internet and reload.</p>'; return; }
const PIECES = normPieces(RAW);
const P = Object.fromEntries(PIECES.map(p => [p.id, p]));
const TEACHER_PIN = String((RAW.settings && RAW.settings.teacherPin) || '1234');

// ---------- Arcade rules ----------
const START_LIVES = 5, LIVES_MAX = 99, CONTINUE_SECS = 9, LISTEN_SECS = 60;   // listen ~60 s to a world's recording -> golden instrument there
const INST_NAME = { flute:'Flute', clarinet:'Clarinet', sax:'Saxophone', trumpet:'Trumpet', trombone:'Trombone', euphonium:'Euphonium' };
const HAIR_NAME = { short:'Short hair', long:'Long hair' };
const AVATARS = ['🎷','🎺','🥁','🎵','🎶','🎹','🎸','🪘','🦄','🐉','🤖','👾'];
const BADGES = [
  { id:'stage1',   e:'🚩', n:'First Stage',     d:'Clear any stage' },
  { id:'nosweat',  e:'😎', n:'No Sweat',        d:'Clear a stage without losing a life' },
  { id:'castle',   e:'🏰', n:'Castle Crusher',  d:'Defeat your first boss' },
  ...PIECES.map(p => ({ id:'boss-'+p.id, e:p.badge.emoji, n:p.badge.name, d:`Defeat ${p.boss}` })),
  { id:'grandtour',e:'🌍', n:'Grand Tour',      d:`Defeat all ${PIECES.length} world bosses` },
  { id:'goldsnare',e:'🥁', n:'Golden Snare',    d:'Defeat Mr. Kurilla, the final boss' },
  { id:'notes500', e:'🪙', n:'Note Collector',  d:'Collect 500 note coins' },
  { id:'notes2000',e:'💰', n:'Note Hoarder',    d:'Collect 2,000 note coins' },
  { id:'neverquit',e:'🔁', n:'Never Give Up',   d:'Use a continue' },
  { id:'tubahero', e:'💥', n:'Tuba Hero',       d:'Blast an enemy, crate or block with the GIANT TUBA' },
  { id:'listener', e:'🎧', n:'Good Listener',   d:'Listen to a world’s recording for a minute' },
  { id:'superfan', e:'🌟', n:'Super Fan',       d:`Listen to all ${PIECES.length} recordings` },
];

// ---------- Storage (same key as earlier versions, so saved game progress carries over) ----------
const KEY = 'practiceQuest.v1';
let memOnly = false;
const fresh = () => ({ v:1, name:'', avatar:'🎷', badges:{}, sound:true, music:true, created:Date.now(), game:null });
let S;
const gw = id => S.game.worlds[id] || (S.game.worlds[id] = { cleared:[false,false,false], boss:0, best:[0,0,0,0] });
function load(keep){
  if (!keep){ try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch(e){ S = fresh(); memOnly = true; } }
  const f = fresh(); for (const k in f) if (S[k] === undefined) S[k] = f[k];
  if (!S.game || typeof S.game !== 'object') S.game = {};
  const g = S.game, d = { inst:null, hair:'short', lives:START_LIVES, score:0, coins:0, continues:0, tubaKO:0, worlds:{}, current:null, finalBossBeaten:false, finalWins:0 };
  for (const k in d) if (g[k] === undefined) g[k] = d[k];
  if (g.inst && !INST_NAME[g.inst]) g.inst = null;   // retired instrument (drums): the hero picker opens on the next PLAY; progress is kept
  if (!HAIR_NAME[g.hair]) g.hair = 'short';
  if (!S.arcade){ S.arcade = 3; if (g.lives < START_LIVES) g.lives = START_LIVES; g.score = 0; } // v3 migration: fresh credit of lives
  for (const p of PIECES) gw(p.id);
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ memOnly = true; } }

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtDate = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric'}); };

// ---------- UI sound blips ----------
// They share the game's ONE AudioContext (PQGame.audio), which owns all the iPhone unlock / silent-switch / wake-up handling.
// (Before v19 the menus had a second context of their own; iOS handles one context far more reliably.)
const audio = () => window.PQGame && PQGame.audio ? PQGame.audio.ctx() : null;
const audioWant = () => { if (window.PQGame && PQGame.audio) PQGame.audio.want(S.sound || S.music); };
function tone(freq, t0, dur, type='square', vol=.2){
  const c = audio(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+.01); g.gain.exponentialRampToValueAtTime(.0001, t+dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+.02);
}
const sfx = {
  win(){ if (S.sound) [523,659,784,1046].forEach((f,i)=>tone(f,i*.12,.25,'square',.2)); },
  blip(){ if (S.sound) tone(660,0,.08,'triangle',.25); },
  tick(){ if (S.sound) tone(440,0,.06,'square',.15); },
  over(){ if (S.sound) [392,330,262,196].forEach((f,i)=>tone(f,i*.18,.3,'triangle',.25)); },
  unlock(){ if (S.sound) [523,659,784,1046,1318].forEach((f,i)=>tone(f,i*.07,.22,'square',.16)); },
};

// ---------- FX, toast, modal ----------
function confetti(n = 60){
  const fx = $('#fx'), cols = ['#ffd23f','#ff4f79','#20c9b4','#4d9de0','#b8f35b','#ff8c42'];
  for (let i=0;i<n;i++){ const c = document.createElement('i'); c.className = 'confetti'; c.style.left = Math.random()*100+'vw'; c.style.background = cols[i%cols.length];
    c.style.animationDuration = (1.6+Math.random()*1.6)+'s'; c.style.animationDelay = (Math.random()*.4)+'s'; fx.appendChild(c); setTimeout(()=>c.remove(), 3800); }
}
let toastT;
function toast(html){ const t = $('#toast'); t.innerHTML = `<span>${html}</span>`; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(()=> t.hidden = true, 3200); }
let modalClose = null;
function openModal(html, onOpen){ $('#modal-body').innerHTML = html; $('#modal').hidden = false; onOpen && onOpen($('#modal-body')); }
function closeModal(){ stopListen(); $('#modal').hidden = true; $('#modal-body').innerHTML = ''; const f = modalClose; modalClose = null; f && f(); } // clearing also stops any video
$('#modal-x').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// ---------- Progress rules: classic 90s progression ----------
const worldIdx = id => PIECES.findIndex(p => p.id === id);
function worldOpen(id){ const i = worldIdx(id); if (i <= 0) return true; const w = gw(id);
  return gw(PIECES[i-1].id).boss > 0 || w.cleared.some(Boolean) || w.boss > 0; }   // beat the previous world's boss (or already started here)
function stageState(id, i){
  const w = gw(id), prev = PIECES[worldIdx(id) - 1];
  if (!worldOpen(id)) return { open:false, why:`Beat ${prev ? prev.boss : 'the previous boss'} first` };
  if (i === 4) return id === lastPiece().id && w.boss > 0 ? { open:true } : { open:false, why:'Beat every world boss first' };
  if (i === 3) return w.cleared[2] ? { open:true } : { open:false, why:'Clear Stages 1–3 to open the castle' };
  if (i > 0 && !w.cleared[i-1]) return { open:false, why:`Clear Stage ${i} first` };
  return { open:true };
}
const starsDone = () => PIECES.reduce((a,p) => { const w = gw(p.id); return a + w.cleared.filter(Boolean).length + (w.boss > 0 ? 1 : 0); }, 0);
function checkBadges(extra = {}){
  const got = [], give = id => { if (!S.badges[id] && BADGES.some(b => b.id === id)){ S.badges[id] = today(); got.push(id); } }, W = S.game.worlds;
  if (PIECES.some(p => gw(p.id).cleared.some(Boolean))) give('stage1');
  if (extra.nosweat) give('nosweat');
  if (PIECES.some(p => gw(p.id).boss > 0)) give('castle');
  for (const p of PIECES) if (gw(p.id).boss > 0) give('boss-'+p.id);
  if (PIECES.length && PIECES.every(p => gw(p.id).boss > 0)) give('grandtour');
  if (S.game.coins >= 500) give('notes500'); if (S.game.coins >= 2000) give('notes2000');
  if (S.game.continues > 0) give('neverquit');
  if (S.game.tubaKO > 0) give('tubahero');
  if (S.game.finalBossBeaten) give('goldsnare');
  if (PIECES.some(p => gw(p.id).golden)) give('listener'); if (PIECES.length && PIECES.every(p => !p.yt || gw(p.id).golden)) give('superfan');
  return got.map(id => BADGES.find(b => b.id === id));
}
const badgeHTML = list => list.length ? `<div class="lbl">New badge${list.length>1?'s':''}!</div><div class="badge-grid">${list.map(b=>`<div class="badge"><div class="be">${b.e}</div><div class="bn">${b.n}</div><div class="bd">${b.d}</div></div>`).join('')}</div>` : '';

// ---------- Rendering ----------
function renderHUD(){
  $('#hud-nick').textContent = S.name || 'Player'; $('#hud-avatar').textContent = S.avatar;
  $('#hud-rank').textContent = `⭐ ${starsDone()} / ${PIECES.length*4} cleared`;
  $('#hud-lives').textContent = S.game.lives; $('#hud-score').textContent = S.game.score;
}
function worldsForMap(){
  return PIECES.map(p => { const w = gw(p.id); return { id:p.id, title:p.title, color:p.color, world:p.world, cleared:w.cleared, bossBeaten:w.boss > 0, bossOpen:w.cleared[2], locked:!worldOpen(p.id) }; });
}
let mapHits = [], mapT = 0, mapRaf = 0;
function renderMap(){
  const c = $('#overworld'); if (!c || !window.PQGame) return;
  const cur = S.game.current && P[S.game.current] && worldOpen(S.game.current) ? S.game.current : (PIECES[0] && PIECES[0].id);
  const fx = mapFx ? { kind:mapFx.kind, from:mapFx.from, to:mapFx.to, e:(performance.now() - mapFx.t0)/1000 } : null;
  mapHits = PQGame.drawOverworld(c, worldsForMap(), { t:mapT, hero:{ inst:S.game.inst || 'sax', hair:S.game.hair }, current:cur, fx });
}
function mapLoop(ts){ mapRaf = 0; if ($('#main').hidden || !$('#game').hidden) return; mapT = ts/1000; renderMap();
  if (mapFx && (performance.now() - mapFx.t0)/1000 > MAPFX_SECS) mapFx = null;
  mapRaf = mapFx ? requestAnimationFrame(mapLoop) : setTimeout(() => requestAnimationFrame(mapLoop), 120); }
function restartMapLoop(){ cancelAnimationFrame(mapRaf); clearTimeout(mapRaf); mapRaf = 0; startMapLoop(); }

// ---------- After a boss: back on the map, the path draws to the next world, its island pops + glows, and a banner names it ----------
const THEME_NAME = { snow:'❄️ Snowy mountains', farm:'🌾 Sunny farm', candy:'🍬 Candy-cane town', castle:'🏰 Mystery castle', haunted:'👻 Haunted graveyard', meadow:'🌼 Flower meadow' };
const MAPFX_SECS = 9;
let mapFx = null, bannerTimer = 0;
function hideMapBanner(){ clearTimeout(bannerTimer); const b = $('#map-banner'); if (b) b.remove(); document.body.classList.remove('has-map-banner'); }
function mapBanner(html){ hideMapBanner(); const b = document.createElement('div'); b.id = 'map-banner'; b.className = 'map-banner'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
  b.innerHTML = html + '<button class="mb-x" id="mb-x" aria-label="close">✕</button>'; document.body.appendChild(b); document.body.classList.add('has-map-banner');
  b.addEventListener('click', e => { const w = e.target.closest('[data-open-world]'); if (w){ hideMapBanner(); sfx.blip(); openWorld(w.dataset.openWorld); } else if (e.target.closest('[data-mb-final]')){ hideMapBanner(); sfx.blip(); openStory(); } else if (e.target.closest('#mb-x, [data-mb-ok]')) hideMapBanner(); });
  bannerTimer = setTimeout(hideMapBanner, 15000); }
// one gentle scroll so the island is in view: a single smooth scroll, never repeated, so the player can scroll the map freely right away
function focusIsland(i){ const c = $('#overworld'); if (!c) return; const r = c.getBoundingClientRect(), cy = 70 + i*78, y = scrollY + r.top + cy*r.height/c.height - innerHeight*.36;
  scrollTo({ top:Math.max(0, y), behavior:'smooth' }); }
function mapCelebrate(kind, to){
  const n = PIECES.length, from = Math.max(0, to - 1);
  mapFx = { kind, from, to, t0:performance.now() }; renderAll(); restartMapLoop();
  if (kind === 'unlock'){ const q = PIECES[to];
    setTimeout(() => { if (mapFx && mapFx.kind === 'unlock') sfx.unlock(); }, 1650);
    mapBanner(`<div class="mb-k">🔓 World ${q.lv} unlocked!</div><div class="mb-t">${esc(q.title)}</div>
      <div class="mb-s">${THEME_NAME[(q.world || {}).theme] || '🗺️ New lands'}${q.composer ? ` · 🎼 ${esc(q.composer)}` : ''}<br>Boss: <b>${esc(q.boss)}</b></div>
      <div class="mb-b"><button class="btn btn-yellow" data-open-world="${q.id}">▶ Enter World ${q.lv}</button><button class="btn btn-ghost" data-mb-ok>Later</button></div>`); }
  else { sfx.win(); confetti(160); setTimeout(() => confetti(120), 900);
    mapBanner(`<div class="mb-k">🏆 All worlds complete!</div><div class="mb-t">You beat all ${n} bosses!</div>
      <div class="mb-s">${S.game.finalBossBeaten ? '🥁 You won the <b>Golden Snare Drum</b>! ' : `🧙 But <b>Mr. Kurilla</b> is still waiting in World ${PIECES[n - 1].lv} for the final showdown! `}Replay any stage to chase a high score, or hear the pieces again for golden instruments.</div>
      <div class="mb-b">${S.game.finalBossBeaten ? '' : '<button class="btn btn-pink" data-mb-final>🧙 Final showdown</button>'}<button class="btn btn-yellow" data-mb-ok>🎉 Awesome!</button></div>`); }
  focusIsland(to);
}
function startMapLoop(){ if (!mapRaf) mapRaf = requestAnimationFrame(mapLoop); }
$('#overworld').addEventListener('click', e => {
  const c = e.currentTarget, r = c.getBoundingClientRect(), x = (e.clientX - r.left)*c.width/r.width, y = (e.clientY - r.top)*c.height/r.height;
  const hit = mapHits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  if (!hit) return; sfx.blip(); hideMapBanner();
  if (worldOpen(hit.id)){ S.game.current = hit.id; save(); }
  openWorld(hit.id);
});
function renderAll(){ renderHUD(); renderMap(); }

// ---------- World screen (stage list + "Hear the piece") ----------
const SPECIAL_NAME = { ship:'🏴‍☠️ Pirate Ship', barn:'🐔 Inside the Barn', workshop:'🎁 Santa’s Workshop', sky:'☁️ Sky Islands' };
function stagesHTML(id){
  const w = gw(id), rows = [0,1,2,3].map(i => { const st = stageState(id, i), done = i < 3 ? w.cleared[i] : w.boss > 0, sp = i < 3 && window.PQGame && PQGame.SPECIAL && (PQGame.SPECIAL[id] || {})[i], name = i < 3 ? `Stage ${i+1}${SPECIAL_NAME[sp] ? ' · ' + SPECIAL_NAME[sp] : ''}` : '🏰 Boss Castle';
    return `<div class="stage ${st.open?'':'locked'} ${done?'done':''}"><div><b>${done?'⭐':st.open?'▶':'🔒'} ${name}</b>${st.open?'':`<div class="why">${esc(st.why)}</div>`}${done?`<div class="why">Best: ${w.best[i]} notes${i===3&&w.boss>1?` · beaten ×${w.boss}`:''}</div>`:''}</div>
      ${st.open?`<button class="btn ${i===3?'btn-pink':'btn-yellow'} play-btn" data-play="${id}" data-stage="${i}">${done?'REPLAY':'PLAY'}</button>`:''}</div>`; }).join('');
  return `<div class="stages"><div class="lbl">🎮 Stages · ❤️ ${S.game.lives} lives</div>${rows}${id === lastPiece().id ? finalRowsHTML(id) : ''}</div>`;
}
// the final boss lives in the LAST world: a 5th row once that world's boss is beaten, plus "Watch the ending" after Mr. Kurilla is beaten
function finalRowsHTML(id){
  const st = stageState(id, 4), done = !!S.game.finalBossBeaten;
  return `<div class="stage final ${st.open?'':'locked'} ${done?'done':''}"><div><b>${done?'🥁':st.open?'🧙':'🔒'} Final Boss: Mr. Kurilla</b>${st.open?'':`<div class="why">${esc(st.why)}</div>`}${done?`<div class="why">Golden Snare won${S.game.finalWins > 1 ? ` · beaten ×${S.game.finalWins}` : ''}</div>`:''}</div>
      ${st.open?`<button class="btn btn-pink play-btn" data-final="1">${done?'REPLAY':'PLAY'}</button>`:''}</div>
    ${done ? `<div class="stage done"><div><b>🎬 Watch the ending</b><div class="why">Character parade + THE END</div></div><button class="btn btn-yellow play-btn" data-ending="1">WATCH</button></div>` : ''}`;
}
// World screen header: the world's real boss sprite (pixel-perfect scale, gentle glow + idle bob), not an emoji.
// Teacher-made worlds fall back to the golem. In the LAST world, once its boss is beaten, a small Mr. Kurilla teaser joins.
function bossPicHTML(p, w){
  const key = PQSprites.BOSSES.includes((p.world || {}).boss) ? p.world.boss : 'golem', last = p.id === lastPiece().id && w.boss > 0;
  return `<div class="bf boss-pic-wrap${w.boss ? ' beaten' : ''}"><canvas class="boss-pic" data-boss="${key}" role="img" aria-label="${esc(p.boss)}"></canvas>
    ${w.boss ? `<span class="boss-badge">⭐ DEFEATED${w.boss > 1 ? ' ×' + w.boss : ''}</span>` : ''}
    ${last ? `<div class="kurilla-tease" title="Mr. Kurilla"><canvas class="boss-pic" data-boss="kurilla" role="img" aria-label="Mr. Kurilla"></canvas><span>${S.game.finalBossBeaten ? '🥁 Beaten!' : '🧙 Final boss!'}</span></div>` : ''}</div>`;
}
function paintBossPics(body){
  body.querySelectorAll('canvas.boss-pic').forEach(c => { const f = PQSprites.bossFrames(c.dataset.boss).r; c.width = f.width; c.height = f.height;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(f, 0, 0);
    const big = !c.closest('.kurilla-tease'), sc = big ? Math.max(2, Math.round(128/Math.max(f.width, f.height))) : 2;   // whole-number scale = crisp pixels
    c.style.width = f.width*sc + 'px'; c.style.height = f.height*sc + 'px'; });
}
function openWorld(id){
  const p = P[id], w = gw(id), open = worldOpen(id);
  openModal(`
    <div class="boss-hero" style="--c:${p.color}">${bossPicHTML(p, w)}<div class="hint wl">WORLD ${p.lv}</div><h2>${esc(p.title)}</h2>
      <div class="hint">Boss: <b>${esc(p.boss)}</b></div><div class="hint" style="margin-top:6px">${esc(p.blurb)}</div></div>
    ${p.yt ? hearHTML(p) : ''}
    ${stagesHTML(id)}
    <div class="credits">${p.composer?`🎼 ${esc(p.title)} by ${esc(p.composer)}`:''}${p.publisher?` · ${esc(p.publisher)}`:''}</div>
    ${open ? '' : '<p class="hint center">🔒 This world opens after you beat the boss of the world before it.</p>'}`, paintBossPics);
}
const goldName = () => `Golden ${INST_NAME[S.game.inst || 'sax'] || 'Sax'}`;
function hearHTML(p){
  const w = gw(p.id), secs = Math.min(LISTEN_SECS, w.listenSecs || 0);
  return `<div class="hear">
    <button class="hear-big" data-hear="${p.yt}" data-world="${p.id}"><span class="hb-icon">🎧</span><span class="hb-t">HEAR THE PIECE</span>
      <small>${w.golden ? `✨ ${goldName()} unlocked in this world!` : `Listen ~1 min → unlock the ✨ ${goldName()} here`}</small></button>
    <div class="video" id="vid" hidden></div>
    <div class="listen ${w.golden ? 'done' : ''}" id="listen" hidden><div class="listen-fill" id="listen-fill" style="width:${secs/LISTEN_SECS*100}%"></div><span id="listen-text">${w.golden ? `✨ ${goldName()} unlocked!` : `🎧 Listening… ${secs} / ${LISTEN_SECS} s`}</span></div>
    <div class="hear-sub"><span>Optional · play anytime</span><a href="https://www.youtube.com/watch?v=${p.yt}" target="_blank" rel="noopener">↗ YouTube (${esc(p.ytChannel)})</a></div></div>`;
}
// Listening tracker: counts seconds while the embedded recording is actually PLAYING (YouTube iframe postMessage events).
// If the player never reports its state (blocked/old browser), it falls back to time the video is open on screen.
let listen = null;
function stopListen(){ if (!listen) return; clearInterval(listen.timer); clearInterval(listen.ping); save(); listen = null; }
function startListen(id, iframe){
  stopListen(); const L = listen = { id, iframe, playing:false, api:false, opened:Date.now() };
  const ping = () => { try { iframe.contentWindow.postMessage(JSON.stringify({ event:'listening', id:'pq', channel:'widget' }), '*'); } catch(e){} };
  iframe.addEventListener('load', ping); L.ping = setInterval(() => { if (L.api) clearInterval(L.ping); else ping(); }, 1500);
  L.timer = setInterval(() => listenTick(1), 1000);
}
function listenTick(n){
  const L = listen; if (!L || document.hidden || $('#modal').hidden) return;
  const counting = L.api ? L.playing : Date.now() - L.opened > 4000; if (!counting) return;
  const w = gw(L.id); w.listenSecs = Math.min(LISTEN_SECS, (w.listenSecs || 0) + n);
  const fill = $('#listen-fill'), txt = $('#listen-text');
  if (fill) fill.style.width = (w.listenSecs/LISTEN_SECS*100) + '%';
  if (w.listenSecs >= LISTEN_SECS && !w.golden){
    w.golden = true; S.game.lives = Math.min(LIVES_MAX, S.game.lives + 1); const nb = checkBadges(); save(); renderHUD(); sfx.win(); confetti(50);
    $('#listen').classList.add('done'); if (txt) txt.textContent = `✨ ${goldName()} unlocked! +1 ❤️`;
    toast(`✨ <b>${goldName()}</b> unlocked for ${esc(P[L.id].title)}: golden triple notes in every stage of this world! +1 life${nb.length ? ' · 🏅 ' + nb.map(b => esc(b.n)).join(', ') : ''}`);
  } else if (!w.golden && txt) txt.textContent = `🎧 Listening… ${w.listenSecs} / ${LISTEN_SECS} s`;
  if (w.listenSecs % 5 === 0) save();
}
addEventListener('message', e => {
  const L = listen; if (!L || e.source !== L.iframe.contentWindow) return;
  let host = ''; try { host = new URL(e.origin).hostname; } catch(_){}
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
  let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch(_){ return; }
  if (!d || typeof d !== 'object') return;
  if (d.event === 'onStateChange'){ L.api = true; L.playing = d.info === 1; }
  else if (d.event === 'infoDelivery' && d.info && 'playerState' in d.info){ L.api = true; L.playing = d.info.playerState === 1; }
  else if (d.event === 'initialDelivery' || d.event === 'onReady') L.api = true;
});
document.addEventListener('click', e => {
  const h = e.target.closest('[data-hear]'); if (!h) return;
  if (!navigator.onLine){ toast('📡 The recording needs the internet. The game works offline!'); return; }
  const box = $('#vid'); box.hidden = false; h.classList.add('playing'); $('#listen').hidden = false;
  box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${h.dataset.hear}?rel=0&playsinline=1&autoplay=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}" title="Recording" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  if (!gw(h.dataset.world).golden) startListen(h.dataset.world, box.querySelector('iframe'));
  box.scrollIntoView({ behavior:'smooth', block:'nearest' });
});

// ---------- Hero picker (instrument + hair; saved in practiceQuest.v1 as game.inst / game.hair) ----------
function heroPicker(then){
  const insts = PQSprites.INSTR.filter(k => INST_NAME[k]);
  let inst = INST_NAME[S.game.inst] ? S.game.inst : 'sax', hair = HAIR_NAME[S.game.hair] ? S.game.hair : 'short';
  const paint = (c, k, h) => { const x = c.getContext('2d'), f = PQSprites.heroFrames(k, h).stand.r; x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); x.drawImage(f, Math.round((c.width - f.width)/2), c.height - f.height - 1); };
  openModal(`<h2 class="pick-title">🎒 Choose your hero</h2><p class="hint">Pick your instrument. You’ll blast music notes with it!</p><div class="inst-grid" id="inst-grid"></div>
    <div class="lbl">Hair</div><div class="hair-row" id="hair-row">${PQSprites.HAIRS.map(h => `<button class="hair" data-hair="${h}" aria-label="${HAIR_NAME[h]}"><canvas width="30" height="24"></canvas><span>${HAIR_NAME[h]}</span></button>`).join('')}</div>
    <button class="btn btn-big btn-yellow" id="hero-ok" style="margin-top:14px">That’s me! ➜</button>`, body => {
    const draw = () => {
      body.querySelector('#inst-grid').innerHTML = insts.map(k => `<button class="inst ${k===inst?'sel':''}" data-inst="${k}" aria-pressed="${k===inst}"><canvas width="36" height="26"></canvas><span>${INST_NAME[k]}</span></button>`).join('');
      body.querySelectorAll('.inst').forEach(b => paint(b.querySelector('canvas'), b.dataset.inst, hair));
      body.querySelectorAll('.hair').forEach(b => { b.classList.toggle('sel', b.dataset.hair === hair); b.setAttribute('aria-pressed', b.dataset.hair === hair); paint(b.querySelector('canvas'), inst, b.dataset.hair); });
    };
    draw();
    body.addEventListener('click', e => { const i = e.target.closest('[data-inst]'), h = e.target.closest('[data-hair]'); if (i){ inst = i.dataset.inst; sfx.blip(); draw(); } if (h){ hair = h.dataset.hair; sfx.blip(); draw(); } });
    body.querySelector('#hero-ok').onclick = () => { S.game.inst = inst; S.game.hair = hair; save(); modalClose = null; closeModal(); renderAll(); then && then(); };
  });
}

// ---------- Playing a stage ----------
let contTimer = 0;
// GIANT TUBA carry-over: a tuba that still has bass bombs comes along to your NEXT stage in the SAME world (incl. the Boss Castle).
// Kept in memory only (not saved): losing a life, a game over, switching worlds or closing the game drops it.
let tubaCarry = null;
const tubaTally = r => { S.game.tubaKO = (S.game.tubaKO || 0) + (r.tubaKO || 0); };
function playStage(id, i, bossHp){
  if (!S.game.inst) return heroPicker(() => playStage(id, i));
  const st = stageState(id, i); if (!st.open){ toast('🔒 ' + st.why); return; }
  if (S.game.lives <= 0){ S.game.lives = START_LIVES; S.game.score = 0; }
  const p = P[id], startLives = S.game.lives, tuba = tubaCarry && tubaCarry.id === id ? tubaCarry.ammo : 0; tubaCarry = null; S.game.current = id; save(); closeModal();
  clearTimeout(mapRaf); cancelAnimationFrame(mapRaf); mapRaf = 0; mapFx = null; hideMapBanner();
  $('#game').hidden = false; $('#pause-menu').hidden = true; document.body.classList.add('in-game');
  const back = html => { $('#game').hidden = true; document.body.classList.remove('in-game'); renderAll(); startMapLoop(); if (html) openModal(html); };
  PQGame.start($('#game-canvas'), $('#game'), {
    world:i === 4 ? Object.assign({}, p.world, { boss:'kurilla' }) : p.world, seed:p.id, level:i === 4 ? 'final' : i === 3 ? 'boss' : i, label:i === 4 ? 'FINAL BOSS' : i === 3 ? 'BOSS' : `WORLD ${p.lv}-${i+1}`, bossName:i === 4 ? 'Mr. Kurilla' : p.boss,
    inst:S.game.inst, hair:S.game.hair, worldNo:p.lv, lives:S.game.lives, coinBase:S.game.score % 100, bossHp:i >= 3 ? bossHp : 0, golden:!!gw(id).golden, tuba, sfx:S.sound, music:S.music,
    onLifeLost:l => { S.game.lives = Math.max(0, Math.min(LIVES_MAX, l)); save(); },   // also called on a 1-UP
    onPause:pz => { $('#pause-menu').hidden = !pz; },
    onClear:r => { const w = gw(id); S.game.coins += r.coins; S.game.score += r.coins; S.game.lives = r.lives; tubaTally(r); if (r.tuba > 0) tubaCarry = { id, ammo:r.tuba };
      if (i === 4) return finalWin(r, startLives, back);
      if (i < 3){ w.cleared[i] = true; w.best[i] = Math.max(w.best[i], r.coins); } else { w.boss++; w.best[3] = Math.max(w.best[3], r.coins); }
      const nb = checkBadges({ nosweat: r.lives >= startLives }); save(); sfx.win(); confetti(i === 3 ? 140 : 60);
      const nxtWorld = i === 3 ? PIECES[worldIdx(id) + 1] : null, firstWin = i === 3 && w.boss === 1;
      const celebrate = !firstWin ? null : nxtWorld ? 'unlock' : PIECES.every(q => gw(q.id).boss > 0) ? 'final' : null;
      if (celebrate === 'unlock'){ S.game.current = nxtWorld.id; save(); }   // the hero walks to the new island on the map
      const next = i < 3 ? { id, i:i+1 } : null;
      back(`<div class="result"><div class="big">${i===3?'🏰 BOSS DEFEATED!':'🚩 STAGE CLEAR!'}</div><p><b>${esc(p.title)}</b> · ${i===3?esc(p.boss):`Stage ${i+1}`}<br>🪙 ${r.coins} note coins · ❤️ ${r.lives} lives</p>${r.tuba > 0 && i < 3 ? `<p>💥 Your <b>GIANT TUBA</b> (${r.tuba} bass bomb${r.tuba>1?'s':''}) comes with you to the next stage in this world!</p>` : ''}
        ${i===3 ? (nxtWorld ? `<p>🗺️ <b>World ${nxtWorld.lv}: ${esc(nxtWorld.title)}</b> is open!</p>` : '<p>🏆 You beat every world! Replay any stage to chase a high score.</p>') : i===2 ? '<p>🏰 The Boss Castle is open!</p>' : ''}
        ${badgeHTML(nb)}${next ? `<button class="btn btn-big btn-yellow" data-play="${next.id}" data-stage="${next.i}">▶ ${next.i===3?'Storm the castle':next.i===0?`Go to World ${P[next.id].lv}`:`Stage ${next.i+1}`}</button>` : ''}
        ${i === 3 ? `<button class="btn btn-big btn-yellow" id="res-ok">${celebrate === 'unlock' ? `🗺️ See World ${nxtWorld.lv} on the map ➜` : celebrate === 'final' ? (S.game.finalBossBeaten ? '🗺️ See your finished map ➜' : '🧙 Wait... someone’s coming! ➜') : '🗺️ Back to map'}</button>`
                  : `<button class="btn btn-wide btn-ghost" id="res-ok">🗺️ Back to map</button>`}</div>`);
      const ok = $('#res-ok'); if (ok) ok.onclick = closeModal;
      if (i === 3){ const to = celebrate === 'unlock' ? worldIdx(nxtWorld.id) : celebrate === 'final' ? PIECES.length - 1 : worldIdx(id);
        modalClose = () => celebrate === 'final' && !S.game.finalBossBeaten ? openStory(true) : celebrate ? mapCelebrate(celebrate, to) : (renderAll(), focusIsland(to)); } },
    onGameOver:r => { S.game.coins += r.coins; S.game.lives = 0; tubaTally(r); checkBadges(); save(); sfx.over(); back(); continueScreen(id, i, r.bossHp); },
    onQuit:r => { S.game.coins += r.coins; S.game.score += r.coins; tubaTally(r); if (r.tuba > 0) tubaCarry = { id, ammo:r.tuba }; const nb = checkBadges(); save(); back(); if (nb.length) toast('🏅 New badge: ' + nb.map(b => esc(b.n)).join(', ')); else if (i === 4) toast(`🧙 Mr. Kurilla is waiting for you in World ${p.lv}. Try again anytime!`); },
  });
}
function continueScreen(id, i, bossHp){
  let n = CONTINUE_SECS; clearInterval(contTimer);
  const finish = () => { clearInterval(contTimer); S.game.lives = START_LIVES; S.game.score = 0; save(); renderAll(); };
  modalClose = () => { clearInterval(contTimer); if (S.game.lives <= 0){ finish(); toast('GAME OVER. Your cleared stages are saved. Lives are back to 5.'); } };
  openModal(`<div class="result continue"><div class="big">GAME OVER</div><p class="hint">Your cleared stages are saved.${i >= 3 && bossHp ? ' Continue now and the boss keeps the damage you did!' : ''}</p><div class="cont-q">CONTINUE?</div><div class="cont-n" id="cont-n">${n}</div>
    <button class="btn btn-big btn-yellow" id="cont-yes">▶ YES! (${START_LIVES} lives)</button><button class="btn btn-wide btn-ghost" id="cont-no">🗺️ No, back to map</button></div>`, body => {
    body.querySelector('#cont-yes').onclick = () => { S.game.continues++; finish(); checkBadges(); save(); modalClose = null; closeModal(); playStage(id, i, bossHp); };
    body.querySelector('#cont-no').onclick = () => closeModal();
  });
  contTimer = setInterval(() => { n--; const el = $('#cont-n'); if (el) el.textContent = Math.max(0, n); sfx.tick(); if (n <= 0) closeModal(); }, 1000);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b){ modalClose = null; playStage(b.dataset.play, +b.dataset.stage); }
  if (e.target.closest('[data-final]')){ modalClose = null; openStory(); }
  if (e.target.closest('[data-ending]')){ modalClose = null; playEnding(false); } });

// ---------- Finale: story scene → final boss (Mr. Kurilla) → ending parade → THE END → Play Again ----------
const lastPiece = () => PIECES[PIECES.length - 1] || {};
const NUM_WORD = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 .!?-]/g, '').trim();
const pauseMap = () => { closeModal(); hideMapBanner(); clearTimeout(mapRaf); cancelAnimationFrame(mapRaf); mapRaf = 0; mapFx = null; document.body.classList.add('in-game'); };
const resumeMap = () => { document.body.classList.remove('in-game'); renderAll(); startMapLoop(); };
let story = null, fin = null, storyFirst = false;   // storyFirst: opened straight from the last world's first boss win
function storyLines(){ const n = NUM_WORD[PIECES.length] || PIECES.length; return [
  { who:'kurilla', t:`Well, well, well... look who made it through all ${n} worlds!` },
  { who:'hero', t:'Mr. Kurilla?! Why are you dressed like a wizard?' },
  { who:'kurilla', t:`I am the Maestro of this quest! You beat all ${n} worlds... but to win the <b>GOLDEN SNARE DRUM</b>, you have to beat ME!`, drum:true },
  { who:'hero', t:'Bring it on! I’ve been practicing!', cheer:true },
  { who:'kurilla', t:'Let’s see if you can keep the beat! Ready... and a one, two, three, four!' } ]; }
function openStory(first){
  storyFirst = first === true; if (!S.game.inst) return heroPicker(openStory);
  const st = stageState(lastPiece().id, 4); if (!st.open){ toast('🔒 ' + st.why); return; }
  pauseMap(); const lines = storyLines(), ctl = PQFinale.story($('#story-canvas'), { inst:S.game.inst, hair:S.game.hair });
  $('#story').hidden = false; $('#talk').hidden = false; $('#story-go').hidden = true; $('#story-skip').hidden = false;
  story = { ctl, n:-1, lines, ready:false,
    next(){ if (this.ready) return; if (this.n >= lines.length - 1) return this.done(); const L = lines[++this.n]; ctl.set(L);
      const who = $('#talk-who'); who.textContent = L.who === 'hero' ? (S.name || 'You') : '🧙 Mr. Kurilla'; who.className = 'talk-who' + (L.who === 'hero' ? ' hero' : '');
      $('#talk-text').innerHTML = L.t; sfx.blip(); },
    done(){ this.ready = true; ctl.set({ who:'kurilla', drum:true, cheer:true }); $('#talk').hidden = true; $('#story-skip').hidden = true; $('#story-go').hidden = false; sfx.unlock(); } };
  story.next();
}
function closeStory(){ if (!story) return; story.ctl.stop(); story = null; $('#story').hidden = true; }
$('#talk').onclick = () => story && story.next();
$('#talk').onkeydown = e => { if (story && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); story.next(); } };
$('#story-skip').onclick = () => story && story.done();
$('#story-fight').onclick = () => { closeStory(); playStage(lastPiece().id, 4); };
$('#story-later').onclick = () => { closeStory(); resumeMap(); if (storyFirst) mapCelebrate('final', PIECES.length - 1); else toast(`🧙 Mr. Kurilla is waiting for you in World ${lastPiece().lv}.`); };
function finalWin(r, startLives, back){
  const first = !S.game.finalBossBeaten; S.game.finalBossBeaten = true; S.game.finalWins = (S.game.finalWins || 0) + 1;
  const nb = checkBadges({ nosweat: r.lives >= startLives }); save(); sfx.win(); confetti(180); setTimeout(() => confetti(120), 900);
  back(`<div class="result"><div class="big">🥁 YOU WON!</div><canvas id="res-drum" class="res-drum" width="24" height="20" aria-label="golden snare drum"></canvas>
    <p><b>Mr. Kurilla</b> is defeated!<br>The <b>GOLDEN SNARE DRUM</b> is yours!<br>🪙 ${r.coins} note coins · ❤️ ${r.lives} lives</p>${badgeHTML(nb)}
    <button class="btn btn-big btn-yellow" id="res-ok">🎉 Celebrate! ➜</button></div>`);
  const c = $('#res-drum'); if (c){ const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(PQSprites.snare(), 0, 0); }
  $('#res-ok').onclick = closeModal; modalClose = () => playEnding(first);
}
const ENEMY_NAME = { imp:'Frost Imp', chicken:'Rubber Chicken', ginger:'Gingerbread Grunt', wisp:'Star Wisp', ghost:'Tango Ghost', gremlin:'Sour-Note Gremlin' };
const BOSS_NAME = { valkyrie:'Skadi the Valkyrie', cluckzilla:'Admiral Cluckzilla', santa:'Santa the Barbarian', dragon:'Deja Vu Dragon', spectro:'Senor Spectro', golem:'Stone Golem' };
function finaleCast(){
  const inst = S.game.inst || 'sax', hair = S.game.hair || 'short', worlds = PIECES.map(p => p.world || {});
  const ens = [...new Set(worlds.map(w => w.enemy).filter(Boolean))], bos = [...new Set(worlds.map(w => w.boss).filter(Boolean))];
  const bossName = k => BOSS_NAME[k] || plain((PIECES.find(p => (p.world || {}).boss === k) || {}).boss) || k;
  const guests = [...(ens.includes('gremlin') ? [] : [{ kind:'enemy', type:'gremlin', name:ENEMY_NAME.gremlin }]), ...(bos.includes('golem') ? [] : [{ kind:'boss', type:'golem', name:BOSS_NAME.golem }])];
  return [
    { title:'STARRING', cols:1, list:[{ kind:'hero', inst, hair, gold:PIECES.some(p => gw(p.id).golden), big:true, name:plain(S.name) || 'You' }] },
    { title:'THE BAND', cols:3, list:Object.keys(INST_NAME).map((k, i) => ({ kind:'hero', inst:k, hair:i % 2 ? 'long' : 'short', name:INST_NAME[k] })) },
    { title:'WORLD BADDIES', cols:3, list:ens.map(k => ({ kind:'enemy', type:k, name:ENEMY_NAME[k] || plain(k) })) },
    { title:'TROUBLEMAKERS', cols:2, list:[['dino', 'Mr. Dinosaur'], ['meep', 'Meep'], ['dragon', 'Burney'], ['hedgehog', 'Hedgehog Archer'], ['frog', 'Froppy']].map(([type, name]) => ({ kind:'enemy', type, name })) },
    { title:'THE BOSSES', cols:3, list:bos.map(k => ({ kind:'boss', type:k, name:bossName(k) })) },
    ...(guests.length ? [{ title:'SPECIAL GUESTS', cols:2, list:guests }] : []),
    { title:'AND THE MAESTRO', cols:2, list:[{ kind:'wizard', name:'Mr. Kurilla' }, { kind:'drum', name:'The Golden Snare' }] },
  ];
}
function playEnding(first){
  pauseMap(); if (fin){ fin.ctl.stop(); PQGame.finale.stop(); }
  const cast = finaleCast(); $('#finale').hidden = false; $('#finale-end').hidden = true; $('#finale-skip').hidden = false;
  $('#credits-list').innerHTML = cast.map(g => `<li>${esc(g.title)}: ${g.list.map(c => esc(c.name)).join(', ')}</li>`).join('');
  PQGame.finale.start(S.music);
  const ctl = PQFinale.credits($('#finale-canvas'), cast, { onEnd:() => { $('#finale-end').hidden = false; $('#finale-skip').hidden = true; $('#finale-again').focus(); } });
  fin = { ctl, first, cast };
}
$('#finale-skip').onclick = () => fin && fin.ctl.skip();
$('#finale-again').onclick = () => { if (!fin) return; const first = fin.first; fin.ctl.stop(); PQGame.finale.stop(); fin = null; $('#finale').hidden = true; sfx.blip();
  resumeMap(); if (first) mapCelebrate('final', PIECES.length - 1); else focusIsland(PIECES.length - 1); };
$('#btn-pause').onclick = () => PQGame.togglePause();
$('#pm-resume').onclick = () => PQGame.togglePause(false);
$('#pm-quit').onclick = () => { if (confirm('Quit this stage and go back to the map?')) PQGame.quit(); };
$('#pm-music').onclick = () => { S.music = !S.music; save(); audioWant(); $('#pm-music').textContent = `🎵 Music: ${S.music?'on':'off'}`; toast('Music change applies next stage.'); };
$('#hero-btn').onclick = () => heroPicker();

// ---------- Badges & settings (modals) ----------
$('#badges-btn').onclick = () => {
  const got = BADGES.filter(b => S.badges[b.id]).length;
  openModal(`<h2 class="pick-title">🏆 Badges <small>${got}/${BADGES.length}</small></h2>
    <div class="stats">${[[starsDone() + '/' + PIECES.length*4,'Cleared ⭐'],[PIECES.filter(p => gw(p.id).boss > 0).length,'Bosses'],[S.game.coins,'Note coins']].map(([v,l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <div class="badge-grid">${BADGES.map(b => { const g = S.badges[b.id]; return `<div class="badge ${g?'':'locked'}"><div class="be">${b.e}</div><div class="bn">${b.n}</div><div class="bd">${g?'Earned '+fmtDate(g):b.d}</div></div>`; }).join('')}</div>`);
};
// Settings → sound check: shows whether the game's audio is actually running, with Test / Reset buttons for phones
let scStop = null;
function soundCheck(body){
  const el = body.querySelector('#snd-status'), tip = body.querySelector('#snd-tip'); if (!el) return; const a = PQGame.audio.status();
  const live = a.state === 'running';
  el.className = 'sc-status ' + (!a.supported ? 'bad' : live ? 'good' : 'warn');
  el.textContent = !a.supported ? '🔇 This browser can’t play game sound' : !S.sound && !S.music ? '🔇 Sound effects and music are both OFF (turn them on below)'
    : a.needRebuild ? '🎧 Audio changed (earbuds/Bluetooth?): tap “Test sound”'
    : live ? `🔊 Sound: on ✓${S.sound ? '' : ' (effects off)'}${S.music ? '' : ' (music off)'}` : '🔇 Sound: tap “Test sound” to enable';
  if (a.needRebuild && el.className.includes('good')) el.className = 'sc-status warn';
  tip.innerHTML = a.ios ? '📱 iPhone/iPad: game sound plays even with the silent switch on while Band Quest is open, and the game lets go of the sound as soon as you leave it. Plugged in earbuds or Bluetooth? The game switches over on your next tap. No chime? Turn the volume up with the side buttons, then tap <b>Reset sound</b>.'
    : 'No chime? Check the device volume, then tap <b>Reset sound</b>.';
}
function settings(){
  openModal(`<h2 class="pick-title">⚙️ Settings</h2><div class="settings">
    <button id="rename-btn" class="btn btn-wide btn-ghost">✏️ Change nickname</button>
    <div class="sound-check" id="sound-check"><div class="sc-status" id="snd-status" role="status" aria-live="polite"></div>
      <div class="sc-row"><button id="snd-test" class="btn btn-yellow">🔔 Test sound</button><button id="snd-reset" class="btn btn-ghost">🛠️ Reset sound</button></div>
      <p class="hint sc-tip" id="snd-tip"></p></div>
    <button id="sound-btn" class="btn btn-wide btn-ghost">🔊 Sound effects: ${S.sound?'on':'off'}</button>
    <button id="music-btn" class="btn btn-wide btn-ghost">🎵 Music: ${S.music?'on':'off'}</button>
    <button id="backup-btn" class="btn btn-wide btn-ghost">💾 Copy backup code (new phone?)</button>
    <button id="restore-btn" class="btn btn-wide btn-ghost">📥 Restore from backup code</button>
    <button id="reset-btn" class="btn btn-wide btn-ghost danger">🗑️ Reset all progress</button>
    ${standalone() ? '' : `<p class="hint">📲 <b>Home screen:</b> iPhone: tap Share ⬆️ then <b>Add to Home Screen</b>. Android: ⋮ then <b>Install app</b>. Then it works offline.</p>`}
    ${deferred ? '<button id="install-btn" class="btn btn-wide btn-yellow">📲 Install Band Quest</button>' : ''}
    <p class="hint">🔒 No accounts, no tracking, nothing leaves this device. Progress is saved in this browser only. Recordings open in YouTube’s privacy-enhanced (no-cookie) player only when you tap 🎧.</p>
    <p class="hint">All game art and sounds are original. Music recordings belong to their composers and publishers and are linked from official YouTube channels.</p></div>`, body => {
    body.querySelector('#rename-btn').onclick = () => { const n = prompt('New nickname or first name (no last names):', S.name); if (n && n.trim()){ S.name = cleanName(n); save(); renderAll(); } };
    body.querySelector('#sound-btn').onclick = () => { S.sound = !S.sound; save(); audioWant(); settings(); };
    body.querySelector('#music-btn').onclick = () => { S.music = !S.music; save(); audioWant(); settings(); };
    if (scStop) scStop(); const paint = () => soundCheck(body); paint(); const off = PQGame.audio.onChange(paint), t = setInterval(paint, 700);
    scStop = () => { off(); clearInterval(t); scStop = null; }; modalClose = () => scStop && scStop();
    body.querySelector('#snd-test').onclick = () => { PQGame.audio.test(); setTimeout(paint, 250); };
    body.querySelector('#snd-reset').onclick = () => { PQGame.audio.reset(); setTimeout(paint, 250); toast('🛠️ Sound was reset. Did you hear the chime?'); };
    body.querySelector('#reset-btn').onclick = () => { if (confirm('Erase ALL game progress on this device? This cannot be undone.')){ localStorage.removeItem(KEY); location.reload(); } };
    body.querySelector('#backup-btn').onclick = async () => { const code = 'PQ1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      try { await navigator.clipboard.writeText(code); toast('💾 Backup code copied! Paste it somewhere safe (like a note).'); }
      catch(e){ openModal(`<h3>💾 Your backup code</h3><p class="hint">Copy all of this and keep it somewhere safe.</p><textarea style="width:100%;height:160px;font-size:12px" readonly>${esc(code)}</textarea>`); } };
    body.querySelector('#restore-btn').onclick = () => { const code = (prompt('Paste your backup code (starts with PQ1:)') || '').trim(); if (!code) return;
      try { const d = JSON.parse(decodeURIComponent(escape(atob(code.replace(/^PQ1:/,''))))); if (!d || d.v !== 1 || typeof d !== 'object') throw 0;
        if (!confirm('Replace the progress on this phone with the backup?')) return; S = d; load(true); save(); closeModal(); renderAll(); toast('📥 Restored!'); }
      catch(e){ toast('😕 That code didn’t work. Check you copied all of it.'); } };
    const ib = body.querySelector('#install-btn'); if (ib) ib.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; closeModal(); };
  });
}
$('#settings-btn').onclick = settings;
$('#hud-avatar').onclick = () => { S.avatar = AVATARS[(AVATARS.indexOf(S.avatar)+1) % AVATARS.length]; save(); renderHUD(); sfx.blip(); };
const cleanName = n => n.replace(/[<>]/g,'').trim().split(/\s+/)[0].slice(0,16);
let deferred = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });

// ---------- Boot ----------
function startApp(){
  audioWant();
  $('#screen-welcome').hidden = true; ['#hud','#main'].forEach(s => $(s).hidden = false);
  renderAll(); startMapLoop();
  if (memOnly) toast('⚠️ This browser is blocking storage (private mode?). Progress won’t be saved.');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
}
load();
if (new URLSearchParams(location.search).has('teacher')){
  $('#screen-welcome').hidden = true;
  const sc = document.createElement('script'); sc.src = 'teacher.js';
  sc.onload = () => window.PQTeacher.open({ raw:RAW, pin:TEACHER_PIN, usingDraft:USING_DRAFT, draftKey:DRAFT_KEY, ytId });
  document.body.appendChild(sc);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  return;
}
$('#welcome-form').onsubmit = e => { e.preventDefault(); const n = cleanName($('#nick').value); if (!n) return; S.name = n; save(); startApp(); confetti(40); };
if (S.name) startApp(); else $('#screen-welcome').hidden = false;
// (this code runs after an await, so the page's 'load' event has usually ALREADY fired: register now in that case, otherwise on load)
if ('serviceWorker' in navigator && location.protocol !== 'file:'){ const reg = () => navigator.serviceWorker.register('sw.js').catch(()=>{});
  if (document.readyState === 'complete') reg(); else addEventListener('load', reg); }
window.__PQ = { get state(){ return S; }, PIECES, listenTick, openStory, playEnding, finaleCast, finaleStep(sec){ if (fin) for (let i = 0; i < sec*30; i++) fin.ctl.step(1/30); },
  get finale(){ return { story:story && { n:story.n, lines:story.lines.length, ready:story.ready, who:story.ctl.state.who, drum:story.ctl.state.drum },
    credits:fin && { phase:fin.ctl.state.phase, t:fin.ctl.state.t, total:fin.ctl.total, shown:[...fin.ctl.state.shown], cast:fin.cast.map(g => g.list.map(c => c.name)).flat() }, music:PQGame.finale.playing }; }, get listen(){ return listen && { id:listen.id, api:listen.api, playing:listen.playing }; } };
if (USING_DRAFT && S.name) toast('🧪 Teacher preview: showing draft worlds on this phone only.');
})();
