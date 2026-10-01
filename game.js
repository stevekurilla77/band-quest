/* Band Quest — original 16-bit-style platformer engine. All art is drawn in code (see sprites.js);
   all sounds and music are synthesized live with Web Audio. */
(() => {
'use strict';
const SP = window.PQSprites;
const W = 256, H = 224, TS = 16, ROWS = 14;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ENEMY_FLY = { wisp:true, ghost:true, dragon:true };
// GIANT TUBA power-up: rare pickup (one golden ♪ block per stage) that fires arcing bass bombs
const TUBA = { ammo:5, cool:.8, radius:34, bossDmg:3 };
// "Mix-in" enemies: they join every world's own enemy (see mixEnemies). w/h = hitbox, hp = note hits needed (one stomp or one bass bomb always wins).
const ENEMY_KIND = {
  dino:    { w:18, h:18, hp:2, speed:22 },            // Mr. Dinosaur: big, slow walker, takes 2 notes
  meep:    { w:12, h:14, hop:true, speed:40 },        // Meep the green alien: hops back and forth
  dragon:  { w:14, h:12, wave:true, speed:34 },       // Sparky the little dragon: flies in a wave
  hedgehog:{ w:14, h:10, archer:true, speed:8 },      // hedgehog archer: shuffles, winds up, throws a slow toy arrow
};
// hedgehog fairness: only throws at a hero who is on screen and not too close, warns first (wind-up + "!"), one arrow at a time, long cooldown
const ARCHER = { range:168, min:30, rise:56, wind:.8, cool:2.8, speed:72, life:3.2, first:1.6 };

// ---------- themes ----------
const THEMES = {
  snow:   { sky:['#1b2a6b','#3556a8','#6f9be0','#b9d6ff'], far:'mountains', near:'pines', top:'#f4f8ff', top2:'#a9c4e8', fill:'#5d6f96', fill2:'#45557a', block:'#8fb8e8', pillar:'ice', fx:'snow', music:{ root:57, minor:true, bpm:132 } },
  farm:   { sky:['#4aa0e8','#6cb8f2','#98d0f8','#cceeff'], far:'hills', near:'barn', top:'#5fcf4e', top2:'#2f8a2f', fill:'#a8642a', fill2:'#7c4519', block:'#e0a040', pillar:'hay', fx:'none', music:{ root:60, minor:false, bpm:150 } },
  candy:  { sky:['#2a1257','#5a2280','#a83c8c','#f08ab0'], far:'fortress', near:'gumdrops', top:'#ffffff', top2:'#ffc0d8', fill:'#e83a4a', fill2:'#ffffff', stripes:true, block:'#3ddc84', pillar:'chimney', fx:'snow', stars:true, music:{ root:62, minor:false, bpm:144 } },
  castle: { sky:['#0c0a2a','#1e1650','#33246e','#4f3a90'], far:'castle', near:'banners', top:'#a8aec4', top2:'#6a7088', fill:'#4a4e66', fill2:'#363a50', bricks:true, block:'#ffd23f', pillar:'tower', fx:'stars', stars:true, music:{ root:55, minor:true, bpm:124 } },
  haunted:{ sky:['#160a26','#22113a','#2c1746','#381d56'], far:'ballroom', near:'chandeliers', top:'#eeeeee', top2:'#26203a', checker:true, fill:'#2a1840', fill2:'#1e1030', block:'#9b5de5', pillar:'column', fx:'dust', music:{ root:52, minor:true, bpm:116, tango:true } },
  meadow: { sky:['#3c98e0','#64b4f0','#94ccf6','#d0ecff'], far:'hills', near:'flowers', top:'#6ad04a', top2:'#2f8a2f', fill:'#c0844a', fill2:'#8a5a2a', block:'#ff8c42', pillar:'stone', fx:'none', music:{ root:60, minor:false, bpm:138 } },
};
function shade(hex, f){ const n = parseInt(hex.slice(1), 16); let r = n>>16, g = n>>8&255, b = n&255;
  const m = v => clamp(Math.round(f < 0 ? v*(1+f) : v + (255-v)*f), 0, 255); return '#' + [m(r),m(g),m(b)].map(v => v.toString(16).padStart(2,'0')).join(''); }
function themeOf(world = {}){
  const base = THEMES[world.theme] || THEMES.meadow, c = world.colors || {}, th = Object.assign({ key: THEMES[world.theme] ? world.theme : 'meadow' }, base);
  if (c.sky) th.sky = [shade(c.sky,-.55), shade(c.sky,-.3), c.sky, shade(c.sky,.45)];
  if (c.ground){ th.fill = c.ground; th.fill2 = shade(c.ground,-.25); }
  if (c.groundTop){ th.top = c.groundTop; th.top2 = shade(c.groundTop,-.3); }
  if (c.accent) th.block = c.accent;
  th.id = th.key + JSON.stringify(c);
  return th;
}

// ---------- seeded random ----------
function hash(s){ let h = 2166136261; for (const ch of String(s)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- pre-rendered backgrounds & tiles (pixel shapes made of rects) ----------
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const tri = (x, p, a) => a * (1 - Math.abs(((((x % p) + p) % p) / p) * 2 - 1));
const bgCache = {};
function backgrounds(th){
  if (bgCache[th.id]) return bgCache[th.id];
  const [sky, s] = cv(W, H), bh = H / 4;
  th.sky.forEach((col, i) => { s.fillStyle = col; s.fillRect(0, i*bh, W, bh+1); });
  for (let i = 1; i < 4; i++) { s.fillStyle = th.sky[i]; for (let x = 0; x < W; x += 2) { s.fillRect(x + (i%2), i*bh - 2, 1, 1); s.fillRect(x, i*bh - 4, 1, 1); } } // dithered band edges
  if (th.stars || th.fx === 'stars'){ const R = rng(hash(th.id)); for (let i = 0; i < 60; i++){ s.fillStyle = R() < .2 ? '#ffd23f' : '#ffffff'; s.fillRect(Math.floor(R()*W), Math.floor(R()*H*.6), 1, 1); } }
  if (th.far === 'mountains' || th.far === 'castle' || th.far === 'fortress'){ s.fillStyle = '#fff6c8'; s.fillRect(196, 22, 14, 14); s.fillRect(194, 24, 18, 10); s.fillStyle = th.sky[0]; s.fillRect(202, 22, 8, 8); } // moon
  const [far, f] = cv(512, H), [near, n] = cv(512, H);
  const col = (ctx, x, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, H - h, 1, h); };
  const R = rng(hash(th.id + 'bg'));
  switch (th.far){
    case 'mountains':
      for (let x = 0; x < 512; x++){ const h = 70 + tri(x, 128, 70) + tri(x + 40, 64, 18); col(f, x, h, '#7f97cc'); f.fillStyle = '#eef4ff'; f.fillRect(x, H - h, 1, Math.max(0, h - 118)); }
      for (let x = 0; x < 512; x++){ const h = 40 + tri(x + 64, 256, 60) + tri(x, 32, 8); col(f, x, h, '#56699f'); f.fillStyle = '#dce8ff'; f.fillRect(x, H - h, 1, Math.max(0, h - 92)); }
      break;
    case 'hills':
      for (let x = 0; x < 512; x++){ const h = 64 + 18*Math.sin(x*Math.PI*2/256) + 10*Math.sin(x*Math.PI*2/128 + 1); col(f, x, h, '#7ccf6a'); f.fillStyle = '#4c9e44'; f.fillRect(x, H - h, 1, 2); }
      for (let i = 0; i < 4; i++){ const cx = i*128 + 30 + Math.floor(R()*40), cy = 30 + Math.floor(R()*30); f.fillStyle = '#ffffff';
        f.fillRect(cx, cy, 40, 10); f.fillRect(cx + 6, cy - 6, 18, 8); f.fillRect(cx + 20, cy - 10, 14, 12); f.fillStyle = '#d6ecff'; f.fillRect(cx, cy + 8, 40, 2); }
      break;
    case 'fortress': {
      const base = '#3a1460';
      for (let x = 0; x < 512; x++) col(f, x, 60 + tri(x, 128, 12), base);
      for (const tx of [40, 150, 260, 380, 470]){ const th2 = 90 + Math.floor(R()*40), tw = 22;
        for (let y = H - th2; y < H; y++) for (let x = 0; x < tw; x++){ f.fillStyle = (((x + y) >> 2) & 1) ? '#e83a4a' : '#ffe0ea'; f.fillRect(tx + x, y, 1, 1); }
        for (let r = 0; r < 14; r++){ f.fillStyle = '#ff4f79'; f.fillRect(tx + tw/2 - r, H - th2 - 14 + r, r*2, 1); }
        f.fillStyle = '#ffd23f'; f.fillRect(tx + 8, H - th2 + 20, 6, 8); }
      break; }
    case 'castle': {
      const c = '#251c4a';
      for (let x = 0; x < 512; x++) col(f, x, 50 + tri(x, 256, 20), '#1a1440');
      for (const [cx, cw, chh] of [[60,90,90],[250,140,110],[420,70,80]]){
        f.fillStyle = c; f.fillRect(cx, H - chh, cw, chh);
        for (let x = 0; x < cw; x += 10) f.fillRect(cx + x, H - chh - 6, 6, 6);
        for (const t of [cx - 10, cx + cw - 6]){ f.fillRect(t, H - chh - 40, 16, chh + 40); for (let r = 0; r < 12; r++) f.fillRect(t + 8 - r, H - chh - 52 + r, r*2, 1); }
        f.fillStyle = '#ffd23f'; for (let i = 0; i < 6; i++) f.fillRect(cx + 10 + Math.floor(R()*(cw - 20)), H - chh + 14 + Math.floor(R()*40), 4, 6); }
      break; }
    case 'ballroom': {
      f.fillStyle = '#2a1640'; f.fillRect(0, 0, 512, H);
      f.fillStyle = '#331c4e'; for (let y = 0; y < H; y += 16) for (let x = (y/16 % 2) * 8; x < 512; x += 16) { f.fillRect(x + 6, y + 6, 4, 4); }
      for (const wx of [40, 168, 296, 424]){ f.fillStyle = '#120a20'; f.fillRect(wx - 4, 40, 56, 130);
        for (let r = 0; r < 24; r++){ const half = Math.round(Math.sqrt(24*24 - (24 - r)*(24 - r))); f.fillRect(wx + 24 - half - 4, 16 + r, half*2 + 8, 1); }
        f.fillStyle = '#1c2c62'; f.fillRect(wx, 44, 48, 122); for (let r = 0; r < 22; r++){ const half = Math.round(Math.sqrt(22*22 - (22 - r)*(22 - r))); f.fillRect(wx + 24 - half, 22 + r, half*2, 1); }
        f.fillStyle = '#120a20'; f.fillRect(wx + 23, 22, 2, 144); f.fillRect(wx, 100, 48, 2);
        if (wx === 168){ f.fillStyle = '#fff6c8'; f.fillRect(wx + 30, 52, 10, 10); f.fillRect(wx + 28, 54, 14, 6); }
        f.fillStyle = '#7a1030'; f.fillRect(wx - 14, 12, 12, 160); f.fillRect(wx + 50, 12, 12, 160); f.fillStyle = '#a8183e'; f.fillRect(wx - 12, 12, 3, 160); f.fillRect(wx + 52, 12, 3, 160); }
      f.fillStyle = '#7a1030'; f.fillRect(0, 0, 512, 10); f.fillStyle = '#ffd23f'; for (let x = 0; x < 512; x += 8) f.fillRect(x, 10, 4, 3);
      break; }
  }
  switch (th.near){
    case 'pines':
      for (let i = 0; i < 8; i++){ const cx = i*64 + 20 + Math.floor(R()*24), hh = 50 + Math.floor(R()*30), base = H - 22;
        n.fillStyle = '#4a2a12'; n.fillRect(cx - 1, base - 6, 3, 8);
        for (let r = 0; r < hh; r++){ const w = Math.floor(r*0.38) + 1; n.fillStyle = (r % 12 === 0 && r) ? '#eef4ff' : '#1f5a3a'; n.fillRect(cx - w, base - hh + r - 6, w*2 + 1, 1); } }
      break;
    case 'barn': {
      n.fillStyle = '#ffffff'; for (let x = 0; x < 512; x += 16){ n.fillRect(x, H - 40, 3, 24); } n.fillRect(0, H - 34, 512, 2); n.fillRect(0, H - 26, 512, 2);
      const bx = 120; n.fillStyle = '#c0283a'; n.fillRect(bx, H - 90, 70, 70); for (let r = 0; r < 26; r++){ n.fillRect(bx + 35 - r*1.4, H - 116 + r, r*2.8, 1); }
      n.fillStyle = '#ffffff'; n.fillRect(bx + 22, H - 56, 26, 36); n.fillStyle = '#c0283a'; n.fillRect(bx + 25, H - 53, 20, 30); n.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++){ n.fillRect(bx + 25 + i, H - 53 + i*1.5, 2, 2); n.fillRect(bx + 44 - i, H - 53 + i*1.5, 2, 2); }
      n.fillStyle = '#ffd23f'; n.fillRect(bx + 29, H - 84, 12, 10);
      n.fillStyle = '#b8b8c8'; n.fillRect(360, H - 110, 26, 90); n.fillStyle = '#d8d8e8'; for (let r = 0; r < 13; r++){ const h2 = Math.round(Math.sqrt(169 - (13 - r)*(13 - r))); n.fillRect(373 - h2, H - 123 + r, h2*2, 1); }
      n.fillStyle = '#e8c050'; n.fillRect(260, H - 40, 30, 20); n.fillRect(292, H - 40, 30, 20); n.fillStyle = '#b89030'; n.fillRect(260, H - 32, 62, 2);
      break; }
    case 'gumdrops':
      for (let i = 0; i < 6; i++){ const cx = i*86 + 20 + Math.floor(R()*20), c = ['#3ddc84','#ff4f79','#ffd23f','#7cc0ff'][i%4];
        if (i % 2){ n.fillStyle = '#ffffff'; n.fillRect(cx, H - 80, 4, 60); n.fillRect(cx, H - 84, 14, 4); n.fillRect(cx + 12, H - 84, 4, 12);
          n.fillStyle = '#e83a4a'; for (let y = 0; y < 60; y += 6) n.fillRect(cx, H - 80 + y, 4, 3); n.fillRect(cx + 4, H - 84, 4, 4); }
        else { for (let r = 0; r < 16; r++){ const h2 = Math.round(Math.sqrt(256 - (16 - r)*(16 - r))); n.fillStyle = c; n.fillRect(cx + 16 - h2, H - 38 + r, h2*2, 1); }
          n.fillStyle = '#ffffff'; n.fillRect(cx + 9, H - 34, 3, 3); } }
      break;
    case 'banners':
      for (let i = 0; i < 5; i++){ const cx = i*104 + 30, c = i % 2 ? '#e83a4a' : '#3a6ee8';
        n.fillStyle = '#5a3412'; n.fillRect(cx, H - 120, 3, 100); n.fillStyle = c; n.fillRect(cx + 3, H - 118, 18, 30);
        n.fillStyle = '#ffd23f'; n.fillRect(cx + 10, H - 110, 4, 4); for (let r = 0; r < 6; r++){ n.fillStyle = c; n.fillRect(cx + 3, H - 88 + r, 9 - r, 1); n.fillRect(cx + 12 + r, H - 88 + r, 9 - r, 1); } }
      break;
    case 'chandeliers':
      for (const cx of [100, 356]){ n.fillStyle = '#c08a10'; n.fillRect(cx, 0, 2, 30); n.fillRect(cx - 24, 30, 50, 3); n.fillRect(cx - 16, 36, 34, 2);
        for (const dx of [-24, -12, 0, 12, 24]){ n.fillStyle = '#fff6c8'; n.fillRect(cx + dx, 24, 2, 6); n.fillStyle = '#ff8c42'; n.fillRect(cx + dx, 21, 2, 3); } }
      break;
    case 'flowers':
      for (let i = 0; i < 10; i++){ const cx = i*52 + Math.floor(R()*20); n.fillStyle = '#3a9a35'; n.fillRect(cx, H - 36, 26, 14); n.fillRect(cx + 4, H - 42, 18, 8);
        n.fillStyle = ['#ff4f79','#ffd23f','#ffffff'][i%3]; n.fillRect(cx + 6, H - 40, 3, 3); n.fillRect(cx + 16, H - 37, 3, 3); }
      break;
  }
  return bgCache[th.id] = { sky, far, near };
}
const tileCache = {};
function tiles(th){
  if (tileCache[th.id]) return tileCache[th.id];
  const t = {}, mk = fn => { const [c, x] = cv(TS, TS); fn(x); return c; };
  const k = '#1a1030', dots = (x, c) => { x.fillStyle = c; [[3,3],[11,6],[6,11],[13,13],[1,9]].forEach(([a,b]) => x.fillRect(a, b, 2, 2)); };
  const fillTex = x => {
    x.fillStyle = th.fill; x.fillRect(0, 0, TS, TS);
    if (th.stripes){ for (let y = 0; y < TS; y++) for (let i = 0; i < TS; i++) if (((i + y) >> 2) & 1){ x.fillStyle = th.fill2; x.fillRect(i, y, 1, 1); } }
    else if (th.bricks || th.checker){ x.fillStyle = th.fill2; x.fillRect(0, 7, TS, 1); x.fillRect(0, 15, TS, 1); x.fillRect(7, 0, 1, 7); x.fillRect(15, 8, 1, 7); }
    else dots(x, th.fill2);
  };
  t.fill = mk(fillTex);
  t.top = mk(x => {
    fillTex(x);
    if (th.checker){ for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++){ x.fillStyle = (i + j) % 2 ? th.top : th.top2; x.fillRect(i*8, j*8, 8, 8); } x.fillStyle = '#ffffff'; x.fillRect(0, 0, TS, 1); return; }
    x.fillStyle = th.top; x.fillRect(0, 0, TS, 5); x.fillRect(2, 5, 3, 2); x.fillRect(9, 5, 4, 1); x.fillStyle = th.top2; x.fillRect(0, 4, 2, 1); x.fillRect(5, 5, 4, 1); x.fillRect(13, 4, 3, 1);
    x.fillStyle = shade(th.top, .5); x.fillRect(0, 0, TS, 1);
  });
  const blockBase = (x, c) => { x.fillStyle = k; x.fillRect(0, 0, TS, TS); x.fillStyle = c; x.fillRect(1, 1, 14, 14); x.fillStyle = shade(c, .45); x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14); x.fillStyle = shade(c, -.35); x.fillRect(1, 13, 14, 2); x.fillRect(13, 1, 2, 14); };
  t.brick = mk(x => { blockBase(x, shade(th.block, -.25)); x.fillStyle = shade(th.block, -.5); x.fillRect(1, 7, 14, 1); x.fillRect(7, 1, 1, 6); x.fillRect(4, 8, 1, 6); x.fillRect(11, 8, 1, 6); });
  t.note = mk(x => { blockBase(x, th.block); x.fillStyle = k; x.fillRect(8, 3, 2, 8); x.fillRect(10, 4, 2, 2); x.fillRect(12, 6, 1, 2); x.fillRect(5, 9, 4, 3); x.fillRect(6, 12, 2, 1); x.fillStyle = '#ffffff'; x.fillRect(6, 9, 1, 1); });
  t.crate = mk(x => { x.fillStyle = k; x.fillRect(0, 0, TS, TS); x.fillStyle = '#c08040'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#e0a868'; x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
    x.fillStyle = '#7a4a1e'; x.fillRect(1, 13, 14, 2); x.fillRect(13, 1, 2, 14); x.fillRect(3, 5, 10, 1); x.fillRect(3, 10, 10, 1);
    for (let i = 0; i < 10; i++){ x.fillStyle = '#7a4a1e'; x.fillRect(3 + i, 3 + i, 2, 1); x.fillRect(12 - i, 3 + i, 2, 1); } x.fillStyle = '#ffe9a0'; [[2,2],[13,2],[2,13],[13,13]].forEach(([a,b]) => x.fillRect(a, b, 1, 1)); });
  t.tuba = mk(x => { blockBase(x, '#ffd23f'); x.fillStyle = '#fff3a0'; x.fillRect(3, 3, 10, 10); x.fillStyle = '#ff4f79';
    x.fillRect(5, 3, 7, 2); x.fillRect(5, 3, 2, 8); x.fillRect(10, 3, 2, 8); x.fillRect(3, 9, 4, 3); x.fillRect(8, 9, 4, 3); x.fillStyle = '#ffffff'; x.fillRect(4, 9, 1, 1); x.fillRect(9, 9, 1, 1); x.fillRect(13, 2, 1, 1); });
  t.used = mk(x => { blockBase(x, '#8a6a4a'); x.fillStyle = '#5a3a22'; [[3,3],[11,3],[3,11],[11,11]].forEach(([a,b]) => x.fillRect(a, b, 2, 2)); });
  t.semi = mk(x => { x.fillStyle = k; x.fillRect(0, 0, TS, 7); x.fillStyle = shade(th.block, .2); x.fillRect(0, 1, TS, 5); x.fillStyle = shade(th.block, .6); x.fillRect(0, 1, TS, 1); x.fillStyle = k; x.fillRect(7, 1, 1, 5); x.fillRect(3, 7, 2, 4); x.fillRect(11, 7, 2, 4); });
  const P = { ice:['#bfe6ff','#ffffff','#7cc0ff'], hay:['#e8c050','#fff0a0','#b08a20'], chimney:['#c0283a','#ffffff','#7a1020'], tower:['#9aa0b4','#d0d4e4','#5a5e76'], column:['#e8e4f0','#ffffff','#a8a0c0'], stone:['#a0a0a8','#d0d0d8','#6a6a72'] }[th.pillar] || ['#a0a0a8','#d0d0d8','#6a6a72'];
  t.pillar = mk(x => { x.fillStyle = k; x.fillRect(0, 0, TS, TS); x.fillStyle = P[0]; x.fillRect(1, 0, 14, TS); x.fillStyle = P[1]; x.fillRect(3, 0, 2, TS); x.fillStyle = P[2]; x.fillRect(12, 0, 2, TS);
    if (th.pillar === 'hay' || th.pillar === 'chimney' || th.pillar === 'tower'){ x.fillStyle = P[2]; x.fillRect(1, 7, 14, 1); x.fillRect(1, 15, 14, 1); } });
  t.cap = mk(x => { x.drawImage(t.pillar, 0, 0); x.fillStyle = k; x.fillRect(0, 0, TS, 5); x.fillStyle = P[1]; x.fillRect(1, 1, 14, 3); if (th.pillar === 'chimney' || th.pillar === 'ice'){ x.fillStyle = '#ffffff'; x.fillRect(0, 0, TS, 3); } });
  return tileCache[th.id] = t;
}

