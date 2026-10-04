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
  dragon:  { w:14, h:12, wave:true, speed:34 },       // Burney the little dragon: flies in a wave
  hedgehog:{ w:14, h:10, archer:true, speed:8 },      // hedgehog archer: shuffles, winds up, throws a slow toy arrow
  frog:    { w:14, h:13, thrower:true, speed:0 },
  reindeer:{ w:14, h:14, antler:true, speed:0 },     // Comet the Antler-Tosser (World 3-3 Reindeer Harbor): lowers his head, then throws his antlers like a boomerang     // Froppy (World 3 workshop): winds up with a piano over his head, then lobs it
  skeleton:{ w:12, h:17, skeleton:true, speed:0 },     // Splashbones the moat skeleton (World 5-2): hides in the moat, ripples, leaps onto the raft, rattles at you, dives back in
  armor:   { w:14, h:20, hp:2, armor:true, speed:16 }, // Sir Clanks-a-Lot (World 5-3): an empty suit of armor that clanks around and lunges with his sword (2 notes or 1 stomp)
  bones:   { w:12, h:17, bones:true, speed:0 },        // Rattlebones (v29, World 5-3): hides in a treasure chest or under the floor, rattles ("!"), pops out, walks at you
  tango:   { w:22, h:18, hp:2, tango:true, speed:0 },  // the Tango Couple (v29, World 5-3): two ghosts dancing a tango; she throws roses (2 notes, 1 stomp or the tuba)
  megahen: { w:44, h:40, hp:6, mega:true, speed:0 },   // Mega Hen (v29, World 2-3): a coop hen hit by a tuba bomb turns into this mini-boss
};
// v29 Knight's Closet extras. Tango Couple: dances in place; 0.9 s wind-up ("!" + the rose raised, + a blinking marker where an arcing rose will land),
// then one slow rose: every other throw is a high arc that lands on the marked spot, the others glide slowly (55 px/s) straight at you. One rose at a time.
// Notes pop roses, a stomp bounces off one, the tuba smashes them; a hit costs 1 heart.
const TANGO = { range:170, min:40, wind:.9, flight:1.2, grav:360, flat:55, cool:3.6, first:1.6, sway:26 };
// Rattlebones: waits in a treasure chest (or under a cracked floor tile) until you come within ~5 tiles (not right on top of him), rattles for 1 s
// ("!", lid jumping / dust + bony fingers poking out — can't hurt you yet), pops out and walks toward you slowly. 1 note, 1 stomp or the tuba.
const BONES = { wake:84, min:34, rattle:1.0, walk:22, roam:72 };
// swinging spiked chain balls hung from the ceiling: a slow pendulum at chest height; jump over the ball or time your run. Touching it costs 1 heart.
const CHAIN = { top:30, len:152, amp:.36, period:4.2, r:7 };
// Mega Hen (World 2-3): grows for 0.9 s (harmless), then walks at you and takes turns: egg toss (0.85 s wind-up + a marker where the egg lands)
// or a big jump (0.95 s wind-up, wings flapping + a marker where she'll land) that leaves her dizzy for 1.5 s (touching her then is safe).
// 6 HP: a note = 1, a stomp = 2, a tuba bomb = 3. When beaten she drops a heart and 5 notes and turns back into a hen.
const MEGA = { hp:6, grow:.9, walk:24, wind:.85, eggT:1.1, eggGrav:520, jumpT:.95, jumpWind:.95, dizzy:1.5, cool:1.5, roam:88 };
// Froppy's pianos: wind-up 0.9 s ("!" + the piano lifted + a blinking shadow where it will land), a slow 1.25 s arc, one piano at a time,
// a long cooldown, only while he's on screen and the hero isn't right next to him. Notes pop a piano, a stomp bounces off it, a bass bomb smashes it.
// Comet's antlers: 0.8 s wind-up (head down, antlers glow, "!"), then they fly out flat at head height ~6.5 tiles and come back (2.2 s round trip).
// Jump over them (twice), pop them with a note, stomp them, or blast them; while they're out he can't throw again, and he regrows them 2.4 s after they're gone.
const ANTLER = { range:150, min:30, rise:40, wind:.8, out:104, T:2.2, cool:2.4, first:1.2 };
const PIANO = { range:176, min:36, rise:90, wind:.9, flight:1.25, grav:480, cool:3.4, first:1.4 };
// vanishing clouds (World 4-2 sky): they shake for 0.8 s after you step on them, vanish, and come back 2.6 s later
const VANISH = { shake:.8, gone:2.6 };
// hedgehog fairness: only throws at a hero who is on screen and not too close, warns first (wind-up + "!"), one arrow at a time, long cooldown
// World 5-2 The Moonlit Moat (raft ride). The hero's log raft is a 'drift' mover locked to the scrolling screen between stone landings;
// at each landing the screen waits until the hero hops onto the next raft. Falling into the moat = a pit.
const MOAT = { speed:30, deck:191, water:200, raftW:112, off:64, lead:236, eoff:196, ew:40 };
// Splashbones: 1 s of ripples + bubbles (and two glowing eyes) where he'll come up, then he leaps out beside the raft and lands on it,
// rattles toward the hero for 2.4 s, then dives back in; 2.2 s under water between leaps, at most 3 leaps each, only while the hero rides a raft.
const SKEL = { ripple:1.0, vy:-330, grav:900, vx:46, board:2.4, walk:20, cool:2.2, first:.6, leaps:3 };
// raft raiders (Meep, Mr. Dinosaur, Burney, a hedgehog in little tub boats beside the raft): 0.9 s wind-up ("!" + a bubble swelling at the mouth),
// then one slow bubble (40 px/s) at the hero; one bubble at a time, 3.6 s apart. Notes pop bubbles, a stomp bounces off one, the tuba pops them.
const BUBBLE = { wind:.9, speed:40, life:5, cool:3.6, range:190, min:30, r:6, first:1.2 };
// Sir Clanks-a-Lot: clanks back and forth, then raises his sword ("!") for 0.7 s and lunges ~2 tiles, then rests 1.2 s (safe to stomp)
const ARMOR = { speed:16, range:104, min:18, rise:30, wind:.7, dash:90, lunge:.38, rest:1.2, cool:2.6, first:1.5 };
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
  if (th.ship){ const hz = 150, sx = 178, sy = 134, r = 26;   /* sunset: striped setting sun, calm sea with a glittering sun path */
    for (let i = -r; i <= r; i++){ const yy = sy + i; if (yy >= hz) break; if (i > 6 && (yy % 5 === 0 || (i > 16 && yy % 5 === 1))) continue; const hw = Math.round(Math.sqrt(r*r - i*i));
      s.fillStyle = i < -12 ? '#fff2a8' : i < 0 ? '#ffe08a' : i < 12 ? '#ffc06a' : '#ff9a52'; s.fillRect(sx - hw, yy, hw*2, 1); }
    const Rs = rng(hash('shipsky')); for (let i = 0; i < 34; i++){ s.fillStyle = Rs() < .25 ? '#ffd23f' : '#ffffff'; s.fillRect(Math.floor(Rs()*W), 16 + Math.floor(Rs()*36), 1, 1); } s.fillStyle = '#f08a8a'; for (let i = 0; i < 9; i++){ const cx = Math.floor(Rs()*W), cy = 50 + Math.floor(Rs()*70), cw = 24 + Math.floor(Rs()*40); s.fillRect(cx, cy, cw, 2); s.fillStyle = '#ffb8a0'; s.fillRect(cx + 4, cy, cw - 10, 1); s.fillStyle = '#f08a8a'; }
    s.fillStyle = '#4a3f9e'; s.fillRect(0, hz, W, H - hz); s.fillStyle = '#3b3488'; s.fillRect(0, hz + 14, W, H - hz - 14); s.fillStyle = '#ffcf8a'; s.fillRect(0, hz, W, 1);
    for (let y = hz + 2; y < H; y += 3){ const spread = 10 + (y - hz)*.9; for (let j = 0; j < 4; j++){ const gx = Math.round(sx - spread + Rs()*spread*2), gw = 2 + Math.floor(Rs()*6); s.fillStyle = Rs() < .5 ? '#ffb070' : '#ffd890'; s.fillRect(gx, y, gw, 1); } }
    for (let i = 0; i < 40; i++){ s.fillStyle = '#6a62c0'; s.fillRect(Math.floor(Rs()*W), hz + 4 + Math.floor(Rs()*(H - hz - 4)), 3 + Math.floor(Rs()*5), 1); } }
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
    case 'barnwall': {   /* inside the barn: dark plank walls, roof trusses, a hayloft window with the night sky, tools on the wall */
      for (let x = 0; x < 512; x++){ const pl = Math.floor(x/12); f.fillStyle = pl % 2 ? '#4a2614' : '#52301a'; f.fillRect(x, 0, 1, H); if (x % 12 === 0){ f.fillStyle = '#2e170a'; f.fillRect(x, 0, 1, H); } }
      for (let i = 0; i < 40; i++){ f.fillStyle = '#3a1c0e'; f.fillRect(Math.floor(R()*512), Math.floor(R()*H), 3, 2); }
      f.fillStyle = '#2a1408'; f.fillRect(0, 34, 512, 7); f.fillStyle = '#6b3f1f'; f.fillRect(0, 34, 512, 1);
      for (const px of [0, 128, 256, 384]){ f.fillStyle = '#2a1408'; f.fillRect(px + 60, 0, 8, H); f.fillStyle = '#6b3f1f'; f.fillRect(px + 60, 0, 1, H);
        for (let i = 0; i < 40; i++){ f.fillStyle = '#2a1408'; f.fillRect(px + 60 - i*1.4, 41 + i, 4, 2); f.fillRect(px + 66 + i*1.4, 41 + i, 4, 2); } }
      const wx = 300, wy = 58; f.fillStyle = '#2a1408'; f.fillRect(wx - 3, wy - 3, 46, 40); f.fillStyle = '#1e2a5a'; f.fillRect(wx, wy, 40, 34); f.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) f.fillRect(wx + 3 + Math.floor(R()*34), wy + 2 + Math.floor(R()*26), 1, 1);
      f.fillStyle = '#fff6c8'; f.fillRect(wx + 26, wy + 6, 7, 7); f.fillStyle = '#1e2a5a'; f.fillRect(wx + 29, wy + 5, 5, 5); f.fillStyle = '#6b3f1f'; f.fillRect(wx + 19, wy, 2, 34); f.fillRect(wx, wy + 16, 40, 2);
      for (const tx of [120, 440]){ f.fillStyle = '#9aa0b4'; f.fillRect(tx, 70, 2, 46); f.fillRect(tx - 6, 70, 14, 2); for (const d of [-6, 0, 6]) f.fillRect(tx + d, 62, 2, 9); }   // pitchforks
      f.fillStyle = '#9aa0b4'; for (const hx of [200, 470]){ for (let a = 0; a < 14; a++){ const an = Math.PI*(.1 + a/16); f.fillRect(Math.round(hx + Math.cos(an)*7), Math.round(96 - Math.sin(an)*7), 2, 2); } }   // horseshoes
      break; }
    case 'coopwall': {   /* inside the chicken coop: warm board-and-batten slats with light peeking through, a chicken-wire window, a row of nesting boxes with hens, a feed sack */
      for (let x = 0; x < 512; x++){ const pl = Math.floor(x/10); f.fillStyle = pl % 2 ? '#7a4a22' : '#84522a'; f.fillRect(x, 0, 1, H); if (x % 10 === 0){ f.fillStyle = '#4a2a10'; f.fillRect(x, 0, 1, H); f.fillStyle = 'rgba(255,214,120,.55)'; if (pl % 3 === 0) f.fillRect(x, 20, 1, 60); } }
      for (let i = 0; i < 50; i++){ f.fillStyle = '#5e3818'; f.fillRect(Math.floor(R()*512), Math.floor(R()*H), 2, 1); }
      f.fillStyle = '#4a2a10'; f.fillRect(0, 30, 512, 5); f.fillStyle = '#9a6a3a'; f.fillRect(0, 30, 512, 1);
      for (const wx of [40, 300]){ f.fillStyle = '#4a2a10'; f.fillRect(wx - 3, 46, 54, 40); f.fillStyle = '#ffd890'; f.fillRect(wx, 49, 48, 34); f.fillStyle = '#ffeec0'; f.fillRect(wx, 49, 48, 12);   // window: morning light
        f.fillStyle = '#ffffff'; f.fillRect(wx + 30, 56, 8, 8); f.fillStyle = '#7ec850'; f.fillRect(wx, 74, 48, 9); f.fillStyle = '#5aa83a'; for (let i = 0; i < 48; i += 3) f.fillRect(wx + i, 72 + (i % 2), 1, 3);
        f.fillStyle = 'rgba(80,80,96,.75)'; for (let y = 49; y < 83; y++) for (let i = 0; i < 48; i++) if ((i + y) % 6 === 0 || (i - y + 600) % 6 === 0) f.fillRect(wx + i, y, 1, 1);   // chicken wire
        f.fillStyle = '#4a2a10'; f.fillRect(wx + 23, 49, 2, 34); }
      for (let i = 0; i < 9; i++){ const nx = 130 + i*18 - (i > 4 ? 0 : 0), ny = 100; f.fillStyle = '#3a200c'; f.fillRect(nx, ny, 17, 16); f.fillStyle = '#9a6234'; f.fillRect(nx + 1, ny + 1, 15, 14); f.fillStyle = '#2a1608'; f.fillRect(nx + 3, ny + 4, 11, 9);   // nest boxes
        f.fillStyle = '#e8c050'; f.fillRect(nx + 3, ny + 10, 11, 3); if (i % 3 === 1){ f.fillStyle = '#fff6e8'; f.fillRect(nx + 4, ny + 4, 9, 6); f.fillStyle = '#e83a4a'; f.fillRect(nx + 10, ny + 2, 2, 2); f.fillStyle = '#ffb030'; f.fillRect(nx + 13, ny + 6, 2, 1); f.fillStyle = '#1a1030'; f.fillRect(nx + 11, ny + 5, 1, 1); }   // a sleeping hen
        else { f.fillStyle = i % 2 ? '#fff6e8' : '#e0b080'; f.fillRect(nx + 6, ny + 8, 4, 4); } }
      f.fillStyle = '#3a200c'; f.fillRect(128, 116, 166, 3);
      f.fillStyle = '#d8c8a0'; f.fillRect(456, 128, 26, 34); f.fillRect(459, 124, 20, 5); f.fillStyle = '#b8a070'; f.fillRect(456, 150, 26, 2); f.fillStyle = '#e83a4a'; f.fillRect(464, 136, 10, 8); f.fillStyle = '#fff6e8'; f.fillRect(467, 138, 4, 4);   // feed sack
      break; }
    case 'harborfar': {   /* snowy harbor at dusk: northern lights, white mountains, a lighthouse, far-off ships with lit windows */
      for (let x = 0; x < 512; x++){ const a = Math.sin(x/70)*10 + Math.sin(x/23 + 1)*4; for (let i = 0; i < 26; i++){ const y = 18 + a + i; f.fillStyle = i < 8 ? 'rgba(90,240,170,.10)' : i < 18 ? 'rgba(90,240,170,.18)' : 'rgba(150,120,255,.12)'; f.fillRect(x, Math.round(y), 1, 1); } }
      for (let i = 0; i < 40; i++){ f.fillStyle = '#ffffff'; f.fillRect(Math.floor(R()*512), Math.floor(R()*70), 1, 1); }
      for (let x = 0; x < 512; x++){ const h = 70 + Math.round(Math.abs(Math.sin(x/90))*44 + Math.sin(x/31)*8); f.fillStyle = '#5a6a9a'; f.fillRect(x, H - h, 1, h); f.fillStyle = '#e8f0ff'; f.fillRect(x, H - h, 1, Math.max(3, Math.round(h/7))); }
      const lx = 420; f.fillStyle = '#e8f0ff'; f.fillRect(lx, H - 120, 14, 64); f.fillStyle = '#e83a4a'; for (let y = H - 112; y < H - 56; y += 16) f.fillRect(lx, y, 14, 7); f.fillStyle = '#2a2a40'; f.fillRect(lx - 2, H - 128, 18, 8); f.fillStyle = '#fff3a0'; f.fillRect(lx + 3, H - 126, 8, 5);
      f.fillStyle = 'rgba(255,243,160,.18)'; for (let i = 0; i < 60; i++) f.fillRect(lx - 60 - i, H - 126 + Math.round(i*.15), 60, 1);   // lighthouse beam
      for (const [sx, sw] of [[60, 70], [250, 54]]){ f.fillStyle = '#3a4470'; f.fillRect(sx, H - 64, sw, 12); f.fillRect(sx + 6, H - 52, sw - 12, 4); f.fillRect(sx + sw/2, H - 104, 2, 40); f.fillRect(sx + 12, H - 92, 2, 28); f.fillStyle = '#ffd890'; for (let i = sx + 6; i < sx + sw - 6; i += 8) f.fillRect(i, H - 60, 3, 2); }
      f.fillStyle = '#2c3e74'; f.fillRect(0, H - 52, 512, 52);
      break; }
    case 'workshopwall': {   /* Santa's toy workshop: striped wallpaper, wood panelling, frosty windows with snow, shelves of toys, a garland */
      for (let x = 0; x < 512; x++){ f.fillStyle = Math.floor(x/8) % 2 ? '#7a2a2a' : '#8a3434'; f.fillRect(x, 0, 1, H); }
      f.fillStyle = '#5a3416'; f.fillRect(0, H - 76, 512, 76); f.fillStyle = '#7a4a22'; f.fillRect(0, H - 76, 512, 3); for (let x = 0; x < 512; x += 32){ f.fillStyle = '#4a2a10'; f.fillRect(x, H - 73, 2, 73); }
      for (const wx of [70, 330]){ f.fillStyle = '#ffffff'; f.fillRect(wx - 3, 46, 50, 48); f.fillStyle = '#24306a'; f.fillRect(wx, 49, 44, 42); f.fillStyle = '#ffffff';
        for (let i = 0; i < 14; i++) f.fillRect(wx + 2 + Math.floor(R()*40), 51 + Math.floor(R()*36), 1, 1); f.fillRect(wx, 84, 44, 7); f.fillRect(wx + 21, 49, 2, 42); f.fillRect(wx, 69, 44, 2);
        f.fillStyle = '#cfe8ff'; f.fillRect(wx, 49, 6, 3); f.fillRect(wx, 49, 3, 6); f.fillRect(wx + 38, 49, 6, 3); f.fillRect(wx + 41, 49, 3, 6); }
      const toys = (sx, sy) => { const c = ['#e83a4a','#3ddc84','#4d9de0','#ffd23f','#9b5de5'];
        for (let i = 0; i < 6; i++){ const tx = sx + 6 + i*18, k = Math.floor(R()*4), col = c[Math.floor(R()*5)];
          if (k === 0){ f.fillStyle = '#a8642a'; f.fillRect(tx, sy - 10, 9, 10); f.fillRect(tx - 1, sy - 13, 3, 3); f.fillRect(tx + 7, sy - 13, 3, 3); f.fillStyle = '#1a1030'; f.fillRect(tx + 2, sy - 8, 1, 1); f.fillRect(tx + 6, sy - 8, 1, 1); }   // teddy
          else if (k === 1){ f.fillStyle = col; f.fillRect(tx, sy - 8, 12, 8); f.fillStyle = '#ffffff'; f.fillRect(tx, sy - 8, 12, 1); f.fillStyle = '#1a1030'; f.fillRect(tx + 2, sy - 1, 3, 1); f.fillRect(tx + 7, sy - 1, 3, 1); }   // toy drum
          else if (k === 2){ f.fillStyle = col; f.fillRect(tx, sy - 6, 6, 6); f.fillStyle = c[(c.indexOf(col) + 1) % 5]; f.fillRect(tx + 6, sy - 6, 6, 6); f.fillRect(tx + 3, sy - 12, 6, 6); }   // blocks
          else { f.fillStyle = col; f.fillRect(tx, sy - 7, 14, 5); f.fillRect(tx + 9, sy - 11, 4, 4); f.fillStyle = '#1a1030'; f.fillRect(tx + 2, sy - 2, 2, 2); f.fillRect(tx + 10, sy - 2, 2, 2); } } };   // train
      for (const [sx, sy] of [[180, 74], [430, 74], [180, 120], [10, 120]]){ f.fillStyle = '#a8743e'; f.fillRect(sx, sy, 120, 4); f.fillStyle = '#6b3f1f'; f.fillRect(sx + 6, sy + 4, 3, 6); f.fillRect(sx + 110, sy + 4, 3, 6); toys(sx, sy); }
      for (let x = 0; x < 512; x++){ const y = 10 + Math.round(Math.abs(Math.sin(x/64*Math.PI))*8); f.fillStyle = '#237a34'; f.fillRect(x, y, 1, 4); if (x % 64 === 32){ f.fillStyle = ['#e83a4a','#ffd23f','#4d9de0'][(x/64|0) % 3]; f.fillRect(x - 2, y + 4, 5, 5); } }
      break; }
    case 'skyfar': {   /* high above the clouds: a cloud sea far below, distant floating islands */
      for (let i = 0; i < 6; i++){ const ix = i*90 + Math.floor(R()*40), iy = 70 + Math.floor(R()*50), iw = 26 + Math.floor(R()*24);
        f.fillStyle = '#9ad08a'; f.fillRect(ix, iy, iw, 4); f.fillStyle = '#b0a0c8'; for (let r = 0; r < 10; r++) f.fillRect(ix + Math.round(r*iw/22), iy + 4 + r, Math.max(1, iw - Math.round(r*iw/11)), 1); }
      for (let x = 0; x < 512; x++){ const h = 44 + Math.round(Math.sin(x/37)*6 + Math.sin(x/13 + 2)*3); f.fillStyle = '#eaf6ff'; f.fillRect(x, H - h, 1, h); f.fillStyle = '#ffffff'; f.fillRect(x, H - h, 1, 2); f.fillStyle = '#cfe4fa'; f.fillRect(x, H - h + 20, 1, h - 20); }
      break; }
    case 'moatcastle': {   /* the haunted castle at midnight: a huge moon, towers with pointy roofs and lit windows, bats */
      f.fillStyle = 'rgba(255,246,200,.08)'; for (let r = -40; r <= 40; r++){ const hw = Math.round(Math.sqrt(1600 - r*r)); f.fillRect(380 - hw, 48 + r, hw*2, 1); }
      f.fillStyle = '#fff6c8'; for (let r = -22; r <= 22; r++){ const hw = Math.round(Math.sqrt(484 - r*r)); f.fillRect(380 - hw, 48 + r, hw*2, 1); } f.fillStyle = '#e8dca8'; f.fillRect(370, 40, 6, 5); f.fillRect(388, 54, 8, 6); f.fillRect(376, 60, 4, 3);
      const c = '#1c1640'; f.fillStyle = c; f.fillRect(0, H - 96, 512, 96); for (let x = 0; x < 512; x += 12) f.fillRect(x, H - 102, 7, 6);   // curtain wall + battlements
      for (const [tx, tw, th2] of [[30, 26, 150], [150, 34, 176], [250, 22, 136], [330, 40, 190], [450, 28, 156]]){ f.fillStyle = c; f.fillRect(tx, H - th2, tw, th2);
        for (let r = 0; r < 26; r++){ const hw = Math.round((r/26)*(tw/2 + 4)); f.fillStyle = '#2a1e5a'; f.fillRect(tx + tw/2 - hw, H - th2 - 26 + r, hw*2, 1); }   // pointy roof
        f.fillStyle = '#ffd23f'; for (let wy = H - th2 + 16; wy < H - 104; wy += 28) f.fillRect(tx + tw/2 - 2, wy, 4, 6); f.fillStyle = '#c0283a'; f.fillRect(tx + tw/2, H - th2 - 38, 1, 12); f.fillRect(tx + tw/2 + 1, H - th2 - 38, 7, 4); }
      f.fillStyle = '#ffd23f'; for (let i = 0; i < 14; i++) f.fillRect(Math.floor(R()*512), H - 86 + Math.floor(R()*40), 3, 4);
      f.fillStyle = '#0e0a24'; for (const [bx, by] of [[90, 60], [210, 40], [300, 74], [470, 30]]){ f.fillRect(bx - 4, by, 9, 2); f.fillRect(bx - 6, by - 2, 3, 2); f.fillRect(bx + 4, by - 2, 3, 2); f.fillRect(bx - 1, by + 2, 3, 1); }   // bats
      break; }
    case 'armorywall': {   /* stone castle wall: arched windows with the moon, royal banners with crests, crossed swords behind shields */
      for (let y = 0; y < H; y += 12) for (let x = ((y/12) % 2)*14 - 14; x < 512 + 28; x += 28){ f.fillStyle = '#2e2838'; f.fillRect(x, y, 27, 11); f.fillStyle = '#383246'; f.fillRect(x, y, 27, 1); }
      for (const wx of [60, 316]){ f.fillStyle = '#14102a'; f.fillRect(wx - 3, 40, 38, 74); for (let r = 0; r < 19; r++){ const hw = Math.round(Math.sqrt(361 - (19 - r)**2)); f.fillRect(wx + 16 - hw - 3, 21 + r, hw*2 + 6, 1); }
        f.fillStyle = '#1e2a5e'; f.fillRect(wx, 43, 32, 70); for (let r = 0; r < 16; r++){ const hw = Math.round(Math.sqrt(256 - (16 - r)**2)); f.fillRect(wx + 16 - hw, 27 + r, hw*2, 1); }
        f.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) f.fillRect(wx + 2 + Math.floor(R()*28), 32 + Math.floor(R()*70), 1, 1);
        f.fillStyle = '#fff6c8'; f.fillRect(wx + 18, 50, 8, 8); f.fillStyle = '#1e2a5e'; f.fillRect(wx + 21, 49, 6, 6); f.fillStyle = '#14102a'; f.fillRect(wx + 15, 27, 2, 86); f.fillRect(wx, 74, 32, 2); }
      for (const [bx, col] of [[150, '#c0283a'], [250, '#3a6ee8'], [420, '#c0283a']]){ f.fillStyle = '#c08a10'; f.fillRect(bx - 2, 22, 28, 3); f.fillStyle = col; f.fillRect(bx, 25, 24, 60);
        for (let r = 0; r < 8; r++){ f.fillRect(bx, 85 + r, 12 - Math.round(r*1.5), 1); f.fillRect(bx + 12 + Math.round(r*1.5), 85 + r, 12 - Math.round(r*1.5), 1); }
        f.fillStyle = '#ffd23f'; f.fillRect(bx + 2, 25, 1, 60); f.fillRect(bx + 21, 25, 1, 60); f.fillRect(bx + 8, 40, 8, 10); f.fillStyle = col; f.fillRect(bx + 10, 42, 4, 6); }   // banners with a crest
      for (const sx of [204, 470]){ for (let i = 0; i < 30; i++){ f.fillStyle = '#d0d4e4'; f.fillRect(sx - 15 + i, 85 + i, 2, 2); f.fillRect(sx + 15 - i, 85 + i, 2, 2); } f.fillStyle = '#c08a10'; f.fillRect(sx - 15, 112, 5, 4); f.fillRect(sx + 11, 112, 5, 4);   // crossed swords
        f.fillStyle = '#14102a'; f.fillRect(sx - 9, 90, 19, 16); for (let r = 0; r < 7; r++) f.fillRect(sx - 9 + r, 106 + r, 19 - r*2, 1); f.fillStyle = '#3a6ee8'; f.fillRect(sx - 8, 91, 17, 14); for (let r = 0; r < 6; r++) f.fillRect(sx - 8 + r, 105 + r, 17 - r*2, 1);
        f.fillStyle = '#ffd23f'; f.fillRect(sx, 93, 1, 16); f.fillRect(sx - 6, 98, 13, 1); }   // ... behind a shield
      break; }
    case 'sea': {   /* far: island silhouettes and a far-away ship on the horizon */
      const hz = 150, c = '#3a1f4e';
      for (const [ix, iw, ih] of [[20, 70, 12], [150, 40, 7], [260, 90, 16], [420, 50, 9]]){ for (let i = 0; i < iw; i++){ const hgt = Math.round(Math.sin(i/iw*Math.PI)*ih); f.fillStyle = c; f.fillRect(ix + i, hz - hgt, 1, hgt); } }
      f.fillStyle = c; f.fillRect(304, hz - 34, 2, 22); for (let i = 0; i < 6; i++){ f.fillRect(305 - i*2, hz - 34 + i, 3, 1); f.fillRect(305 + i*2, hz - 34 + i, 3, 1); }
      f.fillRect(372, hz - 5, 34, 5); f.fillRect(368, hz - 7, 6, 3); f.fillRect(400, hz - 8, 8, 4); f.fillRect(386, hz - 30, 2, 25); f.fillRect(376, hz - 24, 2, 19);
      for (let r = 0; r < 18; r++){ f.fillRect(389, hz - 28 + r, Math.round(r*.6), 1); f.fillRect(379, hz - 22 + r*.8, Math.round(r*.45), 1); }
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
    case 'waves':   /* near: rolling wave rows over the sea (the hull bottoms sit in the foreground sea, see drawSea) */
      for (let x = 0; x < 512; x++){ const y = 172 + Math.round(Math.sin(x/512*Math.PI*8)*3); n.fillStyle = '#2c2a78'; n.fillRect(x, y, 1, H - y); n.fillStyle = '#6a6ad8'; n.fillRect(x, y, 1, 1);
        if (Math.sin(x/512*Math.PI*8) > .85){ n.fillStyle = '#c8d0ff'; n.fillRect(x, y - 1, 1, 1); }
        const y2 = 190 + Math.round(Math.sin(x/512*Math.PI*12 + 1)*2); n.fillStyle = '#232068'; n.fillRect(x, y2, 1, H - y2); n.fillStyle = '#5458c0'; n.fillRect(x, y2, 1, 1); }
      for (let i = 0; i < 30; i++){ n.fillStyle = '#4a4ab0'; n.fillRect(Math.floor(R()*512), 176 + Math.floor(R()*40), 4 + Math.floor(R()*6), 1); }
      break;
    case 'barnposts':   /* near: big support posts with braces, hay piles along the floor */
      for (const px of [40, 290]){ n.fillStyle = '#2e170a'; n.fillRect(px, 0, 12, H); n.fillStyle = '#6b3f1f'; n.fillRect(px + 2, 0, 2, H); for (let i = 0; i < 26; i++){ n.fillStyle = '#2e170a'; n.fillRect(px - 26 + i, 26 + i, 3, 3); n.fillRect(px + 12 + 26 - i, 26 + i, 3, 3); } }
      for (let i = 0; i < 7; i++){ const cx = i*76 + Math.floor(R()*30), hw = 18 + Math.floor(R()*14); for (let r = 0; r < 16; r++){ const ww = Math.round(Math.sqrt(1 - ((16 - r)/16)**2)*hw); n.fillStyle = r < 2 ? '#fff0a0' : '#e8c050'; n.fillRect(cx - ww, H - 34 + r, ww*2, 1); }
        n.fillStyle = '#b08a20'; for (let k = 0; k < 6; k++) n.fillRect(cx - hw + 4 + Math.floor(R()*hw*1.6), H - 30 + Math.floor(R()*10), 3, 1); }
      break;
    case 'coopwire':   /* near: chicken-wire run panels between posts + straw heaps along the floor */
      for (let px = 0; px < 512; px += 128){ n.fillStyle = '#3a200c'; n.fillRect(px + 4, H - 96, 6, 76); n.fillStyle = '#8a5a2a'; n.fillRect(px + 5, H - 96, 2, 76);
        n.fillStyle = 'rgba(190,190,205,.38)'; for (let y = H - 92; y < H - 22; y++) for (let i = 12; i < 120; i++) if ((i + y) % 7 === 0 || (i - y + 700) % 7 === 0) n.fillRect(px + i, y, 1, 1);
        n.fillStyle = '#3a200c'; n.fillRect(px + 10, H - 94, 112, 2); }
      for (let i = 0; i < 8; i++){ const cx = i*66 + Math.floor(R()*24), hw = 12 + Math.floor(R()*10); for (let r = 0; r < 10; r++){ const ww = Math.round(Math.sqrt(1 - ((10 - r)/10)**2)*hw); n.fillStyle = r < 2 ? '#fff0a0' : '#e8c050'; n.fillRect(cx - ww, H - 28 + r, ww*2, 1); } }
      break;
    case 'harbornear':   /* near: snowy warehouses with lit windows and a big NORTH POLE PORT sign */
      for (const [wx, ww, wh] of [[10, 110, 70], [170, 80, 54], [300, 130, 80], [460, 60, 50]]){ const top = H - 30 - wh; n.fillStyle = '#3a2a40'; n.fillRect(wx, top, ww, wh); n.fillStyle = '#4a3650'; for (let i = wx; i < wx + ww; i += 6) n.fillRect(i, top, 1, wh);
        for (let r = 0; r < 12; r++){ n.fillStyle = r < 4 ? '#f2f6ff' : '#2a1e30'; n.fillRect(wx - 4 + r, top - 12 + r, ww + 8 - r*2, 1); }
        n.fillStyle = '#ffd890'; for (let i = wx + 10; i < wx + ww - 12; i += 22) n.fillRect(i, top + 14, 8, 8); n.fillStyle = '#3a2a40'; for (let i = wx + 10; i < wx + ww - 12; i += 22){ n.fillRect(i + 3, top + 14, 1, 8); n.fillRect(i, top + 17, 8, 1); } }
      n.fillStyle = '#1a1030'; n.fillRect(316, H - 140, 98, 18); n.fillStyle = '#c0283a'; n.fillRect(317, H - 139, 96, 16); n.fillStyle = '#f2f6ff'; n.fillRect(317, H - 139, 96, 3);
      SP.text(n, 'NORTH POLE PORT', 320, H - 134, '#ffd23f');
      break;
    case 'lights':   /* near: strings of coloured lights and stockings */
      for (let x = 0; x < 512; x++){ const y = 26 + Math.round(Math.sin(x/128*Math.PI*2)*6); n.fillStyle = '#1a1030'; n.fillRect(x, y, 1, 1); if (x % 16 === 8){ n.fillStyle = ['#ff4f79','#ffd23f','#3ddc84','#7cc0ff'][(x >> 4) % 4]; n.fillRect(x - 1, y + 1, 3, 4); } }
      for (const sx of [100, 230, 420]){ n.fillStyle = '#ffffff'; n.fillRect(sx, 44, 10, 3); n.fillStyle = '#e83a4a'; n.fillRect(sx + 1, 47, 8, 12); n.fillRect(sx + 1, 55, 13, 5); n.fillStyle = '#ffffff'; n.fillRect(sx + 3, 51, 2, 2); }
      break;
    case 'puffs':   /* near: soft clouds drifting past */
      for (let i = 0; i < 7; i++){ const cx = i*74 + Math.floor(R()*30), cy = 30 + Math.floor(R()*120), cw = 26 + Math.floor(R()*30);
        n.fillStyle = 'rgba(255,255,255,.85)'; n.fillRect(cx, cy, cw, 8); n.fillRect(cx + 5, cy - 5, cw - 14, 6); n.fillRect(cx + cw/2 - 2, cy - 9, 12, 6); n.fillStyle = 'rgba(200,225,250,.85)'; n.fillRect(cx + 2, cy + 7, cw - 4, 2); }
      break;
    case 'moatwall':   /* near: the castle's mossy outer wall rising out of the moat, arched water gates, iron rings, dripping moss */
      for (let x = 0; x < 512; x++){ const top = H - 70 + Math.round(Math.sin(x/90*Math.PI*2/5.69)*3); n.fillStyle = '#2a2644'; n.fillRect(x, top, 1, H - top); }
      n.fillStyle = '#34304e'; for (let y = H - 64; y < H; y += 10) for (let x = ((y/10|0) % 2)*12; x < 512; x += 24) n.fillRect(x, y, 22, 1);
      for (const ax of [40, 170, 300, 430]){ n.fillStyle = '#100c22'; for (let r = 0; r < 30; r++){ const hw = Math.round(Math.sqrt(900 - (30 - r)**2)*.8); n.fillRect(ax - hw, H - 56 + r, hw*2, 1); } n.fillRect(ax - 24, H - 26, 48, 26);
        n.fillStyle = '#5a5e76'; for (let r = 0; r < 30; r++){ const hw = Math.round(Math.sqrt(900 - (30 - r)**2)*.8); n.fillRect(ax - hw - 2, H - 56 + r, 2, 1); n.fillRect(ax + hw, H - 56 + r, 2, 1); } }
      n.fillStyle = '#2f5a3a'; for (let i = 0; i < 26; i++){ const mx = Math.floor(R()*512), ml = 4 + Math.floor(R()*14); n.fillRect(mx, H - 70, 2, ml); n.fillRect(mx + 2, H - 70, 1, Math.max(1, ml - 3)); }
      n.fillStyle = '#9aa0b4'; for (const rx of [105, 236, 365, 496]){ n.fillRect(rx - 3, H - 50, 7, 1); n.fillRect(rx - 3, H - 44, 7, 1); n.fillRect(rx - 3, H - 50, 1, 6); n.fillRect(rx + 3, H - 50, 1, 6); }
      break;
    case 'armoryracks':   /* near: weapon racks with spears and halberds, capes on hooks, a row of boots */
      for (const rx of [20, 276]){ n.fillStyle = '#5a3416'; n.fillRect(rx, H - 82, 70, 4); n.fillRect(rx, H - 52, 70, 4); n.fillRect(rx + 2, H - 82, 3, 50); n.fillRect(rx + 65, H - 82, 3, 50);
        for (let i = 0; i < 6; i++){ const sx = rx + 10 + i*10; n.fillStyle = '#7a4a22'; n.fillRect(sx, H - 100, 2, 50); n.fillStyle = '#d0d4e4'; if (i % 2){ n.fillRect(sx - 1, H - 108, 4, 8); n.fillRect(sx, H - 112, 2, 4); } else { n.fillRect(sx - 2, H - 104, 6, 2); n.fillRect(sx, H - 112, 2, 8); } } }
      for (const cx of [140, 200, 400, 460]){ const col = cx % 120 < 60 ? ['#5a1a6a', '#3e1050'] : ['#8a1a2a', '#600c1c'];   // capes on hooks: round shoulders, a gold clasp, folds and a wavy hem
        n.fillStyle = '#9aa0b4'; n.fillRect(cx + 6, H - 114, 3, 4);
        for (let r = 0; r < 52; r++){ const hw = r < 5 ? 4 + r : 9 + Math.round((r - 5)*.12), hem = r > 47 ? (Math.floor((cx + r) / 3) % 2) : 0; n.fillStyle = col[0]; n.fillRect(cx + 7 - hw, H - 110 + r, hw*2, 1);
          n.fillStyle = col[1]; n.fillRect(cx + 7 - Math.round(hw*.45), H - 110 + r, 1, 1); n.fillRect(cx + 7 + Math.round(hw*.45), H - 110 + r, 1, 1); if (hem){ n.clearRect(cx + 7 - hw, H - 110 + r, 3, 1); n.clearRect(cx + 7 + hw - 3, H - 110 + r, 3, 1); } }
        n.fillStyle = '#ffd23f'; n.fillRect(cx + 1, H - 109, 13, 1); n.fillRect(cx + 6, H - 108, 3, 3); }
      for (let i = 0; i < 10; i++){ const bx = 104 + i*40 + (i % 2)*6; n.fillStyle = '#1a1030'; n.fillRect(bx - 1, H - 47, 8, 14); n.fillRect(bx - 1, H - 37, 13, 5);   // pairs of riding boots under the racks
        n.fillStyle = '#6b4a30'; n.fillRect(bx, H - 46, 6, 13); n.fillRect(bx, H - 36, 11, 3); n.fillStyle = '#8a6a48'; n.fillRect(bx, H - 46, 6, 2); n.fillStyle = '#4a3020'; n.fillRect(bx + 4, H - 44, 1, 8); }
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
  t.rung = mk(x => { x.fillStyle = '#2e170a'; x.fillRect(3, 0, 10, 4); x.fillStyle = '#c8a878'; x.fillRect(4, 1, 8, 2); });   // ladder rung (one-way)
  if (th.skin === 'barn'){ const k2 = '#2e170a';
    const planks = x => { x.fillStyle = '#6b3f1f'; x.fillRect(0, 0, TS, TS); for (let r = 0; r < 4; r++){ x.fillStyle = '#7c4a24'; x.fillRect(0, r*4, TS, 1); x.fillStyle = '#4e2c14'; x.fillRect(0, r*4 + 3, TS, 1); x.fillRect((r*5 + 2) % TS, r*4, 1, 3); } };
    t.fill = mk(planks);
    t.top = mk(x => { planks(x); x.fillStyle = k2; x.fillRect(0, 0, TS, 5); x.fillStyle = '#b07a40'; x.fillRect(0, 0, TS, 4); x.fillStyle = '#d8a060'; x.fillRect(0, 0, TS, 1); x.fillStyle = '#8a5a2a'; x.fillRect(7, 0, 1, 4);
      x.fillStyle = '#ffe070'; for (const [a, b] of [[1,0],[4,0],[10,1],[13,0]]) x.fillRect(a, b, 2, 1); x.fillStyle = '#e8c050'; x.fillRect(2, 1, 3, 1); x.fillRect(11, 0, 1, 1); });
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#e8c050'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#fff0a0'; x.fillRect(1, 1, 14, 2);   // hay bale
      x.fillStyle = '#c8a030'; for (let y = 4; y < 15; y += 3) for (let i = 1; i < 15; i += 4) x.fillRect(i + (y % 2), y, 2, 1); x.fillStyle = '#8a5a20'; x.fillRect(4, 1, 1, 14); x.fillRect(11, 1, 1, 14); });
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 7); x.fillStyle = '#8a5a2a'; x.fillRect(0, 1, TS, 5); x.fillStyle = '#b07a40'; x.fillRect(0, 1, TS, 1); x.fillStyle = '#5a3416'; x.fillRect(0, 4, TS, 1);   // rafter beam
      x.fillStyle = '#9aa0b4'; x.fillRect(3, 2, 1, 1); x.fillRect(12, 2, 1, 1); });
    t.pillar = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#8a5a2a'; x.fillRect(2, 0, 12, TS); x.fillStyle = '#b07a40'; x.fillRect(4, 0, 2, TS); x.fillStyle = '#5a3416'; x.fillRect(11, 0, 2, TS); });
    t.cap = mk(x => { x.drawImage(t.pillar, 0, 0); x.fillStyle = k2; x.fillRect(0, 0, TS, 4); x.fillStyle = '#b07a40'; x.fillRect(1, 1, 14, 2); }); }
  if (th.skin === 'workshop'){ const k2 = '#2e170a';
    t.fill = mk(x => { x.fillStyle = '#8a3a2a'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#6a2a1e'; x.fillRect(0, 7, TS, 1); x.fillRect(0, 15, TS, 1); x.fillRect(7, 0, 1, 7); x.fillRect(15, 8, 1, 7); });
    t.top = mk(x => { x.drawImage(t.fill, 0, 0); x.fillStyle = '#a8743e'; x.fillRect(0, 0, TS, 6); x.fillStyle = '#c8925a'; x.fillRect(0, 0, TS, 1); x.fillStyle = '#7a4a22'; x.fillRect(5, 1, 1, 5); x.fillRect(12, 1, 1, 5);
      for (let i = 0; i < TS; i++){ x.fillStyle = ((i >> 1) & 1) ? '#e83a4a' : '#ffffff'; x.fillRect(i, 6, 1, 2); } });   // wood floor with a candy-cane trim
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#3ddc84'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#9ff0c8'; x.fillRect(1, 1, 14, 2);   // gift box with a ribbon
      x.fillStyle = '#e83a4a'; x.fillRect(7, 1, 2, 14); x.fillRect(1, 7, 14, 2); x.fillStyle = '#ffd23f'; x.fillRect(5, 0, 2, 2); x.fillRect(9, 0, 2, 2); });
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 6); x.fillStyle = '#c8925a'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#f0c080'; x.fillRect(0, 1, TS, 1); x.fillStyle = k2; x.fillRect(3, 6, 2, 4); x.fillRect(11, 6, 2, 4); });   // toy shelf
  }
  if (th.skin === 'coop'){ const k2 = '#2e170a';
    const litter = x => { x.fillStyle = '#6a4424'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#563418'; [[2,3],[9,6],[5,11],[12,13],[14,2]].forEach(([a, b]) => x.fillRect(a, b, 2, 1)); x.fillStyle = '#c8a050'; [[6,2],[11,9],[2,13],[13,5]].forEach(([a, b]) => x.fillRect(a, b, 2, 1)); };
    t.fill = mk(litter);
    t.top = mk(x => { litter(x); x.fillStyle = k2; x.fillRect(0, 5, TS, 1); x.fillStyle = '#d8b050'; x.fillRect(0, 0, TS, 5); x.fillStyle = '#fff0a0'; for (const [a, b, l] of [[0,0,4],[5,1,3],[9,0,5],[2,2,3],[11,3,4],[6,3,2]]) x.fillRect(a, b, l, 1);   // straw floor
      x.fillStyle = '#a07828'; for (const [a, b] of [[4,0],[8,2],[14,1],[1,4],[10,4]]) x.fillRect(a, b, 1, 2); x.fillStyle = '#d8b050'; x.fillRect(3, 5, 2, 1); x.fillRect(12, 5, 2, 1); });
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#a8703c'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#c8925a'; x.fillRect(1, 1, 14, 1);   // nesting box with straw + an egg
      x.fillStyle = '#2a1608'; x.fillRect(3, 3, 10, 9); x.fillStyle = '#e8c050'; x.fillRect(3, 9, 10, 3); x.fillStyle = '#fff0a0'; x.fillRect(4, 9, 3, 1); x.fillStyle = '#fff6e8'; x.fillRect(7, 6, 4, 5); x.fillRect(8, 5, 2, 1); x.fillStyle = '#e0c8b0'; x.fillRect(10, 8, 1, 3);
      x.fillStyle = '#7a4a22'; x.fillRect(1, 13, 14, 2); });
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 6); x.fillStyle = '#9a6234'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#c8925a'; x.fillRect(0, 1, TS, 1); x.fillStyle = '#6a3e1c'; x.fillRect(0, 4, TS, 1);   // round roosting perch
      x.fillStyle = '#f4f0e8'; x.fillRect(5, 5, 1, 1); x.fillStyle = k2; x.fillRect(7, 6, 2, 3); });
    t.pillar = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#8a5a2a'; x.fillRect(2, 0, 12, TS); x.fillStyle = '#b07a40'; x.fillRect(4, 0, 2, TS); x.fillStyle = '#5a3416'; x.fillRect(11, 0, 2, TS); });
    t.cap = mk(x => { x.drawImage(t.pillar, 0, 0); x.fillStyle = k2; x.fillRect(0, 0, TS, 4); x.fillStyle = '#d8b050'; x.fillRect(1, 1, 14, 2); }); }
  if (th.skin === 'port'){ const k2 = '#1a1030';
    const piling = x => { x.fillStyle = '#4a3020'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#5e3e28'; x.fillRect(2, 0, 4, TS); x.fillRect(10, 0, 4, TS); x.fillStyle = '#2e1c10'; x.fillRect(7, 0, 2, TS); x.fillRect(0, 7, TS, 1); x.fillStyle = '#7a5434'; x.fillRect(3, 0, 1, TS); x.fillRect(11, 0, 1, TS); };
    t.fill = mk(piling);
    t.top = mk(x => { piling(x); x.fillStyle = k2; x.fillRect(0, 3, TS, 6); x.fillStyle = '#8a5e36'; x.fillRect(0, 4, TS, 4); x.fillStyle = '#6a4424'; x.fillRect(7, 4, 1, 4); x.fillRect(15, 4, 1, 4); x.fillStyle = '#a8784a'; x.fillRect(0, 4, TS, 1);   // dock plank
      x.fillStyle = '#f2f6ff'; x.fillRect(0, 0, TS, 4); x.fillRect(2, 4, 3, 1); x.fillRect(10, 4, 4, 1); x.fillStyle = '#c8d6f0'; x.fillRect(0, 3, TS, 1); x.fillStyle = '#ffffff'; x.fillRect(0, 0, TS, 1); });   // snow cap
    const hullP = (x, c, c2) => { x.fillStyle = c; x.fillRect(0, 0, TS, TS); for (let r = 0; r < 4; r++){ x.fillStyle = c2; x.fillRect(0, r*4 + 3, TS, 1); x.fillRect((r*7 + 3) % TS, r*4, 1, 3); } };
    t.hull = mk(x => hullP(x, '#7a1c2a', '#4e1018'));
    t.deck = mk(x => { hullP(x, '#7a1c2a', '#4e1018'); x.fillStyle = k2; x.fillRect(0, 0, TS, 7); x.fillStyle = '#d9a066'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#f2f6ff'; x.fillRect(0, 0, TS, 2); x.fillRect(4, 2, 3, 1);
      x.fillStyle = '#ffffff'; x.fillRect(0, 9, TS, 2); x.fillStyle = '#ffd23f'; x.fillRect(0, 7, TS, 1); });   // snowy deck + white stripe
    t.port = mk(x => { hullP(x, '#7a1c2a', '#4e1018'); x.fillStyle = k2; x.fillRect(3, 3, 10, 10); x.fillStyle = '#e0b040'; x.fillRect(4, 4, 8, 8); x.fillStyle = '#ffd890'; x.fillRect(5, 5, 6, 6); x.fillStyle = '#fff6c8'; x.fillRect(5, 5, 2, 2); });   // lit porthole
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#a8743e'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#7a4a22'; x.fillRect(1, 5, 14, 1); x.fillRect(1, 10, 14, 1); x.fillRect(4, 1, 1, 14); x.fillRect(11, 1, 1, 14);   // cargo crate with snow on top
      x.fillStyle = '#e83a4a'; x.fillRect(6, 6, 4, 4); x.fillStyle = '#ffffff'; x.fillRect(7, 6, 2, 4); x.fillStyle = '#f2f6ff'; x.fillRect(0, 0, TS, 2); x.fillRect(2, 2, 4, 1); x.fillRect(10, 2, 3, 1); });
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 6); x.fillStyle = '#a8743e'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#f2f6ff'; x.fillRect(0, 0, TS, 2); x.fillStyle = '#6a4424'; x.fillRect(5, 2, 1, 3); x.fillRect(11, 2, 1, 3);   // gangplank slat
      x.fillStyle = '#e8d8b0'; x.fillRect(2, 5, 1, 3); x.fillRect(13, 5, 1, 3); }); }
  if (th.skin === 'sky'){
    const earth = x => { x.fillStyle = '#b07840'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#8a5a2a'; [[2,3],[10,6],[5,11],[13,13]].forEach(([a, b]) => x.fillRect(a, b, 3, 2)); x.fillStyle = '#d09a5a'; x.fillRect(7, 9, 2, 1); };
    t.fill = mk(earth);
    t.top = mk(x => { earth(x); x.fillStyle = '#1a1030'; x.fillRect(0, 5, TS, 1); x.fillStyle = '#6ad04a'; x.fillRect(0, 0, TS, 5); x.fillRect(2, 5, 3, 2); x.fillRect(10, 5, 3, 1); x.fillStyle = '#9ff07a'; x.fillRect(0, 0, TS, 1);
      x.fillStyle = '#2f8a2f'; x.fillRect(6, 4, 3, 1); x.fillStyle = '#ffffff'; x.fillRect(4, 1, 1, 1); x.fillStyle = '#ffd23f'; x.fillRect(12, 2, 1, 1); });
    t.semi = mk(x => { x.fillStyle = '#9cc4ea'; x.fillRect(1, 2, 14, 7); x.fillRect(0, 4, TS, 4); x.fillStyle = '#ffffff'; x.fillRect(1, 1, 14, 6); x.fillRect(0, 3, TS, 3); x.fillRect(3, 0, 4, 1); x.fillRect(9, 0, 5, 1);   // fluffy cloud
      x.fillStyle = '#dcecff'; x.fillRect(2, 6, 12, 2); });
    t.vanish = mk(x => { x.fillStyle = '#e8a0c8'; x.fillRect(1, 2, 14, 7); x.fillRect(0, 4, TS, 4); x.fillStyle = '#ffe0f0'; x.fillRect(1, 1, 14, 6); x.fillRect(0, 3, TS, 3); x.fillRect(3, 0, 4, 1); x.fillRect(9, 0, 5, 1);   // pink puff cloud (vanishes)
      x.fillStyle = '#ffffff'; x.fillRect(3, 2, 2, 1); x.fillRect(9, 3, 3, 1); x.fillStyle = '#e8a0c8'; for (let i = 1; i < 15; i += 3) x.fillRect(i, 8, 1, 1); });
    t.rainbow = mk(x => { x.fillStyle = '#1a1030'; x.fillRect(0, 0, TS, 8); ['#e83a4a','#ff8c42','#ffd23f','#3ddc84','#4d9de0','#9b5de5'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i + 1, TS, 1); });   // rainbow bridge
      x.fillStyle = '#ffffff'; x.fillRect(5, 1, 1, 1); x.fillRect(12, 3, 1, 1); });
  }
  if (th.skin === 'moat'){ const k2 = '#14102a';   /* castle landings: mossy grey stone blocks, wooden plank walkways */
    const stone = x => { x.fillStyle = '#4a4e66'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#363a50'; x.fillRect(0, 7, TS, 1); x.fillRect(0, 15, TS, 1); x.fillRect(5, 0, 1, 7); x.fillRect(12, 8, 1, 7);
      x.fillStyle = '#5c6078'; x.fillRect(0, 0, 5, 1); x.fillRect(6, 0, 10, 1); x.fillRect(0, 8, 12, 1); x.fillRect(13, 8, 3, 1); x.fillStyle = '#2f5a3a'; x.fillRect(2, 13, 2, 2); x.fillRect(9, 5, 2, 1); };
    t.fill = mk(stone);
    t.top = mk(x => { stone(x); x.fillStyle = k2; x.fillRect(0, 4, TS, 1); x.fillStyle = '#8a8ea8'; x.fillRect(0, 0, TS, 4); x.fillStyle = '#b0b4c8'; x.fillRect(0, 0, TS, 1);
      x.fillStyle = '#4a7a3a'; x.fillRect(1, 3, 3, 2); x.fillRect(9, 3, 4, 2); x.fillRect(10, 5, 2, 2); x.fillStyle = '#7ab85a'; x.fillRect(2, 3, 1, 1); x.fillRect(10, 3, 1, 1); });   // mossy stone ledge
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#6a6e88'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#8a8ea8'; x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
      x.fillStyle = '#4a4e66'; x.fillRect(1, 13, 14, 2); x.fillRect(13, 1, 2, 14); x.fillStyle = '#2f5a3a'; x.fillRect(3, 12, 3, 1); });   // big castle block
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 6); x.fillStyle = '#7a5434'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#a8784a'; x.fillRect(0, 1, TS, 1); x.fillStyle = '#4a3020'; x.fillRect(7, 1, 1, 4); }); }
  if (th.skin === 'armory'){ const k2 = '#14102a';   /* the knight's closet: flagstones with a red carpet runner, iron-banded treasure chests, wooden racks */
    const flag = x => { x.fillStyle = '#4a4458'; x.fillRect(0, 0, TS, TS); x.fillStyle = '#383246'; x.fillRect(0, 7, TS, 1); x.fillRect(0, 15, TS, 1); x.fillRect(9, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillStyle = '#5a5468'; x.fillRect(0, 0, 9, 1); x.fillRect(4, 8, 12, 1); };
    t.fill = mk(flag);
    t.top = mk(x => { flag(x); x.fillStyle = k2; x.fillRect(0, 6, TS, 1); x.fillStyle = '#9a2a3a'; x.fillRect(0, 0, TS, 6); x.fillStyle = '#c03a4a'; x.fillRect(0, 0, TS, 1); x.fillStyle = '#ffd23f'; x.fillRect(0, 4, TS, 1); for (let i = 1; i < TS; i += 4) x.fillRect(i, 2, 2, 1); });   // red carpet, gold trim
    t.brick = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, TS); x.fillStyle = '#8a5a2a'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#a8743e'; x.fillRect(1, 1, 14, 5); x.fillStyle = '#6b3f1f'; x.fillRect(1, 6, 14, 1);   // treasure chest: lid, iron bands, gold lock
      x.fillStyle = '#5a5e76'; x.fillRect(3, 1, 2, 14); x.fillRect(11, 1, 2, 14); x.fillStyle = '#9aa0b4'; x.fillRect(3, 1, 1, 14); x.fillRect(11, 1, 1, 14); x.fillStyle = '#ffd23f'; x.fillRect(7, 5, 2, 4); x.fillStyle = k2; x.fillRect(7, 7, 2, 1); });
    t.semi = mk(x => { x.fillStyle = k2; x.fillRect(0, 0, TS, 6); x.fillStyle = '#7a4a22'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#a8743e'; x.fillRect(0, 1, TS, 1); x.fillStyle = '#9aa0b4'; x.fillRect(2, 2, 1, 1); x.fillRect(13, 2, 1, 1);
      x.fillStyle = k2; x.fillRect(1, 6, 2, 3); x.fillRect(13, 6, 2, 3); }); }   // wooden rack shelf
  if (th.ship){ const dk = '#2e1a0c', hull = x => { x.fillStyle = '#6b3f1f'; x.fillRect(0, 0, TS, TS);   /* pirate ship: plank hull, deck boards, portholes, cannon, barrels */
      for (let r = 0; r < 4; r++){ x.fillStyle = '#84502a'; x.fillRect(0, r*4, TS, 1); x.fillStyle = '#4e2c14'; x.fillRect(0, r*4 + 3, TS, 1); x.fillRect((r*7 + 3) % TS, r*4, 1, 3); x.fillStyle = '#c8a060'; x.fillRect((r*7 + 5) % TS, r*4 + 1, 1, 1); } };
    const circ = (x, cx, cy, r, c) => { x.fillStyle = c; for (let i = -r; i <= r; i++){ const hw = Math.round(Math.sqrt(r*r - i*i + r*.6)); x.fillRect(cx - hw, cy + i, hw*2, 1); } };
    t.fill = mk(hull);
    t.top = mk(x => { hull(x); x.fillStyle = dk; x.fillRect(0, 0, TS, 6); x.fillStyle = '#d9a066'; x.fillRect(0, 0, TS, 5); x.fillStyle = '#f3c58a'; x.fillRect(0, 0, TS, 1); x.fillStyle = '#a8743e'; x.fillRect(5, 1, 1, 3); x.fillRect(12, 1, 1, 3); x.fillRect(0, 4, TS, 1); x.fillStyle = '#e0b040'; x.fillRect(0, 8, TS, 1); });
    t.port = mk(x => { hull(x); circ(x, 8, 8, 6, dk); circ(x, 8, 8, 5, '#e0b040'); circ(x, 8, 8, 3, '#1a2a50'); x.fillStyle = '#ffd890'; x.fillRect(6, 6, 2, 1); x.fillRect(6, 7, 1, 1); x.fillStyle = '#fff3a0'; x.fillRect(5, 4, 2, 1); });
    t.semi = mk(x => { x.fillStyle = dk; x.fillRect(0, 0, TS, 6); x.fillStyle = '#b07a40'; x.fillRect(0, 1, TS, 4); x.fillStyle = '#d8a060'; x.fillRect(0, 1, TS, 1); x.fillStyle = dk; x.fillRect(8, 1, 1, 4); x.fillStyle = '#e8d8b0'; x.fillRect(3, 0, 2, 7); x.fillRect(12, 0, 2, 7); x.fillStyle = '#b8a078'; x.fillRect(3, 3, 2, 1); x.fillRect(12, 3, 2, 1); });
    t.cannon = mk(x => { x.fillStyle = dk; x.fillRect(4, 9, 12, 5); x.fillStyle = '#8a5530'; x.fillRect(5, 10, 10, 3); circ(x, 7, 13, 2, '#1a1030'); circ(x, 13, 13, 2, '#1a1030'); x.fillStyle = '#6a6a7a'; x.fillRect(7, 13, 1, 1); x.fillRect(13, 13, 1, 1);
      x.fillStyle = '#1a1030'; x.fillRect(1, 3, 14, 7); x.fillRect(0, 2, 3, 9); x.fillRect(14, 5, 2, 3); x.fillStyle = '#3a3a4e'; x.fillRect(3, 4, 11, 5); x.fillStyle = '#6a6a7a'; x.fillRect(3, 4, 10, 1); x.fillStyle = '#4a4a5e'; x.fillRect(1, 3, 1, 7); });
    t.barrel = mk(x => { x.fillStyle = dk; x.fillRect(2, 0, 12, 16); x.fillRect(1, 2, 14, 12); x.fillStyle = '#a8642a'; x.fillRect(3, 1, 10, 14); x.fillRect(2, 3, 12, 10); x.fillStyle = '#c8844a'; x.fillRect(4, 1, 2, 14);
      x.fillStyle = '#5a5e76'; x.fillRect(2, 3, 12, 2); x.fillRect(2, 11, 12, 2); x.fillStyle = '#9aa0b4'; x.fillRect(3, 3, 10, 1); x.fillRect(3, 11, 10, 1); x.fillStyle = dk; x.fillRect(7, 6, 2, 4); }); }
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

