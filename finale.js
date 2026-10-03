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
window.PQFinale = { story, credits, wrap };
})();