// ---------- level generation (seeded, so each piece's levels are always the same) ----------
function genLevel(seed, idx, enemyType, world = 1){
  const R = rng(hash(seed + '#' + idx)), w = 200 + idx*30, map = new Uint8Array(w*ROWS);
  const coins = [], enemies = [], gTop = new Array(w).fill(ROWS), flyer = !!ENEMY_FLY[enemyType];
  const setCol = (x, top) => { if (x >= w) return; gTop[x] = top; for (let y = top; y < ROWS; y++) map[y*w + x] = 1; };
  const addEnemy = ex => { if (ex < 18 || ex >= w - 24 || gTop[ex] >= ROWS) return; enemies.push({ type:enemyType, x:ex*TS, y:(flyer ? gTop[ex] - 3 : gTop[ex] - 1)*TS, fly:flyer }); };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  let x = 0, top = 12; for (; x < 16; x++) setCol(x, top);
  const end = w - 26;
  while (x < end){
    const r = R();
    if (r < .16 + idx*.03){ const gw = 2 + (R() < .3 + idx*.15 ? 1 : 0); for (let i = -1; i <= gw; i++) coin(x + i, top - 3 - (i >= 0 && i < gw ? 1 : 0)); x += gw; for (let i = 0; i < 3; i++) setCol(x++, top); }
    else if (r < .32){ top = clamp(top + (R() < .5 ? -1 : 1)*(1 + (R() < .3 ? 1 : 0)), 9, 12); const n = 5 + Math.floor(R()*5); for (let i = 0; i < n; i++) setCol(x++, top); if (R() < .5) addEnemy(x - 2); }
    else if (r < .55){ const n = 8 + Math.floor(R()*4), sx = x; for (let i = 0; i < n; i++) setCol(x++, top);
      const by = top - 4, bx = sx + 2, bl = 3 + Math.floor(R()*3);
      for (let i = 0; i < bl; i++){ map[by*w + bx + i] = (i % 2 === 1 || R() < .3) ? 3 : 2; coin(bx + i, by - 1); }
      if (R() < .6) addEnemy(sx + n - 2); }
    else if (r < .7){ const n = 7 + Math.floor(R()*3), sx = x; for (let i = 0; i < n; i++) setCol(x++, top);
      const ph = 2 + Math.floor(R()*2), px = sx + 3; for (let yy = top - ph; yy < top; yy++){ map[yy*w + px] = 6; map[yy*w + px + 1] = 6; }
      coin(px, top - ph - 2); coin(px + 1, top - ph - 2); addEnemy(sx + n - 1); }
    else if (r < .82 && idx >= 1){ const gw = 4 + Math.floor(R()*2), py = top - 3; for (let i = 1; i < gw - 1; i++){ map[py*w + x + i] = 5; coin(x + i, py - 1); } x += gw; for (let i = 0; i < 3; i++) setCol(x++, top); }
    else { const n = 9 + Math.floor(R()*4), sx = x; for (let i = 0; i < n; i++) setCol(x++, top); addEnemy(sx + 4); if (R() < .4 + idx*.2) addEnemy(sx + n - 2); for (let i = 0; i < 4; i++) coin(sx + 3 + i, top - 3); }
  }
  top = 12; for (; x < w; x++) setCol(x, top);
  const st = w - 22; for (let s = 0; s < 4; s++) for (let yy = 0; yy <= s; yy++) map[(11 - yy)*w + st + s] = 2;
  for (let s = 0; s < 4; s++) coin(st + s, 11 - s - 2);
  let cp = Math.floor(w/2); while (gTop[cp] >= ROWS || map[(gTop[cp] - 1)*w + cp]) cp++;
  // fairness: no enemy patrols next to a pit (kids should never face "jump the enemy AND the pit" at once)
  const nearGap = ex => { for (let k = ex - 4; k <= ex + 4; k++) if (k >= 0 && k < w && gTop[k] >= ROWS) return true; return false; };
  for (let i = enemies.length - 1; i >= 0; i--){ const e = enemies[i]; if ((!e.fly || idx < 2) && nearGap(Math.floor(e.x/TS))) enemies.splice(i, 1); }
  const tuba = addTubaSecrets(seed, idx, w, map, gTop, coins, enemies, cp, st);
  mixEnemies(seed, idx, world, w, map, gTop, enemies, cp);
  return { w, map, coins, enemies, gTop, cpX:cp*TS, goalX:(w - 10)*TS, startX:2*TS, tuba };
}
// Tile 8 = golden ♪ "tuba block" (one per stage, hidden high above a pillar when possible); tile 7 = wooden crate (tuba bombs break it).
// Uses its own seeded RNG AFTER the normal layout is built, so existing stages look exactly as before; same piece id -> same spots.
function addTubaSecrets(seed, idx, w, map, gTop, coins, enemies, cp, st){
  const T = rng(hash(seed + '#' + idx + '#tuba')), at = (x, y) => (x < 0 || x >= w || y < 0 || y >= ROWS) ? 0 : map[y*w + x];
  const empty = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = Math.max(0, y0); y <= y1; y++) if (at(x, y)) return false; return true; };
  const lo = Math.floor(w*.22), hi = Math.floor(w*.72), pillars = [], rows = [], flats = [];
  for (let x = lo; x < hi; x++){ const t = gTop[x]; if (t >= ROWS) continue;
    for (let y = 1; y < t; y++) if (at(x, y) === 6 && !at(x, y - 1) && at(x + 1, y) === 6 && at(x - 1, y) !== 6){ const r = y - 4; if (r >= 1 && empty(x - 1, x + 2, r - 1, y - 1)) pillars.push({ x, y:r }); }
    const by = t - 4; if (by >= 1 && (at(x, by) === 2 || at(x, by) === 3) && !at(x, by + 1) && !at(x, by - 1)) rows.push({ x, y:by });
    if (gTop[x - 1] === t && gTop[x + 1] === t && empty(x - 1, x + 1, t - 6, t - 1)) flats.push({ x, y:t - 4 });
  }
  const pick = a => a[Math.floor(T()*a.length)];
  const spot = pillars.length ? pick(pillars) : rows.length ? pick(rows) : flats.length ? pick(flats) : null;
  if (spot) map[spot.y*w + spot.x] = 8;
  // crate piles (1-2-1) on flat ground, away from pits, enemies, the checkpoint, the goal and the tuba block
  const ecols = enemies.map(e => Math.floor(e.x/TS)), sx = spot ? spot.x : lo, cands = [];
  for (let c = 20; c < st - 10; c++){ const t = gTop[c]; if (t >= ROWS) continue; let ok = Math.abs(c + 1 - cp) > 5 && !(spot && Math.abs(c + 1 - spot.x) < 5);
    for (let k = c - 1; ok && k <= c + 3; k++) if (gTop[k] !== t) ok = false;
    for (let k = c - 3; ok && k <= c + 5; k++) if (gTop[k] >= ROWS || ecols.includes(k)) ok = false;
    if (ok && empty(c - 1, c + 3, t - 6, t - 1)) cands.push(c); }
  const piles = [], after = cands.filter(c => c > sx + 4), first = after.length ? pick(after) : cands.length ? pick(cands) : null;
  if (first !== null){ piles.push(first); const more = cands.filter(c => Math.abs(c - first) > 14); if (more.length) piles.push(pick(more)); }
  for (const c of piles){ const t = gTop[c]; for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) map[(t - dy)*w + c + dx] = 7;
    for (let i = coins.length - 1; i >= 0; i--){ const tx = Math.floor(coins[i].x/TS), ty = Math.floor(coins[i].y/TS); if (at(tx, ty) === 7) coins.splice(i, 1); } }
  return spot ? { x:spot.x, y:spot.y, piles } : { piles };
}
// Swap some of the world's enemies for the mix-in enemies (own seeded RNG, run AFTER the layout/tuba/crates are placed, so maps are unchanged).
// Every stage of every world gets some. Stage 1 of World 1 starts with Meep + Mr. Dinosaur; dragons join from 1-2 and hedgehogs from 1-3;
// from World 2 on all four can appear in every stage. The share of mix-ins grows a little with the stage and the world.
function mixEnemies(seed, idx, world, w, map, gTop, enemies, cp){
  if (!enemies.length) return;
  const M = rng(hash(seed + '#' + idx + '#mix')), pool = ['meep', 'dino'];
  if (idx >= 1 || world >= 2) pool.push('dragon'); if (idx >= 2 || world >= 2) pool.push('hedgehog');
  for (let i = pool.length - 1; i > 0; i--){ const j = Math.floor(M()*(i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const share = Math.min(.55, .3 + .04*(world - 1) + .06*idx), n = Math.min(enemies.length, Math.max(pool.length, Math.round(enemies.length*share)));
  const order = enemies.map((e, i) => i).sort((a, b) => enemies[a].x - enemies[b].x), picks = [];
  for (let k = 0; k < n; k++){ const i = order[Math.min(order.length - 1, Math.floor((k + .2 + M()*.6)*order.length/n))]; if (!picks.includes(i)) picks.push(i); }
  const at = (x, y) => (x < 0 || x >= w || y < 0 || y >= ROWS) ? 0 : map[y*w + x];
  const nearGap = c => { for (let k = c - 4; k <= c + 4; k++) if (k < 0 || k >= w || gTop[k] >= ROWS) return true; return false; };
  const flat = (c, r) => { for (let k = c - r; k <= c + r; k++) if (gTop[k] !== gTop[c]) return false; return true; };
  const archers = [];
  const fits = (type, c) => {
    if (type === 'dragon') return true;
    if (nearGap(c) || at(c, gTop[c] - 1) || at(c + 1, gTop[c] - 1)) return false;
    if (type === 'dino') return !at(c, gTop[c] - 2) && !at(c + 1, gTop[c] - 2);
    if (type === 'hedgehog') return flat(c, 2) && Math.abs(c - Math.floor(cp)) > 6 && c > 26 && archers.every(a => Math.abs(a - c) > 12);
    return true; };
  const make = (e, type) => { const c = Math.floor(e.x/TS), K = ENEMY_KIND[type]; e.type = type; e.fly = type === 'dragon'; e.mix = true;
    e.y = e.fly ? (gTop[c] - 3)*TS : gTop[c]*TS - K.h; if (type === 'hedgehog') archers.push(c); };
  picks.forEach((i, k) => { const e = enemies[i], c = Math.floor(e.x/TS);
    const tries = [pool[k % pool.length], ...pool.filter(t => t !== pool[k % pool.length])], type = tries.find(t => fits(t, c)); if (type) make(e, type); });
  // make sure every type of this stage's pool shows up at least once (if the layout has a spot for it)
  for (const type of pool) if (!enemies.some(e => e.type === type)){ const e = order.map(i => enemies[i]).find(e => !e.mix && fits(type, Math.floor(e.x/TS))); if (e) make(e, type); }
  for (const e of enemies) delete e.mix;
}
function genBoss(){
  const w = 16, map = new Uint8Array(w*ROWS);
  for (let x = 0; x < w; x++) for (let y = 12; y < ROWS; y++) map[y*w + x] = 1;
  for (let y = 0; y < 12; y++){ map[y*w] = 6; map[y*w + 15] = 6; }
  for (const [a, b] of [[2,4],[11,13]]) for (let x = a; x <= b; x++) map[8*w + x] = 5;
  return { w, map, coins:[], enemies:[], gTop:new Array(w).fill(12), cpX:2*TS, goalX:-1, startX:2*TS, boss:true };
}

// ---------- audio: chiptune SFX + tiny original music sequencer ----------
let AC = null, master = null, musicGain = null;
function ac(){ if (!AC){ const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination); musicGain = AC.createGain(); musicGain.gain.value = .22; musicGain.connect(master); }
  if (AC.state === 'suspended') AC.resume(); try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(e){} return AC; }
let sfxOn = true, musicOn = true;
function blip(type, f0, f1, dur, vol = .3, t0 = 0, dest){ const c = ac(); if (!c) return; const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(dest || master); o.start(t); o.stop(t + dur + .02); }
let noiseBuf = null;
function noise(dur, vol = .3, t0 = 0, hp = 800){ const c = ac(); if (!c) return; if (!noiseBuf){ noiseBuf = c.createBuffer(1, c.sampleRate*.5, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0; s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + .02); }
const mtof = m => 440*Math.pow(2, (m - 69)/12);
// brass voice: detuned saw + square through a lowpass that "blooms" open then closes (the BWAA of a low brass note)
function brass(m, t0, dur, vol, bend = .94){ const c = ac(); if (!c) return; const t = c.currentTime + t0, f = mtof(m), lp = c.createBiquadFilter(), g = c.createGain();
  lp.type = 'lowpass'; lp.Q.value = 5; lp.frequency.setValueAtTime(f*1.5, t); lp.frequency.exponentialRampToValueAtTime(f*9, t + .07); lp.frequency.exponentialRampToValueAtTime(f*2.2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .025); g.gain.setValueAtTime(vol, t + dur*.55); g.gain.exponentialRampToValueAtTime(.001, t + dur); lp.connect(g).connect(master);
  for (const [type, mul] of [['sawtooth', 1], ['square', 1.006]]){ const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f*mul*bend, t); o.frequency.exponentialRampToValueAtTime(f*mul, t + .08); o.connect(lp); o.start(t); o.stop(t + dur + .02); } }
const SHOOT = {
  sax:()=>blip('sawtooth', 494, 440, .12, .16), trumpet:()=>blip('square', 784, 740, .1, .14), flute:()=>blip('sine', 1175, 1245, .12, .3),
  clarinet:()=>blip('square', 587, 554, .12, .12), trombone:()=>blip('sawtooth', 220, 330, .16, .18), euphonium:()=>brass(58, 0, .15, .16, .95),
};
const SFX = {
  jump:()=>blip('square', 260, 620, .14, .14), coin:()=>{ blip('triangle', 1047, 1047, .06, .3); blip('triangle', 1568, 1568, .14, .3, .05); },
  stomp:()=>{ blip('square', 220, 70, .14, .2); noise(.06, .2, 0, 400); }, bump:()=>blip('square', 140, 110, .08, .2), hurt:()=>blip('sawtooth', 500, 140, .3, .2),
  die:()=>[72,67,64,60,55].forEach((m,i)=>blip('square', mtof(m), mtof(m), .14, .16, i*.12)), power:()=>[60,64,67,72,76].forEach((m,i)=>blip('square', mtof(m), mtof(m), .08, .12, i*.06)),
  bossHit:()=>{ noise(.12, .3, 0, 300); blip('square', 160, 90, .15, .2); }, clear:()=>[[72,0],[76,.12],[79,.24],[84,.36],[79,.6],[84,.72],[88,.84]].forEach(([m,t])=>blip('square', mtof(m), mtof(m), .16, .13, t)),
  boom:()=>{ noise(.6, .4, 0, 100); blip('sawtooth', 120, 40, .6, .25); },
  bwaamp:()=>{ brass(34, 0, .75, .5, .89); brass(41, .01, .7, .28, .89); blip('sine', 110, 32, .55, .6); noise(.35, .32, 0, 60); },
  tubaFire:()=>{ brass(46, 0, .13, .3, .8); noise(.06, .12, 0, 2500); }, crate:()=>{ noise(.16, .3, 0, 500); blip('square', 190, 80, .12, .14); },
  fanfare:()=>{ [[58,0,.11],[58,.12,.11],[65,.24,.11],[70,.36,.5]].forEach(([m,t,d])=>brass(m, t, d, .2, .98)); brass(34, .36, .6, .35); [82,86,89,94].forEach((m,i)=>blip('triangle', mtof(m), mtof(m), .12, .18, .55 + i*.06)); },
  windup:()=>{ blip('triangle', 520, 880, .18, .16); blip('triangle', 880, 880, .06, .12, .2); }, toss:()=>{ noise(.08, .14, 0, 2500); blip('square', 700, 420, .08, .08); },
  empty:()=>blip('square', 120, 100, .06, .12), pause:()=>blip('triangle', 880, 880, .08, .2), heart:()=>[76,79,84].forEach((m,i)=>blip('triangle', mtof(m), mtof(m), .1, .25, i*.07)),
};
function sfx(n, inst){ if (!sfxOn || !ac()) return; if (n === 'shoot') (SHOOT[inst] || SHOOT.sax)(); else SFX[n] && SFX[n](); }
const Music = {
  timer:null, next:0, step:0, song:null,
  make(th, boss){ const m = th.music, R = rng(hash(th.key + (boss ? 'boss' : ''))), sc = m.minor ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
    const prog = boss ? (m.minor ? [0,0,5,4] : [0,3,4,4]) : (m.minor ? [0,5,2,6] : [0,4,5,3]);
    const mel = []; for (let i = 0; i < 64; i++){ const deg = prog[i >> 4]; mel.push(R() < (i % 2 ? .45 : .8) ? sc[(deg + [0,2,4,0,2,7][Math.floor(R()*6)]) % 7] + 12*(R() < .25 ? 1 : 0) : null); }
    return { root:m.root, sc, prog, mel, bpm:boss ? m.bpm + 16 : m.bpm, tango:m.tango }; },
  start(th, boss){ this.stop(); if (!musicOn || !ac()) return; this.song = this.make(th, boss); this.next = AC.currentTime + .1; this.step = 0; this.timer = setInterval(() => this.tick(), 30); },
  stop(){ clearInterval(this.timer); this.timer = null; },
  tick(){ const s = this.song, dt = 60/s.bpm/2;
    while (this.next < AC.currentTime + .15){ const i = this.step % 64, deg = s.prog[i >> 4], t0 = this.next - AC.currentTime, chordRoot = s.root - 24 + s.sc[deg];
      const bassHit = s.tango ? [1,0,0,1,0,1,1,0][i % 8] : (i % 2 === 0);
      if (bassHit) blip('triangle', mtof(chordRoot + (i % 4 === 2 ? 7 : 0)), mtof(chordRoot + (i % 4 === 2 ? 7 : 0)), dt*.9, .5, t0, musicGain);
      if (s.mel[i] !== null) blip('square', mtof(s.root + 12 + s.mel[i]), mtof(s.root + 12 + s.mel[i]), dt*.8, .12, t0, musicGain);
      if (i % 2 === 1) blip('square', mtof(s.root + s.sc[(deg + 2 + (i % 4 === 1 ? 0 : 2)) % 7]), mtof(s.root + s.sc[(deg + 2) % 7]), dt*.4, .05, t0, musicGain);
      this.next += dt; this.step++; } },
};

// ---------- input ----------
const input = { left:false, right:false, jump:false, shoot:false, tuba:false, jumpPressed:false, shootPressed:false, tubaPressed:false };
const keyMap = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump', KeyZ:'jump', KeyX:'shoot', KeyJ:'shoot', KeyK:'jump', ShiftLeft:'shoot', KeyC:'tuba', KeyL:'tuba' };
addEventListener('keydown', e => { if (!G) return; const k = keyMap[e.code]; if (e.code === 'Escape' || e.code === 'KeyP'){ togglePause(); e.preventDefault(); return; }
  if (k){ if (!input[k]) input[k + 'Pressed'] = true; input[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = keyMap[e.code]; if (k) input[k] = false; });
// Touch controls. The d-pad direction is recomputed from the CURRENT touches on every event (targetTouches),
// so a lost touchend/pointerup can never leave a direction stuck "held". Mouse/pen still use pointer events.
let releaseTouch = () => {};
function bindTouch(root){
  const dpad = root.querySelector('#dpad'), pts = new Map(), btns = []; let tdirs = [];
  const upd = () => { const all = [...pts.values(), ...tdirs]; input.left = all.includes('left'); input.right = all.includes('right'); dpad.dataset.dir = input.left && input.right ? '' : input.left ? 'left' : input.right ? 'right' : ''; };
  const dirOf = e => { const r = dpad.getBoundingClientRect(); return (e.clientX - r.left) < r.width/2 ? 'left' : 'right'; };
  const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch(_){} };
  const onTouch = e => { e.preventDefault(); tdirs = [...e.targetTouches].map(dirOf); upd(); };
  ['touchstart','touchmove','touchend','touchcancel'].forEach(ev => dpad.addEventListener(ev, onTouch, { passive:false }));
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); if (e.pointerType === 'touch') return; cap(dpad, e); pts.set(e.pointerId, dirOf(e)); upd(); });
  dpad.addEventListener('pointermove', e => { if (pts.has(e.pointerId)){ pts.set(e.pointerId, dirOf(e)); upd(); } });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => dpad.addEventListener(ev, e => { if (pts.delete(e.pointerId)) upd(); }));
  for (const [id, k] of [['#btn-a','jump'],['#btn-b','shoot'],['#btn-t','tuba']]){ const b = root.querySelector(id); if (!b) continue; const held = new Set(); btns.push({ b, k, held });
    const up = e => { held.delete(e.pointerId); if (!held.size){ input[k] = false; b.classList.remove('down'); } };
    b.addEventListener('pointerdown', e => { e.preventDefault(); cap(b, e); held.add(e.pointerId); if (!input[k]) input[k + 'Pressed'] = true; input[k] = true; b.classList.add('down'); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, up)); }
  // safety nets: a pointer that ends anywhere is released, and when NO finger is on the screen nothing touch-driven can be held
  addEventListener('pointerup', e => { if (pts.delete(e.pointerId)) upd(); for (const o of btns) if (o.held.has(e.pointerId)){ o.held.delete(e.pointerId); if (!o.held.size){ input[o.k] = false; o.b.classList.remove('down'); } } }, true);
  addEventListener('pointercancel', e => { if (pts.delete(e.pointerId)) upd(); }, true);
  const allUp = e => { if (e.touches.length) return; if (tdirs.length){ tdirs = []; upd(); } for (const o of btns){ for (const id of o.held) if (!pts.has(id)) o.held.delete(id); if (!o.held.size && o.b.classList.contains('down')){ input[o.k] = false; o.b.classList.remove('down'); } } };
  addEventListener('touchend', allUp, true); addEventListener('touchcancel', allUp, true);
  releaseTouch = () => { pts.clear(); tdirs = []; for (const o of btns){ o.held.clear(); o.b.classList.remove('down'); } dpad.dataset.dir = ''; };
  root.addEventListener('contextmenu', e => e.preventDefault());
  const ic = root.querySelector('#btn-t canvas'); if (ic){ const x = ic.getContext('2d'), s = SP.item('tubaIcon'); ic.width = s.width; ic.height = s.height; x.drawImage(s, 0, 0); }
}
// drop every held direction/button (keyboard + touch): on stage start/end, pause, app switch, focus loss
function releaseInput(){ releaseTouch(); for (const k in input) input[k] = false; }
addEventListener('blur', releaseInput); addEventListener('pagehide', releaseInput);
let uiRoot = null, tubaUI = '';
function syncTubaUI(){ if (!uiRoot || !G) return; const st = G.tuba > 0 ? G.tuba + (G.tubaCool > 0 ? 'c' : '') : '';
  if (st === tubaUI) return; tubaUI = st; uiRoot.classList.toggle('has-tuba', G.tuba > 0);
  const b = uiRoot.querySelector('#btn-t'); if (b){ b.classList.toggle('cool', G.tubaCool > 0); const n = b.querySelector('b'); if (n) n.textContent = G.tuba; } }