// ---------- HIDDEN BLOCKS (v29) ----------
// Some floating platforms can't be reached with the normal jump (the jump is never changed). After a stage is built, a small physics
// simulation (same numbers as the hero: run 108 px/s, jump -365, gravity 1100, short-hop cut to -130) finds every surface the hero can
// stand on, starting from the main floor. For each platform it can't reach, an invisible block is put in the air 3 tiles above the floor
// next to it (or a chain of two, like stairs). Jump into it from below and it appears (+ a note); stand on it to climb up. A faint sparkle
// hints where it is. Up there: a row of notes and a heart. A block is only kept if the simulation proves it makes the platform reachable
// and does not cut off anything that was reachable before (even once revealed), and never over or next to a pit.
const HIDDEN = { max:8, sparkle:2.4 };
function reachSolver(map, w, gTop){
  const at = (x, y) => (x < 0 || x >= w || y < 0 || y >= ROWS) ? 0 : map[y*w + x];
  const sol = (tx, ty) => tx < 0 || tx >= w ? true : ty < 0 || ty >= ROWS ? false : (map[ty*w + tx] > 0 && map[ty*w + tx] !== 5);
  const mx = (e, dx) => { e.x += dx; const top = Math.floor(e.y/TS), bot = Math.floor((e.y + e.h - .01)/TS);
    if (dx > 0){ const tx = Math.floor((e.x + e.w)/TS); for (let ty = top; ty <= bot; ty++) if (sol(tx, ty)){ e.x = tx*TS - e.w - .01; break; } }
    else if (dx < 0){ const tx = Math.floor(e.x/TS); for (let ty = top; ty <= bot; ty++) if (sol(tx, ty)){ e.x = (tx + 1)*TS + .01; break; } } };
  const my = (e, dy) => { const prevB = e.y + e.h; e.y += dy; e.g = false; const l = Math.floor(e.x/TS), r = Math.floor((e.x + e.w - .01)/TS);
    if (dy > 0){ const ty = Math.floor((e.y + e.h)/TS); for (let tx = l; tx <= r; tx++) if (sol(tx, ty) || (at(tx, ty) === 5 && prevB <= ty*TS + .5)){ e.y = ty*TS - e.h; e.vy = 0; e.g = true; break; } }
    else if (dy < 0){ const ty = Math.floor(e.y/TS); for (let tx = l; tx <= r; tx++) if (sol(tx, ty)){ e.y = (ty + 1)*TS; e.vy = 0; break; } } };
  const stand = (c, r) => r > 0 && r < ROWS && c >= 0 && c < w && at(c, r) > 0 && !sol(c, r - 1) && !sol(c, r - 2);
  // one jump (or walk-off) from standing on tile (c, r): returns the tile it lands on, or -1
  const sim = (x0, r, vx, hold, air, jump, jumpAt = 0) => { const e = { x:x0, y:r*TS - 20, w:10, h:20, vx, vy:0, g:true }; let flew = false;
    for (let f = 0; f < 200; f++){ const dt = 1/60;
      if (air) e.vx = clamp(e.vx + air*650*dt, -108, 108); else { const fr = 300*dt; e.vx = Math.abs(e.vx) <= fr ? 0 : e.vx - Math.sign(e.vx)*fr; }
      if (jump && f === jumpAt) e.vy = -365; if (f >= jumpAt + hold && e.vy < -130) e.vy = -130; e.vy = Math.min(420, e.vy + 1100*dt);
      mx(e, e.vx*dt); my(e, e.vy*dt); if (!e.g) flew = true;
      if (e.g && flew){ const ry = Math.round((e.y + e.h)/TS), cc = Math.floor((e.x + 5)/TS); for (const c of [cc, Math.floor(e.x/TS), Math.floor((e.x + 9.99)/TS)]) if (stand(c, ry)) return ry*w + c; return -1; }
      if (e.y > H + 24) return -1; }
    return -1; };
  // coarse moves prove a spot IS reachable (a few easy jumps); fine moves (more speeds, hold lengths, standing right on the edge of a
  // ledge) are used to decide a platform is NOT reachable, so a hidden block only goes where a real player truly can't get already
  const VX = [-108, -54, 0, 54, 108], HOLD = [4, 9, 99], AIR = [-1, 0, 1];
  const FVX = [-108, -81, -54, -27, 0, 27, 54, 81, 108], FHOLD = [3, 6, 9, 12, 16, 22, 99];
  let fine = false; const memo = new Map();
  const moves = (c, r) => { const key = (fine ? 'f' : 'c') + (r*w + c); if (memo.has(key)) return memo.get(key); const out = new Set(), xs = [c*TS + 3];
    const open = k => !sol(k, r - 1) && !sol(k, r - 2), edgeL = fine && !stand(c - 1, r) && open(c - 1), edgeR = fine && !stand(c + 1, r) && open(c + 1);
    if (edgeL) xs.push(c*TS - 8); if (edgeR) xs.push(c*TS + 14);
    // coyote time (0.09 s): run off the edge and jump a few frames later, already in the air
    for (const [d, ok, x0] of [[-1, edgeL, c*TS - 8], [1, edgeR, c*TS + 14]]) if (ok) for (const v of stand(c - d, r) ? [108, 54] : [54])
      for (const at of [2, 4, 5]) for (const hold of FHOLD) for (const air of [0, d]){ const k = sim(x0, r, d*v, hold, air, true, at); if (k >= 0) out.add(k); }
    for (const x0 of xs) for (const vx of fine ? FVX : VX){ if (Math.abs(vx) > 60 && !stand(c - Math.sign(vx), r) && !(fine && Math.abs(vx) < 90 && x0 === c*TS + 3)) continue;   // a full run-up needs room behind
      for (const hold of fine ? FHOLD : HOLD) for (const air of AIR){ const k = sim(x0, r, vx, hold, air, true); if (k >= 0) out.add(k); } }
    for (const x0 of xs) for (const d of [-1, 1]) for (const v of fine ? [108, 54, 20] : [108]){ const k = sim(x0, r, d*v, 0, d, false); if (k >= 0) out.add(k); }
    if (!lockMemo) memo.set(key, out); return out; };
  let lockMemo = false;
  // BFS over standable tiles; lim = optional [x0, x1] column window
  const reach = (seeds, lim) => { const seen = new Set(), q = []; for (const k of seeds) if (!seen.has(k)){ seen.add(k); q.push(k); }
    while (q.length){ const k = q.pop(), c = k % w, r = (k - c)/w; for (const n of moves(c, r)){ const nc = n % w; if (lim && (nc < lim[0] || nc > lim[1])) continue; if (!seen.has(n)){ seen.add(n); q.push(n); } } }
    return seen; };
  const floorSeeds = (x0 = 0, x1 = w - 1) => { const s = []; for (let c = Math.max(0, x0); c <= Math.min(w - 1, x1); c++) if (gTop[c] < ROWS && stand(c, gTop[c])) s.push(gTop[c]*w + c); return s; };
  return { at, sol, stand, reach, floorSeeds, sim, moves, setFine(v){ fine = v; }, setMemo(on){ lockMemo = !on; if (!on) memo.clear(); } };
}
function addHiddenBlocks(b){
  const w = b.w, map = b.map, gTop = b.gTop, S = reachSolver(map, w, gTop);
  // "can the hero already get there?" is decided generously: fine jumps + coyote time, and moving platforms stamped in as one-way
  // ledges at their highest and resting heights (and swing reach), so a block only goes where a player truly can't get today
  const m2 = map.slice(); for (const m of b.movers || []){ const ax = m.kind === 'swing' ? (m.amp || 0) : 0, ay = m.kind === 'bob' ? (m.amp || 0) : 0;
    for (const yy of [m.y - ay, m.y]){ const r = Math.round(yy/TS); if (r < 1 || r >= ROWS) continue; for (let c = Math.floor((m.x - ax)/TS); c <= Math.floor((m.x + m.w + ax - 1)/TS); c++) if (c >= 0 && c < w && !m2[r*w + c]) m2[r*w + c] = 5; } }
  const S0 = reachSolver(m2, w, gTop); S0.setFine(true); const R0 = S0.reach(S0.floorSeeds()); S.setMemo(false);
  // unreachable platforms = runs of standable tiles (same row) that no jump from the floor can get to
  const plats = []; for (let r = 2; r < ROWS; r++){ let a = -1; for (let c = 0; c <= w; c++){ const u = c < w && S.stand(c, r) && !R0.has(r*w + c);
    if (u && a < 0) a = c; if (!u && a >= 0){ plats.push({ a, b:c - 1, r }); a = -1; } } }
  const pitNear = c => { for (let k = c - 2; k <= c + 2; k++) if (k < 0 || k >= w || gTop[k] >= ROWS) return true; return false; };
  const goal = b.goalX/TS, cp = b.cpX/TS, hidden = [], secrets = [];
  const free = (c, r) => !S.at(c, r) && !hidden.some(h => h.x === c && h.y === r);
  const okSpot = (c, r) => c > 4 && c < goal - 14 && Math.abs(c - cp) > 2 && r >= 1 && free(c, r) && !pitNear(c);
  const clearCol = (c, r0, r1) => { for (let y = r0; y <= r1; y++) if (S.sol(c, y)) return false; return true; };
  const tryBlocks = (list, plat) => {   // put the blocks in for real, then prove: the platform is reached and nothing reachable before is lost (blocks revealed)
    for (const h of list) map[h.y*w + h.x] = 4;
    const x0 = plat.a - 14, x1 = plat.b + 14, seeds = S.floorSeeds(x0, x1), after = S.reach(seeds, [x0, x1]);
    let ok = false; for (let c = plat.a; c <= plat.b; c++) if (after.has(plat.r*w + c)) ok = true;
    if (ok){ for (const h of list) map[h.y*w + h.x] = 0; const before = S.reach(seeds, [x0, x1]); for (const k of before) if (!after.has(k)){ ok = false; break; } for (const h of list) map[h.y*w + h.x] = 4; }
    for (const h of list) map[h.y*w + h.x] = 0; return ok; };
  for (const pl of plats){ if (hidden.length >= HIDDEN.max*2 || secrets.length >= HIDDEN.max) break;
    if (pl.a < 6 || pl.b > goal - 12) continue; { let onlyTuba = true; for (let c = pl.a; c <= pl.b; c++) if (S.at(c, pl.r) !== 8) onlyTuba = false; if (onlyTuba) continue; }   // (standing ON the golden tuba block isn't a place)
    let pick = null; const cols = []; for (let d = 1; d <= 3; d++) cols.push(pl.a - d, pl.b + d); for (let c = pl.a; c <= pl.b; c++) cols.push(c);
    // one block, 3 tiles above a floor the hero already stands on
    for (const hx of cols){ const s = gTop[hx]; if (s >= ROWS || !R0.has(s*w + hx)) continue; const hy = s - 3;
      if (hy - pl.r > 3 || hy <= pl.r || !okSpot(hx, hy) || !clearCol(hx, hy + 1, s - 1) || !clearCol(hx, hy - 2, hy - 1)) continue;
      if (tryBlocks([{ x:hx, y:hy }], pl)){ pick = [{ x:hx, y:hy }]; break; } }
    // a chain of two (like stairs): the 2nd one sits 3 higher and one tile over, bumped while standing on the edge of the 1st
    if (!pick) for (const hx of cols){ const s = gTop[hx]; if (s >= ROWS || !R0.has(s*w + hx)) continue; const hy = s - 3;
      if (!okSpot(hx, hy) || !clearCol(hx, hy + 1, s - 1) || !clearCol(hx, hy - 2, hy - 1)) continue;
      for (const dx of [1, -1]){ const h2 = { x:hx + dx, y:hy - 3 }; if (h2.y - pl.r > 3 || h2.y <= pl.r || !okSpot(h2.x, h2.y) || !clearCol(h2.x, h2.y + 1, hy) || !clearCol(h2.x, h2.y - 2, h2.y - 1)) continue;
        if (tryBlocks([{ x:hx, y:hy }, h2], pl)){ pick = [{ x:hx, y:hy }, h2]; break; } }
      if (pick) break; }
    if (!pick) continue;
    hidden.push(...pick); secrets.push({ a:pl.a, b:pl.b, r:pl.r, blocks:pick.map(h => h.x + ',' + h.y) });
    for (let c = pl.a; c <= pl.b; c++) if (!b.coins.some(o => Math.floor(o.x/TS) === c && Math.abs(o.y - ((pl.r - 1)*TS + 1)) < 20)) b.coins.push({ x:c*TS + 3, y:(pl.r - 1)*TS + 1, secret:true });
    b.bonus = b.bonus || []; b.bonus.push({ kind:'heart', x:Math.round((pl.a + pl.b + 1)/2*TS), y:(pl.r - 1)*TS - 2, still:true, secret:true }); }
  b.hidden = hidden; b.secrets = secrets; b.unreachable = plats.length; return b; }

