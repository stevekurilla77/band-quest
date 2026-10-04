/* Band Quest finale: the story scene with Mr. Kurilla (title-screen style) and the ending parade + THE END.
   Pixel art is drawn in code (PQSprites); the finale song comes from PQGame.finale (Web Audio, follows the music setting). */
(() => {
'use strict';
const SP = window.PQSprites, W = 256, H = 224, BEAT = 60/132;
const k = '#1a1030';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
let bgCache = null;
function starry(){   /* night-sky backdrop shared by the story and the parade */
  if (bgCache) return bgCache; const [c, x] = cv(W, H);
  const sky = ['#120a2e', '#1e1250', '#33206e', '#4a2c86']; sky.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i*44, W, 45); });
  let s = 7; const r = () => (s = (s*16807) % 2147483647)/2147483647;
  for (let i = 0; i < 80; i++){ x.fillStyle = r() < .2 ? '#ffd23f' : '#ffffff'; x.fillRect(Math.floor(r()*W), Math.floor(r()*170), 1, 1); }
  x.fillStyle = '#fff6c8'; x.fillRect(240, 4, 10, 12); x.fillRect(239, 6, 12, 8); x.fillStyle = sky[0]; x.fillRect(245, 4, 7, 7);   /* small crescent moon, clear of the titles */
  x.fillStyle = '#2a1a50'; for (let i = 0; i < W; i++){ const h = 18 + Math.round(Math.sin(i*.05)*6 + Math.sin(i*.13)*3); x.fillRect(i, 176 - h, 1, h); }
  x.fillStyle = '#4a2a7a'; x.fillRect(0, 176, W, H - 176); x.fillStyle = '#b48cff'; x.fillRect(0, 176, W, 2); x.fillStyle = '#3a2066';
  for (let i = 0; i < W; i += 16){ x.fillRect(i, 180, 1, 44); } for (let j = 186; j < H; j += 10) x.fillRect(0, j, W, 1);
  return bgCache = c;
}
const scaled = (img, sc) => { const [c, x] = cv(img.width*sc, img.height*sc); x.drawImage(img, 0, 0, c.width, c.height); return c; };
function sparkle(x, cx, cy, t, n = 6, r = 14, cols = ['#ffd23f', '#ffffff']){
  for (let i = 0; i < n; i++){ const a = t*1.6 + i/n*Math.PI*2, sx = Math.round(cx + Math.cos(a)*r), sy = Math.round(cy + Math.sin(a)*r*.7); if (Math.sin(t*6 + i) < -.3) continue;
    x.fillStyle = cols[i % cols.length]; x.fillRect(sx, sy - 1, 1, 3); x.fillRect(sx - 1, sy, 3, 1); } }
const center = (x, s, y, col, sc = 1) => SP.text(x, s, Math.round(W/2 - SP.textWidth(s, sc)/2), y, col, k, sc);