// ---------- game state ----------
let G = null, raf = 0, last = 0, acc = 0, pausedCb = null;
const BOSS_CFG = {
  valkyrie:{ move:'fly', shot:'spear' }, cluckzilla:{ move:'hop', shot:'egg' }, santa:{ move:'walk', shot:'axe' },
  dragon:{ move:'hover', shot:'fire' }, spectro:{ move:'dance', shot:'orb' }, golem:{ move:'walk', shot:'rock' },
};
function newRun(opts){
  const th = themeOf(opts.world), boss = opts.level === 'boss';
  G = { opts, th, bg:backgrounds(th), tl:tiles(th), boss, coins:0, lives:opts.lives, maxHearts:3 + (opts.plume ? 1 : 0), chord:!!(opts.chord || opts.golden),
        hero:SP.heroFrames(opts.inst, opts.hair, !!opts.golden), enemyType:(opts.world && opts.world.enemy) || 'gremlin', cpReached:false, t:0, paused:false, done:false, msg:null, shake:0,
        tuba:clamp(opts.tuba | 0, 0, TUBA.ammo), tubaCool:0, tubaKO:0, bigShake:0 };
  G.base = boss ? genBoss() : genLevel(opts.seed, opts.level, G.enemyType, Math.max(1, opts.worldNo | 0 || 1));
  resetLevel(true);
}
function resetLevel(first){
  const b = G.base;
  G.L = { w:b.w, map:b.map.slice(), gTop:b.gTop };
  G.coinList = b.coins.map(c => ({ ...c, taken:false }));
  G.enemies = b.enemies.map(e => { const K = ENEMY_KIND[e.type] || {};
    return { ...e, w:K.w || 14, h:K.h || 14, vx:-(K.speed || 28), vy:0, baseY:e.y, t:Math.random()*6, alive:true, dead:0, face:-1, hp:K.hp || 1, st:'idle', cool:ARCHER.first + Math.random(), dir:-1, hopT:.4 + Math.random()*.5 }; });
  G.shots = []; G.eshots = []; G.parts = []; G.bumps = []; G.pops = []; G.pickups = []; G.bombs = []; G.blasts = [];
  const sx = G.cpReached ? b.cpX : b.startX;
  G.p = { x:sx, y:(gTopAt(sx) - 2)*TS - 4, w:10, h:20, vx:0, vy:0, face:1, onGround:false, coyote:0, buffer:0, hearts:G.maxHearts, inv:first ? 0 : 1.5, cool:0, dead:0, anim:0, clear:0 };
  G.cam = clamp(G.p.x - 100, 0, Math.max(0, G.L.w*TS - W));
  if (G.boss){ const k = (G.opts.world && G.opts.world.boss) || 'golem', cfg = BOSS_CFG[k] || BOSS_CFG.golem, hp = (!first && G.B && G.B.hp > 0) ? G.B.hp : Math.min(24, Math.max(1, G.opts.bossHp || 24));
    G.B = { key:k, cfg, x:11*TS, y:7*TS, w:28, h:28, vx:0, vy:0, hp, maxHp:24, t:0, timer:1.5, state:'intro', face:-1, inv:0, onGround:false, gone:0, minions:0 };
    G.msg = { text:'BOSS: ' + (G.opts.bossName || 'BOSS'), t:2 }; }
  else G.msg = { text:G.opts.label || 'READY!', t:1.6 };
}
function gTopAt(px){ const tx = clamp(Math.floor(px/TS), 0, G.L.w - 1); for (let y = 0; y < ROWS; y++){ const v = G.L.map[y*G.L.w + tx]; if (v && v !== 5) return y; } return 12; }
const tileAt = (tx, ty) => (tx < 0 || tx >= G.L.w || ty < 0 || ty >= ROWS) ? 0 : G.L.map[ty*G.L.w + tx];
function solid(tx, ty){ if (tx < 0 || tx >= G.L.w) return true; if (ty < 0 || ty >= ROWS) return false; const v = G.L.map[ty*G.L.w + tx]; return v > 0 && v !== 5; }
function moveX(e, dx){ e.x += dx; e.hitWall = 0; const top = Math.floor(e.y/TS), bot = Math.floor((e.y + e.h - .01)/TS);
  if (dx > 0){ const tx = Math.floor((e.x + e.w)/TS); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)){ e.x = tx*TS - e.w - .01; e.hitWall = 1; break; } }
  else if (dx < 0){ const tx = Math.floor(e.x/TS); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)){ e.x = (tx + 1)*TS + .01; e.hitWall = -1; break; } } }