// ---------- special stages (stage index 0-2 per world; ids, saves and unlocks are unchanged) ----------
//   World 2-2 = inside the barn, World 2-3 = in the chicken coop, World 3-2 = Santa's toy workshop (with Froppy the piano-throwing frog),
//   World 3-3 = Reindeer Harbor (snowy port, Comet the Antler-Tosser), World 4-2 = sky level, World 4-3 = pirate ship,
//   World 5-2 = The Moonlit Moat (raft ride, Splashbones + raft raiders), World 5-3 = The Knight's Closet (armory, Sir Clanks-a-Lot)
const SPECIAL = { chickens:{ 1:'barn', 2:'coop' }, santa:{ 1:'workshop', 2:'port' }, infinite:{ 1:'sky', 2:'ship' }, ghosts:{ 1:'moat', 2:'armory' } };
const SPECIAL_THEME = {
  barn:    { sky:['#1e0e06','#2a1408','#341a0c','#3e2010'], far:'barnwall', near:'barnposts', top:'#b07a40', top2:'#8a5a2a', fill:'#6b3f1f', fill2:'#4e2c14', block:'#e0a040', pillar:'hay', fx:'hay', skin:'barn', indoor:{ dark:'rgba(40,16,2,.24)', glow:'#ffb040' } },
  coop:    { sky:['#2a1a0c','#38220e','#462c12','#523616'], far:'coopwall', near:'coopwire', top:'#d8b050', top2:'#a07828', fill:'#6a4424', fill2:'#563418', block:'#e0a040', pillar:'hay', fx:'feathers', skin:'coop', indoor:{ dark:'rgba(48,20,0,.16)', glow:'#ff9a40' } },
  workshop:{ sky:['#3a1010','#4a1616','#5a1c1c','#6a2222'], far:'workshopwall', near:'lights', top:'#a8743e', top2:'#7a4a22', fill:'#8a3a2a', fill2:'#6a2a1e', block:'#3ddc84', pillar:'chimney', fx:'none', skin:'workshop', indoor:{ dark:'rgba(30,8,8,.14)', glow:'#ffd890' } },
  port:    { sky:['#141a40','#1e2a5a','#2c3e74','#40598f'], far:'harborfar', near:'harbornear', top:'#f2f6ff', top2:'#b8c8e8', fill:'#5a3a22', fill2:'#3e2614', block:'#e0a040', pillar:'ice', fx:'snow', skin:'port' },
  moat:    { sky:['#080a24','#10163c','#1a2452','#26346a'], far:'moatcastle', near:'moatwall', top:'#8a8ea8', top2:'#4a7a3a', fill:'#4a4e66', fill2:'#363a50', block:'#9b5de5', pillar:'tower', fx:'fireflies', skin:'moat', stars:true },
  armory:  { sky:['#1a1420','#221a2a','#2a2034','#32283e'], far:'armorywall', near:'armoryracks', top:'#9a2a3a', top2:'#5a1a28', fill:'#4a4458', fill2:'#383246', block:'#ffd23f', pillar:'tower', fx:'embers', skin:'armory', indoor:{ dark:'rgba(20,10,34,.2)', glow:'#ffa040' } },
  sky:     { sky:['#3d7fe0','#5f9cf0','#8cc0f8','#c8e6ff'], far:'skyfar', near:'puffs', top:'#6ad04a', top2:'#2f8a2f', fill:'#b07840', fill2:'#8a5a2a', block:'#ffd23f', pillar:'stone', fx:'sparkle', skin:'sky' },
};
function specialTheme(kind, world){ const base = themeOf(world); return Object.assign({}, SPECIAL_THEME[kind], { key:base.key, id:'sp-' + kind, music:base.music }); }   // same key + music as the world
// Indoor stages (barn / workshop / chicken coop): a seeded chain of segments on a plank floor — stalls/workbenches, hay-bale or gift-box steps, hay chutes over
// holes in the floor with a rafter above, lofts with a ladder rung, rafters/shelves to climb (the golden tuba block sits up high), chicken roosts / toy shelves.
// Same shape of output as genLevel, so checkpoints, the goal, coins, crates, mix-in enemies and the tuba all work the same.
function genInterior(seed, idx, enemyType, world, kind){
  const R = rng(hash(seed + '#' + idx + '#' + kind)), ws = kind === 'workshop', co = kind === 'coop', ar = kind === 'armory', w = 232, map = new Uint8Array(w*ROWS), skin = new Uint8Array(w*ROWS), gTop = new Array(w).fill(ROWS);
  const coins = [], enemies = [], frogs = [], knights = [], deco = [], piles = [];
  const set = (x, y, v, sk = 0) => { if (x >= 0 && x < w && y >= 0 && y < ROWS){ map[y*w + x] = v; skin[y*w + x] = sk; } };
  const col = (x, top) => { if (x >= w) return; gTop[x] = top; for (let y = top; y < ROWS; y++) map[y*w + x] = 1; };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  const foe = (tx, row, type = enemyType, list = enemies) => { const K = ENEMY_KIND[type] || {}, fly = !!ENEMY_FLY[type]; list.push({ type, x:tx*TS, y:fly ? (row - (ar ? 4 : 3))*TS : row*TS - (K.h || 14), fly }); };   // Knight's Closet ghosts float a bit higher (over a walking hero's head)
  const frog = (tx, row) => { if (!ws || frogs.length >= 3 || tx < 30 || frogs.some(f => Math.abs(f.x/TS - tx) < 24)) return false; foe(tx, row, 'frog', frogs); return true; };
  // the Knight's Closet: up to 5 Sir Clanks-a-Lots on the floor, well spread out (never two near each other)
  const knight = tx => { if (!ar || knights.length >= 5 || tx < 22 || tx > w - 30 || knights.some(f => Math.abs(f.x/TS - tx) < 20)) return false; foe(tx, 12, 'armor', knights); return true; };
  const pile = c => { for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) set(c + dx, 12 - dy, 7); piles.push(c); };
  let x = 0; for (; x < 16; x++) col(x, 12); coin(8, 9); coin(9, 9); coin(10, 9); deco.push({ k:'lantern', x:7, len:30 });
  let tuba = null, last = '', n0 = 0; const end = w - 26;
  while (x < end){
    const r = R(); let seg = r < .2 ? 'flat' : r < .36 ? 'bales' : r < .52 ? 'chute' : r < .68 ? 'loft' : r < .84 ? 'rafters' : 'roost';
    if (seg === last) seg = 'flat'; last = seg; n0++; const sx = x;
    if (seg === 'flat'){ const n = 10 + Math.floor(R()*3); for (let i = 0; i < n; i++) col(x++, 12); deco.push({ k:ws ? 'bench' : co ? 'nests' : ar ? 'armor' : 'stall', x0:sx + 1, x1:sx + n - 2 });
      if (co) deco.push({ k:'hen', x0:sx + 1, x1:sx + n - 2, ph:R()*6.28, sp:.25 + R()*.2 });   // a harmless hen pecking around (scenery, no collision)
      if (piles.length < 2 && R() < .55 && sx > 20){ pile(sx + 2); foe(sx + n - 2, 12); }
      else { for (let i = 0; i < 4; i++) coin(sx + 3 + i, 9); if (!frog(sx + n - 3, 12) && !knight(sx + n - 3)) foe(sx + n - 3, 12); } }
    else if (seg === 'bales'){ const n = 9; for (let i = 0; i < n; i++) col(x++, 12);
      for (const [dx, hgt] of [[2,1],[3,2],[4,2],[5,1]]) for (let y = 0; y < hgt; y++) set(sx + dx, 11 - y, 2);
      coin(sx + 3, 8); coin(sx + 4, 8); coin(sx + 2, 9); coin(sx + 5, 9); if (R() < .5 && !knight(sx + 7)) foe(sx + 7, 12); }
    else if (seg === 'chute'){ for (let i = 0; i < 3; i++) col(x++, 12); const gw = 2 + (R() < .5 ? 1 : 0), gx = x; x += gw;
      for (let i = -1; i <= gw; i++){ set(gx + i, 9, 5); coin(gx + i, 8); }
      deco.push({ k:co ? 'feeder' : ar ? 'capes' : 'chute', x:gx + gw/2, y1:5*TS });
      for (let i = 0; i < 4; i++) col(x++, 12); }
    else if (seg === 'loft'){ for (let i = 0; i < 3; i++) col(x++, 12); const n = 8 + Math.floor(R()*3), lx = x;
      set(lx - 1, 10, 5, 3); deco.push({ k:'ladder', x:lx - 1, y0:9, y1:12 });
      for (let i = 0; i < n; i++){ col(x, 9); if (co || ar) for (let y = 10; y < 12; y++) set(x, y, 2); x++; } for (let i = 1; i < n - 1; i++) coin(lx + i, 7); deco.push({ k:'loft', x0:lx, x1:lx + n - 1, y:9 });   // coop: the loft is a bank of nesting boxes
      if (!frog(lx + n - 3, 9)) foe(lx + n - 2, 9);
      for (let i = 0; i < 2; i++) col(x++, 12); }
    else if (seg === 'rafters'){ const n = 13; for (let i = 0; i < n; i++) col(x++, 12);
      for (let i = 2; i <= 4; i++) set(sx + i, 9, 5); for (let i = 6; i <= 9; i++){ set(sx + i, 6, 5); coin(sx + i, 5); }
      if (!tuba && sx > w*.22 && sx < w*.75){ tuba = { x:sx + 8, y:2 }; set(sx + 8, 2, 8); } else coin(sx + 3, 8);
      if (ar) deco.push({ k:'shields', x0:sx + 2, x1:sx + 9, at:[[sx + 3, 9], [sx + 7, 6], [sx + 9, 6]] });   // shields hang under the rack shelves
      if (!knight(sx + n - 2)) foe(sx + n - 2, 12); }
    else { const n = 11; for (let i = 0; i < n; i++) col(x++, 12);
      for (let i = 3; i <= 7; i++) set(sx + i, 8, 5); deco.push({ k:ws ? 'shelf' : ar ? 'helms' : 'roost', x0:sx + 3, x1:sx + 7, y:8 });
      foe(sx + 5, 8); for (let i = 3; i <= 7; i++) coin(sx + i, 10); if (co) deco.push({ k:'hen', x0:sx + 1, x1:sx + n - 2, ph:R()*6.28, sp:.3 }); }
    if (n0 % 2 === 0) deco.push({ k:'lantern', x:sx + 3, len:22 + Math.floor(R()*30) });
  }
  for (; x < w; x++) col(x, 12);
  const st = w - 22; for (let s2 = 0; s2 < 4; s2++) for (let yy = 0; yy <= s2; yy++) map[(11 - yy)*w + st + s2] = 2;
  for (let s2 = 0; s2 < 4; s2++) coin(st + s2, 11 - s2 - 2);
  let cp = Math.floor(w/2); while (gTop[cp] !== 12 || map[11*w + cp] || map[10*w + cp] || map[9*w + cp]) cp++;
  const flatAt = c => { for (let k = c - 2; k <= c + 4; k++) if (gTop[k] !== 12) return false; for (let k = c - 1; k <= c + 3; k++) for (let y = 6; y < 12; y++) if (map[y*w + k]) return false; return Math.abs(c + 1 - cp) > 5; };
  if (!tuba){ for (let c = Math.floor(w*.3); c < w*.7; c++) if (flatAt(c)){ tuba = { x:c + 1, y:8 }; set(c + 1, 8, 8); break; } }
  for (let c = 24; piles.length < 1 && c < st - 10; c++) if (flatAt(c) && !(tuba && Math.abs(tuba.x - c) < 5)) pile(c);
  // fairness (same rule as the normal stages): no ground enemy right next to a hole in the floor
  const nearGap = ex => { for (let k = ex - 4; k <= ex + 4; k++) if (k >= 0 && k < w && gTop[k] >= ROWS) return true; return false; };
  for (const list of [enemies, frogs, knights]) for (let i = list.length - 1; i >= 0; i--){ const c = Math.floor(list[i].x/TS); if (nearGap(c) || piles.some(p => c >= p - 1 && c <= p + 3) || Math.abs(c - cp) < 3) list.splice(i, 1); }
  mixEnemies(seed, idx, world, w, map, gTop, enemies, cp); if (ar) for (const e of enemies) if (e.type === 'dragon') e.y -= TS;   // Knight's Closet: Burney flies up near the banners too
  enemies.push(...frogs, ...knights);
  const chains = ar ? armoryExtras(seed, idx, w, map, gTop, enemies, cp, st) : [];
  return { w, map, skin, coins, enemies, gTop, cpX:cp*TS, goalX:(w - 10)*TS, startX:2*TS, tuba:tuba ? { x:tuba.x, y:tuba.y, piles } : { piles }, deco, indoor:kind, chains };
}
// v29 Knight's Closet extras (own seeded RNG, added AFTER the layout, so the closet's floor plan is unchanged):
// 3 swinging chain balls, 3 Tango Couples and 4 Rattlebones, each on open floor, spread out and never next to another bad guy or the checkpoint.
function armoryExtras(seed, idx, w, map, gTop, enemies, cp, st){
  const X = rng(hash(seed + '#' + idx + '#closet')), chains = [], taken = [];
  const col = e => Math.floor((e.x + 7)/TS);
  const open = (c, r0, half) => { for (let k = c - half; k <= c + half; k++){ if (k < 0 || k >= w || gTop[k] !== 12) return false; for (let y = r0; y < 12; y++) if (map[y*w + k]) return false; } return true; };
  const far = (c, d, tg = 8) => enemies.every(e => Math.abs(col(e) - c) >= d) && taken.every(t => Math.abs(t - c) >= tg) && Math.abs(c - cp) > 6;
  const spots = (half, r0) => { const out = []; for (let c = 26; c < st - 8; c++) if (open(c, r0, half)) out.push(c); return out; };
  const pickSpread = (list, n, gap, d, tg) => { const got = [], cand = list.slice(); for (let i = cand.length - 1; i > 0; i--){ const j = Math.floor(X()*(i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    for (const c of cand){ if (got.length >= n) break; if (got.every(g => Math.abs(g - c) >= gap) && far(c, d, tg)){ got.push(c); taken.push(c); } } return got.sort((a, b) => a - b); };
  const flat = (c, k) => { for (let j = c - k; j <= c + k; j++) if (gTop[j] !== 12) return false; return true; };   // no pit or step within 8 tiles of a chain
  for (const c of pickSpread(spots(3, 1).filter(c => flat(c, 8)), 3, 26, 5, 6)) chains.push({ x:c*TS + 8, y:CHAIN.top, len:CHAIN.len, amp:CHAIN.amp, period:CHAIN.period, ph:X()*6.28 });
  for (const c of pickSpread(spots(2, 5), 3, 28, 4, 6)) enemies.push({ type:'tango', x:c*TS - 3, y:12*TS - 4*TS - 4, fly:true });
  pickSpread(spots(1, 9).filter(c => flat(c, 4)), 4, 22, 4).forEach((c, i) => enemies.push({ type:'bones', x:c*TS + 2, y:12*TS - 17, hide:i % 2 ? 'floor' : 'chest' }));
  return chains; }
// World 3-3 Reindeer Harbor (hand-built): snowy docks on stilts over icy water (falling in = a pit), two moored ships you board by
// their gangplanks, cargo crates, a crane-hung cargo pallet that rises and sinks and a swinging cargo net over the wide gaps, reindeer
// loading presents onto ships in the background. Bad guys: gingerbread grunts, Comet the Antler-Tosser, and every mix-in troublemaker.
function genPort(foe = 'ginger'){
  const w = 220, map = new Uint8Array(w*ROWS), skin = new Uint8Array(w*ROWS), gTop = new Array(w).fill(ROWS), coins = [], enemies = [], movers = [], deco = [], piles = [];
  const set = (x, y, v, sk = 0) => { if (x >= 0 && x < w && y >= 0 && y < ROWS){ map[y*w + x] = v; skin[y*w + x] = sk; } };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  const dock = (x0, x1) => { for (let x = x0; x <= x1; x++){ gTop[x] = 12; for (let y = 12; y < ROWS; y++) set(x, y, 1); } deco.push({ k:'stilts', x0, x1 }); };
  const ship = (x0, x1, deck, masts, color) => { for (let x = x0; x <= x1; x++){ gTop[x] = deck; for (let y = deck; y < ROWS; y++) set(x, y, y === deck + 1 && (x - x0) % 3 === 1 ? 9 : 1, 4); }
    deco.push({ k:'hullend', x:x0, y:deck, side:-1 }, { k:'hullend', x:x1 + 1, y:deck, side:1 }); for (const m of masts) deco.push({ k:'smast', x:m, deck, color }); };
  const gang = (x0, deck) => { for (let i = 0; i < 12 - deck - 1; i++) set(x0 + i, 11 - i, 5, 6); deco.push({ k:'gang', x0, x1:x0 + 12 - deck - 1, deck }); };   // gangplank: one-way plank steps up to the deck
  const crates = (x, hgt) => { for (let y = 0; y < hgt; y++) set(x, 11 - y, 2); };
  const pile = c => { for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) set(c + dx, 12 - dy, 7); piles.push(c); };
  const en = (type, tx, row) => { const K = ENEMY_KIND[type] || {}, fly = !!ENEMY_FLY[type]; enemies.push({ type, x:tx*TS, y:fly ? (row - 3)*TS : row*TS - (K.h || 14), fly }); };
  // the route
  dock(0, 17); for (const c of [7, 8, 9]) coin(c, 9); crates(13, 1);
  for (let i = 18; i <= 20; i++) coin(i, 9);                                                        // icy gap 18-20
  dock(21, 39); en(foe, 25, 12); crates(28, 1); crates(29, 2); crates(30, 1); coin(29, 8); coin(28, 9); coin(30, 9); en('reindeer', 34, 12); gang(37, 9);
  ship(40, 58, 9, [45, 53], '#c0283a'); en(foe, 44, 9); for (let y = 7; y <= 8; y++) for (const c of [49, 50]) set(c, y, 1, 4); coin(49, 5); coin(50, 5); en('hedgehog', 55, 9);
  movers.push({ kind:'bob', crane:true, x:61*TS, y:9*TS, w:48, h:6, amp:12, sp:1.1, ph:0 }); deco.push({ k:'crane', x:68, boom:59, top:2 });   // gap 59-66: a cargo pallet on the crane rope
  for (const c of [61, 62, 63]) coin(c, 6);
  dock(67, 90); pile(71); crates(76, 1); crates(77, 2); coin(77, 8); en('dino', 80, 12); set(82, 8, 8); en('reindeer', 86, 12); for (const c of [83, 84, 85]) coin(c, 9);
  for (let i = 91; i <= 93; i++) coin(i, 9);                                                        // icy gap 91-93
  dock(94, 108); en(foe, 102, 12); gang(106, 9);
  ship(109, 132, 9, [113, 125], '#3a6ee8'); en('meep', 116, 9); en('dragon', 119, 9); crates(121, 0); set(121, 8, 2); coin(121, 7); en('reindeer', 128, 9);
  movers.push({ kind:'swing', x:135*TS, y:9*TS, w:48, h:6, amp:18, sp:1.2, ph:0 }); for (const c of [135, 136, 137]) coin(c, 7);   // gap 133-140: a swinging cargo net
  dock(141, 160); en(foe, 146, 12); en('hedgehog', 152, 12); crates(157, 1);
  for (let i = 161; i <= 163; i++) coin(i, 9);                                                      // icy gap 161-163
  dock(164, w - 1); pile(167); en('reindeer', 174, 12); en('meep', 181, 12); en('dino', 187, 12); en(foe, 193, 12);
  const st = w - 22; for (let s2 = 0; s2 < 4; s2++){ for (let yy = 0; yy <= s2; yy++) set(st + s2, 11 - yy, 2); coin(st + s2, 9 - s2); }
  for (const [x, flip] of [[4, 0], [72, 1], [143, 0], [176, 1]]) deco.push({ k:'herd', x, flip });   // background ships with reindeer walking up the gangplank
  for (const x of [2, 24, 96, 146, 170, 204]) deco.push({ k:'lamp', x });
  return { w, map, skin, coins, enemies, gTop, cpX:98*TS, goalX:(w - 10)*TS, startX:2*TS, tuba:{ x:82, y:8, piles }, deco, movers, port:true };
}
// World 4-2 sky level (hand-built): floating islands, fluffy one-way clouds, rainbow bridges, bobbing clouds over wide gaps,
// a row of pink clouds that vanish shortly after you step on them, Burney + star wisps in the air. Falling off = a pit.
function genSky(foe = 'wisp'){
  const w = 196, map = new Uint8Array(w*ROWS), skin = new Uint8Array(w*ROWS), gTop = new Array(w).fill(ROWS), coins = [], enemies = [], movers = [], vanish = [], deco = [];
  const set = (x, y, v, sk = 0) => { if (x >= 0 && x < w && y >= 0 && y < ROWS){ map[y*w + x] = v; skin[y*w + x] = sk; } };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  const island = (x0, x1, top, thick = 2) => { for (let x = x0; x <= x1; x++){ gTop[x] = top; for (let y = top; y < Math.min(ROWS, top + thick); y++) set(x, y, 1); } };
  const cloud = (x0, x1, y, sk = 0) => { for (let x = x0; x <= x1; x++) set(x, y, 5, sk); };
  const vanishRow = (groups, y) => groups.forEach(([a, b]) => { cloud(a, b, y, 2); vanish.push({ x0:a, x1:b, y }); });
  const enemy = (type, tx, row) => { const K = ENEMY_KIND[type] || { h:14 }, fly = !!ENEMY_FLY[type]; enemies.push({ type, x:tx*TS, y:fly ? (row - 3)*TS : row*TS - K.h, fly }); };
  const bob = (tx, row, n, amp, ph) => movers.push({ kind:'bob', cloud:true, x:tx*TS, y:row*TS, w:n*TS, h:6, amp, sp:1.3, ph });
  island(0, 15, 11); for (let x = 4; x <= 7; x++) coin(x, 8); [3, 2, 3].forEach((v, i) => { set(10 + i, 7, v); coin(10 + i, 6); });
  coin(16, 9); coin(17, 8); coin(18, 9);                                        // gap 16-18
  cloud(19, 27, 11); enemy(foe, 23, 11); for (let x = 20; x <= 26; x += 2) coin(x, 9);
  island(30, 41, 10); enemy('meep', 35, 10); coin(32, 7); coin(33, 7); coin(38, 7); coin(39, 7);
  cloud(42, 51, 10, 1); for (let x = 43; x <= 50; x++) coin(x, 8); enemy('dragon', 47, 10);   // rainbow bridge
  island(52, 63, 10); const pile = 54; for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) set(pile + dx, 10 - dy, 7); enemy('dino', 59, 10);
  bob(65, 10, 4, 10, 0); coin(66, 8); coin(67, 8);                              // gap 64-69: a bobbing cloud
  island(70, 81, 11); enemy(foe, 76, 11); [3, 3, 2].forEach((v, i) => { set(73 + i, 7, v); coin(73 + i, 6); });
  vanishRow([[82, 84], [85, 87], [88, 91]], 11); for (let x = 83; x <= 90; x += 2) coin(x, 9);   // vanishing pink clouds
  island(92, 104, 11); enemy('meep', 100, 11);
  coin(105, 9); coin(106, 8); coin(107, 9);                                     // gap 105-107
  island(108, 118, 9); enemy('hedgehog', 113, 9); coin(110, 6); coin(111, 6);
  cloud(121, 122, 10); coin(121, 8); coin(122, 8);                              // gap 119-124 with a stepping-stone cloud
  island(125, 137, 10); cloud(128, 131, 7); set(129, 3, 8); for (const x of [128, 130, 131]) coin(x, 6); enemy(foe, 134, 10);   // tuba block above a high cloud
  bob(139, 10, 4, 12, 1.6); coin(140, 8); coin(141, 8);                         // gap 138-143: another bobbing cloud
  island(144, 154, 11); enemy('dino', 149, 11); enemy('dragon', 152, 11);
  cloud(155, 164, 11, 1); for (let x = 156; x <= 163; x += 2) coin(x, 9);      // rainbow bridge
  island(165, w - 1, 12);
  const st = w - 22; for (let s2 = 0; s2 < 4; s2++) for (let yy = 0; yy <= s2; yy++) map[(11 - yy)*w + st + s2] = 2;
  for (let s2 = 0; s2 < 4; s2++) coin(st + s2, 11 - s2 - 2);
  return { w, map, skin, coins, enemies, gTop, cpX:96*TS, goalX:(w - 10)*TS, startX:2*TS, tuba:{ x:129, y:3, piles:[pile] }, deco, movers, vanish, sky:true };
}

// World 5-2 The Moonlit Moat (hand-built raft ride): four mossy stone landings with three log rafts between them. Each raft drifts with the
// scrolling screen (the hero stands on it; it never leaves him behind) and stops at the next landing; the screen waits at each landing
// until the hero steps onto the next raft. Splashbones skeletons ripple, leap onto the raft and dive back; raiders in tub boats float
// alongside and blow slow bubbles; the world's ghosts drift overhead (high enough that a hero standing on the raft is never touched).
function genMoat(foe = 'ghost'){
  const w = 200, map = new Uint8Array(w*ROWS), skin = new Uint8Array(w*ROWS), gTop = new Array(w).fill(ROWS), coins = [], enemies = [], movers = [], deco = [], piles = [];
  const set = (x, y, v) => { if (x >= 0 && x < w && y >= 0 && y < ROWS) map[y*w + x] = v; };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  const land = (x0, x1, k) => { for (let x = x0; x <= x1; x++){ gTop[x] = 12; for (let y = 12; y < ROWS; y++) set(x, y, 1); } deco.push({ k:'landing', x0, x1, kind:k }); };
  const enemy = (type, tx, row = 12, o = {}) => { const K = ENEMY_KIND[type] || { h:14 }, fly = !!ENEMY_FLY[type]; enemies.push(Object.assign({ type, x:tx*TS, y:fly ? (row - 3)*TS : row*TS - (K.h || 14), fly }, o)); };
  const ghost = (tx, y) => enemies.push({ type:foe, x:tx*TS, y, fly:true });
  const raft = (a, b) => { const x0 = a*TS, x1 = b*TS - MOAT.raftW; movers.push({ kind:'drift', drift:true, x:x0, y:MOAT.deck, w:MOAT.raftW, h:6, x0, x1, off:MOAT.off, amp:1.5, sp:1.6, ph:a }); return movers.length - 1; };
  const tub = (cam0) => { movers.push({ kind:'eraft', eraft:true, x:cam0 + MOAT.eoff, y:MOAT.deck + 1, w:MOAT.ew, h:6, a:cam0 + MOAT.eoff, b:cam0 + MOAT.eoff + 240, amp:1.5, sp:2.1, ph:cam0 }); return movers.length - 1; };
  const rider = (type, cam0) => { const ri = tub(cam0), K = ENEMY_KIND[type]; enemies.push({ type, x:cam0 + MOAT.eoff + (MOAT.ew - K.w)/2, y:MOAT.deck + 1 - K.h, ri, rider:true }); };
  const skel = (tx) => enemy('skeleton', tx, 12, { home:tx*TS });
  // start landing with the castle's water gate
  land(0, 5, 'gate'); coin(2, 9); coin(3, 9); coin(4, 9);
  raft(6, 52);
  for (const c of [14, 15, 16, 30, 31, 32, 44, 45]) coin(c, 9);
  ghost(19, 132); skel(22); rider('meep', 120); skel(38); ghost(48, 134);
  // landing B: a little stone tower with ? blocks
  land(52, 57, 'tower'); set(55, 8, 3); set(56, 8, 2); set(57, 8, 3); coin(55, 7); coin(56, 7); coin(57, 7);
  raft(58, 104);
  for (const c of [64, 65, 66, 82, 83, 84, 96, 97]) coin(c, 9);
  skel(70); rider('dino', 1180); ghost(80, 136); skel(92); ghost(96, 130);
  // checkpoint landing with the golden tuba block
  land(104, 111, 'cp'); set(109, 8, 8); const tubaSpot = { x:109, y:8 };
  raft(112, 160);
  for (const c of [118, 119, 120, 136, 137, 138, 150, 151]) coin(c, 9);
  rider('dragon', 1760); skel(124); ghost(120, 134); skel(142); rider('hedgehog', 2190); ghost(150, 130);
  // the castle door landing: crates, a stair of castle blocks, the goal metronome
  land(160, w - 1, 'end'); const pile1 = 165; for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) set(pile1 + dx, 12 - dy, 7); piles.push(pile1); coin(166, 8);
  enemy('dino', 172);
  const st = w - 22; for (let s2 = 0; s2 < 4; s2++){ for (let yy = 0; yy <= s2; yy++) set(st + s2, 11 - yy, 2); coin(st + s2, 11 - s2 - 2); }
  return { w, map, skin, coins, enemies, gTop, cpX:106*TS, goalX:(w - 10)*TS, startX:2*TS, tuba:{ x:tubaSpot.x, y:tubaSpot.y, piles }, deco, movers,
           moat:true, auto:{ speed:MOAT.speed, lead:MOAT.lead, hold:true } };
}
const specialOf = (seed, level) => (SPECIAL[seed] || {})[level] || null;
// speed = auto-scroll px/s (the hero runs 108 px/s, so there is lots of slack); cannonballs and barrels are slow and always telegraphed
const SHIP = { speed:32, wait:1.8, ballSpeed:58, ballCool:3.6, warn:.8, barrelSpeed:40, barrelEvery:3.8, water:205 };
const SHIP_THEME = { sky:['#2a1650','#6a2c78','#d8506a','#ffa860'], far:'sea', near:'waves', top:'#d9a066', top2:'#a8743e', fill:'#6b3f1f', fill2:'#4e2c14', block:'#ffd23f', pillar:'stone', fx:'gulls', ship:true };
function shipTheme(world){ const base = themeOf(world); return Object.assign({}, SHIP_THEME, { key:base.key, id:'ship', music:base.music }); }   // same key + music as the world, so the tune is unchanged
function genShip(foe = 'wisp'){
  const w = 186, D = 10, map = new Uint8Array(w*ROWS), gTop = new Array(w).fill(ROWS), coins = [], enemies = [], deco = [], cannons = [], movers = [], spawners = [];
  const set = (x, y, v) => { if (x >= 0 && x < w && y >= 0 && y < ROWS) map[y*w + x] = v; };
  const coin = (tx, ty) => coins.push({ x:tx*TS + 3, y:ty*TS + 1 });
  const ship = (x0, x1) => { for (let x = x0; x <= x1; x++){ gTop[x] = D; for (let y = D; y < ROWS; y++) set(x, y, 1); }
    for (let x = x0 + 2; x <= x1 - 2; x += 4) set(x, D + 1, 9);
    deco.push({ k:'rail', x0, x1, y:D }, { k:'stern', x:x0, y:D }, { k:'bow', x:x1 + 1, y:D }); };
  const raise = (x0, x1, top) => { for (let x = x0; x <= x1; x++){ for (let y = top; y < gTop[x]; y++) set(x, y, 1); gTop[x] = top; } deco.push({ k:'rail', x0, x1, y:top }); };
  const crates = c => { for (const [dx, dy] of [[0,1],[1,1],[1,2],[2,1]]) set(c + dx, D - dy, 7); return c; };
  const blocks = (x0, kinds) => kinds.forEach((v, i) => { set(x0 + i, 6, v); coin(x0 + i, 5); });
  const mast = (x, top, o = {}) => deco.push({ k:'mast', x, top, deck:D, sail:o.sail !== false, flag:!!o.flag });
  const enemy = (type, tx, row = D) => { const K = ENEMY_KIND[type] || { h:14 }, fly = !!ENEMY_FLY[type]; enemies.push({ type, x:tx*TS, y:fly ? (row - 3)*TS : row*TS - K.h, fly }); };
  const cannon = tx => { set(tx, D - 1, 10); cannons.push({ tx, ty:D - 1 }); };
  // ship 1 (start): crates, ? blocks, a mast, the first cannon
  ship(0, 34); const pile1 = crates(11); coin(12, 6);
  blocks(16, [3, 2, 3]); mast(22, 2); for (let x = 24; x <= 27; x++) coin(x, 8);
  enemy(foe, 25); cannon(30);
  coin(35, 7); coin(36, 6); coin(37, 7);                                  // 3-tile gap
  // ship 2: hedgehog archer, Mr. Dinosaur, a forecastle that rolls barrels down the deck
  ship(38, 71); mast(45, 2); enemy('hedgehog', 49); blocks(53, [2, 3, 2]); enemy('dino', 57);
  raise(62, 66, 8); set(65, 7, 11); set(66, 7, 11); spawners.push({ x:64*TS + 9, y:8*TS - 6 }); coin(65, 5); coin(66, 5);
  mast(69, 3); for (let x = 68; x <= 71; x++) coin(x, 8);
  movers.push({ kind:'bob', x:74*TS, y:D*TS, w:48, h:6, amp:8, sp:1.7, ph:0 });   // gap 72-78 with a bobbing barrel raft
  coin(74, 8); coin(75, 7); coin(76, 8);
  // ship 3: checkpoint + the big mast with rigging yards, crow's nest and the golden tuba block
  ship(79, 118); const cp = 81; enemy('meep', 85);
  for (let x = 88; x <= 91; x++){ set(x, 7, 5); coin(x, 6); }
  for (let x = 94; x <= 98; x++){ set(x, 5, 5); if (x !== 96) coin(x, 4); }
  for (let x = 101; x <= 104; x++){ set(x, 7, 5); coin(x, 6); }
  set(96, 1, 8); const tubaSpot = { x:96, y:1 };
  deco.push({ k:'mast', x:96, top:0, deck:D, sail:false, flag:false, big:true }, { k:'nest', x0:94, x1:98, y:5 },
    { k:'ladder', x:87, y0:7, y1:D }, { k:'ladder', x:92, y0:5, y1:7 }, { k:'ladder', x:100, y0:5, y1:7 }, { k:'ladder', x:105, y0:7, y1:D });
  enemy('dragon', 108); cannon(116);
  for (let x = 119; x <= 122; x++){ set(x, D, 5); coin(x, 8); } deco.push({ k:'gang', x0:119, x1:122, y:D });   // gangplank over a 4-tile gap
  // ship 4: crates, blocks, Meep + a star wisp, the third cannon
  ship(123, 146); const pile2 = crates(126); coin(127, 6); enemy('meep', 129); blocks(131, [3, 3, 2]); mast(134, 2); enemy(foe, 136); cannon(141);
  movers.push({ kind:'swing', x:149*TS, y:D*TS, w:48, h:6, amp:18, sp:1.2, ph:0 });   // gap 147-153 with a swinging plank
  coin(149, 8); coin(150, 7); coin(151, 8);
  // ship 5 (flagship): one more barrel deck, the Jolly Roger and the goal metronome
  ship(154, 185); raise(160, 165, 8); set(164, 7, 11); set(165, 7, 11); spawners.push({ x:163*TS + 9, y:8*TS - 6 }); coin(164, 5); coin(165, 5);
  mast(171, 1, { flag:true }); for (let x = 168; x <= 172; x++) coin(x, 8);
  return { w, map, coins, enemies, gTop, cpX:cp*TS, goalX:(w - 10)*TS, startX:2*TS, tuba:{ x:tubaSpot.x, y:tubaSpot.y, piles:[pile1, pile2] },
           deco, cannons, movers, spawners, pirate:true, auto:{ speed:SHIP.speed } };
}

// ---------- audio: chiptune SFX + tiny original music sequencer ----------
let AC = null, master = null, musicGain = null;
// iPhone audio (v20). Goals: sound with the silent switch on WHILE Band Quest is on screen, and never get in the way of the rest of the phone.
//  • Silent switch: navigator.audioSession.type = 'playback' (Safari 16.4+/17+), set only while the game is VISIBLE and sound is wanted.
//    Older iPhones without that API get one short silent clip (not a loop) played inside a tap.
//    (v19's endless silent <audio> loop is gone: a looping media element can hog the phone's audio and the headphone route.)
//  • Unlock: the context is only created/resumed (synchronously) inside a REAL tap (touchend/pointerup/click/keydown). touchstart doesn't count on iOS.
//  • Letting go: when the app is hidden (home button, app switch, lock, pagehide) the context is SUSPENDED and the session goes back to 'auto',
//    so other apps, calls, earbuds and Bluetooth work normally. It wakes on return / the next tap.
//  • Audio route changes (earbuds/headphones/Bluetooth plugged in or out = 'devicechange', or an 'interrupted' context): the old context can
//    stay stuck on the old route, so it is closed and a fresh one is built on the next tap; any music that was playing carries on.
//  • Settings → Reset sound fully releases everything and rebuilds from scratch inside the tap.
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const AUD = { wanted:true, released:false, needRebuild:false, routeChanges:0, rebuilt:0, taps:0, kicks:0, why:'', listeners:new Set(), checkT:0 };
function audioNotify(){ for (const f of AUD.listeners){ try { f(); } catch(e){} } }
function sessionSet(type){ try { const s = navigator.audioSession; if (s && s.type !== type) s.type = type; } catch(e){} }
function sessionPlayback(){ if (!document.hidden && AUD.wanted && !AUD.released) sessionSet('playback'); }
let kickUrl = null;
function silentKick(){   // older iOS (no audioSession API): one short silent clip inside a tap, then it's gone — no loop, nothing held
  if (!IOS || navigator.audioSession || document.hidden) return;
  if (!kickUrl){ const n = 2400, b = new Uint8Array(44 + n), v = new DataView(b.buffer), str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };   // 0.3 s of 8 kHz 8-bit silence
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44); let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); kickUrl = 'data:audio/wav;base64,' + btoa(bin); }
  try { const a = document.createElement('audio'); a.src = kickUrl; a.loop = false; a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', ''); a.setAttribute('x-webkit-airplay', 'deny');
    const done = () => { try { a.pause(); a.removeAttribute('src'); a.load(); } catch(e){} }; a.addEventListener('ended', done, { once:true }); a.addEventListener('error', done, { once:true });
    const r = a.play(); AUD.kicks++; if (r && r.catch) r.catch(done); setTimeout(done, 1500); } catch(e){} }
function wake(){ if (document.hidden || AUD.released) return; if (AC && AC.state !== 'running' && AC.state !== 'closed'){ try { const r = AC.resume(); if (r && r.then) r.then(audioNotify, () => {}); } catch(e){} } }
function ac(){
  if (AC && AC.state === 'closed') AC = null;
  if (!AC){ if (document.hidden) return null; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { AC = new C(); } catch(e){ return null; }
    master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination); musicGain = AC.createGain(); musicGain.gain.value = .22; musicGain.connect(master); noiseBuf = null;
    const mine = AC; AC.onstatechange = () => { if (AC === mine && mine.state === 'interrupted' && !document.hidden) routeChanged('interrupted'); audioNotify(); }; }
  wake(); sessionPlayback();   // context first, then 'playback' (the order the original pre-v11 code used)
  return AC; }
// Something changed the audio route (earbuds in/out, Bluetooth, a call...): stop holding anything; rebuild on the next tap.
function routeChanged(why){ AUD.needRebuild = true; AUD.routeChanges++; AUD.why = why; audioNotify(); }
try { if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', () => routeChanged('devicechange')); } catch(e){}
// Throw the old context away and build a fresh one (only ever called inside a tap). Music/finale song that was playing carries on.
function rebuildAudio(why){
  const music = !!Music.timer, fin = !!Finale.timer; Music.stop(); Finale.stop();
  const old = AC; AC = null; master = musicGain = null; noiseBuf = null; audioPrimed = false; AUD.rebuilt++; AUD.needRebuild = false; AUD.why = why || AUD.why;
  if (old){ try { old.onstatechange = null; const r = old.close(); if (r && r.catch) r.catch(() => {}); } catch(e){} }
  sessionSet('auto'); const c = ac(); if (!c) return null; prime(c); silentKick();
  if (music) Music.resume(); if (fin) Finale.start(true); return c; }
function prime(c){ try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); audioPrimed = true; } catch(err){} }   // a silent blip inside the tap unlocks iOS
let audioPrimed = false;
function unlockAudio(e){
  const real = !(e && (e.type === 'touchstart' || e.type === 'pointerdown'));   // iOS: only touchend/pointerup/click/keydown are real taps
  if (document.hidden) return;
  if (!real){ wake(); return; }
  AUD.released = false;
  if (!AUD.wanted && !AC) return;
  AUD.taps++;
  if (AUD.needRebuild && AC){ rebuildAudio(); audioNotify(); return; }
  const fresh = !AC, c = ac(); if (!c) return;
  if (fresh) silentKick();
  if (!audioPrimed || c.state !== 'running') prime(c);
  if (c.state !== 'running'){ clearTimeout(AUD.checkT); AUD.checkT = setTimeout(() => { if (AC === c && c.state !== 'running' && !document.hidden) routeChanged('stuck'); }, 600); }   // still not running → rebuild next tap
  audioNotify(); }
['touchend', 'pointerup', 'click', 'keydown', 'pointerdown', 'touchstart'].forEach(ev => addEventListener(ev, unlockAudio, { capture:true, passive:true }));
// Leaving the app (or the page): suspend, and hand the audio session back to iOS, so nothing is held while Band Quest is in the background.
function releaseAudio(){ AUD.released = true; clearTimeout(AUD.checkT); if (AC && AC.state === 'running'){ try { const r = AC.suspend(); if (r && r.catch) r.catch(() => {}); } catch(e){} } sessionSet('auto'); audioNotify(); }
function returnAudio(){ if (document.hidden) return; AUD.released = false; if (AC && !AUD.needRebuild){ wake(); sessionPlayback(); } audioNotify(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAudio(); else returnAudio(); });
addEventListener('pagehide', releaseAudio); addEventListener('pageshow', returnAudio);
function audioStatus(){ const C = window.AudioContext || window.webkitAudioContext;
  return { supported:!!C, state:AC ? AC.state : 'none', ios:IOS, session:navigator.audioSession ? navigator.audioSession.type : null, wanted:AUD.wanted, released:AUD.released,
    needRebuild:AUD.needRebuild, routeChanges:AUD.routeChanges, why:AUD.why, rebuilt:AUD.rebuilt, taps:AUD.taps, kicks:AUD.kicks, music:!!Music.timer }; }
function testSound(){ AUD.released = false; const c = AUD.needRebuild && AC ? rebuildAudio() : ac(); if (!c) return audioStatus(); if (!audioPrimed) prime(c);
  [72, 76, 79, 84].forEach((m, i) => blip('square', mtof(m), mtof(m), .16, .22, .03 + i*.11)); return audioStatus(); }