// ---------- story scene ----------
// lines: [{ who:'kurilla'|'hero', text, drum?:bool }]. The app shows the words in an HTML box (big, readable); the canvas shows the scene.
function story(canvas, opts){
  const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
  const hero = SP.heroFrames(opts.inst, opts.hair), H2 = scaled(hero.stand.r, 2), H2j = scaled(hero.jump.r, 2);
  const wz = { stand:scaled(flip(SP.wizard('stand')), 2), cast:scaled(flip(SP.wizard('cast')), 2) }, drum = scaled(SP.snare(), 2);
  const st = { who:'kurilla', drum:false, t:0, raf:0, last:performance.now(), cheer:false };
  const frame = now => { st.raf = requestAnimationFrame(frame); const dt = Math.min(.1, (now - st.last)/1000); st.last = now; st.t += dt; draw(); };
  const draw = () => { const t = st.t; x.drawImage(starry(), 0, 0);
    center(x, 'THE FINAL SHOWDOWN', 14 + Math.round(Math.sin(t*2)), '#ffd23f', 2);
    const hb = st.who === 'hero' ? Math.round(Math.abs(Math.sin(t*6))*-3) : 0, wb = st.who === 'kurilla' ? Math.round(Math.abs(Math.sin(t*5))*-3) : 0;
    x.drawImage(st.cheer ? H2j : H2, 30, 176 - H2.height + hb);
    const wimg = st.who === 'kurilla' && Math.sin(t*3) > 0 ? wz.cast : wz.stand, wx = 170, wy = 176 - wimg.height + Math.round(Math.sin(t*2)*2) - 6 + wb;
    x.globalAlpha = .25 + Math.sin(t*3)*.08; x.fillStyle = '#c9b6ff'; x.fillRect(wx + 6, 172, 52, 4); x.globalAlpha = 1;
    x.drawImage(wimg, wx, wy); sparkle(x, wx + 10, wy + 6, t, 5, 9, ['#ffd23f', '#c9b6ff']);
    if (st.who === 'kurilla'){ x.fillStyle = '#ffffff'; x.fillRect(wx + 24, wy - 10, 1, 1); }
    if (st.drum){ const dx = 112, dy = 52 + Math.round(Math.sin(t*2.4)*4); x.globalAlpha = .3 + Math.sin(t*5)*.1; x.fillStyle = '#fff3a0';
      for (let i = 0; i < 26; i++){ const hw = Math.round(Math.sqrt(26*26 - i*i)); x.fillRect(dx - hw, dy + 20 - i, hw*2, 1); x.fillRect(dx - hw, dy + 20 + i, hw*2, 1); } x.globalAlpha = 1;
      x.drawImage(drum, dx - drum.width/2, dy); sparkle(x, dx, dy + 20, t, 8, 30); const lb = 'GOLDEN SNARE DRUM'; SP.text(x, lb, Math.round(dx - SP.textWidth(lb)/2), dy + 46, '#ffd23f', k); }
  };
  st.raf = requestAnimationFrame(frame);
  return { set(line){ st.who = line.who; if (line.drum) st.drum = true; if (line.cheer) st.cheer = true; }, stop(){ cancelAnimationFrame(st.raf); }, draw, get state(){ return st; } };
}
function flip(c){ const [f, x] = cv(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; }

// ---------- ending parade ----------
// cast: [{ title, cols, list:[{ kind:'hero'|'enemy'|'boss'|'wizard', inst?, hair?, gold?, type?, name }] }]
function wrap(name, max){ const out = []; let line = ''; for (const w of String(name).toUpperCase().split(' ')){ if (line && (line + ' ' + w).length > max){ out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
function imgFor(c, t){
  if (c.kind === 'hero'){ const f = SP.heroFrames(c.inst, c.hair, !!c.gold); return Math.floor(t/BEAT) % 2 ? f.run1.l : f.run2.l; }
  if (c.kind === 'enemy'){ const f = SP.enemyFrames(c.type); return (f[Math.floor(t*5) % f.length] || f[0]).r; }
  if (c.kind === 'boss') return SP.bossFrames(c.type).r;
  if (c.kind === 'wizard') return SP.wizard('happy');
  if (c.kind === 'drum') return SP.snare();
  return SP.item('coin'); }
function credits(canvas, cast, opts = {}){
  const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
  const G = { t:0, raf:0, last:performance.now(), shown:new Set(), phase:'parade', hearts:[], done:false, onEnd:opts.onEnd };
  const SEG = 6.6, TITLE = .9, IN = 1.3, OUT = 1.0, endAt = cast.length*SEG + .4, END_IN = 1.2, END_HOLD = 3, END_OUT = 1.5;
  G.total = endAt + END_IN + END_HOLD + END_OUT;
  const drawGroup = (g, lt) => {
    const a = lt < TITLE ? lt/TITLE : lt > SEG - OUT ? Math.max(0, (SEG - lt)/OUT) : 1; x.globalAlpha = a; center(x, g.title, 26, '#ffd23f', 2); x.globalAlpha = 1;
    const cols = g.cols || Math.min(4, g.list.length), rows = Math.ceil(g.list.length/cols), cw = W/cols, maxc = Math.max(5, Math.floor((cw - 4)/6));
    g.list.forEach((c, i) => { const row = Math.floor(i/cols), inRow = Math.min(cols, g.list.length - row*cols), col = i % cols;
      const tx = Math.round((W - inRow*cw)/2 + col*cw + cw/2), base = rows === 1 ? 128 : rows === 2 ? 92 + row*76 : 66 + row*62, delay = TITLE*.6 + i*.12;
      let px = tx; const li = lt - delay;
      if (li < IN) px = Math.round(W + 40 + (tx - W - 40)*Math.max(0, li)/IN);
      else if (lt > SEG - OUT) px = Math.round(tx - (lt - (SEG - OUT))/OUT*(tx + 60));
      if (li < 0) return; const img = imgFor(c, G.t), sc = c.big || c.kind === 'wizard' || c.kind === 'drum' ? 2 : 1, w = img.width*sc, h = img.height*sc;
      const hop = Math.round(Math.abs(Math.sin((G.t + i*.11)*Math.PI/BEAT))*(sc > 1 ? 6 : 5));
      x.drawImage(img, Math.round(px - w/2), base - h - hop, w, h);
      if (li > IN && lt < SEG - OUT){ if (base + 14 <= H) G.shown.add(c.name); const lines = wrap(c.name, maxc); lines.forEach((ln, j) => SP.text(x, ln, Math.round(px - SP.textWidth(ln)/2), base + 5 + j*9, j ? '#c9b6ff' : '#ffffff'));
        if (Math.random() < .015) G.hearts.push({ x:px + (Math.random() - .5)*20, y:base - h - 6, t:0, c:Math.random() < .5 ? 'heart' : 'note' }); } });
  };
  const draw = () => { const t = G.t; x.drawImage(starry(), 0, 0);
    if (t < endAt){ const gi = Math.floor(t/SEG); if (cast[gi]) drawGroup(cast[gi], t - gi*SEG); }
    for (const p of G.hearts){ const yy = Math.round(p.y - p.t*24), xx = Math.round(p.x + Math.sin(p.t*4)*3); x.globalAlpha = Math.max(0, 1 - p.t/1.6);
      if (p.c === 'heart') x.drawImage(SP.item('heart'), xx, yy); else { x.fillStyle = '#ffd23f'; x.fillRect(xx + 3, yy, 1, 6); x.fillRect(xx, yy + 5, 4, 3); x.fillRect(xx + 4, yy, 2, 1); } x.globalAlpha = 1; }
    if (t >= endAt){ const e = t - endAt, a = e < END_IN ? e/END_IN : e < END_IN + END_HOLD ? 1 : Math.max(0, 1 - (e - END_IN - END_HOLD)/END_OUT);
      G.phase = e < END_IN + END_HOLD + END_OUT ? 'theend' : 'done'; x.globalAlpha = a; center(x, 'THE END', 92, '#ffd23f', 4); center(x, 'THANKS FOR PLAYING!', 132, '#ffffff', 1); x.globalAlpha = 1;
      if (G.phase === 'done'){ const d = e - END_IN - END_HOLD - END_OUT, k = Math.min(1, d/1.2), dr = SP.snare(), dy = 70 + Math.round(Math.sin(t*2.4)*3);   /* resting card behind the Play Again button */
        x.globalAlpha = k; center(x, 'BAND QUEST', 32, '#ffd23f', 2); x.drawImage(dr, 128 - dr.width, dy, dr.width*2, dr.height*2); sparkle(x, 128, dy + 20, t, 8, 30); center(x, 'THANKS FOR PLAYING!', 128, '#ffffff', 1); x.globalAlpha = 1; }
      if (G.phase === 'done' && !G.done){ G.done = true; G.onEnd && G.onEnd(); } }
  };
  const frame = now => { G.raf = requestAnimationFrame(frame); const dt = Math.min(.1, (now - G.last)/1000); G.last = now; step(dt); draw(); };
  const step = dt => { G.t += dt; for (const p of G.hearts) p.t += dt; G.hearts = G.hearts.filter(p => p.t < 1.6); };
  G.raf = requestAnimationFrame(frame);
  return { stop(){ cancelAnimationFrame(G.raf); }, skip(){ G.t = Math.max(G.t, endAt); }, step(dt){ step(dt); draw(); }, draw, get state(){ return G; }, endAt, total:G.total };
}

// ---------- v30 story cutscenes: opening story, boss talk, wizard showdown, the big reveal ----------
// page.scene: 'intro-room' | 'intro-empty' | 'intro-wizard' | 'intro-hero' | 'boss' | 'showdown' | 'reveal'
function silhouette(img, col){ const [c, x] = cv(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }
function skinBox(img){   /* where the wizard's face is (for the hooded look) */
  const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++){ const o = (j*img.width + i)*4; if (d[o+3] && d[o] > 200 && d[o+1] > 140 && d[o+1] < 210 && d[o+2] > 120 && d[o+2] < 175){ x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i); y1 = Math.max(y1, j); } }
  return x1 < 0 ? { x:10, y:8, w:10, h:8 } : { x:x0, y:y0, w:x1 - x0 + 1, h:Math.min(8, y1 - y0 + 1) }; }
function hooded(sc){   /* mystery wizard: dark purple silhouette, shadowed hood, glowing eyes, purple rim light */
  const src = flip(SP.wizard('stand')), f = skinBox(src), [c, x] = cv(src.width + 2, src.height + 2), rim = silhouette(src, '#b48cff');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(rim, dx, dy);
  x.drawImage(silhouette(src, '#2a1450'), 1, 1); x.fillStyle = '#0c0618'; x.fillRect(f.x + 1, f.y + 1, f.w, f.h);
  x.fillStyle = '#ffe84a'; x.fillRect(f.x + 1 + Math.floor(f.w*.25), f.y + 3, 2, 1); x.fillRect(f.x + 1 + Math.ceil(f.w*.75) - 2, f.y + 3, 2, 1);
  return scaled(c, sc); }
let roomCache = null;
function bandRoom(){   /* the band room at night (no drum) */
  if (roomCache) return roomCache; const [c, x] = cv(W, H); const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(0, 0, W, 150, '#1c1438'); for (let i = 0; i < W; i += 32) R(i, 0, 1, 120, '#211a42');
  R(0, 118, W, 32, '#2a1e4a'); R(0, 118, W, 2, '#3a2c62');
  R(20, 16, 60, 70, '#5a4a7a'); R(24, 20, 52, 62, '#0e0a2a');   /* window, moon + stars */
  let s = 11; const r = () => (s = (s*16807) % 2147483647)/2147483647; for (let i = 0; i < 14; i++) R(25 + Math.floor(r()*50), 21 + Math.floor(r()*60), 1, 1, r() < .3 ? '#ffd23f' : '#fff');
  for (let j = -7; j <= 7; j++){ const w = Math.round(Math.sqrt(49 - j*j)); R(56 - w, 36 + j, w*2, 1, '#fff6c8'); } for (let j = -6; j <= 6; j++){ const w = Math.round(Math.sqrt(36 - j*j)); R(60 - w, 34 + j, w*2, 1, '#0e0a2a'); }
  R(49, 20, 2, 62, '#5a4a7a'); R(24, 49, 52, 2, '#5a4a7a'); R(18, 84, 64, 4, '#6a5a8a');
  R(104, 18, 132, 58, '#8a5a2a'); R(107, 21, 126, 52, '#1e3a2e');   /* chalkboard */
  SP.text(x, 'WINTER CONCERT', 128, 26, '#e8e4f0', null); R(155, 34, 30, 1, '#e8e4f0');
  for (let l = 0; l < 5; l++) R(114, 44 + l*4, 112, 1, '#8fb3a0');
  [[124, 52], [140, 48], [156, 44], [172, 50], [190, 46], [206, 54]].forEach(([nx, ny]) => { R(nx, ny, 4, 3, '#fff'); R(nx + 3, ny - 9, 1, 10, '#fff'); });
  R(110, 74, 14, 2, '#c9c2d8');
  R(0, 128, W, 22, '#2c2050'); R(0, 128, W, 2, '#45387a'); R(0, 139, W, 1, '#45387a');   /* risers */
  const chair = cx => { R(cx, 132, 2, 16, '#40346c'); R(cx, 140, 12, 3, '#40346c'); R(cx + 10, 140, 2, 9, '#40346c'); }, stand = sx => { R(sx + 5, 112, 1, 30, '#4e4280'); R(sx, 108, 12, 6, '#4e4280'); R(sx + 2, 141, 8, 1, '#4e4280'); };
  [10, 44, 182, 220].forEach(chair); [26, 60, 198, 236].forEach(stand);
  R(0, 150, W, H - 150, '#3a2440'); for (let j = 158; j < H; j += 9) R(0, j, W, 1, '#2e1c36');
  for (let j = 0; j < 9; j++){ const ww = 4 + (j % 3); for (let i = 0; i < W; i += 37) R(i + (j*13) % 37, 151 + j*8, ww, 1, '#45304e'); }
  x.globalAlpha = .12; x.fillStyle = '#c9d8ff'; for (let j = 0; j < 74; j++) x.fillRect(30 + j*.9, 150 + j, 56 + j*.2, 1); x.globalAlpha = 1;   /* moonlight on the floor */
  const sx0 = 128; R(sx0 - 1, 160, 3, 30, '#8a8aa0');   /* the drum stand */
  for (let i = 0; i < 16; i++){ R(sx0 - i, 190 + Math.floor(i/2), 1, 1, '#8a8aa0'); R(sx0 + i, 190 + Math.floor(i/2), 1, 1, '#8a8aa0'); } R(sx0 - 1, 190, 3, 10, '#8a8aa0');
  R(sx0 - 14, 159, 28, 2, '#a8a8c0'); R(sx0 - 15, 154, 2, 6, '#a8a8c0'); R(sx0 + 13, 154, 2, 6, '#a8a8c0');
  return roomCache = c; }
const glow = (x, cx, cy, rad, col, a) => { x.globalAlpha = a; x.fillStyle = col; for (let j = -rad; j <= rad; j++){ const w = Math.round(Math.sqrt(rad*rad - j*j)); x.fillRect(cx - w, cy + j, w*2, 1); } x.globalAlpha = 1; };
const disc = (x, cx, cy, rad, col) => glow(x, cx, cy, rad, col, 1);
function island(x, cx, cy, top, dirt, mark){ x.fillStyle = top; x.fillRect(cx - 14, cy, 28, 4); x.fillStyle = dirt; for (let j = 0; j < 8; j++) x.fillRect(cx - 13 + j*1.6, cy + 4 + j, 26 - j*3.2, 1); mark(x, cx, cy); }
const ISLES = [
  ['#ffffff', '#7a8aa8', (x, cx, cy) => { x.fillStyle = '#cfe6ff'; for (let j = 0; j < 8; j++) x.fillRect(cx - 6 + j*.75, cy - j, 12 - j*1.5, 1); }],
  ['#4fbf5a', '#7a4a2a', (x, cx, cy) => { x.fillStyle = '#d23a3a'; x.fillRect(cx - 4, cy - 7, 9, 7); x.fillStyle = '#fff'; x.fillRect(cx - 1, cy - 4, 3, 4); x.fillStyle = '#8a1a1a'; x.fillRect(cx - 5, cy - 8, 11, 2); }],
  ['#ff9ad0', '#a05a8a', (x, cx, cy) => { x.fillStyle = '#fff'; x.fillRect(cx, cy - 9, 2, 9); x.fillStyle = '#e8304a'; x.fillRect(cx, cy - 7, 2, 1); x.fillRect(cx, cy - 4, 2, 1); x.fillRect(cx + 2, cy - 10, 2, 2); }],
  ['#9aa0b8', '#5a5a70', (x, cx, cy) => { x.fillStyle = '#c0c4d8'; x.fillRect(cx - 3, cy - 11, 7, 11); x.fillRect(cx - 4, cy - 13, 2, 2); x.fillRect(cx, cy - 13, 2, 2); x.fillRect(cx + 3, cy - 13, 2, 2); x.fillStyle = '#2a2040'; x.fillRect(cx, cy - 5, 2, 5); }],
  ['#6a4a9a', '#3a2a5a', (x, cx, cy) => { x.fillStyle = '#e8e8ff'; x.fillRect(cx - 3, cy - 9, 7, 6); x.fillRect(cx - 3, cy - 3, 2, 2); x.fillRect(cx + 2, cy - 3, 2, 2); x.fillStyle = '#1a1030'; x.fillRect(cx - 2, cy - 7, 1, 2); x.fillRect(cx + 2, cy - 7, 1, 2); }] ];
function note(x, nx, ny, col){ x.fillStyle = col; x.fillRect(nx, ny + 6, 4, 3); x.fillRect(nx + 3, ny, 1, 7); x.fillRect(nx + 4, ny, 3, 1); x.fillRect(nx + 6, ny + 1, 1, 2); }
function scene(canvas, opts){
  const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
  const hero = SP.heroFrames(opts.inst, opts.hair), H2 = scaled(hero.stand.r, 2), H2j = scaled(hero.jump.r, 2), H3 = scaled(hero.stand.r, 3), H3j = scaled(hero.jump.r, 3);
  const drum = scaled(SP.snare(), 2), drum1 = SP.snare();
  const wizSil = (() => { const src = SP.wizard('cast'), [c, y] = cv(src.width + 2, src.height + 2), rim = silhouette(src, '#9b5de5'); for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) y.drawImage(rim, dx, dy); y.drawImage(silhouette(src, '#1e0c38'), 1, 1); return scaled(c, 2); })(), wizHood = hooded(2), wizHappy = scaled(flip(SP.wizard('happy')), 2);
  let bossImg = null; if (opts.boss){ const b = SP.bossFrames(opts.boss).l; bossImg = scaled(b, b.height <= 56 ? 2 : 1); }
  const st = { page:{}, pt:0, t:0, talking:false, raf:0, last:performance.now() };
  const frame = now => { st.raf = requestAnimationFrame(frame); const dt = Math.min(.1, (now - st.last)/1000); st.last = now; st.t += dt; st.pt += dt; draw(); };
  const ground = 176;
  const draw = () => { const t = st.t, pt = st.pt, sc = st.page.scene || 'intro-room';
    if (sc === 'intro-room' || sc === 'intro-empty'){ x.drawImage(bandRoom(), 0, 0);
      if (sc === 'intro-room'){ const dy = 120; glow(x, 128, dy + 20, 30 + Math.round(Math.sin(t*3)*2), '#fff3a0', .18); x.drawImage(drum, 128 - drum.width/2, dy); sparkle(x, 128, dy + 20, t, 6, 28); }
      else { const by = 112 + Math.round(Math.abs(Math.sin(t*3))*-6); SP.text(x, '?', 125, by, '#ffd23f', k, 2);
        for (let i = 0; i < 10; i++){ const p = ((t*.35 + i/10) % 1), px = Math.round(128 - p*80 + Math.sin(i*2 + t*2)*6), py = Math.round(150 - p*100); x.fillStyle = i % 2 ? '#b48cff' : '#7b3fc4'; x.fillRect(px, py, 2, 2); }
        x.globalAlpha = .55; x.fillStyle = '#7b3fc4'; for (let i = 0; i < 6; i++) x.fillRect(30 + i*7, 70 - i*7, 6, 2); x.globalAlpha = 1; }
      return; }
    if (sc === 'intro-wizard'){ const sky = ['#0a0620', '#0e0a2c', '#120c36', '#160e40', '#1a104a', '#1e1254', '#22145c', '#281864']; sky.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i*28, W, 29); });
      let s = 3; const r = () => (s = (s*16807) % 2147483647)/2147483647; for (let i = 0; i < 70; i++){ const on = Math.sin(t*2 + i) > -.6; x.fillStyle = r() < .2 ? '#ffd23f' : '#ffffff'; const sx = Math.floor(r()*W), sy = Math.floor(r()*150); if (on) x.fillRect(sx, sy, 1, 1); }
      glow(x, 168, 74, 46, '#fff6c8', .08); disc(x, 168, 74, 38, '#fff6c8'); disc(x, 156, 64, 6, '#efe2a8'); disc(x, 182, 88, 8, '#efe2a8'); disc(x, 176, 58, 4, '#efe2a8');
      ISLES.forEach(([top, dirt, mark], i) => island(x, 28 + i*50, 186 + Math.round(Math.sin(t*1.5 + i)*2) - (i % 2)*10, top, dirt, mark));
      const wx = 120 + Math.round(Math.sin(t*.9)*16), wy = 42 + Math.round(Math.sin(t*1.7)*5);
      for (let i = 0; i < 14; i++){ const p = ((t*.8 + i/14) % 1), px = Math.round(wx + 14 - p*120), py = Math.round(wy + 48 + p*30 + Math.sin(i + t*3)*4); x.fillStyle = i % 3 ? '#b48cff' : '#ffd23f'; x.fillRect(px, py, 2, 1); }
      x.drawImage(wizSil, wx, wy); x.drawImage(drum1, wx + 34, wy + 40); sparkle(x, wx + 46, wy + 50, t, 4, 10);
      return; }
    if (sc === 'intro-hero'){ x.fillStyle = '#120a2e'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a1a3a'; for (let i = 0; i < 6; i++){ x.fillRect(i*8, 0, 6, ground); x.fillRect(W - 6 - i*8, 0, 6, ground); }
      x.fillStyle = '#5a1030'; x.fillRect(0, 0, W, 10);
      x.globalAlpha = .16; x.fillStyle = '#fff6c8'; for (let j = 0; j < ground; j++){ const hw = 12 + j*.32; x.fillRect(128 - hw, j, hw*2, 1); } x.globalAlpha = 1;
      x.fillStyle = '#6a3a1a'; x.fillRect(0, ground, W, H - ground); x.fillStyle = '#9a5a2a'; x.fillRect(0, ground, W, 3); x.fillStyle = '#4a2810'; for (let i = 0; i < W; i += 20) x.fillRect(i, ground + 3, 1, H - ground);
      x.globalAlpha = .22; x.fillStyle = '#fff6c8'; for (let j = -7; j <= 7; j++){ const w = Math.round(40*Math.sqrt(1 - (j/7.5)**2)); x.fillRect(128 - w, ground + 4 + j, w*2, 1); } x.globalAlpha = 1;
      center(x, 'BAND QUEST', 22 + Math.round(Math.sin(t*2)*2), '#ffd23f', 3);
      for (let i = 0; i < 6; i++){ const a = t*.9 + i*1.05, nx = Math.round(128 + Math.cos(a)*(60 + i*6)), ny = Math.round(110 + Math.sin(a*1.3)*34); note(x, nx, ny, ['#ffd23f', '#7cc0ff', '#ff9ad0', '#9ef01a'][i % 4]); }
      const hop = Math.sin(t*4) > .6, img = hop ? H3j : H3; x.drawImage(img, 128 - img.width/2, ground - img.height - (hop ? 6 : 0));
      return; }
    x.drawImage(starry(), 0, 0);
    if (sc === 'boss'){ center(x, 'BOSS DEFEATED!', 14 + Math.round(Math.sin(t*2)), '#ffd23f', 2);
      x.drawImage(H2, 34, ground - H2.height);
      if (bossImg){ const bx = 196 - bossImg.width/2, by = ground - bossImg.height + (st.talking ? Math.round(Math.abs(Math.sin(t*9))*-2) : 0);
        x.drawImage(bossImg, bx, by); sparkle(x, bx + bossImg.width/2, by - 4, t, 5, 12, ['#ffd23f', '#ffffff', '#7cc0ff']);
        const ux = Math.round(Math.min(W - 34, bx + bossImg.width/2 - 6)), uy = Math.max(46, by - 34);   /* speech bubble */
        x.fillStyle = k; x.fillRect(ux - 1, uy - 1, 30, 16); x.fillStyle = '#fff'; x.fillRect(ux, uy, 28, 14); x.fillStyle = k; x.fillRect(ux + 4, uy + 14, 5, 2); x.fillStyle = '#fff'; x.fillRect(ux + 5, uy + 14, 3, 1); x.fillRect(ux + 5, uy + 15, 1, 1);
        const dots = st.talking ? 1 + Math.floor(t*4) % 3 : 3; for (let i = 0; i < dots; i++){ x.fillStyle = k; x.fillRect(ux + 7 + i*6, uy + 6, 3, 3); } }
      return; }
    if (sc === 'showdown'){ center(x, 'THE FINAL SHOWDOWN', 14 + Math.round(Math.sin(t*2)), '#ffd23f', 2);
      x.drawImage(H2, 30, ground - H2.height);
      const wx = 166, wy = ground - wizHood.height - 8 + Math.round(Math.sin(t*2)*3);
      glow(x, wx + wizHood.width/2, wy + wizHood.height/2, 40 + Math.round(Math.sin(t*3)*3), '#7b3fc4', .22);
      x.globalAlpha = .25; x.fillStyle = '#c9b6ff'; x.fillRect(wx + 8, 172, 52, 4); x.globalAlpha = 1; x.drawImage(wizHood, wx, wy);
      const dx = 128, dy = 60 + Math.round(Math.sin(t*2.4)*4); glow(x, dx, dy + 20, 24, '#fff3a0', .25); x.drawImage(drum, dx - drum.width/2, dy); sparkle(x, dx, dy + 20, t, 6, 26, ['#ffd23f', '#b48cff']);
      return; }
    if (sc === 'reveal'){ const P1 = .9, P2 = 1.5;
      center(x, pt < P2 ? '???' : 'MR. KURILLA?!', 14 + Math.round(Math.sin(t*2)), '#ffd23f', 2);
      x.drawImage(pt < P2 ? H2 : (Math.sin(t*6) > 0 ? H2j : H2), 30, ground - H2.height - (pt >= P2 && Math.sin(t*6) > 0 ? 6 : 0));
      const wx = 166, wy = ground - wizHood.height - 8;
      if (pt < P1){ x.drawImage(wizHood, wx + Math.round(Math.sin(t*50)*2), wy); if (Math.floor(pt*10) % 3 === 0) glow(x, wx + 34, wy + 40, 40, '#ffffff', .35); }
      else if (pt < P2){ const p = (pt - P1)/(P2 - P1); for (let i = 0; i < 9; i++){ const a = i/9*Math.PI*2, rr = 8 + p*30; disc(x, Math.round(wx + 34 + Math.cos(a)*rr), Math.round(wy + 40 + Math.sin(a)*rr*.8), Math.round(12 - p*7), i % 2 ? '#ffffff' : '#c9b6ff'); } disc(x, wx + 34, wy + 40, Math.round(20 - p*14), '#ffffff'); }
      else { x.drawImage(wizHappy, wx + 2, ground - wizHappy.height + Math.round(Math.abs(Math.sin(t*3))*-2)); sparkle(x, wx + 34, wy + 30, t, 7, 30, ['#ffd23f', '#ffffff', '#b48cff']);
        const dx = 110, dy = 64 + Math.round(Math.sin(t*2.4)*4); glow(x, dx, dy + 20, 26, '#fff3a0', .3); x.drawImage(drum, dx - drum.width/2, dy); sparkle(x, dx, dy + 20, t, 8, 30);
        const lb = 'GOLDEN SNARE DRUM'; SP.text(x, lb, Math.round(dx - SP.textWidth(lb)/2), dy + 46, '#ffd23f', k); }
      return; }
  };
  st.raf = requestAnimationFrame(frame); draw();
  return { set(page){ if (page.scene !== st.page.scene) st.pt = 0; st.page = page; draw(); }, talk(on){ st.talking = !!on; }, stop(){ cancelAnimationFrame(st.raf); }, draw, step(dt){ st.t += dt; st.pt += dt; draw(); }, get state(){ return st; } };
}
// Pixel-font dialog box (drawn into a small canvas the app scales up 2x): speaker name, word-wrapped text, typewriter, blinking arrow.
const chars = s => [...String(s).normalize('NFC')];
function talkLines(text, cols){ const out = []; let line = '';
  for (const w of String(text).normalize('NFC').split(/\s+/).filter(Boolean)){ const cand = line ? line + ' ' + w : w;
    if (line && chars(cand).length > cols){ out.push(line); line = w; } else line = cand;
    while (chars(line).length > cols){ out.push(chars(line).slice(0, cols).join('')); line = chars(line).slice(cols).join(''); } }
  if (line) out.push(line); return out; }
function talkBox(c, o){   // o: { who, color, text, shown, done, t, cols }
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#1a1030'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#ffffff'; x.fillRect(1, 1, c.width - 2, 1); x.fillRect(1, c.height - 2, c.width - 2, 1); x.fillRect(1, 1, 1, c.height - 2); x.fillRect(c.width - 2, 1, 1, c.height - 2);
  let y = 5; if (o.who){ SP.text(x, o.who, 5, y, o.color || '#ffd23f', '#000'); y += 11; }
  let left = o.shown; for (const L of talkLines(o.text, o.cols)){ const cs = chars(L); if (left <= 0) break; SP.text(x, cs.slice(0, left).join(''), 5, y, '#ffffff', '#4a3a7a'); left -= cs.length + 1; y += 10; }
  if (o.done && Math.floor(o.t*2.5) % 2 === 0){ const ax = c.width - 12, ay = c.height - 10; x.fillStyle = '#ffd23f'; x.fillRect(ax, ay, 7, 1); x.fillRect(ax + 1, ay + 1, 5, 1); x.fillRect(ax + 2, ay + 2, 3, 1); x.fillRect(ax + 3, ay + 3, 1, 1); } }

window.PQFinale = { story, scene, credits, wrap, talkLines, talkBox };
})();