function moveY(e, dy){ const prevB = e.y + e.h; e.y += dy; e.onGround = false; e.bonk = null; const l = Math.floor(e.x/TS), r = Math.floor((e.x + e.w - .01)/TS);
  if (dy > 0){ const ty = Math.floor((e.y + e.h)/TS); for (let tx = l; tx <= r; tx++){ if (solid(tx, ty) || (tileAt(tx, ty) === 5 && prevB <= ty*TS + .5)){ e.y = ty*TS - e.h; e.vy = 0; e.onGround = true; break; } } }
  else if (dy < 0){ const ty = Math.floor(e.y/TS); let best = null; for (let tx = l; tx <= r; tx++) if (solid(tx, ty)){ const d = Math.abs((tx + .5)*TS - (e.x + e.w/2)); if (!best || d < best.d) best = { tx, ty, d }; }
    if (best){ e.y = (best.ty + 1)*TS; e.vy = 0; e.bonk = best; } } }
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function puff(x, y, color, n = 6, sp = 60){ for (let i = 0; i < n; i++) G.parts.push({ x, y, vx:(Math.random() - .5)*sp*2, vy:(Math.random() - .8)*sp, life:.5 + Math.random()*.3, color, s:2 }); }

// ---------- update ----------
const deaths = [];
function hurt(why){ const p = G.p; if (p.inv > 0 || p.dead || p.clear) return; p.hearts--; p.lastHit = why; sfx('hurt'); p.inv = 1.3; p.vy = -200; p.vx = -p.face*120; G.shake = .2; if (p.hearts <= 0) die(why); }
function die(why){ const p = G.p; if (p.dead) return; deaths.push({ why:why || p.lastHit, x:Math.round(p.x) }); G.chord = !!G.opts.golden; G.tuba = 0; G.bombs = []; syncTubaUI(); p.dead = 2.2; p.vy = -340; p.vx = 0; sfx('die'); Music.stop(); }
function step(dt){
  G.t += dt; if (G.msg){ G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }
  G.shake = Math.max(0, G.shake - dt); G.bigShake = Math.max(0, G.bigShake - dt);
  const p = G.p;
  // death animation
  if (p.dead){ p.dead -= dt; p.vy += 900*dt; p.y += p.vy*dt;
    if (p.dead <= 0){ G.lives--; G.opts.onLifeLost && G.opts.onLifeLost(G.lives);
      if (G.lives <= 0){ finish('gameover'); return; } resetLevel(false); Music.start(G.th, G.boss); } return; }
  if (p.clear){ p.clear -= dt; p.vx = 60; p.face = 1; p.vy += 1100*dt; moveX(p, p.vx*dt); moveY(p, p.vy*dt); p.anim += dt;
    if (p.clear <= 0) finish('clear'); updateParts(dt); return; }
  // player physics
  const accel = p.onGround ? 900 : 650, max = 108;
  if (input.left && !input.right){ p.vx = Math.max(-max, p.vx - accel*dt); p.face = -1; }
  else if (input.right && !input.left){ p.vx = Math.min(max, p.vx + accel*dt); p.face = 1; }
  else { const fr = (p.onGround ? 1000 : 300)*dt; p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx)*fr; }
  p.coyote = p.onGround ? .09 : p.coyote - dt; p.buffer = input.jumpPressed ? .12 : p.buffer - dt;
  if (p.buffer > 0 && p.coyote > 0){ p.vy = -365; p.coyote = 0; p.buffer = 0; sfx('jump'); }
  if (!input.jump && p.vy < -130) p.vy = -130;
  p.vy = Math.min(420, p.vy + 1100*dt);
  moveX(p, p.vx*dt); moveY(p, p.vy*dt);
  if (p.bonk) bonk(p.bonk.tx, p.bonk.ty);
  p.anim += Math.abs(p.vx)*dt; p.inv = Math.max(0, p.inv - dt); p.cool -= dt;
  if (input.shootPressed && p.cool <= 0 && G.shots.length < (G.chord ? 9 : 3)) shoot();
  G.tubaCool = Math.max(0, G.tubaCool - dt);
  if (input.tubaPressed && G.tuba > 0){ if (G.tubaCool <= 0) fireTuba(); else sfx('empty'); }
  if (p.y > H + 24) { p.hearts = 0; die('pit'); }
  if (!G.boss && !G.cpReached && p.x > G.base.cpX){ G.cpReached = true; sfx('power'); puff(G.base.cpX + 8, (gTopAt(G.base.cpX) - 2)*TS, '#ffd23f', 12); }
  if (!G.boss && p.x + p.w > G.base.goalX + 4 && !p.clear){ p.clear = 2.4; sfx('clear'); Music.stop(); for (let i = 0; i < 30; i++) puff(G.base.goalX + 12, 120, ['#ffd23f','#ff4f79','#7cc0ff'][i%3], 1, 140); }
  input.jumpPressed = input.shootPressed = input.tubaPressed = false;
  // coins
  for (const c of G.coinList) if (!c.taken && Math.abs(c.x + 5 - (p.x + 5)) < 11 && Math.abs(c.y + 6 - (p.y + 10)) < 15){ c.taken = true; addCoin(); puff(c.x + 5, c.y + 6, '#ffd23f', 4, 40); }
  for (const pk of G.pickups){ if (pk.kind === 'tuba'){ tubaPickup(pk, dt); continue; } pk.vy = Math.min(200, pk.vy + 600*dt); pk.y += pk.vy*dt; if (pk.y > (gTopAt(pk.x) )*TS - 8){ pk.y = gTopAt(pk.x)*TS - 8; pk.vy = 0; }
    if (!pk.taken && Math.abs(pk.x - (p.x + 5)) < 12 && Math.abs(pk.y - (p.y + 10)) < 16){ pk.taken = true; if (pk.kind === 'chord'){ G.chord = true; G.msg = { text:'POWER CHORD!', t:1.4 }; sfx('power'); } else { p.hearts = Math.min(G.maxHearts, p.hearts + 1); sfx('heart'); } } }
  G.pickups = G.pickups.filter(k => !k.taken);
  // shots
  for (const s of G.shots){ s.t += dt; s.x += s.vx*dt; s.y += s.vy*dt + Math.sin(s.t*24)*.6; if (s.t > .75 || solid(Math.floor((s.x + 3)/TS), Math.floor((s.y + 3)/TS))){ s.dead = 1; puff(s.x, s.y, s.color, 3, 30); } }
  // enemies
  for (const e of G.enemies){
    if (!e.alive){ e.dead -= dt; e.vy += 900*dt; e.y += e.vy*dt; continue; }
    if (Math.abs(e.x - p.x) > 300) continue;
    e.t += dt; e.flash = Math.max(0, (e.flash || 0) - dt); const K = ENEMY_KIND[e.type] || {};
    if (K.archer) updateArcher(e, dt, p);
    else if (K.hop) updateHopper(e, dt, K);
    else if (K.wave){ moveX(e, e.vx*dt); if (e.hitWall) e.vx = -e.vx; e.y = e.baseY + Math.sin(e.t*2.6)*16; if (Math.abs(e.x - (e.homeX ??= e.x)) > 80) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx); }
    else if (e.fly){ moveX(e, e.vx*.8*dt); if (e.hitWall) e.vx = -e.vx; e.y = e.baseY + Math.sin(e.t*2.2)*14; if (Math.abs(e.x - (e.homeX ??= e.x)) > 64) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx); }
    else { e.vy = Math.min(400, e.vy + 1000*dt); moveX(e, e.vx*dt); if (e.hitWall) e.vx = -e.vx; moveY(e, e.vy*dt);
      if (Math.abs(e.x - (e.homeX ??= e.x)) > 48) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx);
      if (e.onGround){ const fx = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1)/TS), fy = Math.floor((e.y + e.h + 2)/TS); if (!solid(fx, fy) && tileAt(fx, fy) !== 5) e.vx = -e.vx; }
      if (e.y > H + 40) e.alive = false; }
    if (!K.archer && !K.hop) e.face = e.vx > 0 ? 1 : -1;
    for (const s of G.shots) if (!s.dead && e.alive && overlap({ x:s.x, y:s.y, w:6, h:6 }, e)){ s.dead = 1; hitEnemy(e); }
    if (e.alive && !p.dead && overlap(p, e)){
      if (p.vy > 30 && p.y + p.h - e.y < 15){ kill(e, true); p.vy = input.jump ? -380 : -260; }
      else hurt('enemy:' + e.type); }
  }
  if (G.boss) updateBoss(dt);
  for (const s of G.eshots){ s.t += dt; if (s.grav) s.vy += s.grav*dt; s.x += s.vx*dt; s.y += s.vy*dt; s.rot = (s.rot || 0) + dt*12;
    if (s.y > H + 20 || s.x < -20 || s.x > G.L.w*TS + 20 || s.t > 6) s.dead = 1;
    if (s.kind === 'rock' && s.y > 12*TS - 8){ s.dead = 1; puff(s.x, s.y, '#9aa0b4', 6); G.shake = .1; }
    if (s.kind === 'arrow'){ if (s.t > ARCHER.life || solid(Math.floor((s.x + Math.sign(s.vx)*6)/TS), Math.floor(s.y/TS))){ s.dead = 1; puff(s.x, s.y, '#e0a868', 4, 30); }
      for (const n of G.shots) if (!s.dead && !n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - 7, y:s.y - 3, w:14, h:7 })){ n.dead = 1; s.dead = 1; sfx('bump'); puff(s.x, s.y, '#ffffff', 5, 40); } }
    if (s.kind === 'egg' && s.y > 12*TS - 8){ s.y = 12*TS - 8; s.vy = -s.vy*.5; if (Math.abs(s.vy) < 40){ s.dead = 1; puff(s.x, s.y, '#ffffff', 6); } }
    if (!s.dead && !p.dead && overlap(p, { x:s.x - 3, y:s.y - 3, w:6, h:6 })){ s.dead = 1; hurt('shot:' + s.kind); } }
  updateBombs(dt);
  G.shots = G.shots.filter(s => !s.dead); G.eshots = G.eshots.filter(s => !s.dead); G.enemies = G.enemies.filter(e => e.alive || e.dead > 0);
  updateParts(dt);
  for (const b of G.bumps) b.t += dt; G.bumps = G.bumps.filter(b => b.t < .2);
  for (const c of G.pops){ c.t += dt; c.y += c.vy*dt; c.vy += 600*dt; } G.pops = G.pops.filter(c => c.t < .5);
  syncTubaUI();
  // camera
  const target = clamp(p.x - 100 + p.face*16, 0, Math.max(0, G.L.w*TS - W)); G.cam += (target - G.cam)*Math.min(1, dt*6);
}
function updateParts(dt){ for (const q of G.parts){ q.life -= dt; q.vy += 300*dt; q.x += q.vx*dt; q.y += q.vy*dt; } G.parts = G.parts.filter(q => q.life > 0); }
function shoot(){ const p = G.p, color = G.opts.golden ? '#ffe14a' : (SP.NOTE_COLORS[G.opts.inst] || '#ffd23f'), ox = p.x + (p.face > 0 ? 12 : -6), oy = p.y + 8;
  const spreads = G.chord ? [-70, 0, 70] : [0]; for (const vy of spreads) G.shots.push({ x:ox, y:oy, vx:p.face*220, vy, t:0, color });
  p.cool = .22; sfx('shoot', G.opts.inst); }