function resetAudio(){ AUD.released = false; rebuildAudio('reset'); return testSound(); }   // "Reset sound": full release + rebuild inside this tap
function wantAudio(on){ AUD.wanted = !!on; if (!on) sessionSet('auto'); else if (AC) sessionPlayback(); audioNotify(); }   // never claim the session before a tap made a context
let sfxOn = true, musicOn = true;
function blip(type, f0, f1, dur, vol = .3, t0 = 0, dest){ const c = ac(); if (!c) return; const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(dest || master); o.start(t); o.stop(t + dur + .02); }
let noiseBuf = null;
function noise(dur, vol = .3, t0 = 0, hp = 800, dest){ const c = ac(); if (!c) return; if (!noiseBuf){ noiseBuf = c.createBuffer(1, c.sampleRate*.5, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0; s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f).connect(g).connect(dest || master); s.start(t); s.stop(t + dur + .02); }
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
  stomp:()=>{ blip('square', 220, 70, .14, .2); noise(.06, .2, 0, 400); },
  // Meep's squeaky "meep!": two quick rising high blips with a pitch bend (~0.2 s), a soft sine layer makes it cute rather than harsh
  antler:()=>{ noise(.18, .1, 0, 1800); blip('triangle', 300, 760, .16, .1); blip('triangle', 760, 420, .12, .07, .16); },   // whoosh of the thrown antlers
  cluck:()=>{ blip('square', 720, 540, .05, .09); blip('square', 820, 600, .06, .08, .09); blip('triangle', 900, 520, .09, .1, .17); },   // coop hen: buk-buk-BAWK
  meep:()=>{ blip('square', 1250, 1900, .075, .11, .02); blip('sine', 1250, 1900, .075, .16, .02); blip('square', 1450, 2500, .1, .11, .115); blip('sine', 1450, 2500, .1, .16, .115); }, bump:()=>blip('square', 140, 110, .08, .2), hurt:()=>blip('sawtooth', 500, 140, .3, .2),
  die:()=>[72,67,64,60,55].forEach((m,i)=>blip('square', mtof(m), mtof(m), .14, .16, i*.12)), power:()=>[60,64,67,72,76].forEach((m,i)=>blip('square', mtof(m), mtof(m), .08, .12, i*.06)),
  bossHit:()=>{ noise(.12, .3, 0, 300); blip('square', 160, 90, .15, .2); }, clear:()=>[[72,0],[76,.12],[79,.24],[84,.36],[79,.6],[84,.72],[88,.84]].forEach(([m,t])=>blip('square', mtof(m), mtof(m), .16, .13, t)),
  boom:()=>{ noise(.6, .4, 0, 100); blip('sawtooth', 120, 40, .6, .25); },
  bwaamp:()=>{ brass(34, 0, .75, .5, .89); brass(41, .01, .7, .28, .89); blip('sine', 110, 32, .55, .6); noise(.35, .32, 0, 60); },
  tubaFire:()=>{ brass(46, 0, .13, .3, .8); noise(.06, .12, 0, 2500); }, crate:()=>{ noise(.16, .3, 0, 500); blip('square', 190, 80, .12, .14); },
  fanfare:()=>{ [[58,0,.11],[58,.12,.11],[65,.24,.11],[70,.36,.5]].forEach(([m,t,d])=>brass(m, t, d, .2, .98)); brass(34, .36, .6, .35); [82,86,89,94].forEach((m,i)=>blip('triangle', mtof(m), mtof(m), .12, .18, .55 + i*.06)); },
  windup:()=>{ blip('triangle', 520, 880, .18, .16); blip('triangle', 880, 880, .06, .12, .2); }, toss:()=>{ noise(.08, .14, 0, 2500); blip('square', 700, 420, .08, .08); },
  spell:()=>[84,88,91,96].forEach((m,i)=>blip('triangle', mtof(m), mtof(m), .09, .14, i*.045)),
  cannon:()=>{ noise(.35, .35, 0, 150); blip('square', 150, 50, .25, .2); }, splash:()=>{ noise(.3, .2, 0, 1200); blip('sine', 600, 180, .22, .12); },
  // Froppy's piano landing: a comical clunky diminished piano chord + wood crunch + a little "boing"
  plunk:()=>{ [52, 55, 58, 61].forEach((m, i) => { blip('triangle', mtof(m), mtof(m)*.985, .5, .15, i*.014); blip('square', mtof(m + 12), mtof(m + 12)*.99, .06, .05, i*.014); }); noise(.14, .22, 0, 700); blip('sine', 330, 90, .3, .14, .07); },
  poof:()=>{ noise(.18, .14, 0, 2500); blip('sine', 900, 1400, .12, .1); },
  bubble:()=>{ blip('sine', 300, 900, .12, .14); blip('sine', 500, 1300, .08, .1, .1); },   // bloop-bloop (a raider's bubble / skeleton ripples)
  pop:()=>{ blip('sine', 1400, 2400, .05, .16); noise(.03, .08, 0, 4000); },
  rattle:()=>{ for (let i = 0; i < 4; i++) blip('square', 900 + i*120, 700, .03, .08, i*.05); noise(.15, .08, 0, 3000); },   // clickety bones
  clank:()=>{ blip('square', 620, 600, .06, .12); blip('triangle', 1240, 1180, .18, .1); noise(.06, .14, 0, 3500); },   // metal CLANK
  step:()=>{ blip('triangle', 820, 780, .04, .06); noise(.03, .05, 0, 4000); },   // soft armor footstep
  empty:()=>blip('square', 120, 100, .06, .12), pause:()=>blip('triangle', 880, 880, .08, .2), heart:()=>[76,79,84].forEach((m,i)=>blip('triangle', mtof(m), mtof(m), .1, .25, i*.07)),
};
function sfx(n, inst){ if (!sfxOn || !ac()) return; if (n === 'shoot') (SHOOT[inst] || SHOOT.sax)(); else SFX[n] && SFX[n](); }
const Music = {
  timer:null, next:0, step:0, song:null,
  make(th, boss){ if (boss && th.key === 'final') return { wiz:true, bpm:144 };   // Mr. Kurilla gets his own menacing track (wizTick)
    const m = th.music, R = rng(hash(th.key + (boss ? 'boss' : ''))), sc = m.minor ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
    const prog = boss ? (m.minor ? [0,0,5,4] : [0,3,4,4]) : (m.minor ? [0,5,2,6] : [0,4,5,3]);
    const mel = []; for (let i = 0; i < 64; i++){ const deg = prog[i >> 4]; mel.push(R() < (i % 2 ? .45 : .8) ? sc[(deg + [0,2,4,0,2,7][Math.floor(R()*6)]) % 7] + 12*(R() < .25 ? 1 : 0) : null); }
    return { root:m.root, sc, prog, mel, bpm:boss ? m.bpm + 16 : m.bpm, tango:m.tango }; },
  start(th, boss){ this.stop(); if (!musicOn || !ac()) return; sessionPlayback(); this.song = this.make(th, boss); this.next = AC.currentTime + .1; this.step = 0; this.timer = setInterval(() => this.tick(), 30); },
  resume(){ if (!this.song || !musicOn || !ac()) return; this.stop(); this.next = AC.currentTime + .1; this.timer = setInterval(() => this.tick(), 30); },   // after an audio rebuild: same song, new context
  stop(){ clearInterval(this.timer); this.timer = null; },
  tick(){ const s = this.song; if (s.wiz) return this.wizTick(); const dt = 60/s.bpm/2; if (this.next < AC.currentTime - .25) this.next = AC.currentTime + .05;   // after an audio interruption: no burst of late notes
    while (this.next < AC.currentTime + .15){ const i = this.step % 64, deg = s.prog[i >> 4], t0 = this.next - AC.currentTime, chordRoot = s.root - 24 + s.sc[deg];
      const bassHit = s.tango ? [1,0,0,1,0,1,1,0][i % 8] : (i % 2 === 0);
      if (bassHit) blip('triangle', mtof(chordRoot + (i % 4 === 2 ? 7 : 0)), mtof(chordRoot + (i % 4 === 2 ? 7 : 0)), dt*.9, .5, t0, musicGain);
      if (s.mel[i] !== null) blip('square', mtof(s.root + 12 + s.mel[i]), mtof(s.root + 12 + s.mel[i]), dt*.8, .12, t0, musicGain);
      if (i % 2 === 1) blip('square', mtof(s.root + s.sc[(deg + 2 + (i % 4 === 1 ? 0 : 2)) % 7]), mtof(s.root + s.sc[(deg + 2) % 7]), dt*.4, .05, t0, musicGain);
      this.next += dt; this.step++; } },
  // Mr. Kurilla's battle music: D minor, i–VI–iv–V (Dm Bb Gm A), a low chromatic bass ostinato under church-organ chords and timpani.
  // It intensifies with his phase: 1 = ostinato + organ + timpani (a creeping half-time melody), 2 = faster + the chromatic melody + hi-hats
  // + more timpani, 3 = fastest, melody doubled an octave down, snare backbeat and timpani rolls into every chord change.
  wizTick(){ const ph = (G && G.B && G.B.phase) || 1, dt = 60/[0, 144, 156, 172][ph]/2;
    if (this.next < AC.currentTime - .25) this.next = AC.currentTime + .05;
    while (this.next < AC.currentTime + .15){ const i = this.step % 64, ch = WIZ_CHORDS[i >> 4], t0 = this.next - AC.currentTime, r = ch[0] - 12, m = WIZ_MEL[i];
      if (i % 8 === 0) organ(ch, t0, dt*8*.95, ph === 3 ? .05 : .04);
      const b = r + [0, 0, 12, 0, 1, 0, -1, 0][i % 8]; blip('triangle', mtof(b), mtof(b), dt*.85, .45, t0, musicGain); blip('square', mtof(b + 12), mtof(b + 12), dt*.45, ph > 1 ? .06 : .045, t0, musicGain);
      if (i % 16 === 0) timp(r, t0, .5); if (ph > 1 && i % 16 === 8) timp(r - 5, t0, .4);
      if (ph === 3 && i % 16 >= 14){ timp(r, t0, .3); timp(r, t0 + dt/2, .32); }
      if (m){ if (ph === 1){ if (i % 4 === 0) blip('triangle', mtof(m), mtof(m), dt*1.8, .12, t0, musicGain); }
        else { blip('square', mtof(m), mtof(m), dt*.9, .085, t0, musicGain); if (ph === 3) blip('sawtooth', mtof(m - 12), mtof(m - 12), dt*.9, .045, t0, musicGain); } }
      if (ph > 1) noise(.03, .06, t0, 7000, musicGain); if (ph === 3 && i % 4 === 2) noise(.1, .2, t0, 1500, musicGain);
      this.next += dt; this.step++; } },
};
const WIZ_CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];   // Dm, Bb, Gm, A (the C# leading tone keeps it tense)
const WIZ_MEL = [74,0,73,0,72,0,71,0, 70,0,69,0,70,69,68,69,  74,0,0,77,76,0,74,0, 73,0,74,0,70,0,0,0,
                 79,0,78,0,77,0,76,0, 75,0,74,0,75,74,73,74,  76,0,0,73,76,0,79,0, 81,0,80,0,79,0,77,76];   // creeping chromatic lines (0 = rest)
function organ(notes, t0, dur, vol){ const c = ac(); if (!c) return; const t = c.currentTime + t0, g = c.createGain();   // drawbar-style organ: each note + octave + twelfth
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .03); g.gain.setValueAtTime(vol, t + dur - .08); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(musicGain);
  for (const n of notes) for (const [mul, v] of [[1, 1], [2, .55], [3, .3]]){ const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(mtof(n)*mul, t); og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + dur + .02); } }
function timp(m, t0, vol){ const c = ac(); if (!c) return; const t = c.currentTime + t0, f = mtof(m), o = c.createOscillator(), g = c.createGain();   // timpani: pitch-drop boom + a soft mallet thump
  o.type = 'sine'; o.frequency.setValueAtTime(f*1.25, t); o.frequency.exponentialRampToValueAtTime(f, t + .06); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .55);
  o.connect(g).connect(musicGain); o.start(t); o.stop(t + .6); noise(.05, vol*.35, t0, 300, musicGain); }

// ---------- FINAL BOSS: Mr. Kurilla, the Maestro (a friendly "villain" wizard) ----------
// Floats between a few spots, telegraphs every spell (staff glows + sparkles + "!" for ~0.7-0.95 s), teleports with a fade (no contact while faded),
// and after every 3rd spell he flops down to the floor, dizzy, for ~2 s: stomp him then (3 damage) or play notes at him any time (1 each); a tuba blast does 3.
// Phases by health: 1 = single slow notes, 2 = 3-note fans + falling-note rain (floor markers first), 3 = 5-note fans, rain and a bouncing whole note.
const WIZ_SPOTS = [[2.2, 44], [11.4, 44], [6.8, 30], [3, 82], [11, 82], [6.8, 64]];
const WIZ_SPELLS = { 1:['volley', 'volley', 'volley'], 2:['volley', 'rain', 'volley'], 3:['rain', 'volley', 'whole'] };
function finalTheme(){ const th = themeOf({ theme:'castle', colors:{ sky:'#3a1a6e', ground:'#4a2a7a', groundTop:'#c9b6ff', accent:'#ffd23f' } });
  return Object.assign(th, { key:'final', id:'final-tower', music:{ root:50, minor:true, bpm:144 } }); }
function updateWizard(B, dt, p, left, right, floor, hpF){
  const phase = hpF > 2/3 ? 1 : hpF > 1/3 ? 2 : 3, tempo = [1, 1, 1.15, 1.3][phase]; B.phase = phase;
  if (!B.mode){ B.mode = 'float'; B.spot = 5; B.casts = 0; B.timer = 1; }
  const sp = WIZ_SPOTS[B.spot] || WIZ_SPOTS[5], go = (mx, my, kk) => { B.x += (mx - B.x)*Math.min(1, dt*kk); B.y += (my - B.y)*Math.min(1, dt*kk); };
  B.ghost = B.mode === 'out' || B.mode === 'in';
  switch (B.mode){
    case 'float': go(sp[0]*TS, sp[1] + Math.sin(B.t*2)*6, 2.5); if (B.timer <= 0){ B.mode = 'charge'; B.timer = [.95, .95, .8, .7][phase]; B.spell = WIZ_SPELLS[phase][B.casts % 3]; sfx('windup'); } break;
    case 'charge': go(sp[0]*TS, sp[1], 3); if (Math.random() < .5){ const a = Math.random()*Math.PI*2; G.parts.push({ x:B.x + B.w + 6 + Math.cos(a)*16, y:B.y + 2 + Math.sin(a)*16, vx:-Math.cos(a)*40, vy:-Math.sin(a)*40, life:.35, color:Math.random() < .5 ? '#ffd23f' : '#c9b6ff', s:1 }); }
      if (B.timer <= 0){ castSpell(B, p, phase, floor); B.casts++; B.mode = 'after'; B.timer = .55; } break;
    case 'after': go(sp[0]*TS, sp[1], 2); if (B.timer <= 0){ if (B.casts % 3 === 0){ B.mode = 'drop'; B.vy = 0; } else if (B.casts % 2 === 0 || phase > 1){ B.mode = 'out'; B.timer = .45; sfx('pause'); } else { B.mode = 'float'; B.timer = 1.3/tempo; } } break;
    case 'out': if (B.timer <= 0){ const far = WIZ_SPOTS.map((s, i) => i).filter(i => i !== B.spot).sort((a, b) => Math.abs(WIZ_SPOTS[b][0]*TS - p.x) - Math.abs(WIZ_SPOTS[a][0]*TS - p.x));
        B.spot = far[Math.floor(Math.random()*2)]; B.x = WIZ_SPOTS[B.spot][0]*TS; B.y = WIZ_SPOTS[B.spot][1]; B.mode = 'in'; B.timer = .45; puff(B.x + B.w/2, B.y + B.h/2, '#c9b6ff', 10, 70); } break;
    case 'in': if (B.timer <= 0){ B.mode = 'float'; B.timer = 1.1/tempo; } break;
    case 'drop': B.vy = Math.min(260, (B.vy || 0) + 500*dt); B.y += B.vy*dt; if (B.y >= floor){ B.y = floor; B.vy = 0; B.mode = 'rest'; B.timer = [2.6, 2.6, 2.3, 2.0][phase]; G.shake = .15; sfx('bump'); } break;
    case 'rest': B.y = floor; if (B.timer <= 0){ B.mode = 'out'; B.timer = .45; sfx('pause'); } break;
  }
  if (B.mode !== 'out' && B.mode !== 'in') B.ghost = false;
  for (const m of G.marks){ m.t += dt; if (!m.fired && m.t >= m.delay){ m.fired = true; G.eshots.push({ kind:'note', x:m.x, y:-6, vx:0, vy:120, t:0, life:4, rain:true, hr:4 }); } }
  G.marks = G.marks.filter(m => !m.fired || m.t < m.delay + .2);
}
function castSpell(B, p, phase, floor){ const cx = B.x + (B.face > 0 ? B.w + 6 : -6), cy = B.y + 4; sfx('spell');
  if (B.spell === 'volley'){ const n = [1, 1, 3, 3][phase], spd = [62, 62, 68, 76][phase], a0 = Math.atan2(p.y + 10 - cy, p.x + 5 - cx);
    for (let i = 0; i < n; i++){ const a = a0 + (i - (n - 1)/2)*.34; G.eshots.push({ kind:'note', x:cx, y:cy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, t:0, life:5, hr:4, hue:i }); } }
  else if (B.spell === 'rain'){ const n = phase === 2 ? 3 : 4, cols = [], start = 1 + Math.floor(Math.random()*3);
    for (let c = start; c <= 14 && cols.length < n; c += 3 + Math.floor(Math.random()*2)) cols.push(c);
    cols.forEach((c, i) => G.marks.push({ x:c*TS + 8, t:0, delay:.9 + i*.18 })); }
  else if (B.spell === 'whole'){ const dir = p.x < B.x ? -1 : 1; G.eshots.push({ kind:'whole', x:cx, y:floor + B.h - 9, vx:dir*60, vy:-150, grav:700, t:0, life:8, r:7, hr:6 }); }
  puff(cx, cy, '#ffd23f', 8, 70); }
function spellShot(s, p){
  const floorY = 12*TS;
  if (s.kind === 'whole'){ if (s.y > floorY - s.r){ s.y = floorY - s.r; s.vy = -210; } if (s.x < 1.2*TS + s.r || s.x > 14.8*TS - s.r){ s.dead = 1; puff(s.x, s.y, '#ffffff', 8, 60); } }
  else if (s.rain && s.y > floorY - 4){ s.dead = 1; puff(s.x, floorY - 4, '#ffd23f', 6, 50); }
  else if (!s.rain && (s.x < 1.2*TS || s.x > 14.8*TS || s.y > floorY - 2)){ s.dead = 1; puff(s.x, s.y, '#c9b6ff', 5, 40); }
  const r = s.r || 5;
  for (const n of G.shots) if (!s.dead && !n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - r, y:s.y - r, w:r*2, h:r*2 })){ n.dead = 1; if (s.kind === 'whole' && !s.hit){ s.hit = 1; sfx('bump'); } else { s.dead = 1; sfx('bump'); puff(s.x, s.y, '#ffffff', 6, 50); } }
  if (!s.dead && !p.dead && s.kind === 'whole' && p.vy > 30 && p.y + p.h - (s.y - r) < 12 && overlap(p, { x:s.x - r, y:s.y - r, w:r*2, h:r*2 })){ s.dead = 1; p.vy = input.jump ? -380 : -260; sfx('stomp'); puff(s.x, s.y, '#ffffff', 8, 70); } }
function drawWizardBoss(x, B, cam){
  const f = SP.bossFrames('kurilla'), cast = B.mode === 'charge', fr = cast ? f.cast : f, flash = B.inv > 0 && Math.floor(G.t*30) % 2;
  const img = flash ? f.hit : (B.face > 0 ? fr.r : fr.l), bob = B.mode === 'rest' ? 0 : Math.round(Math.sin(G.t*4)*2);
  const bx = Math.round(B.x - cam + B.w/2 - img.width/2), by = Math.round(B.y + B.h - img.height + 2 + bob);
  const kf = clamp(B.timer/.45, 0, 1), a = B.mode === 'out' ? kf : B.mode === 'in' ? 1 - kf : 1;
  if (B.mode !== 'rest' && B.mode !== 'drop'){ x.globalAlpha = .35*a; x.fillStyle = '#c9b6ff'; x.fillRect(bx + 6, 12*TS - 3, 20, 2); }
  x.globalAlpha = a; x.drawImage(img, bx, by); x.globalAlpha = 1;
  if (cast){ const tx = B.face > 0 ? bx + 27 : bx + 4, ty = by + 2; glow(x, tx, ty, 7 + Math.round(Math.sin(G.t*20)*2)); alertBubble(x, bx + 16, by - 2, B.timer); }
  if (B.mode === 'rest'){ for (let i = 0; i < 3; i++){ const a = G.t*4 + i*2.1, sx = Math.round(bx + 16 + Math.cos(a)*10), sy = Math.round(by + 2 + Math.sin(a)*3); x.fillStyle = i % 2 ? '#ffffff' : '#ffd23f'; x.fillRect(sx, sy - 1, 1, 3); x.fillRect(sx - 1, sy, 3, 1); }
    SP.text(x, 'DIZZY!', bx + 16 - Math.round(SP.textWidth('DIZZY!')/2), by - 12, Math.floor(G.t*6) % 2 ? '#ffd23f' : '#ffffff'); } }
function drawMarks(x, cam){ for (const m of G.marks){ if (m.fired) continue; const blink = (m.delay - m.t) < .35 ? Math.floor(G.t*20) % 2 : Math.floor(G.t*8) % 2; const mx = Math.round(m.x - cam);
    x.globalAlpha = .55 + blink*.35; x.fillStyle = '#ffd23f'; x.fillRect(mx - 7, 12*TS - 3, 14, 2); x.fillRect(mx - 5, 12*TS - 5, 10, 2); x.globalAlpha = 1;
    x.fillStyle = '#ffd23f'; x.fillRect(mx, 4 + 15, 1, 7); x.fillRect(mx - 3, 4 + 21, 4, 3); x.fillRect(mx + 1, 4 + 15, 3, 1); } }
function drawNoteShot(x, s, sx, sy){
  if (s.kind === 'whole'){ x.fillStyle = '#1a1030'; x.fillRect(sx - 8, sy - 5, 16, 10); x.fillRect(sx - 6, sy - 7, 12, 14); x.fillStyle = s.hit ? '#ffb0d0' : '#ffffff'; x.fillRect(sx - 7, sy - 4, 14, 8); x.fillRect(sx - 5, sy - 6, 10, 12);
    x.fillStyle = '#1a1030'; x.fillRect(sx - 3, sy - 3, 4, 6); x.fillRect(sx - 1, sy - 4, 4, 6); return; }
  const col = s.rain ? '#ffd23f' : ['#ff4f79', '#c9b6ff', '#7cc0ff', '#ffd23f', '#9ff0c8'][(s.hue || 0) % 5];
  x.fillStyle = '#1a1030'; x.fillRect(sx - 5, sy, 7, 6); x.fillRect(sx + 1, sy - 8, 3, 10); x.fillRect(sx + 2, sy - 9, 5, 4);
  x.fillStyle = col; x.fillRect(sx - 4, sy + 1, 5, 4); x.fillRect(sx + 2, sy - 7, 1, 9); x.fillRect(sx + 3, sy - 8, 3, 2); x.fillStyle = '#ffffff'; x.fillRect(sx - 3, sy + 1, 1, 1); }
// ---------- finale song: an original cheerful tune for the ending parade (synthesized; plays only when music is on, through the music volume) ----------
const FIN_MEL = [72,null,76,null,79,null,76,77, 79,null,74,null,71,null,74,76, 77,76,72,null,69,null,72,74, 76,null,77,null,76,74,72,null,
                 72,74,76,79,84,null,79,76, 77,null,81,null,77,76,74,72, 74,null,79,null,77,null,74,null, 72,null,79,76,72,null,null,null,
                 72,null,76,null,79,null,76,77, 79,null,74,null,71,null,74,76, 77,76,72,null,69,null,72,74, 76,null,77,null,76,74,72,null,
                 72,74,76,79,84,null,79,76, 77,null,81,null,77,76,74,72, 79,77,76,74,71,74,77,79, 84,null,79,null,72,null,null,null];
const FIN_CHORDS = [[48,64,67],[43,62,67],[45,60,64],[41,60,65],[48,64,67],[41,60,65],[43,62,65],[48,64,67]];
const Finale = { timer:null, next:0, step:0,
  start(on){ this.stop(); if (on === false || !ac()) return false; this.next = AC.currentTime + .12; this.step = 0; this.timer = setInterval(() => this.tick(), 30); return true; },
  stop(){ clearInterval(this.timer); this.timer = null; },
  tick(){ const dt = 60/132/2; if (this.next < AC.currentTime - .25) this.next = AC.currentTime + .05;
    while (this.next < AC.currentTime + .15){ const i = this.step % FIN_MEL.length, bar = Math.floor(i/8) % 8, ch = FIN_CHORDS[bar], t0 = this.next - AC.currentTime, m = FIN_MEL[i];
      if (m !== null){ blip('square', mtof(m), mtof(m), dt*.85, .13, t0, musicGain); blip('triangle', mtof(m + 12), mtof(m + 12), dt*.5, .05, t0, musicGain); }
      if (i % 2 === 0) blip('triangle', mtof(ch[0] - (i % 4 === 2 ? -7 : 0)), mtof(ch[0] - (i % 4 === 2 ? -7 : 0)), dt*1.6, .5, t0, musicGain);
      if (i % 2 === 1) for (const n of ch.slice(1)) blip('square', mtof(n), mtof(n), dt*.4, .035, t0, musicGain);
      if (i % 8 === 2 || i % 8 === 6) noise(.12, .22, t0, 1800, musicGain); else noise(.03, .07, t0, 6000, musicGain);   /* snare on 2 and 4, hi-hat on the off-beats */
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
  // World 1 is the first boss kids meet, so the Valkyrie is tuned gentler than the rest (v22): 18 HP instead of 24, slower patrol/dives/spears,
  // a 0.8 s flashing "!" wind-up (with a floor marker where she'll land) before every dive, a 1.5 s dizzy rest on the floor after it
  // (touching her then doesn't hurt — free stomps), a softer rage at half HP, and two heart drops (at 2/3 and 1/3 HP) instead of one.
  // Any field left out = the original numbers, so every other boss is unchanged.
  valkyrie:{ move:'fly', shot:'spear', hp:18, rage:1.15, patrol:40, gap:2.0, swoopP:.55, windup:.8, dive:120, minDown:45, rest:1.5, spear:110, hearts:[2/3, 1/3] },
  cluckzilla:{ move:'hop', shot:'egg' }, santa:{ move:'walk', shot:'axe' },
  // World 4's Déjà Vu Dragon (v23): was 24 HP, an untelegraphed fireball every 1.3 s at 140 px/s (3 at once when angry), hovering out of reach.
  // Now just a bit tougher than the Valkyrie: 20 HP, every attack has a 0.8 s flashing "!" wind-up, slower fireballs (100 px/s, 2 when angry),
  // and every 2nd attack he slams down to the floor (red marker first) and sits dizzy for 1.3 s — touching him then is safe, so stomp away.
  dragon:{ move:'hover', shot:'fire', hp:20, rage:1.15, patrol:32, gap:1.9, windup:.8, fireSpeed:100, spread:[-.2, .2], slamEvery:2, slam:110, rest:1.3, hearts:[2/3, 1/3] }, golem:{ move:'walk', shot:'rock' },
  // World 5's Señor Spectro (v28): was 24 HP, an untelegraphed ring of 5 orbs every 1.8 s at 90 px/s (8 orbs every 1.33 s when angry, rings overlapping),
  // a faster dance when angry, and a 0.8 s see-through phase every 4 s where notes/stomps passed through him but touching him still hurt.
  // Now in the Valkyrie/Dragon spirit: 18 HP, a 0.9 s flashing "!" pose before every attack, slower orbs (60 px/s) in a ring with a safe gap aimed at you
  // (4 orbs, 6 when angry), only one ring on screen at a time, a slower dance, and every 2nd attack a "tango dip" down to the floor (red marker first)
  // followed by a 1.6 s dizzy rest + slow float back up (touching him then is safe — stomp away). He fades only once every 8 s, flickers 0.6 s before,
  // stays half-visible on the same dance path (no teleport), and touching him while faded doesn't hurt. Two heart drops (2/3 and 1/3 HP).
  spectro:{ move:'dance', shot:'orb', hp:18, rage:1.1, sway:.65, gap:2.4, windup:.9, orbN:4, orbNAngry:6, orbSpeed:60, orbLife:4.5, dipEvery:2, dip:100, rest:1.6, rise:45, fadeEvery:8, fadeWarn:.6, fade:.8, hearts:[2/3, 1/3] },
  kurilla:{ move:'wizard', shot:'note' },   /* the final boss (see updateWizard) */
};
function newRun(opts){
  const final = opts.level === 'final', boss = opts.level === 'boss' || final, special = boss ? null : specialOf(opts.seed, opts.level), th = final ? finalTheme() : special === 'ship' ? shipTheme(opts.world) : special ? specialTheme(special, opts.world) : themeOf(opts.world);
  G = { opts, th, bg:backgrounds(th), tl:tiles(th), boss, coins:0, lives:opts.lives, maxHearts:3 + (opts.plume ? 1 : 0), chord:!!(opts.chord || opts.golden),
        hero:SP.heroFrames(opts.inst, opts.hair, !!opts.golden), enemyType:(opts.world && opts.world.enemy) || 'gremlin', cpReached:false, t:0, paused:false, done:false, msg:null, shake:0,
        tuba:clamp(opts.tuba | 0, 0, TUBA.ammo), tubaCool:0, tubaKO:0, bigShake:0 };
  G.special = special;
  const wn = Math.max(1, opts.worldNo | 0 || 1);
  G.base = boss ? genBoss() : special === 'ship' ? genShip(G.enemyType) : special === 'sky' ? genSky(G.enemyType) : special === 'port' ? genPort(G.enemyType) : special === 'moat' ? genMoat(G.enemyType) : special ? genInterior(opts.seed, opts.level, G.enemyType, wn, special) : genLevel(opts.seed, opts.level, G.enemyType, wn);
  if (!boss && !G.base.auto) addHiddenBlocks(G.base);   // v29 secret blocks (not on the auto-scrolling raft/ship rides)
  resetLevel(true);
}
function resetLevel(first){
  const b = G.base;
  G.L = { w:b.w, map:b.map.slice(), gTop:b.gTop, skin:b.skin || null };
  G.vanish = (b.vanish || []).map(v => ({ ...v, st:'idle', t:0 }));
  G.coinList = b.coins.map(c => ({ ...c, taken:false }));
  G.enemies = b.enemies.map(e => { const K = ENEMY_KIND[e.type] || {};
    return { ...e, w:K.w || 14, h:K.h || 14, vx:-(K.speed || 28), vy:0, baseY:e.y, t:Math.random()*6, alive:true, dead:0, face:-1, hp:K.hp || 1, st:'idle', cool:(e.ri != null ? BUBBLE.first : K.tango ? TANGO.first : K.armor ? ARMOR.first : K.skeleton ? SKEL.first : K.thrower ? PIANO.first : K.antler ? ANTLER.first : ARCHER.first) + Math.random(), dir:-1, hopT:.4 + Math.random()*.5 }; });
  G.hidden = (b.hidden || []).map(h => ({ ...h, shown:false })); G.chains = b.chains || []; G.megaFrom = new Set(); G.shots = []; G.eshots = []; G.marks = []; G.parts = []; G.bumps = []; G.pops = []; G.pickups = (b.bonus || []).map(k => ({ ...k, vy:0 })); G.bombs = []; G.blasts = []; G.floats = [];
  const sx = G.cpReached ? b.cpX : b.startX;
  G.p = { x:sx, y:(gTopAt(sx) - 2)*TS - 4, w:10, h:20, vx:0, vy:0, face:1, onGround:false, coyote:0, buffer:0, hearts:G.maxHearts, inv:first ? 0 : 1.5, cool:0, dead:0, anim:0, clear:0 };
  G.cam = clamp(G.p.x - 100, 0, Math.max(0, G.L.w*TS - W));
  G.movers = (b.movers || []).map(m => ({ ...m, bx:m.x, by:m.y, t:0, dx:0, dy:0 })); G.cannons = (b.cannons || []).map(c => ({ ...c, cool:1.2, warn:0 })); G.spawners = (b.spawners || []).map(q => ({ ...q, cool:.6 }));
  if (b.auto){ G.cam = clamp(G.p.x - 48, 0, Math.max(0, G.L.w*TS - W)); G.autoWait = SHIP.wait; }
  if (G.boss){ const k = (G.opts.world && G.opts.world.boss) || 'golem', cfg = BOSS_CFG[k] || BOSS_CFG.golem, maxHp = cfg.hp || 24, hp = (!first && G.B && G.B.hp > 0) ? Math.min(maxHp, G.B.hp) : Math.min(maxHp, Math.max(1, G.opts.bossHp || maxHp));
    G.B = { key:k, cfg, x:11*TS, y:7*TS, w:28, h:28, vx:0, vy:0, hp, maxHp, t:0, timer:1.5, state:'intro', face:-1, inv:0, onGround:false, gone:0, minions:0 };
    G.msg = { text:'BOSS: ' + (G.opts.bossName || 'BOSS'), t:2 }; }
  else G.msg = { text:b.auto ? 'ALL ABOARD!' : (G.opts.label || 'READY!'), t:1.6 };
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
  dt = Math.min(Math.max(0, +dt || 0), 1/30);
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
  if (G.base.auto || G.movers.length) shipPre(dt);
  const accel = p.onGround ? 900 : 650, max = 108;
  if (input.left && !input.right){ p.vx = Math.max(-max, p.vx - accel*dt); p.face = -1; }
  else if (input.right && !input.left){ p.vx = Math.min(max, p.vx + accel*dt); p.face = 1; }
  else { const fr = (p.onGround ? 1000 : 300)*dt; p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx)*fr; }
  p.coyote = p.onGround ? .09 : p.coyote - dt; p.buffer = input.jumpPressed ? .12 : p.buffer - dt;
  if (p.buffer > 0 && p.coyote > 0){ p.vy = -365; p.coyote = 0; p.buffer = 0; sfx('jump'); }
  if (!input.jump && p.vy < -130) p.vy = -130;
  p.vy = Math.min(420, p.vy + 1100*dt);
  const prevB = p.y + p.h; moveX(p, p.vx*dt); if (G.hidden.length && p.vy < 0) revealHidden(p, p.vy*dt); moveY(p, p.vy*dt); if (G.movers.length) landMovers(prevB);
  if (p.bonk) bonk(p.bonk.tx, p.bonk.ty);
  if (G.vanish.length) updateVanish(dt);
  if (G.base.indoor === 'coop') henClucks();
  if (G.base.auto){ autoScroll(dt); if (!p.splash && p.y + p.h > waterY() + 4){ p.splash = 1; splash(p.x + p.w/2); } }
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
  for (const pk of G.pickups){ if (pk.kind === 'tuba'){ tubaPickup(pk, dt); continue; } if (pk.still) pk.vy = 0; else pk.vy = Math.min(200, pk.vy + 600*dt); pk.y += pk.vy*dt; if (!pk.still && pk.y > (gTopAt(pk.x) )*TS - 8){ pk.y = gTopAt(pk.x)*TS - 8; pk.vy = 0; }
    if (!pk.taken && Math.abs(pk.x - (p.x + 5)) < 12 && Math.abs(pk.y - (p.y + 10)) < 16){ pk.taken = true; if (pk.kind === 'chord'){ G.chord = true; G.msg = { text:'POWER CHORD!', t:1.4 }; sfx('power'); } else { p.hearts = Math.min(G.maxHearts, p.hearts + 1); sfx('heart'); } } }
  G.pickups = G.pickups.filter(k => !k.taken);
  // shots
  for (const s of G.shots){ s.t += dt; s.x += s.vx*dt; s.y += s.vy*dt + Math.sin(s.t*24)*.6; if (s.t > .75 || solid(Math.floor((s.x + 3)/TS), Math.floor((s.y + 3)/TS))){ s.dead = 1; puff(s.x, s.y, s.color, 3, 30); } }
  // enemies
  for (const e of G.enemies){
    if (!e.alive){ e.dead -= dt; e.vy += 900*dt; e.y += e.vy*dt; continue; }
    if (Math.abs(e.x - p.x) > 300) continue;
    e.t += dt; e.flash = Math.max(0, (e.flash || 0) - dt); const K = ENEMY_KIND[e.type] || {};
    if (e.ri != null) updateRider(e, dt, p);
    else if (K.tango) updateTango(e, dt, p);
    else if (K.bones) updateBones(e, dt, p);
    else if (K.mega) updateMega(e, dt, p);
    else if (K.skeleton) updateSkeleton(e, dt, p);
    else if (K.armor) updateArmor(e, dt, p);
    else if (K.archer) updateArcher(e, dt, p);
    else if (K.thrower) updateFrog(e, dt, p);
    else if (K.antler) updateReindeer(e, dt, p);
    else if (K.hop) updateHopper(e, dt, K);
    else if (K.wave){ moveX(e, e.vx*dt); if (e.hitWall) e.vx = -e.vx; e.y = e.baseY + Math.sin(e.t*2.6)*16; if (Math.abs(e.x - (e.homeX ??= e.x)) > 80) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx); }
    else if (e.fly){ moveX(e, e.vx*.8*dt); if (e.hitWall) e.vx = -e.vx; e.y = e.baseY + Math.sin(e.t*2.2)*14; if (Math.abs(e.x - (e.homeX ??= e.x)) > 64) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx); }
    else { e.vy = Math.min(400, e.vy + 1000*dt); moveX(e, e.vx*dt); if (e.hitWall) e.vx = -e.vx; moveY(e, e.vy*dt);
      if (Math.abs(e.x - (e.homeX ??= e.x)) > 48) e.vx = -Math.sign(e.x - e.homeX)*Math.abs(e.vx);
      if (e.onGround){ const fx = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1)/TS), fy = Math.floor((e.y + e.h + 2)/TS); if (!solid(fx, fy) && tileAt(fx, fy) !== 5) e.vx = -e.vx; }
      if (e.y > H + 40) e.alive = false; }
    if (!K.archer && !K.hop && !K.thrower && !K.antler && !K.skeleton && !K.armor && !K.tango && !K.bones && !K.mega && e.ri == null) e.face = e.vx > 0 ? 1 : -1;
    if (e.sub || !e.alive) continue;   // a Splashbones hiding under the water can't be hit and can't hurt
    for (const s of G.shots) if (!s.dead && e.alive && overlap({ x:s.x, y:s.y, w:6, h:6 }, e)){ s.dead = 1; hitEnemy(e); }
    if (e.alive && !p.dead && overlap(p, e)){
      if (p.vy > 30 && p.y + p.h - e.y < 15){ if (K.mega){ megaHit(e, 2); G.megaStomps = (G.megaStomps || 0) + 1; } else kill(e, true); p.vy = input.jump ? -380 : -260; }
      else if (!K.tango && !(K.mega && (e.st === 'grow' || e.st === 'dizzy'))) hurt('enemy:' + e.type); }   // the Tango Couple is too busy dancing to hurt you: only their roses do
  }
  if (G.chains.length) updateChains(p);
  if (G.boss) updateBoss(dt);
  if (G.base.auto){ updateCannons(dt); updateSpawners(dt); }
  for (const s of G.eshots){ s.t += dt; if (s.grav) s.vy += s.grav*dt; s.x += s.vx*dt; s.y += s.vy*dt; s.rot = (s.rot || 0) + dt*12;
    if (s.y > H + 20 || s.x < -20 || s.x > G.L.w*TS + 20 || s.t > (s.life || 6)) s.dead = 1;
    if (s.kind === 'ball' || s.kind === 'barrel') shipShot(s, p);
    if (s.kind === 'note' || s.kind === 'whole') spellShot(s, p);
    if (s.kind === 'piano') pianoShot(s, p);
    if (s.kind === 'antler') antlerShot(s, p);
    if (s.kind === 'rose' || s.kind === 'megaegg'){ softShot(s, p); continue; }
    if (s.kind === 'bubble'){ bubbleShot(s, p); continue; }
    if (s.kind === 'rock' && s.y > 12*TS - 8){ s.dead = 1; puff(s.x, s.y, '#9aa0b4', 6); G.shake = .1; }
    if (s.kind === 'arrow'){ if (s.t > ARCHER.life || solid(Math.floor((s.x + Math.sign(s.vx)*6)/TS), Math.floor(s.y/TS))){ s.dead = 1; puff(s.x, s.y, '#e0a868', 4, 30); }
      for (const n of G.shots) if (!s.dead && !n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - 7, y:s.y - 3, w:14, h:7 })){ n.dead = 1; s.dead = 1; sfx('bump'); puff(s.x, s.y, '#ffffff', 5, 40); } }
    if (s.kind === 'egg' && s.y > 12*TS - 8){ s.y = 12*TS - 8; s.vy = -s.vy*.5; if (Math.abs(s.vy) < 40){ s.dead = 1; puff(s.x, s.y, '#ffffff', 6); } }
    const hr = s.hr || 3; if (!s.dead && !p.dead && overlap(p, { x:s.x - hr, y:s.y - hr, w:hr*2, h:hr*2 })){ s.dead = 1; hurt('shot:' + s.kind); } }
  updateBombs(dt);
  G.shots = G.shots.filter(s => !s.dead); G.eshots = G.eshots.filter(s => !s.dead); G.enemies = G.enemies.filter(e => e.alive || e.dead > 0);
  updateParts(dt);
  for (const b of G.bumps) b.t += dt; G.bumps = G.bumps.filter(b => b.t < .2);
  for (const c of G.pops){ c.t += dt; c.y += c.vy*dt; c.vy += 600*dt; } G.pops = G.pops.filter(c => c.t < .5);
  for (const f of G.floats){ f.t += dt; f.y -= 28*dt; } G.floats = G.floats.filter(f => f.t < .8);
  syncTubaUI();
  // camera
  if (!G.base.auto){ const target = clamp(p.x - 100 + p.face*16, 0, Math.max(0, G.L.w*TS - W)); G.cam += (target - G.cam)*Math.min(1, dt*6); }
}
// ---------- pirate ship: auto-scroll, moving rafts, cannons, rolling barrels ----------
function shipPre(dt){ const p = G.p;   /* move the rafts first and carry a hero who is standing on one */
  for (const m of G.movers){ m.t += dt; const ox = m.x, oy = m.y;
    if (m.drift){ m.x = clamp(G.cam + m.off, m.x0, m.x1); m.y = m.by + Math.sin(m.t*m.sp + m.ph)*m.amp; }   // moat log raft: rides with the screen, docks at the landings
    else if (m.eraft){ const c = G.cam + MOAT.eoff; if (p.on === m) m.b = Math.max(m.b, c);   // a raider's tub floats alongside, then paddles off ahead (it waits while the hero stands in it)
      m.x = c < m.a ? m.a : c <= m.b ? c : m.b + (c - m.b)*1.8; m.y = m.by + Math.sin(m.t*m.sp + m.ph)*m.amp; }
    else if (m.kind === 'swing') m.x = m.bx + Math.sin(m.t*m.sp + m.ph)*m.amp; else m.y = m.by + Math.sin(m.t*m.sp + m.ph)*m.amp;
    m.dx = m.x - ox; m.dy = m.y - oy;
    if (p.on === m && !p.dead){ if (p.x + p.w > m.x - 1 && p.x < m.x + m.w + 1){ moveX(p, m.dx); p.y = m.y - p.h; } else p.on = null; } } }