function addCoin(){ G.coins++; sfx('coin'); const tot = (G.opts.coinBase || 0) + G.coins; if (tot % 100 === 0){ G.lives = Math.min(99, G.lives + 1); G.opts.onLifeLost && G.opts.onLifeLost(G.lives); G.msg = { text:'1-UP!', t:1.4 }; sfx('power'); } }
function hitEnemy(e){ if ((e.hp || 1) > 1){ e.hp--; e.flash = .3; sfx('bump'); puff(e.x + e.w/2, e.y + 4, '#ffffff', 4, 40); return; } kill(e); }
function updateHopper(e, dt, K){ // Meep: sits a moment, then hops (never hops off a ledge or far from home)
  e.vy = Math.min(400, e.vy + 1000*dt);
  if (e.onGround){ e.vx = 0; e.hopT -= dt;
    if (e.hopT <= 0){ let d = e.dir || -1; const home = (e.homeX ??= e.x);
      const bad = dd => { const ax = Math.floor((e.x + e.w/2 + dd*30)/TS), fy = Math.floor((e.y + e.h + 2)/TS); return Math.abs(e.x + dd*22 - home) > 44 || !solid(ax, fy) || solid(ax, fy - 1); };
      if (bad(d)) d = -d; if (!bad(d)){ e.dir = d; e.vx = d*K.speed; } e.vy = -250; e.hopT = .55 + Math.random()*.45; } }
  moveX(e, e.vx*dt); if (e.hitWall){ e.vx = -e.vx; e.dir = -e.dir; } moveY(e, e.vy*dt); e.face = e.dir;
  if (e.y > H + 40) e.alive = false; }
function updateArcher(e, dt, p){ // hedgehog: shuffle -> wind-up ("!", quills up) -> throw one slow arrow -> long cooldown
  const A = ARCHER, dx = (p.x + p.w/2) - (e.x + e.w/2), dy = (e.y + e.h) - (p.y + p.h);
  e.vy = Math.min(400, e.vy + 1000*dt); moveY(e, e.vy*dt); if (e.y > H + 40){ e.alive = false; return; }
  if (e.st === 'idle'){ const home = (e.homeX ??= e.x); moveX(e, e.vx*dt);
    const fx = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1)/TS), fy = Math.floor((e.y + e.h + 2)/TS);
    if (e.hitWall || Math.abs(e.x - home) > 12 || (e.onGround && !solid(fx, fy))) e.vx = -Math.sign(e.x - home || e.vx)*Math.abs(e.vx);
    e.face = Math.abs(dx) < A.range ? (Math.sign(dx) || -1) : (e.vx > 0 ? 1 : -1); e.cool -= dt;
    if (e.cool <= 0 && e.onGround && !p.dead && !p.clear && Math.abs(dx) < A.range && Math.abs(dx) > A.min && dy >= -8 && dy < A.rise && !G.eshots.some(s => s.from === e)){
      e.st = 'wind'; e.stT = A.wind; e.face = Math.sign(dx) || -1; sfx('windup'); } }
  else if (e.st === 'wind'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'throw'; e.stT = .35; sfx('toss');
      G.eshots.push({ kind:'arrow', x:e.x + e.w/2 + e.face*10, y:e.y + 3, vx:e.face*A.speed, vy:0, t:0, from:e }); } }
  else if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'idle'; e.cool = A.cool + Math.random()*.6; } } }
function kill(e, stomp){ e.alive = false; e.dead = 1; e.vy = -200; sfx('stomp'); puff(e.x + 7, e.y + 7, '#ffffff', 6); G.coins += 0; }
function bonk(tx, ty){ const v = tileAt(tx, ty); G.bumps.push({ tx, ty, t:0 });
  if (v === 3){ G.L.map[ty*G.L.w + tx] = 4; const lucky = (hash(tx + ':' + ty) % 7 === 0) && G.p.hearts < G.maxHearts;
    const chordBlock = !G.chord && hash('c' + tx + ':' + ty) % 9 === 0;
    if (lucky || chordBlock){ G.pickups.push({ x:tx*TS + 8, y:(ty - 1)*TS, vy:-120, kind:lucky ? 'heart' : 'chord' }); sfx('power'); } else { addCoin(); G.pops.push({ x:tx*TS + 3, y:(ty - 1)*TS, vy:-220, t:0 }); } }
  else if (v === 8){ G.L.map[ty*G.L.w + tx] = 4; const dir = tileAt(tx + 1, ty - 1) || tileAt(tx + 1, ty) === 6 ? -1 : 1;
    G.pickups.push({ kind:'tuba', x:tx*TS + 8, y:(ty - 1)*TS + 4, vx:dir*36, vy:0, t:0, home:{ x:tx*TS + 8, y:(ty - 1)*TS + 4 } }); sfx('power'); puff(tx*TS + 8, ty*TS, '#fff3a0', 10, 80); }
  else sfx('bump');
  for (const e of G.enemies) if (e.alive && Math.abs(e.x + e.w/2 - (tx*TS + 8)) < 7 + e.w/2 && Math.abs(e.y + e.h - ty*TS) < 4) kill(e); }
// ---------- GIANT TUBA ----------
function tubaPickup(pk, dt){ // rises out of the block, then drifts sideways and floats down until it rests on the ground
  const p = G.p; pk.t += dt;
  if (pk.t < .4) pk.y -= 40*dt;
  else { const e = { x:pk.x - 6, y:pk.y, w:12, h:12, vy:pk.vy }; pk.vy = Math.min(70, pk.vy + 400*dt);
    if (pk.vx){ moveX(e, pk.vx*dt); if (e.hitWall) pk.vx = -pk.vx; } moveY(e, pk.vy*dt); if (e.onGround) pk.vy = 0;
    if (e.onGround && tileAt(Math.floor(pk.x/TS), Math.floor((e.y + e.h + 1)/TS)) === 1) pk.vx = 0;
    pk.x = e.x + 6; pk.y = e.y; if (pk.y > H){ pk.x = pk.home.x; pk.y = pk.home.y; pk.vy = 0; pk.vx = -(pk.vx || 36); pk.t = 0; } }
  if (Math.random() < .25) G.parts.push({ x:pk.x + (Math.random() - .5)*16, y:pk.y + Math.random()*14, vx:0, vy:-20, life:.4, color:Math.random() < .5 ? '#fff3a0' : '#ffffff', s:1 });
  if (!pk.taken && pk.t > .25 && !p.dead && overlap(p, { x:pk.x - 8, y:pk.y - 2, w:16, h:16 })){
    pk.taken = true; G.tuba = TUBA.ammo; G.tubaCool = .3; G.gotTuba = true; G.msg = { text:'GIANT TUBA!', t:2 }; sfx('fanfare');
    for (let i = 0; i < 24; i++) puff(pk.x, pk.y + 6, ['#ffd23f','#fff3a0','#ffffff','#ff8c42'][i%4], 1, 130); syncTubaUI(); } }
function fireTuba(){ const p = G.p; G.tuba--; G.tubaCool = TUBA.cool; p.tubaFlash = .18;
  G.bombs.push({ x:p.x + 5 + p.face*8, y:p.y + 2, vx:p.face*150 + p.vx*.35, vy:-235, t:0 });
  p.vx -= p.face*40; sfx('tubaFire'); puff(p.x + 5 - p.face*4, p.y - 2, '#ffffff', 4, 40);
  if (G.tuba <= 0) G.msg = { text:'TUBA EMPTY!', t:1.2 }; syncTubaUI(); }
function updateBombs(dt){
  const B = G.B, bhb = B && !B.gone && B.state !== 'intro' && !B.ghost ? { x:B.x + 2, y:B.y + 2, w:B.w - 4, h:B.h - 2 } : null;
  for (const b of G.bombs){ b.t += dt; b.vy = Math.min(380, b.vy + 700*dt); b.x += b.vx*dt; b.y += b.vy*dt;
    if (Math.random() < .5) G.parts.push({ x:b.x + 3, y:b.y - 6, vx:(Math.random() - .5)*20, vy:-30, life:.25, color:Math.random() < .5 ? '#ffd23f' : '#ff8c42', s:1 });
    const box = { x:b.x - 4, y:b.y - 4, w:8, h:8 }, tx = Math.floor(b.x/TS), ty = Math.floor((b.y + 4)/TS);
    const hit = solid(tx, ty) || (tileAt(tx, ty) === 5 && b.vy > 0 && b.y + 4 - ty*TS < 8) || G.enemies.some(e => e.alive && overlap(box, e)) || (bhb && overlap(box, bhb)) || b.t > 2.5;
    if (b.y > H + 16) b.dead = 1; else if (hit){ b.dead = 1; blast(b.x, b.y); } }
  G.bombs = G.bombs.filter(b => !b.dead);
  for (const q of G.blasts) q.t += dt; G.blasts = G.blasts.filter(q => q.t < .9); }
function blast(cx, cy){ const R = TUBA.radius; let ko = 0; sfx('bwaamp'); G.shake = .4; G.bigShake = .3; G.blasts.push({ x:cx, y:cy, t:0 });
  for (let i = 0; i < 26; i++) puff(cx, cy, ['#fff3a0','#ffd23f','#ff8c42','#ffffff','#1a1030'][i%5], 1, 170);
  for (const e of G.enemies) if (e.alive && Math.hypot(e.x + e.w/2 - cx, e.y + e.h/2 - cy) < R + 8){ kill(e); ko++; }
  for (const s of G.eshots) if (s.kind === 'arrow' && Math.hypot(s.x - cx, s.y - cy) < R + 8) s.dead = 1;
  const B = G.B; if (B && !B.gone && B.state !== 'intro' && !B.ghost){ const nx = clamp(cx, B.x, B.x + B.w), ny = clamp(cy, B.y, B.y + B.h);
    if (Math.hypot(nx - cx, ny - cy) < R){ damageBoss(TUBA.bossDmg, true); ko++; } }
  const w = G.L.w, tmin = Math.floor((cx - R)/TS), tmax = Math.floor((cx + R)/TS);
  for (let tx = tmin; tx <= tmax; tx++) for (let ty = Math.floor((cy - R)/TS); ty <= Math.floor((cy + R)/TS); ty++){
    const v = tileAt(tx, ty); if (!v || Math.hypot(tx*TS + 8 - cx, ty*TS + 8 - cy) > R + 6) continue;
    if (v === 7 || (v === 2 && !G.boss && tx < w - 24)){ G.L.map[ty*w + tx] = 0; ko++; sfx('crate');
      const col = v === 7 ? ['#c08040','#7a4a1e','#e0a868'] : [shade(G.th.block, -.25), shade(G.th.block, -.5), '#1a1030'];
      for (let i = 0; i < 8; i++) G.parts.push({ x:tx*TS + 4 + Math.random()*8, y:ty*TS + 4 + Math.random()*8, vx:(Math.random() - .5)*180, vy:-80 - Math.random()*160, life:.7, color:col[i%3], s:3 });
      if (v === 7){ addCoin(); G.pops.push({ x:tx*TS + 3, y:ty*TS, vy:-240, t:0 }); } }
    else if (v === 3 || v === 8) bonk(tx, ty); }
  if (ko) G.tubaKO += ko; }
function updateBoss(dt){
  const B = G.B, p = G.p; if (!B) return;
  if (B.gone){ B.gone -= dt; if (Math.random() < .5) puff(B.x + Math.random()*28, B.y + Math.random()*28, ['#ffd23f','#ff4f79','#ffffff'][Math.floor(Math.random()*3)], 2, 90);
    if (B.gone <= 0 && !p.clear){ p.clear = 2.6; sfx('clear'); } return; }
  B.t += dt; B.timer -= dt; B.inv = Math.max(0, B.inv - dt);
  const left = 1.2*TS, right = 14.8*TS - B.w, floor = 12*TS - B.h, toward = Math.sign(p.x - B.x) || 1, hpF = B.hp/B.maxHp, fast = hpF < .5 ? 1.35 : 1;
  const throwShot = () => { const k = B.cfg.shot, cx = B.x + B.w/2, cy = B.y + B.h/2, dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
    if (k === 'spear') G.eshots.push({ kind:k, x:cx, y:cy, vx:dx/d*150, vy:dy/d*150, t:0 });
    if (k === 'egg') for (const s of [-1, 1]) G.eshots.push({ kind:k, x:cx, y:B.y + B.h - 6, vx:s*(70 + Math.random()*60), vy:-260, grav:700, t:0 });
    if (k === 'axe') G.eshots.push({ kind:k, x:cx, y:cy - 8, vx:toward*(110 + Math.abs(dx)*.25), vy:-300, grav:700, t:0 });
    if (k === 'fire') for (const a of (hpF < .5 ? [-.25, 0, .25] : [0])) G.eshots.push({ kind:k, x:cx, y:cy, vx:Math.cos(Math.atan2(dy, dx) + a)*140, vy:Math.sin(Math.atan2(dy, dx) + a)*140, t:0 });
    if (k === 'orb'){ const n = hpF < .5 ? 8 : 5; for (let i = 0; i < n; i++){ const a = i/n*Math.PI*2 + B.t; G.eshots.push({ kind:k, x:cx, y:cy, vx:Math.cos(a)*90, vy:Math.sin(a)*90, t:0 }); } }
    if (k === 'rock') for (let i = 0; i < 3; i++) G.eshots.push({ kind:k, x:left + Math.random()*(right - left + B.w), y:-10 - i*30, vx:0, vy:40, grav:420, t:0 });
  };
  if (B.state === 'intro'){ if (B.timer <= 0){ B.state = 'fight'; B.timer = 1.2; } }
  else switch (B.cfg.move){
    case 'fly': if (B.mode !== 'swoop'){ B.y += ((36 + Math.sin(B.t*2)*10) - B.y)*Math.min(1, dt*3); B.x += (B.vx ||= 50)*fast*dt; if (B.x < left || B.x > right) B.vx = -B.vx; B.x = clamp(B.x, left, right);
        if (B.timer <= 0){ if (Math.random() < .45){ B.mode = 'swoop'; const d = Math.hypot(p.x - B.x, p.y - B.y) || 1; B.svx = (p.x - B.x)/d*170*fast; B.svy = (p.y - B.y)/d*170*fast; } else throwShot(); B.timer = 1.6/fast; } }
      else { B.x = clamp(B.x + B.svx*dt, left, right); B.y += B.svy*dt; if (B.y > floor){ B.y = floor; B.mode = ''; G.shake = .15; } }
      break;
    case 'hover': B.y += ((96 + Math.sin(B.t*1.6)*22) - B.y)*Math.min(1, dt*2); B.x += (B.vx ||= 40)*fast*dt; if (B.x < left || B.x > right) B.vx = -B.vx; B.x = clamp(B.x, left, right);
      if (B.timer <= 0){ throwShot(); B.timer = 1.3/fast; } break;
    case 'dance': { const cx = 7.5*TS - B.w/2; B.x = cx + Math.sin(B.t*.9*fast)*80; B.y = 98 + Math.sin(B.t*1.8*fast)*24;
      B.ghost = (B.t % 4) > 3.2; if (B.timer <= 0){ throwShot(); B.timer = 1.8/fast; } break; }
    case 'hop': case 'walk': {
      B.vy = Math.min(500, B.vy + 900*dt); const wasAir = !B.onGround;
      if (B.cfg.move === 'walk' && B.onGround){ B.vx = toward*(B.charge > 0 ? 150 : 38)*fast; B.charge = (B.charge || 0) - dt; }
      moveX(B, B.vx*dt); moveY(B, B.vy*dt);
      if (B.onGround && wasAir && B.cfg.move === 'hop'){ B.vx = 0; G.shake = .2; sfx('bump'); throwShot(); if (++B.minions % 3 === 0 && G.enemies.length < 3) G.enemies.push({ type:'chicken', x:B.x + 8, y:B.y + 10, w:14, h:14, vx:toward*40, vy:0, baseY:0, t:0, alive:true, dead:0, face:toward }); }
      if (B.onGround && B.timer <= 0){
        if (B.cfg.move === 'hop'){ B.vy = -380; B.vx = toward*(60 + Math.abs(p.x - B.x)*.6)*fast; B.timer = 1.4/fast; }
        else { if (B.cfg.shot === 'rock'){ B.vy = -300; } else if (Math.random() < .3) B.charge = .8; throwShot(); B.timer = 1.7/fast; } }
      break; }
  }
  B.face = toward;
  const hb = { x:B.x + 2, y:B.y + 2, w:B.w - 4, h:B.h - 2 };
  if (B.state !== 'intro' && !B.ghost) for (const s of G.shots) if (!s.dead && overlap({ x:s.x, y:s.y, w:6, h:6 }, hb)){ s.dead = 1; damageBoss(1); }
  if (!p.dead && B.state !== 'intro' && overlap(p, hb)){
    if (p.vy > 30 && p.y + p.h - hb.y < 16 && !B.ghost){ p.vy = -330; damageBoss(3); if (B.cfg.move === 'walk'){ B.inv = 1; B.charge = .9; } } else hurt('boss'); }
}
function damageBoss(n, force){ const B = G.B; if ((B.inv > 0 && !force) || B.gone) return; const before = B.hp; B.hp = Math.max(0, B.hp - n); B.inv = n > 1 ? .5 : .08; sfx('bossHit'); puff(B.x + 14, B.y + 14, '#ffffff', 4);
  if (before > B.maxHp/2 && B.hp <= B.maxHp/2) G.pickups.push({ x:7.5*TS, y:20, vy:0 });
  if (B.hp <= 0){ B.gone = 2; G.eshots = []; Music.stop(); sfx('boom'); G.shake = .6; G.enemies.forEach(e => e.alive && kill(e)); } }
function finish(kind){ if (G.done) return; G.done = true; Music.stop(); releaseInput(); const o = G.opts, r = { coins:G.coins, lives:G.lives, bossHp:G.B ? G.B.hp : 0, tuba:G.p.dead ? 0 : G.tuba, tubaKO:G.tubaKO };
  setTimeout(() => { stop(); if (kind === 'clear') o.onClear && o.onClear(r); else if (kind === 'gameover') o.onGameOver && o.onGameOver(r); else o.onQuit && o.onQuit(r); }, kind === 'clear' ? 200 : 600); }