function landMovers(prevB){ const p = G.p; p.on = null; if (p.vy < 0 || p.dead) return;
  for (const m of G.movers) if (p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && prevB <= m.y + 4 && p.y + p.h >= m.y){ p.y = m.y - p.h; p.vy = 0; p.onGround = true; p.on = m; if (m.drift) m.boarded = true; return; } }
const boxFree = (x, y, w, h) => { for (let tx = Math.floor(x/TS); tx <= Math.floor((x + w - .01)/TS); tx++) for (let ty = Math.floor(y/TS); ty <= Math.floor((y + h - .01)/TS); ty++) if (solid(tx, ty)) return false; return true; };
function autoScroll(dt){ const p = G.p, A = G.base.auto, c0 = G.cam; let max = Math.max(0, G.L.w*TS - W);
  // moat: the screen waits at a landing until the hero has stepped past the start of the next raft
  if (A.hold) for (const m of G.movers) if (m.drift && p.x + p.w/2 < m.x0 && m.x0 - m.off >= G.cam - 1) max = Math.min(max, m.x0 - m.off);
  if (G.autoWait > 0) G.autoWait -= dt; else G.cam = Math.max(G.cam, Math.min(max, G.cam + A.speed*dt));
  const lead = p.x - G.cam - (A.lead || 160); if (lead > 0 && !p.dead) G.cam = Math.max(G.cam, Math.min(max, G.cam + Math.min(lead, 150*dt)));
  G.camV = dt > 0 ? (G.cam - c0)/dt : 0;   /* never pin a hero at the right edge: a hero who runs ahead scrolls the screen faster */
  const left = G.cam + 2, right = G.cam + W - p.w - 2;
  if (p.x < left){ moveX(p, left - p.x); if (p.vx < 0) p.vx = 0; if (p.x < left - .5) unsquish(p, left); }
  if (p.x > right){ p.x = right; if (p.vx > 0) p.vx = 0; } }
// no squish traps: if the screen edge pushes the hero into a crate/step/cannon, pop the hero up onto it instead of hurting them
function unsquish(p, left){ for (let up = 1; up <= 96; up++){ const y = p.y - up; if (boxFree(left, y, p.w, p.h)){ p.x = left; p.y = y; p.vy = Math.min(p.vy, -60); G.unsquish = (G.unsquish || 0) + 1; puff(p.x + p.w, p.y + p.h, '#ffffff', 5, 40); return; } } p.x = left; }
const waterY = () => G.base.moat ? MOAT.water : SHIP.water;
function splash(x){ const wy = waterY(); puff(x, wy, '#ffffff', 8, 80); puff(x, wy, '#7cc0ff', 6, 60); sfx('splash'); }
function updateCannons(dt){ const p = G.p;
  for (const c of G.cannons){ const cx = c.tx*TS, cy = c.ty*TS + 6; c.cool -= dt; c.flash = Math.max(0, (c.flash || 0) - dt);
    if (c.warn > 0){ c.warn -= dt; if (Math.random() < .3) G.parts.push({ x:cx + 1, y:cy - 1, vx:-10 - Math.random()*20, vy:-20 - Math.random()*20, life:.5, color:'#d0d4e4', s:2 });
      if (c.warn <= 0){ G.eshots.push({ kind:'ball', x:cx - 4, y:cy, vx:-SHIP.ballSpeed, vy:0, t:0, r:5, hr:4, life:7, from:c }); sfx('cannon'); c.flash = .15; c.shots = (c.shots || 0) + 1;
        puff(cx - 4, cy, '#ffffff', 8, 60); puff(cx - 4, cy, '#9aa0b4', 6, 40); G.shake = Math.max(G.shake, .08); c.cool = SHIP.ballCool; }
      continue; }
    const sx = cx - G.cam, dx = cx - (p.x + p.w), dy = Math.abs(p.y + p.h/2 - cy);
    if (c.cool <= 0 && sx > 24 && sx < W - 8 && dx > 48 && dx < 210 && dy < 40 && !p.dead && !p.clear && !G.eshots.some(s => s.from === c)){ c.warn = SHIP.warn; sfx('windup'); } } }
function updateSpawners(dt){ const p = G.p;
  for (const sp of G.spawners){ sp.cool -= dt; const sx = sp.x - G.cam;
    if (sp.cool <= 0 && sx > 40 && sx < W + 4 && sp.x - (p.x + p.w) > 40 && !p.dead && !p.clear && G.eshots.filter(s => s.from === sp).length < 2){
      G.eshots.push({ kind:'barrel', x:sp.x, y:sp.y, vx:-SHIP.barrelSpeed, vy:-110, grav:900, t:0, r:6, hr:5, life:16, from:sp }); sp.cool = SHIP.barrelEvery; sp.n = (sp.n || 0) + 1; sfx('toss'); } } }
function shipShot(s, p){   /* cannonballs fly straight; barrels roll along decks and fall off edges; both splash into the sea */
  if (s.kind === 'barrel'){ const tx = Math.floor(s.x/TS), ty = Math.floor((s.y + s.r)/TS);
    if (s.vy >= 0 && (solid(tx, ty) || tileAt(tx, ty) === 5) && s.y + s.r - ty*TS < 10){ s.y = ty*TS - s.r; s.vy = 0; }
    if (solid(Math.floor((s.x - s.r)/TS), Math.floor(s.y/TS))){ s.dead = 1; puff(s.x, s.y, '#a8642a', 8, 70); sfx('crate'); } }
  else if (solid(Math.floor((s.x - s.r)/TS), Math.floor(s.y/TS))){ s.dead = 1; puff(s.x, s.y, '#9aa0b4', 6, 50); }
  if (!s.splash && s.y > SHIP.water){ s.splash = 1; splash(s.x); }
  if (s.x < G.cam - 40) s.dead = 1;
  for (const n of G.shots) if (!s.dead && !n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - s.r, y:s.y - s.r, w:s.r*2, h:s.r*2 })){ n.dead = 1; s.dead = 1; sfx('bump'); puff(s.x, s.y, '#ffffff', 6, 50); G.popped = (G.popped || 0) + 1; }
  if (!s.dead && !p.dead && p.vy > 30 && p.y + p.h - (s.y - s.r) < 12 && overlap(p, { x:s.x - s.r, y:s.y - s.r, w:s.r*2, h:s.r*2 })){   // stomp it: bounce like on an enemy
    s.dead = 1; p.vy = input.jump ? -380 : -260; sfx('stomp'); puff(s.x, s.y, s.kind === 'barrel' ? '#a8642a' : '#ffffff', 8, 70); G.stompedShots = (G.stompedShots || 0) + 1; } }
function updateParts(dt){ for (const q of G.parts){ q.life -= dt; q.vy += 300*dt; q.x += q.vx*dt; q.y += q.vy*dt; } G.parts = G.parts.filter(q => q.life > 0); }
function shoot(){ const p = G.p, color = G.opts.golden ? '#ffe14a' : (SP.NOTE_COLORS[G.opts.inst] || '#ffd23f'), ox = p.x + (p.face > 0 ? 12 : -6), oy = p.y + 8;
  const spreads = G.chord ? [-70, 0, 70] : [0]; for (const vy of spreads) G.shots.push({ x:ox, y:oy, vx:p.face*220, vy, t:0, color });
  p.cool = .22; sfx('shoot', G.opts.inst); }
function addCoin(){ G.coins++; sfx('coin'); const tot = (G.opts.coinBase || 0) + G.coins; if (tot % 100 === 0){ G.lives = Math.min(99, G.lives + 1); G.opts.onLifeLost && G.opts.onLifeLost(G.lives); G.msg = { text:'1-UP!', t:1.4 }; sfx('power'); } }
// ---------- World 5: The Moonlit Moat (Splashbones + raft raiders) and The Knight's Closet (Sir Clanks-a-Lot) ----------
const waterAt = x => { const tx = Math.floor(x/TS); return tx >= 0 && tx < G.L.w && G.L.gTop[tx] >= ROWS; };
const heroRaft = p => G.movers.find(r => r.drift && p.x + p.w > r.x && p.x < r.x + r.w && p.y + p.h <= r.y + 3) || null;
function updateSkeleton(e, dt, p){   /* under the water → ripples + bubbles for 1 s → leaps out and lands on the far end of the raft → rattles toward the hero → dives back */
  const S = SKEL; e.cool -= dt; e.stT = (e.stT || 0) - dt;
  if (e.st === 'idle' || e.st === 'under'){ e.st = 'under'; e.sub = true; e.x = e.home; e.y = MOAT.water + 24; e.vx = 0; e.vy = 0;
    const m = heroRaft(p), near = e.home > G.cam - 40 && e.home < G.cam + W + 40;
    if (e.cool <= 0 && near && m && m.boarded && !p.dead && !p.clear && (e.leaps || 0) < S.leaps && !G.enemies.some(o => o !== e && o.alive && o.type === 'skeleton' && o.st !== 'under' && o.st !== 'idle')){
      const hx = p.x + p.w/2, side = hx - m.x < m.w/2 ? -1 : 1, sx = side < 0 ? m.x + m.w + 6 : m.x - 24;   // come up at the end of the raft AWAY from the hero
      if (sx > G.cam + 6 && sx < G.cam + W - 18 && waterAt(sx) && waterAt(sx + e.w)){ e.side = side; e.raft = m; e.st = 'ripple'; e.stT = S.ripple; e.x = sx; e.y = MOAT.water + 6; G.ripples = (G.ripples || 0) + 1; sfx('bubble'); } }
    return; }
  const r = e.raft;
  if (e.st === 'ripple'){ e.x = e.side < 0 ? r.x + r.w + 6 : r.x - 24;   // the ripples ride along beside the raft
    if (Math.random() < .3) G.parts.push({ x:e.x + e.w/2 + (Math.random() - .5)*10, y:MOAT.water - 1, vx:(Math.random() - .5)*10, vy:-26 - Math.random()*20, life:.35, color:'#c8f0ff', s:2 });
    if (e.stT <= 0){ e.st = 'leap'; e.sub = false; e.y = MOAT.water - e.h + 4; e.vy = S.vy; e.vx = e.side*S.vx; e.face = e.side; e.leaps = (e.leaps || 0) + 1; G.leaps = (G.leaps || 0) + 1; splash(e.x + e.w/2); sfx('rattle'); }
    return; }
  if (e.st === 'leap' || e.st === 'dive'){ e.vy += S.grav*dt; e.x += (e.vx + (G.camV || 0)*(e.st === 'leap' ? 1 : 0))*dt; e.y += e.vy*dt;
    if (e.st === 'leap' && e.vy > 0 && e.x + e.w > r.x + 2 && e.x < r.x + r.w - 2 && e.y + e.h >= r.y && e.y + e.h <= r.y + 12){ e.y = r.y - e.h; e.st = 'board'; e.stT = S.board; e.vx = 0; e.vy = 0; sfx('clank'); }
    else if (e.y + e.h > MOAT.water + 8){ splash(e.x + e.w/2); e.st = 'under'; e.sub = true; e.cool = S.cool + Math.random()*.6; }
    return; }
  if (e.st === 'board'){ e.x += r.dx; e.y = r.y - e.h; const dir = Math.sign(p.x + p.w/2 - (e.x + e.w/2)) || -1; e.face = dir;
    if (Math.abs(p.x + p.w/2 - (e.x + e.w/2)) > 6) e.x += dir*S.walk*dt; e.x = clamp(e.x, r.x, r.x + r.w - e.w);
    if (G.t - (G.rattleT ?? -9) > .9){ G.rattleT = G.t; sfx('rattle'); }
    if (e.stT <= 0 || heroRaft(p) !== r){ e.st = 'dive'; e.vy = -170; e.vx = (e.x + e.w/2 < r.x + r.w/2 ? -1 : 1)*60; e.face = Math.sign(e.vx); } } }
function updateRider(e, dt, p){   /* a raider in a tub boat: faces the hero, winds up ("!" + a swelling bubble), then blows one slow bubble at the hero */
  const m = G.movers[e.ri], B = BUBBLE; if (!m){ e.alive = false; return; }
  e.x = m.x + (m.w - e.w)/2; e.y = m.y - e.h; e.vy = 0; e.onGround = true;
  const dx = (p.x + p.w/2) - (e.x + e.w/2), sx = e.x - G.cam; e.face = Math.sign(dx) || -1;
  if (e.type === 'meep' || e.type === 'dragon') e.y += Math.round(Math.sin(e.t*5)*1);
  if (e.st === 'idle'){ e.cool -= dt;
    if (e.cool <= 0 && !p.dead && !p.clear && sx > 10 && sx < W - e.w - 6 && Math.abs(dx) < B.range && Math.abs(dx) > B.min && !G.eshots.some(s => s.from === e)){ e.st = 'wind'; e.stT = B.wind; sfx('windup'); } }
  else if (e.st === 'wind'){ e.stT -= dt;
    if (e.stT <= 0){ const x0 = e.x + e.w/2 + e.face*(e.w/2 + 4), y0 = e.y + 5, ty = p.y + p.h/2, T = Math.max(.6, Math.abs(p.x + p.w/2 - x0)/B.speed);
      e.st = 'throw'; e.stT = .3; sfx('bubble'); G.bubbles = (G.bubbles || 0) + 1;
      G.eshots.push({ kind:'bubble', x:x0, y:y0, vx:(G.camV || 0) + e.face*B.speed, vy:clamp((ty - y0)/T, -20, 20), t:0, r:B.r, hr:5, life:B.life, from:e, ph:Math.random()*6 }); } }
  else if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'idle'; e.cool = B.cool + Math.random()*.6; } } }
function popBubble(s){ s.dead = 1; sfx('pop'); for (let i = 0; i < 8; i++){ const a = i/8*Math.PI*2; G.parts.push({ x:s.x + Math.cos(a)*s.r, y:s.y + Math.sin(a)*s.r, vx:Math.cos(a)*60, vy:Math.sin(a)*60, life:.3, color:'#c8f0ff', s:2 }); } }
function bubbleShot(s, p){   /* slow wobbly bubble: a note pops it, a stomp bounces off it, it pops by itself on the water or after 5 s; touching it costs a heart */
  s.y += Math.sin(s.t*6 + s.ph)*.25;
  if (s.y > MOAT.water - 4 || solid(Math.floor(s.x/TS), Math.floor(s.y/TS)) || s.t > s.life || s.dead){ if (!s.dead || s.t > s.life) popBubble(s); return; }
  const box = { x:s.x - 5, y:s.y - 5, w:10, h:10 };
  for (const n of G.shots) if (!n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - 7, y:s.y - 7, w:14, h:14 })){ n.dead = 1; G.bubblePops = (G.bubblePops || 0) + 1; popBubble(s); return; }
  if (p.dead) return;
  if (p.vy > 30 && p.y + p.h - box.y < 10 && overlap(p, box)){ p.vy = input.jump ? -380 : -260; G.stompedShots = (G.stompedShots || 0) + 1; popBubble(s); return; }   // stomp it = bounce
  if (overlap(p, box)){ popBubble(s); hurt('shot:bubble'); } }
function updateArmor(e, dt, p){   /* Sir Clanks-a-Lot: clank, clank (patrols) → raises his sword ("!") → lunges about two tiles → rests (stomp him!) */
  const A = ARMOR, dx = (p.x + p.w/2) - (e.x + e.w/2), dy = (e.y + e.h) - (p.y + p.h), sx = e.x - G.cam;
  e.vy = Math.min(400, e.vy + 1000*dt); moveY(e, e.vy*dt); if (e.y > H + 40){ e.alive = false; return; }
  const home = (e.homeX ??= e.x), edge = d => { const fx = Math.floor((d > 0 ? e.x + e.w + 2 : e.x - 2)/TS), fy = Math.floor((e.y + e.h + 2)/TS); return !solid(fx, fy) && tileAt(fx, fy) !== 5; };
  e.stT = (e.stT || 0) - dt;
  if (e.st === 'idle'){ e.cool -= dt; const d = Math.sign(e.vx) || -1; moveX(e, d*A.speed*dt); e.face = d;
    if (e.hitWall || (e.onGround && edge(d)) || Math.abs(e.x - home) > 40) e.vx = -Math.sign(e.x - home || d)*A.speed;
    e.stepT = (e.stepT || 0) - dt; if (e.stepT <= 0){ e.stepT = .45; e.clk = (e.clk || 0) + 1; if (sx > -8 && sx < W + 8 && Math.abs(dx) < 140 && G.t - (G.clankT ?? -9) > .4){ G.clankT = G.t; sfx('step'); } }
    if (e.cool <= 0 && e.onGround && !p.dead && !p.clear && sx > 8 && sx < W - 22 && Math.abs(dx) < A.range && Math.abs(dx) > A.min && dy > -6 && dy < A.rise){ e.st = 'wind'; e.stT = A.wind; e.face = Math.sign(dx) || -1; sfx('windup'); } }
  else if (e.st === 'wind'){ if (e.stT <= 0){ e.st = 'lunge'; e.stT = A.lunge; sfx('clank'); G.lunges = (G.lunges || 0) + 1; } }
  else if (e.st === 'lunge'){ if (!(e.onGround && edge(e.face))) moveX(e, e.face*A.dash*dt); if (e.hitWall || e.stT <= 0){ e.st = 'rest'; e.stT = A.rest; } }
  else if (e.st === 'rest'){ if (e.stT <= 0){ e.st = 'idle'; e.cool = A.cool + Math.random()*.8; e.vx = e.face*A.speed; } } }
// ---------- v29: the Tango Couple, Rattlebones, swinging chain balls (World 5-3) + Mega Hen (World 2-3) ----------
function updateTango(e, dt, p){   /* dances in place → wind-up ("!", rose raised, marker for an arcing rose) → one slow rose → long cooldown */
  const T = TANGO, dx = (p.x + p.w/2) - (e.x + e.w/2), sx = e.x - G.cam, home = (e.homeX ??= e.x);
  e.x = home + Math.sin(e.t*1.1)*T.sway*(e.st === 'wind' ? .3 : 1); e.y = e.baseY + Math.sin(e.t*2.2)*3; e.face = Math.sign(dx) || -1;
  if (e.st === 'idle'){ e.cool -= dt;
    if (e.cool <= 0 && !p.dead && !p.clear && sx > 8 && sx < W - e.w - 8 && Math.abs(dx) < T.range && Math.abs(dx) > T.min && !G.eshots.some(s => s.from === e)){
      e.n = (e.n || 0) + 1; e.arc = e.n % 2 === 1; e.st = 'wind'; e.stT = T.wind; e.mark = e.arc ? landSpot(p.x + p.w/2, p.y + p.h) : null; sfx('windup'); } }
  else if (e.st === 'wind'){ e.stT -= dt;
    if (e.stT <= 0){ const x0 = e.x + e.w/2 + e.face*8, y0 = e.y + 2; e.st = 'throw'; e.stT = .35; sfx('toss'); G.roses = (G.roses || 0) + 1;
      if (e.arc){ const m = e.mark, Tf = T.flight, ty = m.y ?? (H + 60); G.eshots.push({ kind:'rose', x:x0, y:y0, vx:(m.x - x0)/Tf, vy:(ty - 4 - y0 - .5*T.grav*Tf*Tf)/Tf, grav:T.grav, t:0, from:e, tx:m.x, ty:m.y, T:Tf, life:4 }); }
      else { const tx = p.x + p.w/2, ty = p.y + p.h/2, d = Math.hypot(tx - x0, ty - y0) || 1; G.eshots.push({ kind:'rose', flat:true, x:x0, y:y0, vx:(tx - x0)/d*T.flat, vy:(ty - y0)/d*T.flat, t:0, from:e, life:5 }); } } }
  else if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'idle'; e.cool = T.cool + Math.random()*.6; } } }
function updateBones(e, dt, p){   /* hidden (can't hurt, can't be hit) → rattles 1 s ("!") → pops out → walks at the hero, never off a ledge */
  const B = BONES, dx = (p.x + p.w/2) - (e.x + e.w/2), sx = e.x - G.cam, home = (e.homeX ??= e.x);
  if (e.st === 'idle' || e.st === 'hide'){ e.st = 'hide'; e.sub = true; e.x = home; e.y = e.baseY; e.vx = 0; e.vy = 0;
    if (!p.dead && !p.clear && sx > 6 && sx < W - 20 && Math.abs(dx) < B.wake && Math.abs(dx) > B.min && p.y + p.h > e.y - 40){ e.st = 'rattle'; e.stT = B.rattle; e.face = Math.sign(dx) || -1; sfx('rattle'); G.bonesWake = (G.bonesWake || 0) + 1; }
    return; }
  if (e.st === 'rattle'){ e.stT -= dt; if (Math.random() < .25) G.parts.push({ x:home + 6 + (Math.random() - .5)*14, y:e.baseY + e.h - 2, vx:(Math.random() - .5)*30, vy:-30 - Math.random()*30, life:.35, color:e.hide === 'chest' ? '#ffd23f' : '#9a94a8', s:2 });
    if (e.stT <= 0){ e.st = 'pop'; e.sub = false; e.vy = -230; e.vx = e.face*24; sfx('rattle'); G.bonesPop = (G.bonesPop || 0) + 1; puff(home + 6, e.baseY + e.h - 4, e.hide === 'chest' ? '#ffd23f' : '#c8c0a0', 6, 60); }
    return; }
  e.vy = Math.min(400, e.vy + 1000*dt); moveX(e, e.vx*dt); moveY(e, e.vy*dt); if (e.y > H + 40){ e.alive = false; return; }
  if (e.st === 'pop'){ if (e.onGround && e.vy >= 0){ e.st = 'walk'; } return; }
  const d = Math.abs(dx) > 4 ? Math.sign(dx) : e.face || -1, fx = Math.floor((d > 0 ? e.x + e.w + 2 : e.x - 2)/TS), fy = Math.floor((e.y + e.h + 2)/TS);
  e.face = d; e.vx = (!solid(fx, fy) && tileAt(fx, fy) !== 5) || Math.abs(e.x + d*4 - home) > B.roam ? 0 : d*B.walk;
  if (G.t - (G.rattleT ?? -9) > 1.1 && sx > -8 && sx < W + 8){ G.rattleT = G.t; sfx('rattle'); } }
function updateChains(p){   /* pendulums: angle = amp·sin(2πt/period + ph); the spiked ball (radius 7) costs 1 heart on touch */
  if (p.dead || p.clear) return;
  for (const c of G.chains){ const b = chainBall(c), nx = clamp(b.x, p.x, p.x + p.w), ny = clamp(b.y, p.y, p.y + p.h);
    if (Math.hypot(nx - b.x, ny - b.y) < CHAIN.r - 1){ if (p.inv <= 0) G.chainHits = (G.chainHits || 0) + 1; hurt('chain'); } } }
function chainBall(c){ const a = c.amp*Math.sin(G.t*Math.PI*2/c.period + c.ph); return { x:c.x + Math.sin(a)*c.len, y:c.y + Math.cos(a)*c.len, a }; }
function softShot(s, p){   /* a Tango rose or a Mega Hen egg: notes pop it, a stomp bounces off it, the tuba smashes it, a hit costs 1 heart */
  if (s.kind === 'rose') s.rot = s.t*8;
  const lands = s.vy > 0 && ((s.ty != null && s.y + 3 >= s.ty) || solid(Math.floor(s.x/TS), Math.floor((s.y + 4)/TS)));
  if (lands || (s.flat && solid(Math.floor(s.x/TS), Math.floor(s.y/TS))) || s.t > s.life){ if (s.ty != null && lands) s.y = Math.min(s.y, s.ty - 3); breakSoft(s); return; }
  const box = { x:s.x - 5, y:s.y - 5, w:10, h:10 };
  for (const n of G.shots) if (!n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, { x:s.x - 7, y:s.y - 7, w:14, h:14 })){ n.dead = 1; G.softPops = (G.softPops || 0) + 1; breakSoft(s); return; }
  if (p.dead) return;
  if (p.vy > 30 && p.y + p.h - box.y < 10 && overlap(p, box)){ p.vy = input.jump ? -380 : -260; G.stompedShots = (G.stompedShots || 0) + 1; breakSoft(s); return; }
  if (overlap(p, box)){ breakSoft(s); hurt('shot:' + s.kind); } }
function breakSoft(s){ s.dead = 1; sfx(s.kind === 'rose' ? 'pop' : 'crate');
  const cols = s.kind === 'rose' ? ['#e83a4a', '#9c1c30', '#ff8aa0', '#3a9a3a'] : ['#ffffff', '#fff6e8', '#ffd23f', '#e0d0b8'];
  for (let i = 0; i < 10; i++) G.parts.push({ x:s.x, y:s.y, vx:(Math.random() - .5)*110, vy:-50 - Math.random()*90, life:.55, color:cols[i % 4], s:2 }); }
// a coop hen + a tuba bomb = MEGA HEN (one at a time)
function megaHen(d, h){ G.megaFrom.add(d); G.megaMade = (G.megaMade || 0) + 1;
  const e = { type:'megahen', x:h.x - 22, y:12*TS - 40, w:44, h:40, vx:0, vy:0, baseY:12*TS - 40, t:0, alive:true, dead:0, face:h.face > 0 ? 1 : -1, hp:MEGA.hp, st:'grow', stT:MEGA.grow, cool:MEGA.cool, homeX:h.x - 22, inv:0 };   // drawn at 2× the sprite: twice the hero's height
  G.enemies.push(e); G.msg = { text:'MEGA HEN!', t:1.8 }; G.floats.push({ text:'BAWK!!', x:h.x, y:12*TS - 44, t:0 }); sfx('cluck'); sfx('power');
  for (let i = 0; i < 28; i++) G.parts.push({ x:h.x + (Math.random() - .5)*18, y:12*TS - 10 - Math.random()*14, vx:(Math.random() - .5)*170, vy:-40 - Math.random()*140, life:.8, color:i % 3 ? '#fff6e8' : '#ffffff', s:i % 4 ? 2 : 3 }); }
function megaHit(e, n, force){ if (!e.alive || ((e.inv || 0) > 0 && !force) || e.st === 'grow') return; e.hp -= n; e.inv = .6; e.flash = .45; sfx('bossHit'); puff(e.x + e.w/2, e.y + 6, '#fff6e8', 8, 70);
  if (e.hp <= 0) kill(e); }
function updateMega(e, dt, p){
  const M = MEGA, dx = (p.x + p.w/2) - (e.x + e.w/2), sx = e.x - G.cam, home = e.homeX, floor = 12*TS; e.inv = Math.max(0, (e.inv || 0) - dt);
  if (e.st === 'grow'){ e.stT -= dt; e.y = floor - e.h; if (e.stT <= 0){ e.st = 'walk'; e.cool = .8; } return; }
  if (e.st === 'leap'){ e.vy += M.eggGrav*2*dt; moveX(e, e.vx*dt); e.y += e.vy*dt; e.onGround = false;   // flies over the roosts (ignores one-way perches), lands on the floor
    if (e.vy > 0 && e.y + e.h >= floor && e.y + e.h < floor + 12 && (solid(Math.floor(e.x/TS), 12) || solid(Math.floor((e.x + e.w - 1)/TS), 12))){ e.y = floor - e.h; e.onGround = true; }
    if (e.onGround && e.vy >= 0){ e.st = 'dizzy'; e.stT = M.dizzy; e.vx = 0; G.shake = Math.max(G.shake, .25); sfx('bump'); puff(e.x + e.w/2, e.y + e.h, '#e8c050', 10, 80); G.megaLands = (G.megaLands || 0) + 1; }
    if (e.y > H + 40) e.alive = false; return; }
  e.vy = Math.min(400, e.vy + 1000*dt); moveY(e, e.vy*dt);
  if (e.st === 'dizzy'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'walk'; e.cool = M.cool; } return; }
  if (e.st === 'walk'){ e.face = Math.sign(dx) || -1; const d = e.face, fx = Math.floor((d > 0 ? e.x + e.w + 2 : e.x - 2)/TS), fy = Math.floor((e.y + e.h + 2)/TS);
    if (Math.abs(dx) > 26 && (solid(fx, fy) || tileAt(fx, fy) === 5) && Math.abs(e.x + d*4 - home) < M.roam) moveX(e, d*M.walk*dt);
    e.stepT = (e.stepT || 0) - dt; if (e.stepT <= 0){ e.stepT = .5; e.clk = (e.clk || 0) + 1; }
    e.cool -= dt; if (e.cool <= 0 && e.onGround && !p.dead && !p.clear && sx > -6 && sx < W - e.w + 6 && Math.abs(dx) < 200){
      e.n = (e.n || 0) + 1; e.next = e.n % 2 ? 'egg' : 'leap'; e.st = 'wind'; e.stT = e.next === 'egg' ? M.wind : M.jumpWind; sfx('windup');
      if (e.next === 'egg') e.mark = landSpot(p.x + p.w/2, p.y + p.h);
      else { let tx = clamp(p.x + p.w/2 - e.w/2, home - M.roam, home + M.roam); const ok = c => { for (const k of [Math.floor(c/TS), Math.floor((c + e.w - 1)/TS)]) if (!solid(k, 12)) return false; return true; };
        if (!ok(tx)) tx = e.x; e.tx = tx; e.mark = { x:tx + e.w/2, y:floor }; } }
    return; }
  if (e.st === 'wind'){ e.stT -= dt; e.face = Math.sign(dx) || -1;
    if (e.stT <= 0){ if (e.next === 'egg'){ const m = e.mark, x0 = e.x + e.w/2 + e.face*18, y0 = e.y + 10, Tf = M.eggT, ty = m.y ?? (H + 60); sfx('toss'); G.megaEggs = (G.megaEggs || 0) + 1;
        G.eshots.push({ kind:'megaegg', x:x0, y:y0, vx:(m.x - x0)/Tf, vy:(ty - 4 - y0 - .5*M.eggGrav*Tf*Tf)/Tf, grav:M.eggGrav, t:0, from:e, tx:m.x, ty:m.y, T:Tf, life:4 }); e.st = 'throw'; e.stT = .4; }
      else { const Tf = M.jumpT; e.st = 'leap'; e.vx = (e.tx - e.x)/Tf; e.vy = -M.eggGrav*Tf; e.onGround = false; sfx('jump'); G.megaJumps = (G.megaJumps || 0) + 1; } }
    return; }
  if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'walk'; e.cool = M.cool; } } }
function hitEnemy(e){ if (e.type === 'megahen'){ if (e.inv > 0 || e.st === 'grow') puff(e.x + e.w/2, e.y + 6, '#ffffff', 2, 30); else megaHit(e, 1); return; } if ((e.hp || 1) > 1){ e.hp--; e.flash = .3; sfx('bump'); puff(e.x + e.w/2, e.y + 4, '#ffffff', 4, 40); return; } kill(e); }
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
// Froppy: sits and bobs -> wind-up (lifts a piano, "!" bubble, a blinking shadow where it will land) -> lobs it in a slow arc -> long cooldown
function updateFrog(e, dt, p){
  const P = PIANO, dx = (p.x + p.w/2) - (e.x + e.w/2), dy = (e.y + e.h) - (p.y + p.h), sx = e.x - G.cam;
  e.vy = Math.min(400, e.vy + 1000*dt); moveY(e, e.vy*dt); if (e.y > H + 40){ e.alive = false; return; }
  if (e.st === 'idle'){ e.face = Math.sign(dx) || -1; e.cool -= dt;
    if (e.cool <= 0 && e.onGround && !p.dead && !p.clear && sx > 8 && sx < W - 22 && Math.abs(dx) < P.range && Math.abs(dx) > P.min && Math.abs(dy) < P.rise && !G.eshots.some(s => s.from === e)){
      e.st = 'wind'; e.stT = P.wind; e.face = Math.sign(dx) || -1; e.mark = landSpot(p.x + p.w/2, p.y + p.h); sfx('windup'); } }
  else if (e.st === 'wind'){ e.stT -= dt;
    if (e.stT <= 0){ const m = e.mark, x0 = e.x + e.w/2, y0 = e.y - 10, T = P.flight, ty = m.y ?? (H + 60);
      e.st = 'throw'; e.stT = .35; sfx('toss'); G.pianos = (G.pianos || 0) + 1;
      G.eshots.push({ kind:'piano', x:x0, y:y0, vx:(m.x - x0)/T, vy:(ty - 6 - y0 - .5*P.grav*T*T)/T, grav:P.grav, t:0, T, from:e, tx:m.x, ty:m.y, r:7, hr:6, life:5 }); } }
  else if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0){ e.st = 'idle'; e.cool = P.cool + Math.random()*.6; } } }
function updateReindeer(e, dt, p){
  const A = ANTLER, dx = (p.x + p.w/2) - (e.x + e.w/2), dy = (e.y + e.h) - (p.y + p.h), sx = e.x - G.cam;
  e.vy = Math.min(400, e.vy + 1000*dt); moveY(e, e.vy*dt); if (e.y > H + 40){ e.alive = false; return; }
  if (e.antlerOut && (!e.antler || e.antler.dead)){ e.antlerOut = false; e.antler = null; e.cool = A.cool; }   // antlers came back or broke → regrow, then wait
  if (e.st === 'idle'){ if (!e.antlerOut){ e.face = Math.sign(dx) || -1; e.cool -= dt; }
    if (!e.antlerOut && e.cool <= 0 && e.onGround && !p.dead && !p.clear && sx > 8 && sx < W - 22 && Math.abs(dx) < A.range && Math.abs(dx) > A.min && Math.abs(dy) < A.rise){
      e.st = 'wind'; e.stT = A.wind; e.face = Math.sign(dx) || -1; sfx('windup'); } }
  else if (e.st === 'wind'){ e.stT -= dt;
    if (e.stT <= 0){ const x0 = e.x + e.w/2 + e.face*6, y0 = e.y + 4; e.st = 'throw'; e.stT = .3; sfx('antler'); G.antlers = (G.antlers || 0) + 1;
      e.antler = { kind:'antler', x:x0, y:y0, x0, y0, dir:e.face, vx:0, vy:0, t:0, T:A.T, D:A.out, from:e, r:6, hr:5, life:A.T + 2 }; e.antlerOut = true; G.eshots.push(e.antler); } }
  else if (e.st === 'throw'){ e.stT -= dt; if (e.stT <= 0) e.st = 'idle'; } }
function antlerShot(s, p){ const u = Math.min(1, s.t/s.T), e = s.from;   // boomerang: out and back along the same flat line
  if (s.back == null && u < .5 && solid(Math.floor((s.x + s.dir*6)/TS), Math.floor(s.y/TS))){ s.back = 1; s.t = s.T - s.t; }   // bonks a wall → comes straight back
  const k = Math.sin(Math.PI*Math.min(1, s.t/s.T)); s.x = s.x0 + s.dir*s.D*k; s.y = s.y0 + Math.sin(s.t*9)*1.5;
  if (s.t >= s.T){ s.dead = 1; if (e && e.alive) puff(s.x, s.y, '#fff3a0', 3, 20); return; }   // caught!
  const box = { x:s.x - 6, y:s.y - 4, w:12, h:8 };
  for (const n of G.shots) if (!n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, box)){ n.dead = 1; G.antlerPops = (G.antlerPops || 0) + 1; breakAntler(s); return; }
  if (p.dead) return;
  if (p.vy > 30 && p.y + p.h - box.y < 10 && overlap(p, box)){ p.vy = input.jump ? -380 : -260; G.stompedShots = (G.stompedShots || 0) + 1; breakAntler(s); return; }   // stomp it = bounce
  if (overlap(p, box)){ breakAntler(s); hurt('shot:antler'); } }
function breakAntler(s){ s.dead = 1; sfx('bump'); for (let i = 0; i < 8; i++) G.parts.push({ x:s.x, y:s.y, vx:(Math.random() - .5)*120, vy:-60 - Math.random()*90, life:.5, color:i % 2 ? '#ecd6a4' : '#1a1030', s:2 }); }
function landSpot(x, footY){ const tx = Math.floor(x/TS); for (let ty = Math.max(0, Math.floor((footY - 4)/TS)); ty < ROWS; ty++) if (tileAt(tx, ty)) return { x, y:ty*TS }; return { x, y:null }; }   // y:null = over a pit
function pianoShot(s, p){ const box = { x:s.x - 7, y:s.y - 6, w:14, h:12 };
  if (s.vy > 0 && ((s.ty != null && s.y + 6 >= s.ty) || solid(Math.floor(s.x/TS), Math.floor((s.y + 6)/TS)))){ if (s.ty != null) s.y = Math.min(s.y, s.ty - 6); breakPiano(s, true); return; }
  for (const n of G.shots) if (!n.dead && overlap({ x:n.x, y:n.y, w:6, h:6 }, box)){ n.dead = 1; G.popped = (G.popped || 0) + 1; breakPiano(s, false); return; }
  if (p.dead) return;
  if (p.vy > 30 && p.y + p.h - box.y < 12 && overlap(p, box)){ p.vy = input.jump ? -380 : -260; G.stompedShots = (G.stompedShots || 0) + 1; breakPiano(s, false); return; }   // stomp it = bounce
  if (overlap(p, box)){ breakPiano(s, false); hurt('shot:piano'); } }
function breakPiano(s, landed){ s.dead = 1; sfx('plunk'); G.plunks = (G.plunks || 0) + 1; if (landed) G.shake = Math.max(G.shake, .12);
  const cols = ['#ffffff', '#1a1030', '#a8642a', '#5a3412']; for (let i = 0; i < 14; i++) G.parts.push({ x:s.x + (Math.random() - .5)*12, y:s.y, vx:(Math.random() - .5)*170, vy:-70 - Math.random()*150, life:.7, color:cols[i % 4], s:i % 3 ? 2 : 3 });
  G.floats.push({ text:'PLUNK!', x:s.x, y:s.y - 16, t:0 }); }
function henClucks(){ const p = G.p, pc = p.x + p.w/2; if (p.dead || G.t - (G.cluckT ?? -9) < 2.5) return;   // walk past a hen and she clucks (sound follows the SFX setting)
  for (const d of G.base.deco) if (d.k === 'hen' && !G.megaFrom?.has(d) && Math.abs(henAt(d, G.t).x - pc) < 26 && p.y + p.h > 12*TS - 30){ G.cluckT = G.t; d.cl = G.t; G.clucks = (G.clucks || 0) + 1; sfx('cluck'); return; } }
function updateVanish(dt){ const p = G.p, L = G.L;
  for (const v of G.vanish){ const x0 = v.x0*TS, x1 = (v.x1 + 1)*TS, on = !p.dead && p.onGround && Math.abs(p.y + p.h - v.y*TS) < 1.5 && p.x + p.w > x0 && p.x < x1;
    if (v.st === 'idle'){ if (on){ v.st = 'shake'; v.t = VANISH.shake; v.n = (v.n || 0) + 1; } }
    else if (v.st === 'shake'){ v.t -= dt; if (v.t <= 0){ v.st = 'gone'; v.t = VANISH.gone; for (let x = v.x0; x <= v.x1; x++){ L.map[v.y*L.w + x] = 0; puff(x*TS + 8, v.y*TS + 4, '#ffe0f0', 3, 50); } sfx('poof'); } }
    else if (v.t > 0){ v.t -= dt; }
    else if (!overlap(p, { x:x0, y:v.y*TS - 4, w:x1 - x0, h:TS })){ v.st = 'idle'; for (let x = v.x0; x <= v.x1; x++) L.map[v.y*L.w + x] = 5; puff((x0 + x1)/2, v.y*TS + 4, '#ffffff', 6, 40); } } }
function kill(e, stomp){ e.alive = false; e.dead = 1; e.vy = -200; sfx('stomp'); puff(e.x + 7, e.y + 7, '#ffffff', 6); G.coins += 0;
  if (e.type === 'meep'){ if (G.t - (G.meepT ?? -1) > .12){ G.meepT = G.t; sfx('meep'); G.meeps = (G.meeps || 0) + 1; }   // one squeak at a time even if a tuba blast pops several
    G.floats.push({ text:'MEEP!', x:e.x + e.w/2, y:e.y - 6, t:0 }); }
  if (e.type === 'frog') G.floats.push({ text:'RIBBIT!', x:e.x + e.w/2, y:e.y - 8, t:0 });
  if (e.type === 'reindeer') G.floats.push({ text:'JINGLE!', x:e.x + e.w/2, y:e.y - 8, t:0 });
  if (e.type === 'skeleton'){ G.floats.push({ text:'CLATTER!', x:e.x + e.w/2, y:e.y - 8, t:0 }); sfx('rattle'); G.bones = (G.bones || 0) + 1;
    for (let i = 0; i < 8; i++) G.parts.push({ x:e.x + e.w/2, y:e.y + 6, vx:(Math.random() - .5)*140, vy:-80 - Math.random()*120, life:.7, color:i % 2 ? '#f4f0e0' : '#c8c0a0', s:2 }); }
  if (e.type === 'tango'){ G.floats.push({ text:'OLE!', x:e.x + e.w/2, y:e.y - 8, t:0 }); G.tangoKO = (G.tangoKO || 0) + 1; for (let i = 0; i < 10; i++) G.parts.push({ x:e.x + e.w/2, y:e.y + 6, vx:(Math.random() - .5)*120, vy:-60 - Math.random()*100, life:.7, color:i % 2 ? '#e83a4a' : '#ffffff', s:2 }); }
  if (e.type === 'bones'){ G.floats.push({ text:'CLATTER!', x:e.x + e.w/2, y:e.y - 8, t:0 }); sfx('rattle'); G.bonesKO = (G.bonesKO || 0) + 1;
    for (let i = 0; i < 8; i++) G.parts.push({ x:e.x + e.w/2, y:e.y + 6, vx:(Math.random() - .5)*140, vy:-80 - Math.random()*120, life:.7, color:i % 2 ? '#f4f0e0' : '#c8c0a0', s:2 }); }
  if (e.type === 'megahen'){ G.megaBeaten = (G.megaBeaten || 0) + 1; G.msg = { text:'MEGA HEN BEATEN!', t:1.8 }; G.floats.push({ text:'BAWK...', x:e.x + e.w/2, y:e.y - 10, t:0 }); sfx('fanfare');   // she shrinks back to a hen; reward: a heart + 5 notes
    G.pickups.push({ kind:'heart', x:e.x + e.w/2, y:e.y - 6, vy:-140 }); for (let i = 0; i < 5; i++){ addCoin(); G.pops.push({ x:e.x + 4 + i*5, y:e.y - 4, vy:-200 - i*20, t:0 }); }
    for (let i = 0; i < 24; i++) G.parts.push({ x:e.x + e.w/2, y:e.y + 10, vx:(Math.random() - .5)*180, vy:-60 - Math.random()*140, life:.8, color:i % 3 ? '#fff6e8' : '#ffd23f', s:i % 4 ? 2 : 3 }); }
  if (e.type === 'armor'){ G.floats.push({ text:'CLANK!', x:e.x + e.w/2, y:e.y - 8, t:0 }); sfx('clank'); G.clanked = (G.clanked || 0) + 1;
    for (let i = 0; i < 8; i++) G.parts.push({ x:e.x + e.w/2, y:e.y + 8, vx:(Math.random() - .5)*150, vy:-90 - Math.random()*120, life:.7, color:i % 2 ? '#9aa0b4' : '#d0d4e4', s:3 }); } }
// a hidden block appears the moment the hero's head comes up into it from below (it becomes a solid "used" block, pops out a note)
function revealHidden(p, dy){ const ny = p.y + dy;
  for (const h of G.hidden){ if (h.shown) continue; const bot = (h.y + 1)*TS;
    if (p.x < (h.x + 1)*TS && p.x + p.w > h.x*TS && p.y >= bot - .5 && ny < bot && !G.L.map[h.y*G.L.w + h.x]){
      h.shown = true; G.L.map[h.y*G.L.w + h.x] = 4; addCoin(); G.pops.push({ x:h.x*TS + 3, y:(h.y - 1)*TS, vy:-220, t:0 }); sfx('power'); puff(h.x*TS + 8, h.y*TS + 8, '#fff3a0', 10, 70);
      G.floats.push({ text:'SECRET!', x:h.x*TS + 8, y:h.y*TS - 6, t:0 }); G.secretsFound = (G.secretsFound || 0) + 1; } } }
function bonk(tx, ty){ const v = tileAt(tx, ty); G.bumps.push({ tx, ty, t:0 });
  if (v === 3){ G.L.map[ty*G.L.w + tx] = 4; const lucky = (hash(tx + ':' + ty) % 7 === 0) && G.p.hearts < G.maxHearts;
    const chordBlock = !G.chord && hash('c' + tx + ':' + ty) % 9 === 0;
    if (lucky || chordBlock){ G.pickups.push({ x:tx*TS + 8, y:(ty - 1)*TS, vy:-120, kind:lucky ? 'heart' : 'chord' }); sfx('power'); } else { addCoin(); G.pops.push({ x:tx*TS + 3, y:(ty - 1)*TS, vy:-220, t:0 }); } }
  else if (v === 8){ G.L.map[ty*G.L.w + tx] = 4; const dir = tileAt(tx + 1, ty - 1) || tileAt(tx + 1, ty) === 6 ? -1 : 1;
    G.pickups.push({ kind:'tuba', x:tx*TS + 8, y:(ty - 1)*TS + 4, vx:dir*36, vy:0, t:0, home:{ x:tx*TS + 8, y:(ty - 1)*TS + 4 } }); sfx('power'); puff(tx*TS + 8, ty*TS, '#fff3a0', 10, 80); }
  else sfx('bump');
  for (const e of G.enemies) if (e.alive && !e.sub && Math.abs(e.x + e.w/2 - (tx*TS + 8)) < 7 + e.w/2 && Math.abs(e.y + e.h - ty*TS) < 4) kill(e); }
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
    const hit = solid(tx, ty) || (tileAt(tx, ty) === 5 && b.vy > 0 && b.y + 4 - ty*TS < 8) || G.enemies.some(e => e.alive && !e.sub && overlap(box, e)) || (bhb && overlap(box, bhb)) || b.t > 2.5;
    if (b.y > H + 16) b.dead = 1; else if (hit){ b.dead = 1; blast(b.x, b.y); } }
  G.bombs = G.bombs.filter(b => !b.dead);
  for (const q of G.blasts) q.t += dt; G.blasts = G.blasts.filter(q => q.t < .9); }
function blast(cx, cy){ const R = TUBA.radius; let ko = 0; sfx('bwaamp'); G.shake = .4; G.bigShake = .3; G.blasts.push({ x:cx, y:cy, t:0 });
  for (let i = 0; i < 26; i++) puff(cx, cy, ['#fff3a0','#ffd23f','#ff8c42','#ffffff','#1a1030'][i%5], 1, 170);
  for (const e of G.enemies) if (e.alive && !e.sub && Math.hypot(e.x + e.w/2 - cx, e.y + e.h/2 - cy) < R + 8){ if (e.type === 'megahen') megaHit(e, TUBA.bossDmg, true); else kill(e); ko++; }
  if (G.base.indoor === 'coop') for (const d of G.base.deco){ if (d.k !== 'hen' || G.megaFrom.has(d) || G.enemies.some(e => e.alive && e.type === 'megahen')) continue; const h = henAt(d, G.t); if (Math.hypot(h.x - cx, 12*TS - 6 - cy) < R + 10) megaHen(d, h); }
  for (const s of G.eshots) if (!s.dead && (s.kind === 'rose' || s.kind === 'megaegg') && Math.hypot(s.x - cx, s.y - cy) < R + 8) breakSoft(s);
  for (const s of G.eshots) if (!s.dead && (s.kind === 'arrow' || s.kind === 'ball' || s.kind === 'barrel' || s.kind === 'note' || s.kind === 'whole' || s.kind === 'piano' || s.kind === 'antler' || s.kind === 'bubble') && Math.hypot(s.x - cx, s.y - cy) < R + 8){ if (s.kind === 'piano') breakPiano(s, false); else if (s.kind === 'antler') breakAntler(s); else if (s.kind === 'bubble') popBubble(s); else s.dead = 1; }
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
  const left = 1.2*TS, right = 14.8*TS - B.w, floor = 12*TS - B.h, toward = Math.sign(p.x - B.x) || 1, hpF = B.hp/B.maxHp, fast = hpF < .5 ? (B.cfg.rage || 1.35) : 1;
  const throwShot = () => { const k = B.cfg.shot, cx = B.x + B.w/2, cy = B.y + B.h/2, dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
    if (k === 'spear'){ const v = B.cfg.spear || 150; G.eshots.push({ kind:k, x:cx, y:cy, vx:dx/d*v, vy:dy/d*v, t:0 }); }
    if (k === 'egg') for (const s of [-1, 1]) G.eshots.push({ kind:k, x:cx, y:B.y + B.h - 6, vx:s*(70 + Math.random()*60), vy:-260, grav:700, t:0 });
    if (k === 'axe') G.eshots.push({ kind:k, x:cx, y:cy - 8, vx:toward*(110 + Math.abs(dx)*.25), vy:-300, grav:700, t:0 });
    if (k === 'fire'){ const v = B.cfg.fireSpeed || 140; for (const a of (hpF < .5 ? (B.cfg.spread || [-.25, 0, .25]) : [0])) G.eshots.push({ kind:k, x:cx, y:cy, vx:Math.cos(Math.atan2(dy, dx) + a)*v, vy:Math.sin(Math.atan2(dy, dx) + a)*v, t:0 }); }
    if (k === 'orb'){ const C = B.cfg, n = hpF < .5 ? (C.orbNAngry || 8) : (C.orbN || 5), v = C.orbSpeed || 90;
      const a0 = C.orbN ? Math.atan2(dy, dx) + Math.PI/n : B.t;   /* v28: the hero always sits in the middle of a gap between two orbs */
      for (let i = 0; i < n; i++){ const a = i/n*Math.PI*2 + a0; G.eshots.push({ kind:k, x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, t:0, life:C.orbLife }); } }
    if (k === 'rock') for (let i = 0; i < 3; i++) G.eshots.push({ kind:k, x:left + Math.random()*(right - left + B.w), y:-10 - i*30, vx:0, vy:40, grav:420, t:0 });
  };
  if (B.state === 'intro'){ if (B.timer <= 0){ B.state = 'fight'; B.timer = 1.2; } }
  else switch (B.cfg.move){
    case 'fly': { const C = B.cfg, aim = () => { const ty = B.ty ?? floor, tx = B.tx ?? p.x, d = Math.hypot(tx - B.x, ty - B.y) || 1, v = (C.dive || 170)*fast;
        B.mode = 'swoop'; B.swoopT = 0; B.svx = (tx - B.x)/d*v; B.svy = Math.max((C.minDown || 60)*fast, (ty - B.y)/d*v); };   // dives ALWAYS go down
      if (B.mode === 'warn'){ B.warnT -= dt; B.y += (30 - B.y)*Math.min(1, dt*4); if (B.warnT <= 0){ aim(); sfx('bump'); } }          // wind-up: rises a little, flashes, "!"
      else if (B.mode === 'swoop'){ B.swoopT = (B.swoopT || 0) + dt; B.x = clamp(B.x + B.svx*dt, left, right); B.y += Math.max(40, B.svy || 0)*dt;
        if (B.y >= floor || B.swoopT > 3.5){ const landed = B.y >= floor; if (landed){ B.y = floor; G.shake = .15; } B.tx = B.ty = undefined;
          if (landed && C.rest){ B.mode = 'rest'; B.restT = C.rest; } else B.mode = ''; } }
      else if (B.mode === 'rest'){ B.restT -= dt; B.y = floor; if (B.restT <= 0){ B.mode = ''; B.timer = Math.max(B.timer, .7); } }      // dizzy on the floor = free hits
      else { B.y += ((36 + Math.sin(B.t*2)*10) - B.y)*Math.min(1, dt*3); B.x += (B.vx ||= (C.patrol || 50))*fast*dt; if (B.x < left || B.x > right) B.vx = -B.vx; B.x = clamp(B.x, left, right);
        if (B.timer <= 0){ if (Math.random() < (C.swoopP || .45)){ B.ty = p.y > B.y + 24 ? Math.min(p.y, floor) : floor; B.tx = clamp(p.x, left, right);
            if (C.windup){ B.mode = 'warn'; B.warnT = C.windup; sfx('windup'); } else aim(); }
          else throwShot(); B.timer = (C.gap || 1.6)/fast; } }
      break; }
    case 'hover': { const C = B.cfg;
      if (B.mode === 'warn'){ B.warnT -= dt; if (B.warnT <= 0){ if (B.next === 'slam'){ B.mode = 'slam'; sfx('bump'); } else { throwShot(); B.mode = ''; } } }   // telegraph: hovers in place, flashes, "!"
      else if (B.mode === 'slam'){ B.y += (C.slam || 110)*fast*dt; if (B.y >= floor){ B.y = floor; G.shake = .2; sfx('bump'); puff(B.x + B.w/2, floor + B.h, '#ffd23f', 8, 70); B.mode = 'rest'; B.restT = C.rest || 1; B.tx = undefined; } }
      else if (B.mode === 'rest'){ B.restT -= dt; B.y = floor; if (B.restT <= 0){ B.mode = ''; B.timer = Math.max(B.timer, .8); } }   // dizzy on the floor = free hits
      else { B.y += ((96 + Math.sin(B.t*1.6)*22) - B.y)*Math.min(1, dt*2); B.x += (B.vx ||= (C.patrol || 40))*fast*dt; if (B.x < left || B.x > right) B.vx = -B.vx; B.x = clamp(B.x, left, right);
        if (B.timer <= 0){ if (C.windup){ B.n = (B.n || 0) + 1; B.next = C.slamEvery && B.n % C.slamEvery === 0 ? 'slam' : 'fire'; B.mode = 'warn'; B.warnT = C.windup; if (B.next === 'slam') B.tx = B.x; sfx('windup'); }
          else throwShot(); B.timer = (C.gap || 1.3)/fast; } }
      break; }
    case 'dance': updateDance(B, dt, p, left, right, floor, fast, throwShot); break;
    case 'wizard': updateWizard(B, dt, p, left, right, floor, hpF); break;
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
  keepBossInArena(B, dt, left, right, floor);
  B.face = toward;
  const hb = { x:B.x + 2, y:B.y + 2, w:B.w - 4, h:B.h - 2 };
  if (B.state !== 'intro' && !B.ghost) for (const s of G.shots) if (!s.dead && overlap({ x:s.x, y:s.y, w:6, h:6 }, hb)){ s.dead = 1; damageBoss(1); }
  const harmless = (B.cfg.move === 'wizard' && (B.ghost || B.mode === 'rest' || B.mode === 'drop')) || (B.mode === 'rest' && !!B.cfg.rest) || (B.cfg.move === 'dance' && !!B.cfg.windup && (B.ghost || B.mode === 'rise'));   /* a fading or dizzy wizard never hurts on touch */
  if (!p.dead && B.state !== 'intro' && overlap(p, hb)){
    if (p.vy > 30 && p.y + p.h - hb.y < 16 && !B.ghost){ p.vy = -330; damageBoss(3); if (B.cfg.move === 'walk'){ B.inv = 1; B.charge = .9; } if (B.cfg.move === 'wizard' && B.hp > 0){ B.mode = 'out'; B.timer = .5; } } else if (!harmless) hurt('boss'); }
}
// Señor Spectro (World 5). Modes: '' = dancing, 'warn' = "!" pose (nothing moves), 'dip' = tango dip down to the marked spot,
// 'rest' = dizzy on the floor (harmless), 'rise' = floats back up (harmless). Fading only happens while dancing.
function updateDance(B, dt, p, left, right, floor, fast, throwShot){ const C = B.cfg, cx = 7.5*TS - B.w/2;
  if (!C.windup){ B.x = cx + Math.sin(B.t*.9*fast)*80; B.y = 98 + Math.sin(B.t*1.8*fast)*24; B.ghost = (B.t % 4) > 3.2; if (B.timer <= 0){ throwShot(); B.timer = 1.8/fast; } return; }   // (old tuning)
  B.ghost = false; B.preFade = false;
  if (B.mode === 'warn'){ B.warnT -= dt; if (B.warnT <= 0){ if (B.next === 'dip'){ B.mode = 'dip'; sfx('bump'); } else { throwShot(); B.mode = ''; B.timer = C.gap/fast; } } return; }
  if (B.mode === 'dip'){ B.y += (C.dip || 100)*dt; if (B.y >= floor){ B.y = floor; G.shake = .15; sfx('bump'); puff(B.x + B.w/2, floor + B.h, '#9b5de5', 8, 70); B.mode = 'rest'; B.restT = C.rest; B.tx = undefined; } return; }
  if (B.mode === 'rest'){ B.y = floor; B.restT -= dt; if (B.restT <= 0) B.mode = 'rise'; return; }
  const ph = B.ph = (B.ph || 0) + (B.mode === 'rise' ? 0 : dt*(C.sway || 1)*fast), tx = cx + Math.sin(ph*.9)*80, ty = 98 + Math.sin(ph*1.8)*24;
  if (B.mode === 'rise'){ B.y = Math.max(ty, B.y - (C.rise || 45)*dt); B.x += clamp(tx - B.x, -30*dt, 30*dt); if (B.y <= ty + .5 && Math.abs(tx - B.x) < 2){ B.mode = ''; B.timer = Math.max(B.timer, C.gap*.6/fast); } return; }
  B.x += (tx - B.x)*Math.min(1, dt*4); B.y += (ty - B.y)*Math.min(1, dt*4);
  B.fadeT = (B.fadeT || 0) + dt; const fe = C.fadeEvery || 8, f0 = fe - (C.fade || .8);
  if (B.fadeT >= fe) B.fadeT = 0; else if (B.fadeT >= f0) B.ghost = true; else if (B.fadeT >= f0 - (C.fadeWarn || .6)) B.preFade = true;
  // attack only when visible, not about to fade, and the last ring of orbs is gone
  if (B.timer <= 0 && !B.ghost && !B.preFade && B.fadeT < f0 - (C.fadeWarn || .6) - C.windup && !G.eshots.some(s => s.kind === 'orb')){
    B.n = (B.n || 0) + 1; B.next = C.dipEvery && B.n % C.dipEvery === 0 ? 'dip' : 'orb'; B.mode = 'warn'; B.warnT = C.windup;
    if (B.next === 'dip'){ B.x = clamp(B.x, left, right); B.tx = B.x; } else B.tx = undefined; sfx('windup'); } }
// boss safety net (all bosses): never NaN, never above the top of the screen or under the floor, never outside the arena walls,
// and if it is somehow out of the camera view for more than 2 s it is put back in the middle of the arena.
const BOSS_HOME_Y = { fly:36, hover:96, dance:98, wizard:44 };
function bossHome(B, floor){ B.x = 7.5*TS - B.w/2; B.y = BOSS_HOME_Y[B.cfg.move] ?? floor; B.vx = B.vy = 0; B.svx = B.svy = 0; B.mode = ''; B.tx = B.ty = undefined; B.charge = 0; B.timer = Math.max(B.timer, 1); B.offT = 0; }
function keepBossInArena(B, dt, left, right, floor){ const top = 6;
  if (!Number.isFinite(B.x) || !Number.isFinite(B.y) || !Number.isFinite(B.vx || 0) || !Number.isFinite(B.vy || 0)){ bossHome(B, floor); return; }
  B.x = clamp(B.x, left, right);
  if (B.y < top){ B.y = top; if (B.vy < 0) B.vy = 0; if ((B.mode === 'swoop' && B.svy < 0) || B.mode === 'rest') B.mode = ''; }
  if (B.y > floor){ B.y = floor; if (B.vy > 0) B.vy = 0; B.onGround = true; if (B.mode === 'swoop'){ B.mode = ''; B.tx = B.ty = undefined; } }
  const seen = B.x + B.w > G.cam && B.x < G.cam + W && B.y + B.h > 0 && B.y < H;
  B.offT = seen ? 0 : (B.offT || 0) + dt;
  if (B.offT > 2){ bossHome(B, floor); puff(B.x + B.w/2, B.y + B.h/2, '#ffffff', 6); } }
function damageBoss(n, force){ const B = G.B; if ((B.inv > 0 && !force) || B.gone) return; const before = B.hp; B.hp = Math.max(0, B.hp - n); B.inv = n > 1 ? .5 : .08; sfx('bossHit'); puff(B.x + 14, B.y + 14, '#ffffff', 4);
  for (const f of (B.cfg.hearts || [.5])) if (before > B.maxHp*f && B.hp <= B.maxHp*f) G.pickups.push({ x:7.5*TS, y:20, vy:0 });   // mid-fight heart drop(s)
  if (B.hp <= 0){ B.gone = 2; G.eshots = []; Music.stop(); sfx('boom'); G.shake = .6; G.enemies.forEach(e => e.alive && kill(e)); } }
function finish(kind){ if (G.done) return; G.done = true; Music.stop(); releaseInput(); const o = G.opts, r = { coins:G.coins, lives:G.lives, bossHp:G.B ? G.B.hp : 0, tuba:G.p.dead ? 0 : G.tuba, tubaKO:G.tubaKO };
  const run = G; setTimeout(() => { if (G === run) stop(); if (kind === 'clear') o.onClear && o.onClear(r); else if (kind === 'gameover') o.onGameOver && o.onGameOver(r); else o.onQuit && o.onQuit(r); }, kind === 'clear' ? 200 : 600); }

// ---------- render ----------
let ctx = null;
function draw(){
  const x = ctx, cam = Math.round(G.cam + (G.shake ? (Math.random() - .5)*(G.bigShake ? 10 : 6) : 0)), th = G.th;
  x.drawImage(G.bg.sky, 0, 0); x.save(); if (G.bigShake) x.translate(0, Math.round((Math.random() - .5)*8));
  const par = (img, f) => { const o = -Math.round(cam*f) % 512; x.drawImage(img, o, 0); x.drawImage(img, o + 512, 0); if (o + 1024 < W + 512) x.drawImage(img, o + 1024, 0); };
  par(G.bg.far, .25); par(G.bg.near, .5);
  if (G.base.deco) (G.base.pirate ? drawShipDeco : G.base.moat ? drawMoatDeco : drawSpecialDeco)(x, cam);
  // tiles
  const t0 = Math.floor(cam/TS), t1 = Math.min(G.L.w - 1, t0 + 17);
  for (let tx = t0; tx <= t1; tx++) for (let ty = 0; ty < ROWS; ty++){ const v = G.L.map[ty*G.L.w + tx]; if (!v) continue;
    const bump = G.bumps.find(b => b.tx === tx && b.ty === ty), by = bump ? -Math.sin(bump.t/.2*Math.PI)*5 : 0;
    const skv = G.L.skin ? G.L.skin[ty*G.L.w + tx] : 0, sk = v === 5 ? skv : 0, vg = sk === 2 ? G.vanish.find(g => ty === g.y && tx >= g.x0 && tx <= g.x1) : null, jig = vg && vg.st === 'shake' ? (Math.floor(G.t*30) % 2 ? 1 : -1) : 0;
    const img = v === 1 && skv === 4 && G.tl.hull ? (tileAt(tx, ty - 1) === 1 || tileAt(tx, ty - 1) === 9 ? G.tl.hull : G.tl.deck) : v === 1 ? (tileAt(tx, ty - 1) === 1 || tileAt(tx, ty - 1) === 9 ? G.tl.fill : G.tl.top) : v === 2 ? G.tl.brick : v === 3 ? G.tl.note : v === 4 ? G.tl.used : v === 5 ? (sk === 1 ? G.tl.rainbow : sk === 2 ? G.tl.vanish : sk === 3 ? G.tl.rung : G.tl.semi) : v === 7 ? G.tl.crate : v === 8 ? G.tl.tuba : v === 9 ? G.tl.port : v === 10 ? G.tl.cannon : v === 11 ? G.tl.barrel : (tileAt(tx, ty - 1) === 6 ? G.tl.pillar : G.tl.cap);
    if (v === 8) glow(x, tx*TS - cam + 8, ty*TS + 8, 13);
    x.drawImage(img, tx*TS - cam + jig, ty*TS + by); if (v === 8) twinkle(x, tx*TS - cam + 8, ty*TS + 8, 12);
    if (v === 1 && G.base.sky && ty + 1 < ROWS && !tileAt(tx, ty + 1)) islandUnder(x, tx, ty, cam); }
  if (G.movers.length) drawMovers(x, cam); if (G.cannons.length) drawCannonFx(x, cam);
  for (const h of G.hidden){ if (h.shown) continue; const sx = h.x*TS - cam; if (sx < -16 || sx > W) continue;   // hidden block hint: a faint sparkle now and then
    const ph = (G.t + ((h.x*7 + h.y*3) % 10)*.23) % HIDDEN.sparkle; if (ph < .6){ const k = Math.sin(ph/.6*Math.PI), cx = sx + 8 + ((h.x*5) % 7) - 3, cy = h.y*TS + 8 + ((h.x*3) % 5) - 2;
      x.globalAlpha = .6*k; x.fillStyle = '#fff3a0'; x.fillRect(cx - 1, cy - 3, 2, 6); x.fillRect(cx - 3, cy - 1, 6, 2); x.fillStyle = '#ffffff'; x.fillRect(cx, cy, 1, 1); x.globalAlpha = 1; } }
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
  if (G.chains.length) drawChains(x, cam);
  for (const e of G.enemies) if (e.type === 'bones' && (e.homeX ??= e.x) - cam > -24 && e.homeX - cam < W + 24) drawBonesProp(x, e, cam);
  // enemies
  for (const e of G.enemies){ if (e.x - cam < -32 || e.x - cam > W + 32) continue;
    let fi = Math.floor(e.t*6) % 2;
    if (e.type === 'megahen' && e.alive){ drawMegaHen(x, e, cam); continue; }
    if (e.type === 'hedgehog') fi = e.st === 'wind' ? 2 : e.st === 'throw' ? 3 : Math.floor(e.t*4) % 2;
    else if (e.type === 'meep') fi = e.onGround || !e.alive ? 0 : 1; else if (e.type === 'dragon') fi = Math.floor(e.t*5) % 2;
    else if (e.type === 'frog') fi = e.st === 'wind' ? 2 : e.st === 'throw' ? 3 : Math.floor(e.t*1.6) % 2;
    else if (e.type === 'reindeer') fi = e.antlerOut ? 3 : e.st === 'wind' ? 2 : Math.floor(e.t*2) % 2;
    else if (e.type === 'armor') fi = e.st === 'wind' ? 2 : e.st === 'lunge' ? 3 : e.st === 'rest' ? 0 : (e.clk || 0) % 2;
    else if (e.type === 'tango') fi = e.st === 'wind' ? 2 : e.st === 'throw' ? 3 : Math.floor(e.t*2.2) % 2;
    else if (e.type === 'bones'){ if (e.sub && e.alive) continue; fi = e.st === 'pop' || !e.alive ? 2 : Math.floor(e.t*5) % 2; }
    else if (e.type === 'skeleton'){ if (e.sub && e.alive) continue; fi = e.st === 'leap' || e.st === 'dive' || !e.alive ? 2 : Math.floor(e.t*5) % 2; }
    const fr = SP.enemyFrames(e.type)[fi], img = e.face > 0 ? fr.l : fr.r;
    if (!e.alive){ x.save(); x.translate(Math.round(e.x - cam + e.w/2), Math.round(e.y + e.h/2)); x.scale(1, -1); x.drawImage(img, -Math.round(img.width/2), -Math.round(img.height/2)); x.restore(); continue; }
    if (e.flash > 0 && Math.floor(G.t*30) % 2) continue;
    const shake = e.st === 'wind' ? (Math.floor(G.t*30) % 2 ? 1 : -1) : 0, ex = Math.round(e.x - cam - (img.width - e.w)/2) + shake;
    if (e.type === 'tango') x.globalAlpha = .82 + Math.sin(G.t*9)*.08;
    x.drawImage(img, ex, Math.round(e.y + e.h - img.height)); x.globalAlpha = 1; if (G.base.pirate) pirateHat(x, e, ex, Math.round(e.y + e.h - img.height), img);
    if (e.type === 'frog' && e.st === 'wind'){ const py = Math.round(e.y + e.h - img.height) - 12 - Math.round(Math.sin(G.t*20)); x.drawImage(SP.item('piano'), Math.round(e.x - cam + e.w/2 - 8), py);   // piano held overhead
      if (e.mark) landMarker(x, e.mark, cam, 1 - e.stT/PIANO.wind); alertBubble(x, Math.round(e.x - cam + e.w/2), py - 1, e.stT); }
    else if (e.type === 'tango' && e.st === 'wind'){ if (e.mark && e.mark.y != null) landMarker(x, e.mark, cam, 1 - e.stT/TANGO.wind); alertBubble(x, Math.round(e.x - cam + e.w/2), Math.round(e.y + e.h - img.height) - 4, e.stT); }
    else if (e.st === 'wind') alertBubble(x, Math.round(e.x - cam + e.w/2), Math.round(e.y + e.h - img.height) - 4, e.stT);
    if (e.ri != null && e.st === 'wind') drawBubbleAt(x, Math.round(e.x - cam + e.w/2 + e.face*(e.w/2 + 3)), Math.round(e.y + 6), Math.round(2 + (1 - e.stT/BUBBLE.wind)*4));   // the bubble swells at the raider's mouth
    if (e.ri != null && e.type === 'hedgehog'){ const ey = Math.round(e.y + e.h - img.height); x.fillStyle = '#1a1030'; x.fillRect(ex + 3, ey - 2, 9, 3); x.fillStyle = '#3a6ee8'; x.fillRect(ex + 4, ey - 1, 7, 1); } }   // a little sailor cap
  // boss
  if (G.marks.length) drawMarks(x, cam);
  if (G.B && G.B.key === 'kurilla' && (!G.B.gone || G.B.gone > 1)) drawWizardBoss(x, G.B, cam);
  else if (G.B && (!G.B.gone || G.B.gone > 1)){ const B = G.B, f = SP.bossFrames(B.key); const img = B.inv > 0 && Math.floor(G.t*30) % 2 ? f.hit : (B.face > 0 ? f.r : f.l);
    x.globalAlpha = B.ghost ? (B.cfg.windup && B.cfg.move === 'dance' ? .5 + Math.sin(G.t*20)*.08 : .35 + Math.sin(G.t*30)*.15) : B.preFade && Math.floor(G.t*14) % 2 ? .7 : 1;   /* Spectro: stays half-visible, flickers before fading */ const bob = B.cfg.move === 'fly' || B.cfg.move === 'hover' || B.cfg.move === 'dance' ? Math.round(Math.sin(G.t*6)*2) : 0;
    const warn = B.mode === 'warn', flash = warn && Math.floor(G.t*(B.warnT < .3 ? 24 : 12)) % 2;
    x.drawImage(flash ? f.hit : img, Math.round(B.x - cam - 2), Math.round(B.y - 4 + bob)); x.globalAlpha = 1;
    if (warn){ alertBubble(x, Math.round(B.x - cam + B.w/2), Math.round(B.y - 6 + bob), B.warnT);                       // dive telegraph: "!" + where she'll land
      if (B.tx != null && B.next === 'slam' && B.cfg.move === 'hover'){ const sx0 = Math.round(B.x - cam + 2), k = 1 - B.warnT/(B.cfg.windup || .8); x.globalAlpha = .35 + .3*k; x.fillStyle = '#1a1030'; x.fillRect(sx0, 12*TS - 2, B.w - 4, 2); x.fillRect(sx0 + 3, 12*TS - 3, B.w - 10, 1); x.globalAlpha = 1; }   // dragon slam: his shadow grows on the floor
      if (B.tx != null && Math.floor(G.t*12) % 2){ const mx = Math.round(clamp(B.tx, 1.2*TS, 14.8*TS - B.w) + B.w/2 - cam), my = 12*TS - 3; x.fillStyle = '#e83a4a'; x.fillRect(mx - 6, my, 12, 2); x.fillRect(mx - 3, my - 3, 6, 2); x.fillRect(mx - 1, my - 6, 2, 2); } }
    if (B.mode === 'rest'){ x.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++){ const a = G.t*6 + i*2.1; x.fillRect(Math.round(B.x - cam + B.w/2 + Math.cos(a)*11) - 1, Math.round(B.y - 7 + Math.sin(a)*3) - 1, 3, 3); } } }
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
      case 'ball': case 'barrel': drawShipShot(x, s, sx, sy); break;
      case 'note': case 'whole': drawNoteShot(x, s, sx, sy); break;
      case 'piano': { if (s.ty != null) landMarker(x, { x:s.tx, y:s.ty }, cam, 1 + s.t/s.T); x.save(); x.translate(sx, sy); x.rotate(Math.sin(s.t*7)*.35); x.drawImage(SP.item('piano'), -8, -6); x.restore(); break; }
      case 'antler': { x.save(); x.translate(sx, sy); x.rotate(s.t*14*s.dir); x.drawImage(SP.item('antler', { A:'#ecd6a4' }), -6, -4); x.restore(); break; }
      case 'bubble': drawBubbleAt(x, sx, sy, s.r); break;
      case 'rose': { if (s.ty != null) landMarker(x, { x:s.tx, y:s.ty }, cam, 1 + s.t/s.T); x.save(); x.translate(sx, sy); x.rotate(s.rot || 0); x.drawImage(SP.item('rose'), -3, -4); x.restore(); break; }
      case 'megaegg': { if (s.ty != null) landMarker(x, { x:s.tx, y:s.ty }, cam, 1 + s.t/s.T); x.save(); x.translate(sx, sy); x.rotate(s.t*6); x.fillStyle = '#1a1030'; x.fillRect(-4, -5, 8, 10); x.fillRect(-5, -3, 10, 7); x.fillStyle = '#fff6e8'; x.fillRect(-3, -4, 6, 8); x.fillRect(-4, -2, 8, 5); x.fillStyle = '#ffffff'; x.fillRect(-2, -3, 2, 2); x.restore(); break; }
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
  for (const f of G.floats){ if (f.t > .6 && Math.floor(f.t*20) % 2) continue; SP.text(x, f.text, Math.round(f.x - cam - SP.textWidth(f.text)/2), Math.round(f.y), '#ffffff', '#1a1030'); }   // tiny 'MEEP!' pop (over the hero)
  if (G.base.auto){ if (G.base.moat) drawMoatWater(x, cam); else drawSea(x, cam); drawPushHint(x, cam); }
  if (G.base.port) drawHarborWater(x, cam);
  if (G.base.indoor) indoorLight(x, cam);
  if (G.base.indoor === 'coop') drawHenBubbles(x, cam);
  weather(x, cam); x.restore();
  hud(x);
}
// ---------- pirate ship drawing ----------
function line(x, x0, y0, x1, y1, c, wd = 1){ x.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++){ const k = n ? i/n : 0; x.fillRect(Math.round(x0 + (x1 - x0)*k), Math.round(y0 + (y1 - y0)*k), wd, wd); } }
function skull(x, cx, cy){ x.fillStyle = '#ffffff'; x.fillRect(cx - 2, cy - 2, 5, 4); x.fillRect(cx - 1, cy + 2, 3, 1); x.fillStyle = '#1a1030'; x.fillRect(cx - 1, cy - 1, 1, 1); x.fillRect(cx + 1, cy - 1, 1, 1);
  x.fillStyle = '#ffffff'; x.fillRect(cx - 4, cy + 4, 2, 1); x.fillRect(cx + 3, cy + 4, 2, 1); x.fillRect(cx - 3, cy + 3, 1, 1); x.fillRect(cx + 3, cy + 3, 1, 1); x.fillRect(cx - 2, cy + 5, 1, 1); x.fillRect(cx + 2, cy + 5, 1, 1); }