// ---------- render ----------
let ctx = null;
function draw(){
  const x = ctx, cam = Math.round(G.cam + (G.shake ? (Math.random() - .5)*(G.bigShake ? 10 : 6) : 0)), th = G.th;
  x.drawImage(G.bg.sky, 0, 0); x.save(); if (G.bigShake) x.translate(0, Math.round((Math.random() - .5)*8));
  const par = (img, f) => { const o = -Math.round(cam*f) % 512; x.drawImage(img, o, 0); x.drawImage(img, o + 512, 0); if (o + 1024 < W + 512) x.drawImage(img, o + 1024, 0); };
  par(G.bg.far, .25); par(G.bg.near, .5);
  // tiles
  const t0 = Math.floor(cam/TS), t1 = Math.min(G.L.w - 1, t0 + 17);
  for (let tx = t0; tx <= t1; tx++) for (let ty = 0; ty < ROWS; ty++){ const v = G.L.map[ty*G.L.w + tx]; if (!v) continue;
    const bump = G.bumps.find(b => b.tx === tx && b.ty === ty), by = bump ? -Math.sin(bump.t/.2*Math.PI)*5 : 0;
    const img = v === 1 ? (tileAt(tx, ty - 1) === 1 ? G.tl.fill : G.tl.top) : v === 2 ? G.tl.brick : v === 3 ? G.tl.note : v === 4 ? G.tl.used : v === 5 ? G.tl.semi : v === 7 ? G.tl.crate : v === 8 ? G.tl.tuba : (tileAt(tx, ty - 1) === 6 ? G.tl.pillar : G.tl.cap);
    if (v === 8) glow(x, tx*TS - cam + 8, ty*TS + 8, 13);
    x.drawImage(img, tx*TS - cam, ty*TS + by); if (v === 8) twinkle(x, tx*TS - cam + 8, ty*TS + 8, 12); }
  // checkpoint & goal
  if (!G.boss){ const st = SP.item('stand'), cx = G.base.cpX - cam, gy = gTopAt(G.base.cpX)*TS; x.drawImage(st, cx, gy - st.height);
    if (G.cpReached){ x.drawImage(SP.item('coin'), cx + 2, gy - st.height - 14); }
    drawMetronome(x, G.base.goalX - cam, gTopAt(G.base.goalX)*TS); }
  // coins
  const coinImg = SP.item('coin');
  for (const c of G.coinList) if (!c.taken && c.x - cam > -16 && c.x - cam < W + 16){ const b = Math.round(Math.sin(G.t*4 + c.x*.05)*1.5); x.drawImage(coinImg, Math.round(c.x - cam), c.y + b); }
  for (const c of G.pops) x.drawImage(coinImg, Math.round(c.x - cam), Math.round(c.y));
  for (const pk of G.pickups){ if (pk.kind === 'tuba'){ const tu = SP.item('tuba'), px = Math.round(pk.x - cam), py = Math.round(pk.y + Math.sin(G.t*5)*1.5);
      glow(x, px, py + 7, 14); x.drawImage(tu, px - 7, py - 1); twinkle(x, px, py + 7, 14); continue; }
    const h = SP.item(pk.kind === 'chord' ? 'chord' : 'heart'); x.drawImage(h, Math.round(pk.x - cam - 3), Math.round(pk.y)); }
  // enemies
  for (const e of G.enemies){ if (e.x - cam < -32 || e.x - cam > W + 32) continue;
    let fi = Math.floor(e.t*6) % 2;
    if (e.type === 'hedgehog') fi = e.st === 'wind' ? 2 : e.st === 'throw' ? 3 : Math.floor(e.t*4) % 2;
    else if (e.type === 'meep') fi = e.onGround || !e.alive ? 0 : 1; else if (e.type === 'dragon') fi = Math.floor(e.t*5) % 2;
    const fr = SP.enemyFrames(e.type)[fi], img = e.face > 0 ? fr.l : fr.r;
    if (!e.alive){ x.save(); x.translate(Math.round(e.x - cam + e.w/2), Math.round(e.y + e.h/2)); x.scale(1, -1); x.drawImage(img, -Math.round(img.width/2), -Math.round(img.height/2)); x.restore(); continue; }
    if (e.flash > 0 && Math.floor(G.t*30) % 2) continue;
    const shake = e.st === 'wind' ? (Math.floor(G.t*30) % 2 ? 1 : -1) : 0, ex = Math.round(e.x - cam - (img.width - e.w)/2) + shake;
    x.drawImage(img, ex, Math.round(e.y + e.h - img.height));
    if (e.st === 'wind') alertBubble(x, Math.round(e.x - cam + e.w/2), Math.round(e.y + e.h - img.height) - 4, e.stT); }
  // boss
  if (G.B && (!G.B.gone || G.B.gone > 1)){ const B = G.B, f = SP.bossFrames(B.key); const img = B.inv > 0 && Math.floor(G.t*30) % 2 ? f.hit : (B.face > 0 ? f.r : f.l);
    x.globalAlpha = B.ghost ? .35 + Math.sin(G.t*30)*.15 : 1; const bob = B.cfg.move === 'fly' || B.cfg.move === 'hover' || B.cfg.move === 'dance' ? Math.round(Math.sin(G.t*6)*2) : 0;
    x.drawImage(img, Math.round(B.x - cam - 2), Math.round(B.y - 4 + bob)); x.globalAlpha = 1; }
  // enemy shots
  for (const s of G.eshots){ const sx = Math.round(s.x - cam), sy = Math.round(s.y);
    switch (s.kind){
      case 'spear': x.fillStyle = '#5a3412'; x.fillRect(sx - 1, sy - 6, 2, 10); x.fillStyle = '#d0d4e4'; x.fillRect(sx - 2, sy + 3, 4, 4); break;
      case 'egg': x.fillStyle = '#1a1030'; x.fillRect(sx - 4, sy - 5, 8, 10); x.fillStyle = '#ffffff'; x.fillRect(sx - 3, sy - 4, 6, 8); break;
      case 'axe': { const fl = Math.floor(s.rot) % 2; x.fillStyle = '#5a3412'; fl ? x.fillRect(sx - 5, sy - 1, 10, 2) : x.fillRect(sx - 1, sy - 5, 2, 10); x.fillStyle = '#d0d4e4'; fl ? x.fillRect(sx + 2, sy - 4, 4, 8) : x.fillRect(sx - 4, sy - 6, 8, 4); break; }
      case 'fire': x.fillStyle = '#ff4f1f'; x.fillRect(sx - 4, sy - 4, 8, 8); x.fillStyle = '#ffd23f'; x.fillRect(sx - 2, sy - 2, 4, 4); break;
      case 'arrow': { const d = s.vx > 0 ? 1 : -1, tip = sx + d*6, tail = sx - d*6;   // toy arrow: pink rubber tip, wooden shaft, blue feathers
        x.fillStyle = '#1a1030'; x.fillRect(sx - 6, sy - 1, 13, 3); x.fillStyle = '#e0a868'; x.fillRect(sx - 5, sy, 11, 1);
        x.fillStyle = '#1a1030'; x.fillRect(tip - 2, sy - 3, 5, 7); x.fillStyle = '#ff4f79'; x.fillRect(tip - 1, sy - 2, 3, 5); x.fillStyle = '#ffc0d8'; x.fillRect(tip - (d > 0 ? 0 : -1), sy - 2, 1, 2);
        x.fillStyle = '#3a6ee8'; x.fillRect(tail - 2, sy - 3, 4, 2); x.fillRect(tail - 2, sy + 2, 4, 2); x.fillStyle = '#7cc0ff'; x.fillRect(tail - 1, sy - 3, 2, 1); break; }
      case 'orb': x.fillStyle = '#9b5de5'; x.fillRect(sx - 3, sy - 3, 6, 6); x.fillStyle = '#ffffff'; x.fillRect(sx - 1, sy - 2, 2, 2); break;
      default: x.fillStyle = '#1a1030'; x.fillRect(sx - 5, sy - 5, 10, 10); x.fillStyle = '#9aa0b4'; x.fillRect(sx - 4, sy - 4, 8, 8); x.fillStyle = '#d0d4e4'; x.fillRect(sx - 3, sy - 3, 3, 2);
    } }
  // shots
  for (const s of G.shots) x.drawImage(SP.noteShot(s.color), Math.round(s.x - cam), Math.round(s.y - 3));
  // tuba bass bombs + blasts
  const bb = SP.item('bassbomb'); for (const b of G.bombs){ x.drawImage(bb, Math.round(b.x - cam - 4), Math.round(b.y - 6)); if (Math.floor(G.t*20) % 2){ x.fillStyle = '#ffffff'; x.fillRect(Math.round(b.x - cam + 3), Math.round(b.y - 8), 2, 2); } }
  for (const q of G.blasts) drawBlast(x, q, cam);
  // player
  const p = G.p;
  if (!(p.inv > 0 && Math.floor(G.t*20) % 2)){
    const fr = p.dead ? G.hero.jump : !p.onGround ? G.hero.jump : Math.abs(p.vx) > 8 ? (Math.floor(p.anim/10) % 2 ? G.hero.run1 : G.hero.run2) : G.hero.stand;
    const img = p.face > 0 ? fr.r : fr.l, dx = p.face > 0 ? p.x - 3 : p.x - (img.width - 13);
    if (G.tuba > 0 && !p.dead){ const tu = SP.item(p.face > 0 ? 'tuba' : 'tubaL'); p.tubaFlash = Math.max(0, (p.tubaFlash || 0) - 1/60);
      const tx = Math.round((p.face > 0 ? p.x - 10 : p.x + p.w - 4) - cam), ty = Math.round(p.y - 2 - (p.tubaFlash ? 2 : 0)); x.drawImage(tu, tx, ty);
      if (p.tubaFlash){ x.fillStyle = '#ffffff'; x.fillRect(tx + 3, ty - 2, 8, 2); } }
    if (p.dead){ x.save(); x.translate(Math.round(dx - cam + img.width/2), Math.round(p.y + 10)); x.scale(1, -1); x.drawImage(img, -img.width/2, -10); x.restore(); }
    else x.drawImage(img, Math.round(dx - cam), Math.round(p.y - 1)); }
  // particles
  for (const q of G.parts){ x.fillStyle = q.color; x.fillRect(Math.round(q.x - cam), Math.round(q.y), q.s, q.s); }
  weather(x, cam); x.restore();
  hud(x);
}
function alertBubble(x, cx, by, left){ // the hedgehog's warning: a white "!" bubble that blinks faster just before the throw
  if (left < .25 && Math.floor(G.t*24) % 2) return; const bx = cx - 4, top = by - 11;
  x.fillStyle = '#1a1030'; x.fillRect(bx - 1, top - 1, 10, 12); x.fillRect(cx - 1, top + 11, 3, 2); x.fillStyle = '#ffffff'; x.fillRect(bx, top, 8, 10); x.fillRect(cx, top + 10, 1, 2);
  x.fillStyle = '#e83a4a'; x.fillRect(cx - 1, top + 2, 2, 4); x.fillRect(cx - 1, top + 7, 2, 2); }
function glow(x, cx, cy, r){ const a = .22 + Math.sin(G.t*5)*.1; x.globalAlpha = a; x.fillStyle = '#fff3a0';
  for (let i = 0; i < r; i++){ const hw = Math.round(Math.sqrt(r*r - i*i)); x.fillRect(cx - hw, cy - i, hw*2, 1); x.fillRect(cx - hw, cy + i, hw*2, 1); } x.globalAlpha = 1; }
function twinkle(x, cx, cy, r){ for (let i = 0; i < 4; i++){ const ph = G.t*4 + i*1.57; if (Math.sin(ph*1.7) < .2) continue;
  const sx = Math.round(cx + Math.cos(ph*.6 + i)*r), sy = Math.round(cy + Math.sin(ph*.6 + i)*r); x.fillStyle = i % 2 ? '#ffffff' : '#ffd23f'; x.fillRect(sx, sy - 2, 1, 5); x.fillRect(sx - 2, sy, 5, 1); } }
function drawBlast(x, q, cam){ const k = q.t/.35, cx = Math.round(q.x - cam), cy = Math.round(q.y), R = TUBA.radius;
  if (q.t < .08){ x.globalAlpha = .8; x.fillStyle = '#ffffff'; for (let i = 0; i < R; i += 2){ const hw = Math.round(Math.sqrt(R*R - i*i)); x.fillRect(cx - hw, cy - i, hw*2, 2); x.fillRect(cx - hw, cy + i, hw*2, 2); } x.globalAlpha = 1; }
  if (k < 1){ const r = Math.round(R*Math.sqrt(k)); for (let i = 0; i < 28; i++){ const a = i/28*Math.PI*2; x.fillStyle = i % 2 ? '#ff8c42' : '#ffd23f'; x.fillRect(Math.round(cx + Math.cos(a)*r) - 1, Math.round(cy + Math.sin(a)*r) - 1, 3, 3);
      x.fillStyle = '#fff3a0'; x.fillRect(Math.round(cx + Math.cos(a + .1)*r*.6), Math.round(cy + Math.sin(a + .1)*r*.6), 2, 2); } }
  const s = 'BWAAMP!', tw = SP.textWidth(s); SP.text(x, s, cx - Math.round(tw/2), Math.round(cy - 30 - q.t*22), q.t < .5 || Math.floor(q.t*20) % 2 ? '#ffd23f' : '#ff8c42'); }