function jollyRoger(x, px, py, t){ for (let i = 0; i < 20; i++){ const wv = Math.round(Math.sin(t*5 - i*.45)*1.5); x.fillStyle = '#1a1030'; x.fillRect(px + i, py + wv, 1, 13); } skull(x, px + 10, py + 5 + Math.round(Math.sin(t*5 - 4.5)*1.5)); }
function drawShipDeco(x, cam){ const k = '#2e1a0c', t = G.t;
  for (const d of G.base.deco){
    if (d.k === 'mast'){ const mx = Math.round(d.x*TS + 6 - cam), top = d.top*TS + (d.top ? 0 : 16), bot = d.deck*TS; if (mx < -90 || mx > W + 90) continue;
      for (const s of [-1, 1]){ const fx = mx + 2 + s*(d.big ? 64 : 40), fy = top + 8;   /* shrouds: rope-ladder nets from the mast top to the deck */
        line(x, mx + 2, fy, fx, bot, '#3a2412'); line(x, mx + 2, fy, fx - s*7, bot, '#3a2412');
        for (let r = 1; r < 9; r++){ const k1 = r/9, ya = Math.round(fy + (bot - fy)*k1); line(x, mx + 2 + s*(d.big ? 64 : 40)*k1, ya, mx + 2 + s*((d.big ? 64 : 40) - 7)*k1, ya, '#5a3a1e'); } }
      x.fillStyle = k; x.fillRect(mx - 1, top, 6, bot - top); x.fillStyle = '#8a5a2a'; x.fillRect(mx, top, 4, bot - top); x.fillStyle = '#b07a40'; x.fillRect(mx, top, 1, bot - top);
      for (let yy = top + 20; yy < bot; yy += 26){ x.fillStyle = k; x.fillRect(mx - 1, yy, 6, 2); }
      if (d.sail){ const sy = top + 10, sh = 50; x.fillStyle = k; x.fillRect(mx - 32, sy - 2, 70, 4);
        for (let r = 0; r < sh; r++){ const bel = Math.round(Math.sin(r/sh*Math.PI)*5 + Math.sin(t*2 + r*.1)*.6), hw = 26 + bel;
          x.fillStyle = k; x.fillRect(mx + 2 - hw - 1, sy + 2 + r, hw*2 + 2, 1); x.fillStyle = r % 12 === 11 ? '#d8c8a0' : (r < 3 ? '#fff6dc' : '#f3e6c4'); x.fillRect(mx + 2 - hw, sy + 2 + r, hw*2, 1);
          x.fillStyle = '#d8c8a0'; x.fillRect(mx + 2 + hw - 5, sy + 2 + r, 5, 1); }
        x.fillStyle = k; x.fillRect(mx - 30, sy + sh + 2, 66, 2); skull(x, mx + 2, sy + 22); x.fillStyle = '#1a1030'; x.fillRect(mx - 4, sy + 18, 13, 1); }
      if (d.flag) jollyRoger(x, mx + 5, top + 2, t);
      if (d.big){ x.fillStyle = '#c0283a'; for (let i = 0; i < 14; i++) x.fillRect(mx + 5 + i, top + 2 + Math.round(Math.sin(t*6 - i*.5)), 1, 5 - Math.floor(i/4)); } }
    else if (d.k === 'nest'){ const nx = Math.round(d.x0*TS - cam), ny = d.y*TS + 6, nw = (d.x1 - d.x0 + 1)*TS; if (nx > W || nx + nw < 0) continue;
      x.fillStyle = k; x.fillRect(nx + 6, ny, nw - 12, 13); x.fillStyle = '#8a5a2a'; x.fillRect(nx + 7, ny, nw - 14, 12); x.fillStyle = '#5a3416'; for (let i = nx + 10; i < nx + nw - 8; i += 6) x.fillRect(i, ny, 1, 12); x.fillRect(nx + 7, ny + 5, nw - 14, 1); }
    else if (d.k === 'ladder'){ const lx = Math.round(d.x*TS + 4 - cam); if (lx < -16 || lx > W + 16) continue; const y0 = d.y0*TS, y1 = d.y1*TS;
      x.fillStyle = '#e8d8b0'; x.fillRect(lx, y0, 1, y1 - y0); x.fillRect(lx + 8, y0, 1, y1 - y0); x.fillStyle = '#c8a878'; for (let y = y0 + 3; y < y1; y += 5) x.fillRect(lx, y, 9, 1); }
    else if (d.k === 'rail'){ const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam), y = d.y*TS; if (x1 < 0 || x0 > W) continue;
      x.fillStyle = k; x.fillRect(x0, y - 8, x1 - x0, 2); for (let i = x0 + 3; i < x1; i += 8) x.fillRect(i, y - 7, 2, 7); x.fillStyle = '#a8743e'; x.fillRect(x0, y - 8, x1 - x0, 1); }
    else if (d.k === 'gang'){ const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam), y = d.y*TS; if (x1 < 0 || x0 > W) continue;
      for (let i = x0; i <= x1; i++){ const sag = Math.round(Math.sin((i - x0)/(x1 - x0)*Math.PI)*5); x.fillStyle = '#e8d8b0'; x.fillRect(i, y - 12 + sag, 1, 1); }
      x.fillStyle = k; x.fillRect(x0 - 1, y - 14, 2, 14); x.fillRect(x1 - 1, y - 14, 2, 14); }
    else if (d.k === 'stern'){ const px = Math.round(d.x*TS + 4 - cam), y = d.y*TS; if (px < -20 || px > W + 20) continue;
      x.fillStyle = k; x.fillRect(px, y - 22, 2, 22); x.fillRect(px - 3, y - 29, 8, 8); glow(x, px + 1, y - 25, 8); x.fillStyle = Math.sin(t*9) > -.6 ? '#ffd23f' : '#ffb040'; x.fillRect(px - 2, y - 28, 6, 6); x.fillStyle = '#fff3a0'; x.fillRect(px - 1, y - 27, 2, 2); }
    else if (d.k === 'bow'){ const px = Math.round(d.x*TS - cam), y = d.y*TS; if (px < -40 || px > W + 40) continue;
      for (let r = 0; r < 44; r++){ const wd = Math.max(0, Math.round(12 - r*.3 - (r*r)*.004)); if (!wd) continue; x.fillStyle = k; x.fillRect(px, y + r, wd + 1, 1); x.fillStyle = r < 3 ? '#d9a066' : (r % 4 === 3 ? '#4e2c14' : '#6b3f1f'); x.fillRect(px, y + r, wd, 1); }
      x.fillStyle = '#e0b040'; x.fillRect(px, y + 7, 9, 1); line(x, px, y + 1, px + 26, y - 18, k, 2); line(x, px + 1, y, px + 26, y - 18, '#8a5a2a'); line(x, px + 26, y - 18, px - 2, y - 40, '#3a2412'); } } }
function drawMovers(x, cam){ const k = '#2e1a0c';
  for (const m of G.movers){ const mx = Math.round(m.x - cam), my = Math.round(m.y); if (mx > W + 20 || mx + m.w < -20) continue;
    if (m.cloud){ for (let i = 0; i < m.w; i += TS) x.drawImage(G.tl.semi, mx + i, my - 1); x.fillStyle = '#ffffff'; x.fillRect(mx + 6, my - 4, 12, 4); x.fillRect(mx + m.w - 20, my - 3, 10, 3);   // bobbing cloud
      x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(mx + 10, my + 10 + Math.round(Math.sin(G.t*3)*2), 3, 1); x.fillRect(mx + m.w - 14, my + 12 - Math.round(Math.sin(G.t*3)*2), 3, 1); continue; }
    if (m.crane){ const rx = mx + m.w/2; x.fillStyle = '#1a1030'; x.fillRect(rx - 1, 30, 2, my - 30); x.fillRect(rx - 4, my - 10, 8, 3); x.fillStyle = '#9aa0b4'; x.fillRect(rx - 3, my - 9, 6, 1);   // crane rope + hook + cargo pallet
      line(x, rx, my - 8, mx + 3, my, '#e8d8b0'); line(x, rx, my - 8, mx + m.w - 4, my, '#e8d8b0');
      x.fillStyle = '#1a1030'; x.fillRect(mx, my, m.w, 7); x.fillStyle = '#a8743e'; x.fillRect(mx + 1, my + 1, m.w - 2, 4); x.fillStyle = '#f2f6ff'; x.fillRect(mx + 1, my + 1, m.w - 2, 1); x.fillStyle = '#6a4424'; for (let i = mx + 8; i < mx + m.w - 2; i += 8) x.fillRect(i, my + 2, 1, 3);
      x.fillStyle = '#1a1030'; x.fillRect(mx + 6, my + 7, m.w - 12, 8); x.fillStyle = '#c8b088'; x.fillRect(mx + 7, my + 7, m.w - 14, 7); x.fillStyle = '#1a1030'; for (let i = mx + 9; i < mx + m.w - 8; i += 5) x.fillRect(i, my + 7, 1, 7); continue; }
    if (m.drift){ drawLogRaft(x, mx, my, m.w); continue; }
    if (m.eraft){ drawTub(x, mx, my, m.w); continue; }
    if (m.kind === 'swing'){ const ax = Math.round(m.bx + m.w/2 - cam), ay = 22; line(x, ax, ay, mx + 4, my, '#e8d8b0'); line(x, ax, ay, mx + m.w - 5, my, '#e8d8b0'); x.fillStyle = k; x.fillRect(ax - 3, ay - 3, 7, 4); }
    else { for (const bx of [mx + 4, mx + m.w - 18]){ x.fillStyle = k; x.fillRect(bx, my + 5, 14, 13); x.fillStyle = '#a8642a'; x.fillRect(bx + 1, my + 6, 12, 11); x.fillStyle = '#5a5e76'; x.fillRect(bx + 1, my + 8, 12, 2); x.fillRect(bx + 1, my + 14, 12, 2); } }
    x.fillStyle = k; x.fillRect(mx, my, m.w, 7); x.fillStyle = '#c8925a'; x.fillRect(mx + 1, my + 1, m.w - 2, 4); x.fillStyle = '#f0c080'; x.fillRect(mx + 1, my + 1, m.w - 2, 1);
    x.fillStyle = '#7a4a22'; for (let i = mx + 8; i < mx + m.w - 2; i += 8) x.fillRect(i, my + 1, 1, 4); } }
function drawCannonFx(x, cam){ for (const c of G.cannons){ const cx = Math.round(c.tx*TS - cam), cy = c.ty*TS; if (cx < -30 || cx > W + 30) continue;
    if (c.warn > 0){ if (Math.floor(G.t*16) % 2){ x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(cx, cy + 3, 14, 7); } alertBubble(x, cx + 8, cy - 1, c.warn); }
    if (c.flash > 0){ x.fillStyle = '#ffd23f'; x.fillRect(cx - 8, cy + 2, 8, 9); x.fillStyle = '#ffffff'; x.fillRect(cx - 5, cy + 4, 5, 5); } } }
function drawShipShot(x, s, sx, sy){
  if (s.kind === 'ball'){ for (let i = -5; i <= 5; i++){ const hw = Math.round(Math.sqrt(30 - i*i)); x.fillStyle = '#1a1030'; x.fillRect(sx - hw, sy + i, hw*2, 1); }
    for (let i = -4; i <= 4; i++){ const hw = Math.round(Math.sqrt(20 - i*i)); x.fillStyle = '#3a3a4e'; x.fillRect(sx - hw, sy + i, hw*2, 1); } x.fillStyle = '#9aa0b4'; x.fillRect(sx - 2, sy - 3, 2, 2); x.fillStyle = '#ffffff'; x.fillRect(sx - 2, sy - 3, 1, 1);
    x.fillStyle = 'rgba(208,212,228,.6)'; x.fillRect(sx + 6, sy - 1, 3, 2); x.fillRect(sx + 10, sy, 2, 1); return; }
  x.fillStyle = '#2e1a0c'; x.fillRect(sx - 6, sy - 5, 12, 11); x.fillRect(sx - 5, sy - 6, 10, 13); x.fillStyle = '#a8642a'; x.fillRect(sx - 5, sy - 5, 10, 11); x.fillRect(sx - 4, sy - 6, 8, 13);
  const o = ((Math.floor(-s.rot*2) % 10) + 10) % 10; x.fillStyle = '#5a5e76'; for (const b of [o, o + 5]){ const bx = sx - 5 + (b % 10); if (bx < sx + 5) x.fillRect(bx, sy - 5, 1, 11); }
  x.fillStyle = '#c8844a'; x.fillRect(sx - 4, sy - 5, 8, 1); }
function pirateHat(x, e, ex, ey, img){ const hx = ex + Math.round(img.width/2) + (e.type === 'dino' ? (e.face > 0 ? 4 : -4) : 0), hy = ey + (e.type === 'dino' ? 1 : 0) - (e.type === 'meep' ? 2 : 0);
  x.fillStyle = '#1a1030'; x.fillRect(hx - 7, hy - 1, 14, 2); x.fillRect(hx - 5, hy - 4, 10, 3); x.fillRect(hx - 2, hy - 6, 4, 2);
  x.fillStyle = '#ffffff'; x.fillRect(hx - 1, hy - 3, 2, 1); x.fillStyle = '#ffd23f'; x.fillRect(hx - 7, hy - 1, 1, 1); x.fillRect(hx + 6, hy - 1, 1, 1); }
function drawSea(x, cam){ const t = G.t, c0 = Math.round(cam);
  for (let sx = 0; sx < W; sx += 2){ const wx = sx + c0, y0 = SHIP.water + Math.round(Math.sin(wx*.06 + t*2.2)*1.5 + Math.sin(wx*.023 - t*1.3)*1.5);
    x.fillStyle = 'rgba(30,50,130,.9)'; x.fillRect(sx, y0, 2, H - y0); x.fillStyle = '#7cc0ff'; x.fillRect(sx, y0, 2, 1);
    if ((((wx >> 1) + Math.floor(t*3)) % 13) === 0){ x.fillStyle = '#ffffff'; x.fillRect(sx, y0 - 1, 2, 1); }
    if ((((wx >> 1)*7 + Math.floor(t*2)) % 29) === 0){ x.fillStyle = '#ffb070'; x.fillRect(sx, y0 + 6 + (wx % 9), 3, 1); } } }
function drawHarborWater(x, cam){ const t = G.t, c0 = Math.round(cam);   // icy harbor water in front of the dock stilts, with drifting ice floes
  for (let sx = 0; sx < W; sx += 2){ const wx = sx + c0, y0 = 206 + Math.round(Math.sin(wx*.05 + t*1.8)*1.2 + Math.sin(wx*.021 - t)*1);
    x.fillStyle = 'rgba(24,52,110,.88)'; x.fillRect(sx, y0, 2, H - y0); x.fillStyle = '#a8d8ff'; x.fillRect(sx, y0, 2, 1);
    if ((((wx >> 1) + Math.floor(t*2)) % 17) === 0){ x.fillStyle = '#ffffff'; x.fillRect(sx, y0 - 1, 2, 1); } }
  for (let i = 0; i < 5; i++){ const span = W + 60, fx = Math.round((((i*131 + t*(6 + i*2) - cam*.9) % span) + span) % span - 30), fy = 210 + (i*5) % 9; x.fillStyle = '#e8f4ff'; x.fillRect(fx, fy, 14 + i*2, 3); x.fillStyle = '#b8d8f0'; x.fillRect(fx + 2, fy + 3, 10 + i*2, 1); } }
function drawReindeerMini(x, rx, ry, face, step, gift){ const k = '#1a1030', f = face > 0;   // a little background reindeer walking with a present on its back
  const px = (dx, dy, w, h, c) => { x.fillStyle = c; x.fillRect(f ? rx + dx : rx + 12 - dx - w, ry + dy, w, h); };
  px(1, 3, 9, 5, k); px(2, 4, 7, 3, '#a8642a'); px(9, 0, 4, 5, k); px(10, 1, 2, 3, '#a8642a'); px(12, 2, 1, 1, '#e83a4a'); px(9, -3, 1, 3, '#ecd6a4'); px(11, -3, 1, 3, '#ecd6a4'); px(8, -3, 2, 1, '#ecd6a4'); px(11, -4, 2, 1, '#ecd6a4');
  const s = step ? 1 : 0; px(2 + s, 8, 1, 3, k); px(5 - s, 8, 1, 3, k); px(7 + s, 8, 1, 3, k); px(9 - s, 8, 1, 3, k);
  if (gift){ px(3, 0, 5, 4, k); px(4, 1, 3, 2, ['#3ddc84','#e83a4a','#4d9de0'][gift % 3]); px(5, 0, 1, 4, '#ffd23f'); } }
function drawPortDeco(x, d, cam){ const t = G.t, k = '#1a1030';
  if (d.k === 'herd'){ const bx = Math.round(d.x*TS - cam*1 + 0), hx = bx, deckY = 120, base = 200; if (hx < -200 || hx > W + 40) return;   // a moored cargo ship behind the dock + reindeer loading presents
    x.globalAlpha = .95; x.fillStyle = '#56487a'; x.fillRect(hx, deckY, 150, base - deckY); for (let r = 0; r < 16; r++){ x.fillRect(hx - 16 + r, deckY + r*4, 16 - r, 4); } x.fillStyle = '#8a7aae'; x.fillRect(hx, deckY, 150, 5); x.fillStyle = '#ffd890'; for (let i = hx + 14; i < hx + 140; i += 18) x.fillRect(i, deckY + 18, 4, 4);
    x.fillStyle = '#56487a'; x.fillRect(hx + 40, deckY - 60, 3, 60); x.fillRect(hx + 100, deckY - 46, 3, 46); x.fillRect(hx + 110, deckY - 22, 30, 22); x.fillStyle = '#ffd890'; x.fillRect(hx + 116, deckY - 16, 5, 5); x.fillRect(hx + 128, deckY - 16, 5, 5);
    x.fillStyle = '#e8f0ff'; x.fillRect(hx, deckY - 2, 150, 2); x.globalAlpha = 1;
    const gx0 = hx + 150, gx1 = hx + 196; for (let i = 0; i <= 46; i++){ const yy = Math.round(base - 8 - (46 - i)*(base - 8 - deckY)/46); x.fillStyle = k; x.fillRect(gx0 + i - 46 + 46, yy, 1, 3); }   // gangplank down to the dock
    x.fillStyle = '#8a5e36'; for (let i = 0; i <= 46; i += 2){ const yy = Math.round(base - 8 - (46 - i)*(base - 8 - deckY)/46); x.fillRect(gx0 + i, yy, 2, 1); }
    for (let n = 0; n < 3; n++){ const u = ((t*.12 + n/3) % 1), rx = gx1 - 6 - u*52, ry = Math.round(base - 8 - Math.min(1, u*1.1)*(base - 8 - deckY)) - 11; drawReindeerMini(x, Math.round(rx), Math.min(ry, base - 19), -1, Math.floor(t*6 + n) % 2, n + 1); }
    for (let n = 0; n < 2; n++){ const u = ((t*.1 + n/2) % 1), rx = hx + 130 - u*110; drawReindeerMini(x, Math.round(rx), deckY - 11, -1, Math.floor(t*5 + n) % 2, 0); }   // walking along the deck back to the hold
    return; }
  if (d.k === 'stilts'){ const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam); if (x1 < -10 || x0 > W + 10) return; return; }
  if (d.k === 'lamp'){ const lx = Math.round(d.x*TS + 8 - cam); if (lx < -20 || lx > W + 20) return; x.fillStyle = k; x.fillRect(lx - 1, 12*TS - 46, 3, 46); x.fillRect(lx - 4, 12*TS - 52, 9, 7); x.fillStyle = '#fff3a0'; x.fillRect(lx - 3, 12*TS - 51, 7, 5);
    x.fillStyle = '#f2f6ff'; x.fillRect(lx - 5, 12*TS - 54, 11, 2); x.globalAlpha = .12; x.fillStyle = '#fff3a0'; for (let r = 18; r > 4; r -= 4) x.fillRect(lx - r, 12*TS - 49 - r/2, r*2, r); x.globalAlpha = 1; return; }
  if (d.k === 'crane'){ const cx = Math.round(d.x*TS - cam), bx = Math.round(d.boom*TS - cam), top = d.top*TS; if (cx < -40 || bx > W + 220 || cx > W + 40) return;   // lattice dock crane, boom reaching out over the water
    x.fillStyle = k; x.fillRect(cx, top, 16, 12*TS - top); x.fillStyle = '#e0a020'; x.fillRect(cx + 1, top, 14, 12*TS - top); x.fillStyle = k; for (let y = top + 4; y < 12*TS; y += 12){ for (let i = 0; i < 12; i++){ x.fillRect(cx + 2 + i, y + i, 1, 1); x.fillRect(cx + 13 - i, y + i, 1, 1); } }
    x.fillStyle = k; x.fillRect(bx, top - 4, cx + 20 - bx, 6); x.fillStyle = '#e0a020'; x.fillRect(bx + 1, top - 3, cx + 18 - bx, 4); x.fillStyle = k; for (let i = bx + 4; i < cx; i += 8) x.fillRect(i, top - 3, 1, 4);
    x.fillStyle = '#3a3a4e'; x.fillRect(cx + 2, top - 18, 12, 14); x.fillStyle = '#7cc0ff'; x.fillRect(cx + 4, top - 15, 8, 5); x.fillStyle = '#f2f6ff'; x.fillRect(cx, top - 20, 16, 2); x.fillRect(bx, top - 5, cx + 20 - bx, 1); return; }
  if (d.k === 'smast'){ const mx = Math.round(d.x*TS + 6 - cam), top = 16, bot = d.deck*TS; if (mx < -60 || mx > W + 60) return;
    x.fillStyle = k; x.fillRect(mx - 1, top, 6, bot - top); x.fillStyle = '#8a5a2a'; x.fillRect(mx, top, 4, bot - top); x.fillStyle = '#f2f6ff'; x.fillRect(mx - 1, top, 6, 2);
    x.fillStyle = k; x.fillRect(mx - 24, top + 14, 54, 4); x.fillStyle = '#f3e6c4'; x.fillRect(mx - 22, top + 18, 50, 8); x.fillStyle = '#d8c8a0'; for (let i = mx - 20; i < mx + 26; i += 7) x.fillRect(i, top + 18, 1, 8); x.fillStyle = '#f2f6ff'; x.fillRect(mx - 24, top + 13, 54, 1);   // furled sail with snow
    x.fillStyle = d.color; for (let i = 0; i < 12; i++) x.fillRect(mx + 5 + i, top + 2 + Math.round(Math.sin(t*6 - i*.5)), 1, 5 - Math.floor(i/4));   // pennant
    line(x, mx + 2, top + 4, mx - 34, bot, '#3a2412'); line(x, mx + 2, top + 4, mx + 38, bot, '#3a2412'); return; }
  if (d.k === 'hullend'){ const ex = Math.round(d.x*TS - cam), y = d.y*TS; if (ex < -40 || ex > W + 40) return;   // pointy bow / round stern of a moored ship
    for (let r = 0; r < 14*TS - y; r++){ const wv = Math.max(0, 22 - Math.floor(r*.45)); x.fillStyle = r < 2 ? '#f2f6ff' : r < 7 ? '#d9a066' : '#7a1c2a'; if (d.side > 0) x.fillRect(ex, y + r, wv, 1); else x.fillRect(ex - wv, y + r, wv, 1); }
    x.fillStyle = '#ffffff'; if (d.side > 0) x.fillRect(ex, y + 9, 18, 2); else x.fillRect(ex - 18, y + 9, 18, 2); return; }
  if (d.k === 'gang'){ const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam) + 16; if (x1 < -10 || x0 > W + 10) return;   // rope rails along the gangplank
    line(x, x0, 12*TS - 14, x1, d.deck*TS - 14, '#e8d8b0'); x.fillStyle = k; x.fillRect(x0, 12*TS - 16, 2, 16); x.fillRect(x1 - 2, d.deck*TS - 16, 2, 16); return; } }
function drawPushHint(x, cam){ const p = G.p; if (p.dead || p.clear || p.x - cam > 22 || Math.floor(G.t*6) % 2) return; const y = Math.round(p.y + 6);
  for (const o of [2, 7]){ x.fillStyle = '#1a1030'; x.fillRect(o - 1, y - 1, 4, 9); x.fillStyle = '#ffd23f'; x.fillRect(o, y, 1, 7); x.fillRect(o + 1, y + 1, 1, 5); x.fillRect(o + 2, y + 2, 1, 3); } }
// where a piano will land: a dark shadow on the floor that grows and blinks faster as it gets close
function drawChains(x, cam){   /* a ceiling bracket, a swinging chain of links and a spiked iron ball, plus its shadow on the floor */
  for (const c of G.chains){ const ax = Math.round(c.x - cam); if (ax < -c.len - 20 || ax > W + c.len + 20) continue; const b = chainBall(c), bx = Math.round(b.x - cam), by = Math.round(b.y);
    x.fillStyle = '#1a1030'; x.fillRect(ax - 6, c.y - 4, 12, 5); x.fillStyle = '#6a6478'; x.fillRect(ax - 5, c.y - 3, 10, 3);
    const n = Math.floor(c.len/6); for (let i = 1; i < n; i++){ const k = i/n, lx = Math.round(c.x - cam + (b.x - c.x)*k), ly = Math.round(c.y + (b.y - c.y)*k);
      x.fillStyle = '#1a1030'; x.fillRect(lx - 2, ly - 2, 5, 5); x.fillStyle = i % 2 ? '#e4e0f0' : '#a8a4c0'; i % 2 ? x.fillRect(lx - 1, ly - 1, 2, 3) : x.fillRect(lx - 1, ly - 1, 3, 2); }
    const fy = gTopAt(b.x)*TS, sh = Math.max(2, 9 - Math.round((fy - by)/14)); x.globalAlpha = .3; x.fillStyle = '#1a1030'; x.fillRect(bx - sh, fy - 2, sh*2, 2); x.globalAlpha = 1;
    x.fillStyle = '#1a1030'; for (const [dx, dy] of [[0, -9], [0, 9], [-9, 0], [9, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]]) x.fillRect(bx + dx - 1, by + dy - 1, 3, 3);   // spikes
    x.fillStyle = '#ffffff'; for (const [dx, dy] of [[0, -9], [0, 9], [-9, 0], [9, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]]) x.fillRect(bx + dx, by + dy, 1, 1);
    x.fillStyle = '#1a1030'; x.fillRect(bx - 6, by - 5, 12, 10); x.fillRect(bx - 5, by - 6, 10, 12);
    x.fillStyle = '#9c98b4'; x.fillRect(bx - 5, by - 4, 10, 8); x.fillRect(bx - 4, by - 5, 8, 10); x.fillStyle = '#6a6680'; x.fillRect(bx - 4, by + 2, 8, 2); x.fillStyle = '#f0f0ff'; x.fillRect(bx - 3, by - 4, 3, 2); x.fillRect(bx - 3, by - 2, 1, 1); } }
function drawBonesProp(x, e, cam){   /* where a Rattlebones hides: a treasure chest (lid pops open) or a crack in the floor stones; shakes + "!" while it rattles */
  const hx = Math.round(e.homeX - cam + 6), fy = Math.round(e.baseY + e.h), rat = e.alive && e.st === 'rattle', sh = rat ? (Math.floor(G.t*30) % 2 ? 1 : -1) : 0, open = !e.alive || !e.sub;
  if (e.hide === 'chest'){ const cx = hx - 8 + sh, cy = fy - 10;
    x.fillStyle = '#1a1030'; x.fillRect(cx - 1, cy - 1, 18, 12); x.fillStyle = '#8a4a1c'; x.fillRect(cx, cy, 16, 10); x.fillStyle = '#ffd23f'; x.fillRect(cx, cy + 3, 16, 1); x.fillRect(cx + 7, cy + 2, 2, 4);
    if (open){ x.fillStyle = '#1a1030'; x.fillRect(cx - 1, cy - 8, 18, 6); x.fillStyle = '#a85a24'; x.fillRect(cx, cy - 7, 16, 4); x.fillStyle = '#2a1a10'; x.fillRect(cx + 1, cy - 1, 14, 2); }
    else { x.fillStyle = '#1a1030'; x.fillRect(cx - 1, cy - 5 - (rat ? Math.floor(G.t*12) % 2 : 0), 18, 5); x.fillStyle = '#a85a24'; x.fillRect(cx, cy - 4 - (rat ? Math.floor(G.t*12) % 2 : 0), 16, 3); } }
  else { x.fillStyle = '#1a1030'; x.fillRect(hx - 8 + sh, fy - 1, 16, 1); x.fillRect(hx - 5, fy - 2, 3, 1); x.fillRect(hx + 2, fy - 2, 4, 1); if (open){ x.fillStyle = '#2a2236'; x.fillRect(hx - 6, fy - 2, 12, 2); }
    if (rat) for (let i = 0; i < 3; i++){ x.fillStyle = '#9a94a8'; x.fillRect(hx - 6 + i*5 + sh, fy - 3 - (Math.floor(G.t*16 + i) % 2), 2, 2); } }
  if (rat) alertBubble(x, hx, fy - 16, e.stT); }
function drawMegaHen(x, e, cam){   /* Mega Hen: grows out of a hen, "!" + marker before an egg or a stomp jump, stars while dizzy, a name tag + hit pips */
  const fr = SP.enemyFrames('megahen'), fi = e.st === 'wind' ? 2 : e.st === 'leap' ? 3 : e.st === 'grow' || e.st === 'dizzy' ? 0 : (e.clk || 0) % 2, img = e.face > 0 ? fr[fi].l : fr[fi].r;
  const cx = Math.round(e.x - cam + e.w/2), fy = Math.round(e.y + e.h);
  if (e.st === 'wind' && e.mark && e.mark.y != null) landMarker(x, e.mark, cam, 1 - e.stT/(e.next === 'egg' ? MEGA.wind : MEGA.jumpWind));
  if (e.st === 'leap' && e.mark) landMarker(x, e.mark, cam, 1.2);
  if (e.st === 'leap'){ const fl = gTopAt(e.x + e.w/2)*TS; x.globalAlpha = .35; x.fillStyle = '#1a1030'; x.fillRect(cx - 20, fl - 2, 40, 2); x.fillRect(cx - 16, fl - 3, 32, 1); x.globalAlpha = 1; }   // her shadow under her
  if (!(e.flash > 0 && Math.floor(G.t*30) % 2)){ const k = e.st === 'grow' ? .45 + .55*(1 - e.stT/MEGA.grow) : 1, sh = e.st === 'wind' ? (Math.floor(G.t*30) % 2 ? 1 : -1) : 0;
    x.save(); x.translate(cx + sh, fy); x.scale(2*k, 2*k); x.drawImage(img, -Math.round(img.width/2), -img.height); x.restore(); }
  const ty = fy - 54; if (e.st === 'wind') alertBubble(x, cx + e.face*30, fy - 40, e.stT);   // the "!" pops up in front of her beak
  if (e.st === 'dizzy') for (let i = 0; i < 3; i++){ const a = G.t*6 + i*2.1; x.fillStyle = '#ffd23f'; x.fillRect(Math.round(cx + Math.cos(a)*18) - 1, Math.round(fy - 46 + Math.sin(a)*3) - 1, 3, 3); }
  const nm = 'MEGA HEN'; SP.text(x, nm, cx - Math.round(SP.textWidth(nm)/2), ty - 16, '#ffd23f');
  for (let i = 0; i < MEGA.hp; i++){ x.fillStyle = '#1a1030'; x.fillRect(cx - MEGA.hp*3 + i*6, ty - 8, 5, 4); x.fillStyle = i < e.hp ? '#e83a4a' : '#5a5668'; x.fillRect(cx - MEGA.hp*3 + i*6 + 1, ty - 7, 3, 2); } }
function landMarker(x, m, cam, k){ const mx = Math.round(m.x - cam), my = m.y, hw = Math.round(4 + Math.min(1.9, k)*4); if (k > 1.6 && Math.floor(G.t*20) % 2) return;
  x.globalAlpha = .55; x.fillStyle = '#1a1030'; x.fillRect(mx - hw, my - 2, hw*2, 2); x.fillRect(mx - hw + 2, my - 3, hw*2 - 4, 1); x.globalAlpha = 1;
  x.fillStyle = Math.floor(G.t*8) % 2 ? '#ff3a4a' : '#ffd23a'; x.fillRect(mx - hw, my - 1, hw*2, 1); x.fillRect(mx - hw, my - 4, 1, 3); x.fillRect(mx + hw - 1, my - 4, 1, 3);   // blinking floor bracket where it will land
  if (Math.floor(G.t*8) % 2){ x.fillStyle = '#e83a4a'; x.fillRect(mx - 1, my - 9, 2, 4); x.fillRect(mx - 3, my - 6, 6, 1); } }
// ---------- special stage drawing (barn, workshop, coop, sky) ----------
// a harmless coop hen: wanders back and forth on a floor stretch, pecks, and now and then clucks (scenery only, never hurts)
function henAt(d, t){ const span = Math.max(8, (d.x1 - d.x0)*TS - 12), u = (Math.sin(t*d.sp + d.ph) + 1)/2; return { x:d.x0*TS + 6 + u*span, face:Math.cos(t*d.sp + d.ph) >= 0 ? 1 : -1, peck:Math.sin(t*5 + d.ph*3) > .6 }; }
function drawHen(x, hx, fy, face, peck){ const k = '#1a1030', bx = Math.round(hx) - 6, by = fy - 11, f = face > 0;
  const px = (dx, dy, w, h, c) => { x.fillStyle = c; x.fillRect(f ? bx + dx : bx + 12 - dx - w, by + dy, w, h); };
  px(1, 3, 9, 7, k); px(2, 4, 7, 5, '#fff6e8'); px(0, 2, 3, 4, k); px(1, 3, 2, 3, '#fff6e8'); px(3, 6, 4, 2, '#e8dcc8');   // body + tail
  const hy = peck ? 4 : 0; px(8, hy, 4, 5, k); px(9, hy + 1, 2, 3, '#fff6e8'); px(9, hy - 1, 2, 1, '#e83a4a'); px(12, hy + 2, 1, 1, '#ffb030'); px(10, hy + 1, 1, 1, k); px(9, hy + 4, 1, 1, '#e83a4a');   // head, comb, beak
  px(4, 10, 1, 1, '#ffb030'); px(7, 10, 1, 1, '#ffb030');
}
const BAWK = { text:'BAWK!', show:1.1 };   // a hen's cluck shows a readable speech bubble (drawn on top of everything, after the warm coop light)
function drawHenBubbles(x, cam){ const t = G.t, k = '#1a1030';
  for (const d of G.base.deco){ if (d.k !== 'hen' || G.megaFrom?.has(d) || d.cl == null || t < d.cl || t - d.cl > BAWK.show) continue;
    const a = t - d.cl, hx = Math.round(henAt(d, t).x - cam), tw = SP.textWidth(BAWK.text), bw = tw + 8, bh = 13, pop = a < .12 ? Math.round((.12 - a)*25) : 0;
    const bx = Math.max(2, Math.min(W - bw - 2, hx - Math.round(bw/2))), by = 12*TS - 41 + pop, tip = Math.max(bx + 4, Math.min(bx + bw - 6, hx - 1));
    if (hx < -30 || hx > W + 30 || (a > BAWK.show - .25 && Math.floor(a*20) % 2)) continue;
    x.fillStyle = k; x.fillRect(bx + 1, by, bw - 2, bh); x.fillRect(bx, by + 1, bw, bh - 2); x.fillRect(tip - 1, by + bh - 1, 5, 2); x.fillRect(tip, by + bh + 1, 3, 2); x.fillRect(tip + 1, by + bh + 3, 1, 2);   // outline + tail pointing at the hen
    x.fillStyle = '#ffffff'; x.fillRect(bx + 2, by + 1, bw - 4, bh - 2); x.fillRect(bx + 1, by + 2, bw - 2, bh - 4); x.fillRect(tip, by + bh - 1, 3, 2); x.fillRect(tip + 1, by + bh + 1, 1, 2);
    SP.text(x, BAWK.text, bx + 4, by + 3, k, null); } }
function islandUnder(x, tx, ty, cam){ const h = hash(tx + 'u') % 3, bx = tx*TS - cam, by = (ty + 1)*TS;
  x.fillStyle = '#5a3416'; x.fillRect(bx, by, TS, 3); x.fillRect(bx + 2 + h, by + 3, 12 - h*2, 4); x.fillRect(bx + 5, by + 7, 6 - h, 3 + h);
  x.fillStyle = '#8a5a2a'; x.fillRect(bx + 1, by, TS - 2, 2); x.fillRect(bx + 3 + h, by + 3, 10 - h*2, 3); x.fillStyle = '#2f8a2f'; if (h === 1) x.fillRect(bx + 12, by + 2, 1, 6); }
// ---------- World 5 drawing: the Moonlit Moat + the Knight's Closet ----------
function drawBubbleAt(x, cx, cy, r){ if (r < 1) return; x.fillStyle = 'rgba(150,215,255,.32)'; for (let i = -r; i <= r; i++){ const hw = Math.round(Math.sqrt(r*r - i*i)); x.fillRect(cx - hw, cy + i, hw*2, 1); }
  x.fillStyle = '#c8f0ff'; const n = Math.max(12, r*5); for (let a = 0; a < n; a++){ const an = a/n*Math.PI*2; x.fillRect(Math.round(cx + Math.cos(an)*r - .5), Math.round(cy + Math.sin(an)*r - .5), 1, 1); }
  x.fillStyle = '#ffffff'; x.fillRect(cx - Math.ceil(r/2), cy - Math.ceil(r/2), 2, 2); if (r > 3) x.fillRect(cx - Math.ceil(r/2) + 2, cy - Math.ceil(r/2) - 1, 1, 1); }
function drawLogRaft(x, mx, my, w){ const k = '#1e1008';   // the hero's log raft with a lantern on a pole
  for (let i = 0; i < w; i += 8){ x.fillStyle = k; x.fillRect(mx + i, my + 2, 8, 9); x.fillStyle = (i/8) % 2 ? '#8a5a2a' : '#7a4a22'; x.fillRect(mx + i + 1, my + 3, 6, 7); x.fillStyle = '#c8925a'; x.fillRect(mx + i + 2, my + 5, 4, 3); x.fillStyle = '#7a4a22'; x.fillRect(mx + i + 3, my + 6, 2, 1); }
  x.fillStyle = k; x.fillRect(mx, my, w, 3); x.fillStyle = '#a8743e'; x.fillRect(mx + 1, my, w - 2, 2); x.fillStyle = '#d8a060'; x.fillRect(mx + 1, my, w - 2, 1);
  x.fillStyle = '#e8d8b0'; for (const rx of [mx + 14, mx + w - 18]) x.fillRect(rx, my + 2, 2, 9);
  const lx = mx + 5; x.fillStyle = k; x.fillRect(lx, my - 24, 2, 24); x.fillRect(lx - 3, my - 32, 8, 9); x.fillStyle = Math.sin(G.t*8) > -.6 ? '#ffd23f' : '#ffb040'; x.fillRect(lx - 2, my - 31, 6, 7); x.fillStyle = '#fff3a0'; x.fillRect(lx - 1, my - 29, 2, 3);
  glow(x, lx + 1, my - 28, 9); }
function drawTub(x, mx, my, w){ const k = '#1e1008', pa = Math.round(Math.sin(G.t*4)*3);   // a raider's little half-barrel boat with a paddle
  line(x, mx + w - 8, my - 10, mx + w + 3, my + 11 + pa, '#c8925a'); x.fillStyle = '#a8743e'; x.fillRect(mx + w + 1, my + 8 + pa, 4, 6);
  x.fillStyle = k; x.fillRect(mx, my, w, 10); x.fillRect(mx + 2, my + 10, w - 4, 3); x.fillStyle = '#6b3f1f'; x.fillRect(mx + 1, my + 1, w - 2, 9); x.fillRect(mx + 3, my + 10, w - 6, 2);
  x.fillStyle = '#4e2c14'; for (let i = mx + 6; i < mx + w - 3; i += 7) x.fillRect(i, my + 1, 1, 10); x.fillStyle = '#5a5e76'; x.fillRect(mx + 1, my + 3, w - 2, 1); x.fillRect(mx + 1, my + 7, w - 2, 1); x.fillStyle = '#a8743e'; x.fillRect(mx + 1, my + 1, w - 2, 1); }
function drawMoatWater(x, cam){ const t = G.t, c0 = Math.round(cam), WY = MOAT.water;   // dark moat water in front, with the moon's reflection and skeleton ripples
  for (let sx = 0; sx < W; sx += 2){ const wx = sx + c0, y0 = WY + Math.round(Math.sin(wx*.05 + t*1.6)*1.2 + Math.sin(wx*.019 - t*.9));
    x.fillStyle = 'rgba(12,16,46,.92)'; x.fillRect(sx, y0, 2, H - y0); x.fillStyle = '#4a5ab0'; x.fillRect(sx, y0, 2, 1);
    if ((((wx >> 1) + Math.floor(t*2)) % 19) === 0){ x.fillStyle = '#c8d0ff'; x.fillRect(sx, y0 - 1, 2, 1); } }
  const o = -Math.round(cam*.25) % 512; for (const m of [o + 380, o + 892]) if (m > -40 && m < W + 40) for (let y = WY + 4; y < H; y += 3){ const sp = 4 + (y - WY)*.5; x.fillStyle = 'rgba(255,246,200,.3)'; x.fillRect(Math.round(m - sp + Math.sin(t*2 + y)*3), y, Math.max(2, Math.round(sp*2*(.5 + .3*Math.sin(y*1.3 + t*3)))), 1); }
  x.fillStyle = 'rgba(40,140,60,.8)'; for (let i = 0; i < 6; i++){ const span = W + 40, px = Math.round((((i*97 - cam) % span) + span) % span - 20), py = WY + 6 + (i*7) % 14; x.fillRect(px, py, 7, 2); x.fillRect(px + 1, py - 1, 5, 1); }   // lily pads
  for (const e of G.enemies) if (e.alive && e.st === 'ripple'){ const cx = Math.round(e.x + e.w/2 - cam), k = 1 - e.stT/SKEL.ripple;
    for (let r = 0; r < 3; r++){ const rr = Math.round(((k*2 + r/3) % 1)*12) + 3; x.fillStyle = 'rgba(210,230,255,.85)'; x.fillRect(cx - rr, WY + 2, 3, 1); x.fillRect(cx + rr - 3, WY + 2, 3, 1); x.fillRect(cx - rr + 2, WY + 1, rr*2 - 4, 1); }
    x.fillStyle = '#c8f0ff'; for (let i = 0; i < 3; i++){ const by = WY - 1 - ((t*26 + i*6) % 12), bx = cx - 4 + i*4 + Math.round(Math.sin(t*6 + i)); x.fillRect(bx, Math.round(by), 2, 2); }
    if (Math.floor(t*8) % 4){ x.fillStyle = '#7cf0ff'; x.fillRect(cx - 3, WY + 7, 2, 2); x.fillRect(cx + 2, WY + 7, 2, 2); } } }   // two glowing eyes under the water
function drawMoatDeco(x, cam){ const t = G.t, k = '#14102a';   // stone landings: the castle water gate, a little tower, the checkpoint lamp, the castle door
  for (const d of G.base.deco){ if (d.k !== 'landing') continue; const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam); if (x1 < -120 || x0 > W + 120) continue; const fy = 12*TS;
    if (d.kind === 'gate'){ x.fillStyle = k; x.fillRect(x0 - 4, fy - 92, 70, 92); x.fillStyle = '#4a4e66'; x.fillRect(x0 - 3, fy - 91, 68, 91); x.fillStyle = '#363a50'; for (let y = fy - 86; y < fy; y += 10) x.fillRect(x0 - 3, y, 68, 1);
      for (let i = 0; i < 6; i++){ x.fillStyle = k; x.fillRect(x0 - 4 + i*12, fy - 100, 8, 9); x.fillStyle = '#4a4e66'; x.fillRect(x0 - 3 + i*12, fy - 99, 6, 8); }
      x.fillStyle = '#100c22'; x.fillRect(x0 + 12, fy - 52, 38, 52); for (let r = 0; r < 19; r++){ const hw = Math.round(Math.sqrt(361 - (19 - r)**2)); x.fillRect(x0 + 31 - hw, fy - 71 + r, hw*2, 1); }
      x.fillStyle = '#5a5e76'; for (let gx = x0 + 14; gx < x0 + 50; gx += 6) x.fillRect(gx, fy - 66, 2, 40); for (let gy = fy - 62; gy < fy - 26; gy += 8) x.fillRect(x0 + 13, gy, 36, 2); for (let gx = x0 + 14; gx < x0 + 50; gx += 6){ x.fillRect(gx, fy - 26, 2, 3); }   // raised portcullis
      x.fillStyle = '#c0283a'; x.fillRect(x0 + 30, fy - 124, 1, 24); x.fillRect(x0 + 31, fy - 124, 10, 6); }
    else if (d.kind === 'tower'){ const tx = x0 + 8, tw = x1 - x0 - 16; x.fillStyle = k; x.fillRect(tx - 1, fy - 150, tw + 2, 150); x.fillStyle = '#4a4e66'; x.fillRect(tx, fy - 149, tw, 149); x.fillStyle = '#363a50'; for (let y = fy - 144; y < fy; y += 10) x.fillRect(tx, y, tw, 1);
      for (let r = 0; r < 30; r++){ const hw = Math.round((r/30)*(tw/2 + 6)); x.fillStyle = r % 6 === 5 ? '#3a2a6a' : '#2a1e5a'; x.fillRect(tx + tw/2 - hw, fy - 180 + r, hw*2, 1); }
      x.fillStyle = '#ffd23f'; x.fillRect(tx + tw/2 - 3, fy - 132, 6, 9); x.fillRect(tx + tw/2 - 3, fy - 104, 6, 9); x.fillStyle = k; x.fillRect(tx + tw/2, fy - 132, 1, 9); x.fillRect(tx + tw/2, fy - 104, 1, 9);
      x.fillStyle = '#2f5a3a'; for (let i = 0; i < 6; i++) x.fillRect(tx + 3 + i*11 % tw, fy - 40 + (i*13) % 30, 3, 6); }
    else if (d.kind === 'cp' || d.kind === 'end'){ const lx = x0 + 10; x.fillStyle = k; x.fillRect(lx, fy - 44, 3, 44); x.fillRect(lx - 4, fy - 54, 11, 11); x.fillStyle = Math.sin(t*7) > -.7 ? '#ffd23f' : '#ffb040'; x.fillRect(lx - 3, fy - 53, 9, 9); x.fillStyle = '#fff3a0'; x.fillRect(lx - 1, fy - 51, 4, 4); glow(x, lx + 1, fy - 49, 12);
      if (d.kind === 'end'){ const dx = x0 + 120; x.fillStyle = k; x.fillRect(dx - 2, fy - 120, 132, 120); x.fillStyle = '#4a4e66'; x.fillRect(dx - 1, fy - 119, 130, 119); x.fillStyle = '#363a50'; for (let y = fy - 114; y < fy; y += 10) x.fillRect(dx - 1, y, 130, 1);
        for (let i = 0; i < 11; i++){ x.fillStyle = k; x.fillRect(dx - 2 + i*12, fy - 128, 8, 9); x.fillStyle = '#4a4e66'; x.fillRect(dx - 1 + i*12, fy - 127, 6, 8); }
        x.fillStyle = '#100c22'; x.fillRect(dx + 44, fy - 50, 40, 50); for (let r = 0; r < 20; r++){ const hw = Math.round(Math.sqrt(400 - (20 - r)**2)); x.fillRect(dx + 64 - hw, fy - 70 + r, hw*2, 1); }
        x.fillStyle = '#6b3f1f'; x.fillRect(dx + 47, fy - 47, 34, 47); x.fillStyle = '#4e2c14'; for (let i = dx + 52; i < dx + 80; i += 7) x.fillRect(i, fy - 47, 1, 47); x.fillStyle = '#5a5e76'; x.fillRect(dx + 47, fy - 38, 34, 2); x.fillRect(dx + 47, fy - 16, 34, 2); x.fillStyle = '#ffd23f'; x.fillRect(dx + 74, fy - 26, 3, 3);   // big castle door
        for (const bx of [dx + 22, dx + 100]){ x.fillStyle = '#c0283a'; x.fillRect(bx, fy - 110, 14, 34); x.fillStyle = '#ffd23f'; x.fillRect(bx + 5, fy - 100, 4, 6); x.fillStyle = '#c0283a'; for (let r = 0; r < 5; r++){ x.fillRect(bx, fy - 76 + r, 7 - r, 1); x.fillRect(bx + 7 + r, fy - 76 + r, 7 - r, 1); } } } }
    x.fillStyle = k; for (const bx of [x0 + 2, x1 - 7]){ x.fillRect(bx, fy - 9, 6, 9); x.fillStyle = '#6b4a30'; x.fillRect(bx + 1, fy - 8, 4, 8); x.fillStyle = '#e8d8b0'; x.fillRect(bx, fy - 6, 6, 1); x.fillStyle = k; } } }   // mooring posts
function drawTorch(x, lx, fy, ph){ const k = '#1a1030', fl = Math.round(Math.sin(ph*12)*1.5);   // wall torch: iron bracket, wooden handle, flickering flame
  x.fillStyle = k; x.fillRect(lx - 2, fy + 2, 5, 14); x.fillStyle = '#6b3f1f'; x.fillRect(lx - 1, fy + 3, 3, 12); x.fillStyle = '#5a5e76'; x.fillRect(lx - 4, fy + 2, 9, 2); x.fillRect(lx - 3, fy + 12, 7, 2);
  x.fillStyle = '#ff6a30'; x.fillRect(lx - 3, fy - 6 + fl, 7, 8 - fl); x.fillRect(lx - 1, fy - 9 + fl, 3, 3); x.fillStyle = '#ffb040'; x.fillRect(lx - 2, fy - 4, 5, 6); x.fillStyle = '#fff3a0'; x.fillRect(lx - 1, fy - 2, 3, 3); }
function drawHelm(x, bx, y, i){ const k = '#1a1030'; x.fillStyle = k; x.fillRect(bx, y - 10, 11, 10); x.fillRect(bx + 1, y - 11, 9, 1); x.fillStyle = '#9aa0b4'; x.fillRect(bx + 1, y - 10, 9, 10); x.fillStyle = '#d0d4e4'; x.fillRect(bx + 2, y - 9, 2, 4);
  x.fillStyle = k; x.fillRect(bx + 3, y - 6, 6, 1); x.fillRect(bx + 3, y - 4, 6, 1); x.fillStyle = '#5a5e76'; x.fillRect(bx + 5, y - 10, 1, 3);
  if (i % 2){ x.fillStyle = '#c0283a'; x.fillRect(bx + 4, y - 15, 3, 5); x.fillRect(bx + 7, y - 14, 2, 2); } }
function drawShield(x, px, py, s){ const k = '#1a1030', col = ['#3a6ee8', '#c0283a', '#3a9a5a'][s % 3];
  x.fillStyle = '#5a5e76'; x.fillRect(px + 5, py - 6, 2, 6); x.fillStyle = k; x.fillRect(px - 1, py - 1, 14, 12); for (let r = 0; r < 6; r++) x.fillRect(px - 1 + r, py + 11 + r, 14 - r*2, 1);
  x.fillStyle = col; x.fillRect(px, py, 12, 11); for (let r = 0; r < 5; r++) x.fillRect(px + r + 1, py + 11 + r, 10 - r*2, 1); x.fillStyle = '#ffd23f'; x.fillRect(px + 5, py + 1, 2, 13); x.fillRect(px + 1, py + 4, 10, 2); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 1, py + 1, 3, 2); }
function drawArmorStand(x, px, fy, i){ const k = '#1a1030', s = '#737990', S = '#4a4e66', hl = '#a4aabe';   // a bit dimmer than Sir Clanks-a-Lot so the real bad guy stands out   // a suit of armor on a wooden stand, with a pair of boots
  x.fillStyle = k; x.fillRect(px + 4, fy - 4, 12, 4); x.fillStyle = '#5a3416'; x.fillRect(px + 5, fy - 3, 10, 2); x.fillRect(px + 9, fy - 12, 2, 8);
  x.fillStyle = k; x.fillRect(px + 3, fy - 32, 14, 20); x.fillStyle = s; x.fillRect(px + 4, fy - 31, 12, 18); x.fillStyle = hl; x.fillRect(px + 5, fy - 30, 2, 15); x.fillStyle = S; x.fillRect(px + 4, fy - 22, 12, 1); x.fillRect(px + 10, fy - 31, 1, 9);
  x.fillStyle = k; x.fillRect(px, fy - 31, 4, 14); x.fillRect(px + 16, fy - 31, 4, 14); x.fillStyle = S; x.fillRect(px + 1, fy - 30, 2, 12); x.fillRect(px + 17, fy - 30, 2, 12);
  x.fillStyle = k; x.fillRect(px + 5, fy - 43, 10, 11); x.fillStyle = s; x.fillRect(px + 6, fy - 42, 8, 9); x.fillStyle = k; x.fillRect(px + 7, fy - 39, 6, 2); x.fillStyle = hl; x.fillRect(px + 6, fy - 42, 2, 2);
  x.fillStyle = i % 2 ? '#3a6ee8' : '#c0283a'; x.fillRect(px + 9, fy - 48, 3, 5); x.fillRect(px + 11, fy - 47, 3, 2);
  x.fillStyle = '#4a3020'; x.fillRect(px + 1, fy - 6, 6, 6); x.fillRect(px + 1, fy - 2, 8, 2); x.fillRect(px + 13, fy - 6, 6, 6); x.fillRect(px + 13, fy - 2, 8, 2); x.fillStyle = '#6b4a30'; x.fillRect(px + 2, fy - 6, 2, 3); x.fillRect(px + 14, fy - 6, 2, 3);
  if (i % 3 === 1) drawShield(x, px + 19, fy - 17, i); else if (i % 3 === 2){ x.fillStyle = '#d0d4e4'; x.fillRect(px + 21, fy - 34, 2, 28); x.fillStyle = '#c08a10'; x.fillRect(px + 18, fy - 8, 8, 2); x.fillRect(px + 21, fy - 6, 2, 5); } }   // leaning shield or sword
function drawSpecialDeco(x, cam){ const t = G.t, ws = G.base.indoor === 'workshop', co = G.base.indoor === 'coop', ar = G.base.indoor === 'armory', k = ar ? '#1a1424' : '#2e170a';
  for (const d of G.base.deco){
    if (G.base.port){ drawPortDeco(x, d, cam); continue; }
    if (d.k === 'lantern'){ const lx = Math.round(d.x*TS + 8 - cam), sw = Math.round(Math.sin(t*1.5 + d.x)*2); if (lx < -20 || lx > W + 20) continue;
      if (ar){ drawTorch(x, lx, d.len + 6, t + d.x); continue; }   // the Knight's Closet: wall torches instead of hanging lanterns
      x.fillStyle = '#1a1030'; x.fillRect(lx, 0, 1, d.len); const cx = lx + sw, cy = d.len;
      if (co){ x.fillStyle = '#1a1030'; x.fillRect(cx - 6, cy, 13, 6); x.fillStyle = '#b8bcc8'; x.fillRect(cx - 5, cy + 1, 11, 4); x.fillStyle = '#e0e4ec'; x.fillRect(cx - 4, cy + 1, 4, 1);   // warm heat lamp: metal dome + glowing bulb
        x.fillStyle = Math.sin(t*7 + d.x) > -.8 ? '#ff8c42' : '#ff6a30'; x.fillRect(cx - 2, cy + 5, 5, 4); x.fillStyle = '#fff3a0'; x.fillRect(cx - 1, cy + 5, 2, 2); }
      else if (ws){ x.fillStyle = '#ffd23f'; x.fillRect(cx - 4, cy + 3, 9, 3); x.fillRect(cx - 1, cy, 3, 9); x.fillRect(cx - 3, cy + 1, 7, 7); x.fillStyle = '#fff3a0'; x.fillRect(cx - 1, cy + 3, 3, 3); }   // glowing star ornament
      else { x.fillStyle = '#1a1030'; x.fillRect(cx - 4, cy, 9, 11); x.fillStyle = '#4a4e66'; x.fillRect(cx - 3, cy, 7, 2); x.fillRect(cx - 3, cy + 9, 7, 2); x.fillStyle = Math.sin(t*9 + d.x) > -.7 ? '#ffd23f' : '#ffb040'; x.fillRect(cx - 2, cy + 2, 5, 7); x.fillStyle = '#fff3a0'; x.fillRect(cx - 1, cy + 4, 2, 3); } }
    else if (d.k === 'ladder'){ const lx = Math.round(d.x*TS + 3 - cam); if (lx < -16 || lx > W + 16) continue; const y0 = d.y0*TS, y1 = d.y1*TS;
      x.fillStyle = k; x.fillRect(lx - 1, y0, 3, y1 - y0); x.fillRect(lx + 9, y0, 3, y1 - y0); x.fillStyle = '#c8a878'; x.fillRect(lx, y0, 1, y1 - y0); x.fillRect(lx + 10, y0, 1, y1 - y0); for (let y = y0 + 6; y < y1; y += 8){ x.fillStyle = k; x.fillRect(lx, y - 1, 11, 3); x.fillStyle = '#c8a878'; x.fillRect(lx, y, 11, 1); } }
    else { const x0 = Math.round(d.x0*TS - cam), x1 = Math.round((d.x1 + 1)*TS - cam); if ((d.k !== 'chute' && (x1 < -20 || x0 > W + 20))) continue;
      if (d.k === 'armor'){ const fy = 12*TS; for (let px = x0 + 6, i = 0; px < x1 - 18; px += 30, i++) drawArmorStand(x, px, fy, i + d.x0); }   // suits of armor on stands, boots, a leaning shield
      else if (d.k === 'capes'){ const cx = Math.round(d.x*TS - cam); if (cx < -40 || cx > W + 40) continue; const ry = d.y1 - 30;   // capes on a hanging rod over a gap
        x.fillStyle = '#1a1030'; x.fillRect(cx - 1, 0, 2, ry); x.fillRect(cx - 22, ry, 44, 3); x.fillStyle = '#9aa0b4'; x.fillRect(cx - 21, ry, 42, 1);
        [[-20, '#8a1a2a'], [-6, '#5a1a6a'], [8, '#1f5a8a']].forEach(([o, col], i) => { const sw = Math.sin(t*1.4 + i); x.fillStyle = col; for (let r = 0; r < 30; r++){ const hw = 5 + Math.round(r*.12); x.fillRect(cx + o + 6 - hw + Math.round(sw*r/20), ry + 3 + r, hw*2, 1); } x.fillStyle = '#ffd23f'; x.fillRect(cx + o + 1, ry + 3, 10, 1); }); }
      else if (d.k === 'helms'){ const y = d.y*TS; x.fillStyle = k; x.fillRect(x0 + 2, y + 6, 3, 12*TS - y - 6); x.fillRect(x1 - 5, y + 6, 3, 12*TS - y - 6); for (let bx = x0 + 6, i = 0; bx < x1 - 10; bx += 15, i++) drawHelm(x, bx, y, i); }   // helmet shelf
      else if (d.k === 'shields'){ for (const [sx2, sy2] of d.at) drawShield(x, Math.round(sx2*TS - cam) + 2, sy2*TS + 7, sx2); }   // shields hung under the rack shelves
      else if (d.k === 'nests'){ const fy = 12*TS; for (let px = x0 + 4, i = 0; px < x1 - 18; px += 22, i++){ x.fillStyle = k; x.fillRect(px, fy - 20, 20, 20); x.fillStyle = '#a8703c'; x.fillRect(px + 1, fy - 19, 18, 18);   // nesting boxes on the floor
          x.fillStyle = '#2a1608'; x.fillRect(px + 3, fy - 16, 14, 11); x.fillStyle = '#e8c050'; x.fillRect(px + 3, fy - 9, 14, 4);
          if (i % 2){ drawHen(x, px + 10, fy - 6, 1, false, false); } else { x.fillStyle = '#fff6e8'; x.fillRect(px + 6, fy - 11, 4, 5); x.fillStyle = '#e0b080'; x.fillRect(px + 11, fy - 10, 4, 4); } } }
      else if (d.k === 'hen' && !G.megaFrom?.has(d)){ const h = henAt(d, t), sx = h.x - cam; if (sx < -20 || sx > W + 20) continue; drawHen(x, sx, 12*TS, h.face, h.peck); }
      else if (d.k === 'feeder'){ const cx = Math.round(d.x*TS - cam); if (cx < -30 || cx > W + 30) continue;   // hanging grain feeder over a gap, grain trickling down
        x.fillStyle = '#1a1030'; x.fillRect(cx, 0, 1, d.y1 - 18); x.fillRect(cx - 9, d.y1 - 18, 18, 16); x.fillStyle = '#b8bcc8'; x.fillRect(cx - 8, d.y1 - 17, 16, 14); x.fillStyle = '#e0e4ec'; x.fillRect(cx - 6, d.y1 - 17, 3, 14);
        x.fillStyle = '#1a1030'; x.fillRect(cx - 12, d.y1 - 3, 24, 4); x.fillStyle = '#9aa0b4'; x.fillRect(cx - 11, d.y1 - 2, 22, 2);
        for (let i = 0; i < 6; i++){ const fy = d.y1 + ((t*50 + i*37) % 110), fx = cx - 6 + ((i*5) % 12) + Math.round(Math.sin(t*3 + i)*2); x.fillStyle = i % 2 ? '#ffe070' : '#c89040'; x.fillRect(fx, Math.round(fy), 2, 1); } }
      else if (d.k === 'stall'){ const fy = 12*TS; for (let px = x0; px < x1; px += 34){ const pw = Math.min(30, x1 - px); x.fillStyle = k; x.fillRect(px, fy - 30, pw, 30); x.fillStyle = '#7a3a22'; x.fillRect(px + 1, fy - 29, pw - 2, 28);   // stall half-walls with an X brace
        x.fillStyle = '#a8542e'; for (let i = 0; i < pw - 4; i++){ x.fillRect(px + 2 + i, fy - 28 + Math.round(i*24/(pw - 4)), 2, 2); x.fillRect(px + 2 + i, fy - 4 - Math.round(i*24/(pw - 4)), 2, 2); } x.fillStyle = k; x.fillRect(px - 2, fy - 34, 4, 34); } }
      else if (d.k === 'bench'){ const fy = 12*TS, by = fy - 22; x.fillStyle = k; x.fillRect(x0 + 4, by, x1 - x0 - 8, 5); x.fillRect(x0 + 8, by + 5, 3, 17); x.fillRect(x1 - 12, by + 5, 3, 17); x.fillStyle = '#c8925a'; x.fillRect(x0 + 5, by + 1, x1 - x0 - 10, 2);   // workbench + half-built toys
        x.fillStyle = '#e83a4a'; x.fillRect(x0 + 16, by - 6, 8, 6); x.fillStyle = '#ffd23f'; x.fillRect(x0 + 17, by - 8, 6, 2); x.fillStyle = '#9aa0b4'; x.fillRect(x0 + 34, by - 2, 10, 2); x.fillRect(x0 + 42, by - 5, 3, 5);
        x.fillStyle = '#4d9de0'; x.fillRect(x1 - 40, by - 7, 12, 7); x.fillStyle = '#1a1030'; x.fillRect(x1 - 38, by - 1, 2, 1); x.fillRect(x1 - 32, by - 1, 2, 1); }
      else if (d.k === 'roost' || d.k === 'shelf'){ const y = d.y*TS; x.fillStyle = k; x.fillRect(x0 + 2, y + 6, 3, 12*TS - y - 6); x.fillRect(x1 - 5, y + 6, 3, 12*TS - y - 6);
        if (d.k === 'roost'){ for (let bx = x0 + 10; bx < x1 - 12; bx += 22){ x.fillStyle = k; x.fillRect(bx, y + 7, 16, 12); x.fillStyle = '#7a3a22'; x.fillRect(bx + 1, y + 8, 14, 10); x.fillStyle = '#e8c050'; x.fillRect(bx + 2, y + 13, 12, 4); x.fillStyle = '#ffffff'; x.fillRect(bx + 6, y + 11, 4, 4); } }   // nesting boxes with eggs
        else { const c = ['#e83a4a','#3ddc84','#4d9de0','#ffd23f']; for (let bx = x0 + 8, i = 0; bx < x1 - 10; bx += 16, i++){ x.fillStyle = c[i % 4]; x.fillRect(bx, y - 8, 8, 8); x.fillStyle = '#ffffff'; x.fillRect(bx + 3, y - 8, 2, 8); } } }
      else if (d.k === 'loft'){ const y = d.y*TS; x.fillStyle = 'rgba(26,16,48,.35)'; x.fillRect(x0, y + 6, x1 - x0, 3); if (ar){ for (let bx = x0 + 8, i = 0; bx < x1 - 12; bx += 28, i++) drawHelm(x, bx, y, i + 1); } else if (!ws){ x.fillStyle = '#e8c050'; for (let bx = x0 + 6; bx < x1 - 6; bx += 10) x.fillRect(bx, y - 3, 6, 3); } }
      else if (d.k === 'chute'){ const cx = Math.round(d.x*TS - cam); if (cx < -30 || cx > W + 30) continue;
        x.fillStyle = k; x.fillRect(cx - 9, 0, 18, d.y1); x.fillStyle = ws ? '#ffffff' : '#8a5a2a'; x.fillRect(cx - 8, 0, 16, d.y1 - 1); if (ws){ x.fillStyle = '#e83a4a'; for (let y = 0; y < d.y1; y += 6) x.fillRect(cx - 8, y, 16, 3); }
        x.fillStyle = k; x.fillRect(cx - 10, d.y1 - 3, 20, 4);
        for (let i = 0; i < 6; i++){ const fy = d.y1 + ((t*60 + i*37) % 120), fx = cx - 6 + ((i*5) % 12) + Math.round(Math.sin(t*3 + i)*2); x.fillStyle = ws ? ['#ffd23f','#ff4f79','#7cc0ff'][i % 3] : (i % 2 ? '#ffe070' : '#e8c050'); x.fillRect(fx, Math.round(fy), ws ? 2 : 3, ws ? 2 : 1); } } } }
}
function indoorLight(x, cam){ const L = G.th.indoor, k = '#1e0e06';
  x.fillStyle = L.dark; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter'; for (const d of G.base.deco){ if (d.k !== 'lantern') continue; const lx = Math.round(d.x*TS + 8 - cam), ly = d.len + 6; if (lx < -60 || lx > W + 60) continue;
    for (const [r, a] of [[46, .05], [30, .07], [16, .09]]){ x.globalAlpha = a; x.fillStyle = L.glow; for (let i = -r; i <= r; i += 2){ const hw = Math.round(Math.sqrt(r*r - i*i)); x.fillRect(lx - hw, ly + i, hw*2, 2); } } }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  if (G.base.indoor === 'armory'){ x.fillStyle = '#1a1424'; x.fillRect(0, 0, W, 6); for (let bx = -((Math.round(cam) % 64) + 64) % 64; bx < W; bx += 64){ x.fillRect(bx, 0, 12, 10); x.fillStyle = '#4a4458'; x.fillRect(bx + 1, 0, 10, 1); x.fillRect(bx + 2, 8, 8, 1); x.fillStyle = '#1a1424'; } return; }   // stone vault ribs
  x.fillStyle = k; x.fillRect(0, 0, W, 6); for (let bx = -((Math.round(cam) % 64) + 64) % 64; bx < W; bx += 64){ x.fillRect(bx, 0, 10, 12); x.fillStyle = '#4e2c14'; x.fillRect(bx + 1, 0, 2, 11); x.fillStyle = k; }   // roof beams
  if (G.base.indoor === 'workshop'){ for (let i = 0; i < W; i += 4){ const y = 7 + Math.round(Math.abs(Math.sin((i + cam)/40))*3); x.fillStyle = '#237a34'; x.fillRect(i, y, 4, 3); } } }
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
  else if (fx === 'gulls'){ for (let i = 0; i < 4; i++){ const span = W + 40, bx = Math.round((((i*137 + G.t*(12 + i*3) - cam*.2) % span) + span) % span - 20), by = Math.round(36 + i*15 + Math.sin(G.t*2 + i)*4), up = Math.floor(G.t*5 + i) % 2;
    x.fillStyle = '#2a1650'; x.fillRect(bx - 4, by - up, 3, 1); x.fillRect(bx + 2, by - up, 3, 1); x.fillRect(bx - 1, by, 3, 1); } }
  else if (fx === 'hay'){ x.fillStyle = 'rgba(255,224,112,.7)'; for (let i = 0; i < 16; i++){ const sx = ((i*67 + Math.sin(G.t*.7 + i)*16 - cam*.4) % W + W) % W, sy = (i*41 + G.t*(5 + i % 4)) % H; x.fillRect(Math.round(sx), Math.round(sy), 1, 1); } }
  else if (fx === 'feathers'){ for (let i = 0; i < 9; i++){ const sx = ((i*89 + Math.sin(G.t*1.1 + i)*14 - cam*.45) % W + W) % W, sy = (i*53 + G.t*(7 + i % 3*2)) % H, tilt = Math.sin(G.t*1.6 + i) > 0;   // drifting feathers
    x.fillStyle = 'rgba(255,250,240,.85)'; x.fillRect(Math.round(sx), Math.round(sy), 3, 1); x.fillRect(Math.round(sx) + (tilt ? 1 : 0), Math.round(sy) + 1, 2, 1); x.fillStyle = 'rgba(200,190,170,.8)'; x.fillRect(Math.round(sx) + (tilt ? 3 : -1), Math.round(sy), 1, 1); } }
  else if (fx === 'sparkle'){ for (let i = 0; i < 10; i++){ if (Math.sin(G.t*2.4 + i*1.9) > .8){ x.fillStyle = '#ffffff'; const sx = ((i*83 - cam*.3) % W + W) % W, sy = 20 + (i*29) % 120; x.fillRect(Math.round(sx), sy, 1, 3); x.fillRect(Math.round(sx) - 1, sy + 1, 3, 1); } } }
  else if (fx === 'fireflies'){ for (let i = 0; i < 10; i++){ if (Math.sin(G.t*2.2 + i*1.7) < -.2) continue; const sx = Math.round((((i*71 + Math.sin(G.t*.8 + i*2)*18 - cam*.35) % W) + W) % W), sy = Math.round(104 + (i*29) % 80 + Math.sin(G.t*1.3 + i)*6);
    x.fillStyle = 'rgba(200,255,120,.25)'; x.fillRect(sx - 1, sy - 1, 4, 4); x.fillStyle = 'rgba(220,255,140,.95)'; x.fillRect(sx, sy, 2, 2); } }
  else if (fx === 'embers'){ for (let i = 0; i < 12; i++){ const sx = Math.round((((i*67 + Math.sin(G.t*1.5 + i)*10 - cam*.4) % W) + W) % W), sy = Math.round(H - ((i*53 + G.t*(14 + i % 4*4)) % H));
    x.fillStyle = i % 3 ? 'rgba(255,160,64,.85)' : 'rgba(255,230,140,.9)'; x.fillRect(sx, sy, 1, 2); } }
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
  // celebration effects (after a boss): fx = { kind:'unlock'|'final', from, to, e:seconds since start }
  const fx = opts.fx || null, fe = fx ? fx.e : 0, U = fx && fx.kind === 'unlock' && fx.to > 0 && fx.to < n ? fx : null, FIN = fx && fx.kind === 'final' ? fx : null;
  const PATH_T0 = .35, PATH_T1 = 1.65, pathP = U ? clamp((fe - PATH_T0)/(PATH_T1 - PATH_T0), 0, 1) : 1;
  const curve = (a, b, s) => ({ x:a.x + (b.x - a.x)*s, y:a.y + (b.y - a.y)*s + Math.sin(s*Math.PI)*10 });
  const ring = (cx, cy, rx, ry, col, k, a0, sz = 3) => { x.fillStyle = col; for (let j = 0; j < k; j++){ const a = a0 + j/k*Math.PI*2; x.fillRect(Math.round(cx + Math.cos(a)*rx) - (sz >> 1), Math.round(cy + Math.sin(a)*ry) - (sz >> 1), sz, sz); } };
  if (FIN) SP.text(x, 'ALL CLEAR!', Math.round(W/2 - SP.textWidth('ALL CLEAR!', 2)/2), 10, Math.floor(fe*4) % 2 ? '#ff4f79' : '#ffd23f', '#1a1030', 2);
  // dotted path (the path to a newly unlocked world draws itself in gold, dot by dot)
  for (let i = 0; i < n - 1; i++){ const a = pos[i], b = pos[i+1], drawing = U && i === U.to - 1;
    for (let s = 0; s <= 1; s += .06){ if (drawing && s > pathP) break; const { x:px, y:py } = curve(a, b, s);
      x.fillStyle = '#1a1030'; x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5); x.fillStyle = drawing ? '#ffd23f' : '#ffe9a0'; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); }
    if (drawing && pathP > 0 && pathP < 1){ const h = curve(a, b, pathP); ring(h.x, h.y, 6, 6, '#ffffff', 4, fe*8, 2); } }
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
    const lockShown = w.locked || (U && i === U.to && fe < PATH_T1), jig = U && i === U.to && fe > PATH_T1 - .45 ? Math.round(Math.sin(fe*60)*2) : 0;
    if (lockShown){ x.globalAlpha = .55; x.fillStyle = '#1a1030'; for (let r = -15; r <= 15; r++){ const hw = Math.round(Math.sqrt(1 - (r/16)*(r/16))*54); x.fillRect(cx - hw, cy + r, hw*2, 1); } x.globalAlpha = 1;
      const R = (a, b, ww, hh, c) => { x.fillStyle = c; x.fillRect(cx + a + jig, cy + b, ww, hh); };
      R(-8, -14, 16, 2, '#1a1030'); R(-8, -14, 2, 8, '#1a1030'); R(6, -14, 2, 8, '#1a1030'); R(-6, -12, 2, 6, '#c8c8d8'); R(4, -12, 2, 6, '#c8c8d8'); R(-6, -14, 12, 2, '#c8c8d8');
      R(-11, -6, 22, 16, '#1a1030'); R(-10, -5, 20, 14, '#ffd23f'); R(-2, -2, 4, 5, '#1a1030'); R(-1, 3, 2, 3, '#1a1030'); }
    hits.push({ id:w.id, x:cx - 58, y:cy - 42, w:116, h:76 });
  });
  // unlock: the lock bursts, the island pops and then glows; final: every island glows in turn + fireworks
  if (U){ const b = pos[U.to], k = fe - PATH_T1;
    if (k > 0 && k < .5){ const sc = 1 + .22*Math.sin(Math.PI*k/.5), sw = 124, sh = 88, tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh;
      tmp.getContext('2d').drawImage(canvas, b.x - sw/2, b.y - 46, sw, sh, 0, 0, sw, sh); x.drawImage(tmp, Math.round(b.x - sw*sc/2), Math.round(b.y - 4 - 42*sc), Math.round(sw*sc), Math.round(sh*sc)); }
    if (k > 0 && k < .7) ring(b.x, b.y - 4, 8 + k*90, 6 + k*40, ['#ffd23f','#ffffff','#ff4f79'][Math.floor(k*12) % 3], 12, k*3);
    if (k > 0 && k < 9){ const pulse = .5 + .5*Math.sin(fe*6); x.globalAlpha = .55 + .45*pulse; ring(b.x, b.y, 62 + pulse*3, 22 + pulse, '#ffd23f', 28, fe*.8); ring(b.x, b.y, 66 + pulse*3, 25 + pulse, '#ffffff', 6, -fe*1.6, 2); x.globalAlpha = 1; } }
  if (FIN){ pos.forEach((b, i) => { const k = fe - i*.3; if (k > 0){ const pulse = .5 + .5*Math.sin(fe*6 + i); x.globalAlpha = .55 + .45*pulse; ring(b.x, b.y, 62 + pulse*3, 22 + pulse, ['#ffd23f','#ff4f79','#7cc0ff','#9ff0c8','#c9b6ff'][i % 5], 28, fe*.8 + i); x.globalAlpha = 1; } });
    for (let j = 0; j < 6; j++){ const k = (fe + j*.37) % 1.6, bx = 30 + ((j*97) % 196), by = 40 + ((j*151) % Math.max(60, h - 120)); if (k < 1.1) ring(bx, by, 4 + k*26, 4 + k*26, ['#ffd23f','#ff4f79','#ffffff','#9ff0c8'][j % 4], 10, j, k < .7 ? 3 : 2); } }
  if (opts.hero){ const cur = Math.max(0, worlds.findIndex(w => w.id === opts.current)), f = SP.heroFrames(opts.hero.inst, opts.hero.hair);
    let pp = pos[cur], walk = false; if (U && pathP < 1){ pp = curve(pos[U.to - 1], pos[U.to], pathP); walk = pathP > 0; }
    const fr = walk ? (Math.floor(fe*8) % 2 ? f.run1 : f.run2) : f.stand, face = U && walk && pos[U.to].x < pos[U.to - 1].x ? fr.l : fr.r;
    x.drawImage(face, Math.round(pp.x - 44), Math.round(pp.y - 6 + (walk ? 0 : Math.sin(t*4)))); }
  return hits;
}

window.PQGame = { SPECIAL, SHIP, MOAT, SKEL, BUBBLE, ARMOR, TANGO, BONES, CHAIN, MEGA, HIDDEN, audio:{ ctx:() => ac(), want:wantAudio, status:audioStatus, test:testSound, reset:resetAudio, onChange(f){ AUD.listeners.add(f); return () => AUD.listeners.delete(f); } },
  finale:{ start:on => Finale.start(on), stop:() => Finale.stop(), get playing(){ return !!Finale.timer; } }, start, stop, quit, togglePause, drawOverworld, themeOf, THEMES:Object.keys(THEMES), stats, get running(){ return !!G; },
  debug:{ get G(){ return G; }, reachSolver, addHiddenBlocks, get audio(){ return AC; }, get music(){ return { playing:!!Music.timer, wiz:!!(Music.song && Music.song.wiz), step:Music.step }; }, deaths, input, run(n){ for (let i = 0; i < n && G && !G.done; i++){ if (!G.paused) step(1/60); } }, step(dt){ if (G && !G.done && !G.paused) step(dt); }, draw(){ if (G) draw(); } } };
})();