function drawMetronome(x, gx, gy){ // the goal: a giant wooden metronome with a swinging arm
  const k = '#1a1030'; x.fillStyle = k; for (let r = 0; r < 56; r++){ const w = 8 + Math.floor(r*0.3); x.fillRect(gx + 12 - w, gy - 56 + r, w*2, 1); }
  x.fillStyle = '#a8642a'; for (let r = 1; r < 55; r++){ const w = 7 + Math.floor(r*0.3); x.fillRect(gx + 12 - w, gy - 56 + r, w*2, 1); }
  x.fillStyle = '#7c4519'; x.fillRect(gx + 4, gy - 22, 16, 18); x.fillStyle = '#ffe9a0'; x.fillRect(gx + 7, gy - 50, 10, 26);
  for (let i = 0; i < 6; i++){ x.fillStyle = k; x.fillRect(gx + 8, gy - 48 + i*4, 3, 1); }
  const a = Math.sin(G.t*4)*.5, px = gx + 12, py = gy - 18;
  for (let i = 0; i < 40; i++){ x.fillStyle = '#d0d4e4'; x.fillRect(Math.round(px + Math.sin(a)*i), Math.round(py - Math.cos(a)*i), 2, 1); }
  x.fillStyle = '#ffd23f'; x.fillRect(Math.round(px + Math.sin(a)*26) - 3, Math.round(py - Math.cos(a)*26) - 3, 7, 6); x.fillStyle = k; x.fillRect(Math.round(px + Math.sin(a)*26) - 3, Math.round(py - Math.cos(a)*26) + 3, 7, 1);
}
function weather(x, cam){
  const fx = G.th.fx;
  if (fx === 'snow'){ x.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++){ const sx = ((i*53 + G.t*(10 + i%5*4) - cam*.6) % W + W) % W, sy = ((i*97 + G.t*(28 + i%7*5)) % H); x.fillRect(Math.round(sx), Math.round(sy), i % 3 ? 1 : 2, i % 3 ? 1 : 2); } }
  else if (fx === 'stars'){ for (let i = 0; i < 12; i++){ if (Math.sin(G.t*3 + i*1.7) > .7){ x.fillStyle = '#ffffff'; const sx = (i*71) % W, sy = (i*37) % 100; x.fillRect(sx, sy, 1, 3); x.fillRect(sx - 1, sy + 1, 3, 1); } } }
  else if (fx === 'dust'){ x.fillStyle = 'rgba(220,200,255,.6)'; for (let i = 0; i < 18; i++){ const sx = ((i*61 + Math.sin(G.t + i)*20 - cam*.3) % W + W) % W, sy = (i*47 + G.t*6*(i%3 + 1)) % H; x.fillRect(Math.round(sx), Math.round(H - sy), 1, 1); } }
}
function hud(x){
  x.fillStyle = 'rgba(16,8,40,.72)'; x.fillRect(0, 0, W, 15);
  const h = SP.item('heart'); for (let i = 0; i < G.maxHearts; i++){ x.globalAlpha = i < G.p.hearts ? 1 : .25; x.drawImage(h, 4 + i*9, 4); } x.globalAlpha = 1;
  x.drawImage(SP.item('coin'), 46, 2); SP.text(x, 'x' + G.coins, 56, 4, '#ffd23f');
  SP.text(x, 'LIVES ' + G.lives, 92, 4, '#ffffff');
  if (G.chord) x.drawImage(SP.item('chord'), 146, 5);
  if (G.tuba > 0){ x.fillStyle = 'rgba(16,8,40,.72)'; x.fillRect(0, 15, 34, 13); x.globalAlpha = G.tubaCool > 0 ? .45 : 1; x.drawImage(SP.item('tubaIcon'), 3, 17); x.globalAlpha = 1;
    SP.text(x, 'x' + G.tuba, 14, 19, '#ffd23f'); if (G.tubaCool > 0){ x.fillStyle = '#ffd23f'; x.fillRect(2, 26, Math.round(30*(1 - G.tubaCool/TUBA.cool)), 1); } }
  const label = G.boss ? 'BOSS' : (G.opts.label || '').split('  ')[0]; SP.text(x, label, W - SP.textWidth(label) - 40, 4, '#7cc0ff');
  if (G.B){ const B = G.B; x.fillStyle = '#1a1030'; x.fillRect(40, 18, 176, 7); x.fillStyle = '#e83a4a'; x.fillRect(41, 19, Math.round(174*B.hp/B.maxHp), 5); x.fillStyle = '#ff8a8a'; x.fillRect(41, 19, Math.round(174*B.hp/B.maxHp), 1); }
  if (G.msg){ const s = G.msg.text.slice(0, 40), sc = s.length > 20 ? 1 : 2, tw = SP.textWidth(s, sc); x.fillStyle = 'rgba(16,8,40,.75)'; x.fillRect(W/2 - tw/2 - 6, 92, tw + 12, 7*sc + 12); SP.text(x, s, Math.round(W/2 - tw/2), 98, '#ffd23f', '#1a1030', sc); }
  if (G.p.clear){ const s = G.boss ? 'BOSS DEFEATED!' : 'STAGE CLEAR!', tw = SP.textWidth(s, 2); SP.text(x, s, Math.round(W/2 - tw/2), 80, '#ffd23f', '#1a1030', 2); }
  if (G.paused){ x.fillStyle = 'rgba(16,8,40,.6)'; x.fillRect(0, 0, W, H); const tw = SP.textWidth('PAUSED', 2); SP.text(x, 'PAUSED', Math.round(W/2 - tw/2), 70, '#ffffff', '#1a1030', 2); }
}

// ---------- loop ----------
let fpsFrames = 0, fpsT = 0; const stats = { fps:0 };
function frame(ts){
  raf = requestAnimationFrame(frame); if (!G) return;
  const dt = Math.min(.1, (ts - last)/1000 || 0); last = ts;
  fpsFrames++; fpsT += dt; if (fpsT >= 1){ stats.fps = fpsFrames/fpsT; fpsFrames = 0; fpsT = 0; }
  if (!G.paused && !G.done){ acc += dt; let n = 0; while (acc >= 1/60 && n < 5){ step(1/60); acc -= 1/60; n++; if (!G) return; } }
  if (G) draw();
}
function togglePause(force){ if (!G || G.done) return; G.paused = force !== undefined ? force : !G.paused; sfx('pause'); releaseInput();
  if (G.paused) Music.stop(); else Music.start(G.th, G.boss); pausedCb && pausedCb(G.paused); }
function start(canvas, root, opts){
  stop(); ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  sfxOn = opts.sfx !== false; musicOn = opts.music !== false; pausedCb = opts.onPause;
  if (!root.dataset.bound){ bindTouch(root); root.dataset.bound = '1'; } uiRoot = root; tubaUI = '';
  releaseInput();
  newRun(opts); syncTubaUI(); ac(); Music.start(G.th, G.boss); last = performance.now(); acc = 0; raf = requestAnimationFrame(frame);
}
function stop(){ cancelAnimationFrame(raf); Music.stop(); releaseInput(); G = null; tubaUI = ''; if (uiRoot) uiRoot.classList.remove('has-tuba'); }
function quit(){ if (G && !G.done){ G.done = true; const o = G.opts, r = { coins:G.coins, lives:G.lives, tuba:G.p.dead ? 0 : G.tuba, tubaKO:G.tubaKO }; stop(); o.onQuit && o.onQuit(r); } }
document.addEventListener('visibilitychange', () => { if (document.hidden){ releaseInput(); if (G && !G.paused) togglePause(true); } });

// ---------- overworld map (90s island-hopping style) ----------
function iconFor(x, theme, cx, cy, t){
  const k = '#1a1030', R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(cx + a, cy + b, w, h); };
  switch (theme){
    case 'snow': for (let r = 0; r < 26; r++){ R(-r, -26 + r, r*2 + 1, 1, r < 8 ? '#ffffff' : '#7f97cc'); } R(-14, -2, 28, 2, k); break;
    case 'farm': R(-12, -16, 24, 16, '#c0283a'); for (let r = 0; r < 9; r++) R(-r - 3, -25 + r, r*2 + 6, 1, '#7a1020'); R(-4, -10, 8, 10, '#ffffff'); R(-3, -9, 6, 9, '#7a1020'); R(14, -20, 6, 20, '#d8d8e8'); break;
    case 'candy': for (const [a, h] of [[-12, 24], [0, 30], [12, 22]]){ for (let y = 0; y < h; y++) R(a - 4, -y, 8, 1, ((y >> 2) & 1) ? '#e83a4a' : '#ffffff'); for (let r = 0; r < 6; r++) R(a - r, -h - 6 + r, r*2, 1, '#ff4f79'); } break;
    case 'castle': R(-14, -18, 28, 18, '#9aa0b4'); for (let i = 0; i < 4; i++) R(-14 + i*8, -22, 4, 4, '#9aa0b4'); R(-4, -9, 8, 9, k); R(-18, -28, 8, 28, '#7a8098'); R(10, -28, 8, 28, '#7a8098');
      R(-14, -34, 2, 6, k); R(-12, -34, 6, 4, '#e83a4a'); if (Math.sin(t*3) > 0) R(2, -30, 1, 1, '#ffd23f'); R(-1, -30, 3, 3, '#ffd23f'); break;
    case 'haunted': R(-14, -20, 28, 20, '#5a2a9a'); for (let r = 0; r < 10; r++) R(-r - 6, -30 + r, r*2 + 12, 1, '#3a1a6a'); R(-9, -15, 5, 6, Math.sin(t*5) > .3 ? '#ffd23f' : '#3a1a6a'); R(4, -15, 5, 6, '#ffd23f'); R(-3, -8, 6, 8, k);
      R(12, -40 + Math.round(Math.sin(t*2)*2), 6, 6, '#ffffff'); break;
    default: for (let r = 0; r < 12; r++) R(-r*2, -12 + r, r*4 + 1, 1, '#4ec04e'); R(0, -26, 2, 14, k); R(2, -26, 8, 5, '#ff4f79');
  }
}
function drawOverworld(canvas, worlds, opts = {}){
  const n = worlds.length, h = 80 + n*78, x = canvas.getContext('2d'); canvas.width = W; canvas.height = h; x.imageSmoothingEnabled = false;
  const t = opts.t || 0;
  x.fillStyle = '#2f6fd8'; x.fillRect(0, 0, W, h);
  for (let y = 0; y < h; y += 8) for (let i = 0; i < W; i += 16){ const off = ((y/8) % 2)*8 + Math.round(Math.sin(t*2 + y)*2); x.fillStyle = '#4f8ff0'; x.fillRect(i + off, y + 3, 5, 1); }
  SP.text(x, 'BAND QUEST', Math.round(W/2 - SP.textWidth('BAND QUEST', 2)/2), 10, '#ffd23f', '#1a1030', 2);
  const pos = worlds.map((w, i) => ({ x:i % 2 ? 182 : 74, y:70 + i*78 }));
  // dotted path
  for (let i = 0; i < n - 1; i++){ const a = pos[i], b = pos[i+1]; for (let s = 0; s <= 1; s += .06){ const px = a.x + (b.x - a.x)*s, py = a.y + (b.y - a.y)*s + Math.sin(s*Math.PI)*10;
    x.fillStyle = '#1a1030'; x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5); x.fillStyle = '#ffe9a0'; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); } }
  const hits = [];
  worlds.forEach((w, i) => {
    const { x:cx, y:cy } = pos[i], th = themeOf(w.world || {});
    // island
    for (let r = -16; r <= 16; r++){ const hw = Math.round(Math.sqrt(1 - (r/17)*(r/17))*56); x.fillStyle = '#1a1030'; x.fillRect(cx - hw - 2, cy + r, hw*2 + 4, 1); }
    for (let r = -15; r <= 15; r++){ const hw = Math.round(Math.sqrt(1 - (r/16)*(r/16))*54); x.fillStyle = r > 9 ? th.fill : th.key === 'haunted' ? '#4a3a5a' : th.top === '#ffffff' || th.top === '#f4f8ff' ? '#e8f0ff' : th.top; x.fillRect(cx - hw, cy + r, hw*2, 1); }
    iconFor(x, th.key, cx, cy + 4, t);
    // label plate
    const words = ((i + 1) + ' ' + String(w.title).toUpperCase().replace(/[^A-Z0-9 !?'-]/g, '')).split(/\s+/), lines = [''];
    for (const wd of words){ const cur = lines[lines.length - 1], nx = (cur + ' ' + wd).trim(); if (nx.length <= 18) lines[lines.length - 1] = nx; else if (lines.length < 2) lines.push(wd.slice(0, 18)); else lines[1] = (lines[1] + ' ' + wd).slice(0, 18); }
    const tw = Math.max(...lines.map(l => SP.textWidth(l))), lh = lines.length*9 + 1;
    x.fillStyle = '#1a1030'; x.fillRect(cx - tw/2 - 4, cy + 18, tw + 8, lh + 2); x.fillStyle = w.color || '#ffd23f'; x.fillRect(cx - tw/2 - 3, cy + 19, tw + 6, lh);
    lines.forEach((l, j) => SP.text(x, l, Math.round(cx - SP.textWidth(l)/2), cy + 21 + j*9, '#1a1030', null));
    // progress dots: 3 stages + boss crown
    for (let s = 0; s < 3; s++){ x.fillStyle = '#1a1030'; x.fillRect(cx - 22 + s*10, cy - 38, 7, 7); x.fillStyle = w.cleared && w.cleared[s] ? '#ffd23f' : '#4a3a73'; x.fillRect(cx - 21 + s*10, cy - 37, 5, 5); }
    x.fillStyle = '#1a1030'; x.fillRect(cx + 8, cy - 39, 13, 9); x.fillStyle = w.bossBeaten ? '#ff4f79' : w.bossOpen ? '#ffd23f' : '#4a3a73'; x.fillRect(cx + 9, cy - 38, 11, 7);
    SP.text(x, w.bossBeaten ? '!' : 'B', cx + 12, cy - 38, '#1a1030', null);
    if (w.locked){ x.globalAlpha = .55; x.fillStyle = '#1a1030'; for (let r = -15; r <= 15; r++){ const hw = Math.round(Math.sqrt(1 - (r/16)*(r/16))*54); x.fillRect(cx - hw, cy + r, hw*2, 1); } x.globalAlpha = 1;
      const R = (a, b, ww, hh, c) => { x.fillStyle = c; x.fillRect(cx + a, cy + b, ww, hh); };
      R(-8, -14, 16, 2, '#1a1030'); R(-8, -14, 2, 8, '#1a1030'); R(6, -14, 2, 8, '#1a1030'); R(-6, -12, 2, 6, '#c8c8d8'); R(4, -12, 2, 6, '#c8c8d8'); R(-6, -14, 12, 2, '#c8c8d8');
      R(-11, -6, 22, 16, '#1a1030'); R(-10, -5, 20, 14, '#ffd23f'); R(-2, -2, 4, 5, '#1a1030'); R(-1, 3, 2, 3, '#1a1030'); }
    hits.push({ id:w.id, x:cx - 58, y:cy - 42, w:116, h:76 });
  });
  if (opts.hero){ const cur = Math.max(0, worlds.findIndex(w => w.id === opts.current)), f = SP.heroFrames(opts.hero.inst, opts.hero.hair), pp = pos[cur];
    x.drawImage(f.stand.r, pp.x - 44, pp.y - 6 + Math.round(Math.sin(t*4))); }
  return hits;
}

window.PQGame = { start, stop, quit, togglePause, drawOverworld, themeOf, THEMES:Object.keys(THEMES), stats, get running(){ return !!G; },
  debug:{ get G(){ return G; }, deaths, input, run(n){ for (let i = 0; i < n && G && !G.done; i++){ if (!G.paused) step(1/60); } } } };
})();
