/* Band Quest — hidden teacher screen (open the app with ?teacher). Builds a new pieces.json; no server involved. */
window.PQTeacher = { open(cfg){
  const $ = s => document.querySelector(s);
  const WORK_KEY = 'practiceQuest.teacherWork';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'piece';
  const live = JSON.parse(JSON.stringify(cfg.raw));
  let data; try { data = JSON.parse(localStorage.getItem(WORK_KEY)); } catch(e){}
  if (!data || !Array.isArray(data.pieces)) data = JSON.parse(JSON.stringify(live));
  data.settings = data.settings || {}; if (!data.settings.teacherPin) data.settings.teacherPin = cfg.pin;
  let editing = -1;
  const form = $('#t-form');
  $('#screen-teacher').hidden = false;
  const TH = { snow:'❄️ Snowy mountains', farm:'🐄 Farm', candy:'🍬 Candy fortress', castle:'🏰 Fantasy castle', haunted:'👻 Haunted ballroom', meadow:'🌼 Meadow (generic)' };
  const EN = { imp:'Frost imp', chicken:'Rubber chicken', ginger:'Gingerbread', wisp:'Star wisp (flies)', ghost:'Tango ghost (flies)', gremlin:'Sour-note gremlin (generic)' };
  const BO = { valkyrie:'Winged Valkyrie', cluckzilla:'Admiral chicken', santa:'Barbarian Santa', dragon:'Dragon', spectro:'Ghost in a hat', golem:'Stone golem (generic)' };
  const opts = (o, keys) => keys.map(k => `<option value="${k}">${o[k] || k}</option>`).join('');
  $('#t-wtheme').innerHTML = opts(TH, window.PQGame ? PQGame.THEMES : Object.keys(TH));
  $('#t-wenemy').innerHTML = opts(EN, window.PQSprites ? PQSprites.ENEMIES : Object.keys(EN));
  $('#t-wboss').innerHTML = opts(BO, window.PQSprites ? PQSprites.BOSSES : Object.keys(BO));

  const unlock = () => { $('#t-pin-form').hidden = true; $('#t-editor').hidden = false; render(); };
  $('#t-pin-form').onsubmit = e => { e.preventDefault();
    if ($('#t-pin').value.trim() === cfg.pin){ sessionStorage.setItem('pqTeacherOK','1'); unlock(); } else { $('#t-pin-err').hidden = false; $('#t-pin').value = ''; } };

  const json = () => JSON.stringify(data, null, 2) + '\n';
  function persist(){ localStorage.setItem(WORK_KEY, JSON.stringify(data)); }
  function render(){
    $('#t-list').innerHTML = data.pieces.map((p,i) => `<li><div>${esc(p.bossEmoji)} <b>${i+1}. ${esc(p.title)}</b><div class="meta">${esc(p.composer)} · ${esc((p.world && p.world.theme) || 'meadow')} world${cfg.ytId(p.youtube)?' · ▶ video':' · <b>no video</b>'}</div></div>
      <div class="t-acts"><button class="chip" data-up="${i}" aria-label="move up" ${i?'':'disabled'}>↑</button><button class="chip" data-edit="${i}" aria-label="edit">✏️</button><button class="chip" data-del="${i}" aria-label="delete">🗑</button></div></li>`).join('') || '<li class="empty">No pieces yet.</li>';
    $('#t-json').value = json(); $('#t-newpin').value = data.settings.teacherPin;
    const previewing = !!localStorage.getItem(cfg.draftKey);
    $('#t-draft-note').hidden = !previewing; $('#t-unpreview').hidden = !previewing;
  }
  function fillForm(p){
    const f = form.elements;
    for (const k of ['title','composer','publisher','boss','bossEmoji','blurb','youtube','channel']) f[k].value = p[k] || '';
    f.color.value = /^#[0-9a-f]{6}$/i.test(p.color||'') ? p.color : '#ffd23f';
    const w = p.world || {}; f.wTheme.value = w.theme || 'meadow'; f.wEnemy.value = w.enemy || 'gremlin'; f.wBoss.value = w.boss || 'golem';
    f.wUseSky.checked = !!(w.colors && w.colors.sky); f.wSky.value = (w.colors && w.colors.sky) || '#000000';
    f.badgeName.value = (p.badge && p.badge.name) || ''; f.badgeEmoji.value = (p.badge && p.badge.emoji) || '';
    syncForm();
  }
  function syncForm(){
    const f = form.elements;
    const u = f.youtube.value.trim(), id = cfg.ytId(u);
    $('#t-yt-note').innerHTML = !u ? 'Optional. Paste a watch, youtu.be or shorts link.' : id ? `✅ Video ID <b>${id}</b> — <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">check it</a>` : '⚠️ That doesn’t look like a YouTube video link.';
  }
  form.addEventListener('input', syncForm);
  function resetForm(){ editing = -1; form.reset(); form.elements.color.value = '#ffd23f'; form.elements.wTheme.value = 'meadow'; form.elements.wEnemy.value = 'gremlin'; form.elements.wBoss.value = 'golem'; $('#t-form-title').textContent = '➕ Add a piece'; $('#t-save').textContent = 'Add piece ➕'; $('#t-cancel').hidden = true; syncForm(); }
  $('#t-cancel').onclick = resetForm;
  form.onsubmit = e => {
    e.preventDefault(); const f = form.elements, v = k => f[k].value.trim();
    if (v('youtube') && !cfg.ytId(v('youtube'))){ alert('That YouTube link doesn’t look right. Fix it or leave it blank.'); return; }
    const old = editing >= 0 ? data.pieces[editing] : null;
    let id = old ? old.id : slug(v('title')); // keep ids stable so students keep their game progress
    if (!old){ const base = id; let n = 2; while (data.pieces.some(p => p.id === id)) id = `${base}-${n++}`; }
    const p = { id, title:v('title'), composer:v('composer'), publisher:v('publisher'), boss:v('boss'), bossEmoji:v('bossEmoji'),
      color:f.color.value, blurb:v('blurb'), youtube: v('youtube') ? `https://www.youtube.com/watch?v=${cfg.ytId(v('youtube'))}` : '',
      channel:v('channel') };
    p.world = { theme:f.wTheme.value, enemy:f.wEnemy.value, boss:f.wBoss.value }; if (f.wUseSky.checked) p.world.colors = { sky:f.wSky.value };
    p.badge = { name: v('badgeName') || `${v('title')} Champion`, emoji: v('badgeEmoji') || '🏅' };
    if (old) data.pieces[editing] = p; else data.pieces.push(p);
    persist(); render(); resetForm();
    toast(old ? '✅ Piece updated. Download the new pieces.json below.' : '✅ Piece added. Download the new pieces.json below.');
  };
  $('#t-list').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit){ editing = +b.dataset.edit; fillForm(data.pieces[editing]); $('#t-form-title').textContent = '✏️ Edit piece'; $('#t-save').textContent = 'Save changes ✔'; $('#t-cancel').hidden = false; form.scrollIntoView({behavior:'smooth'}); }
    if (b.dataset.del){ const i = +b.dataset.del; if (confirm(`Remove “${data.pieces[i].title}”? Students lose that world when you deploy.`)){ data.pieces.splice(i,1); persist(); render(); resetForm(); } }
    if (b.dataset.up){ const i = +b.dataset.up; [data.pieces[i-1], data.pieces[i]] = [data.pieces[i], data.pieces[i-1]]; persist(); render(); }
  });
  $('#t-newpin').addEventListener('change', e => { const v = e.target.value.trim(); if (v){ data.settings.teacherPin = v; persist(); render(); } });
  const file = () => new File([json()], 'pieces.json', { type:'application/json' });
  $('#t-download').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(file()); a.download = 'pieces.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  $('#t-share').onclick = async () => {
    const f = file();
    if (navigator.canShare && navigator.canShare({ files:[f] })){ try { await navigator.share({ files:[f], title:'pieces.json' }); } catch(e){} }
    else toast('Sharing files isn’t supported here — use Download or Copy instead.');
  };
  $('#t-copy').onclick = async () => { try { await navigator.clipboard.writeText(json()); toast('📋 Copied!'); } catch(e){ $('#t-json').select(); toast('Select-all is on — copy it manually.'); } };
  $('#t-preview').onclick = () => { localStorage.setItem(cfg.draftKey, json()); toast('🧪 Preview on. Open the student app (← Back) to try it. Only this phone sees it.'); render(); };
  $('#t-unpreview').onclick = () => { localStorage.removeItem(cfg.draftKey); toast('Preview off — this phone uses the live pieces.json again.'); render(); };
  $('#t-revert').onclick = async () => {
    if (!confirm('Throw away your edits and reload the live pieces.json?')) return;
    localStorage.removeItem(WORK_KEY);
    try { data = await (await fetch('pieces.json', { cache:'no-cache' })).json(); } catch(e){ data = JSON.parse(JSON.stringify(live)); }
    data.settings = data.settings || { teacherPin:cfg.pin }; render(); resetForm();
  };
  let tt; function toast(m){ const t = $('#toast'); t.innerHTML = `<span>${esc(m)}</span>`; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 3500); }
  resetForm();
  if (sessionStorage.getItem('pqTeacherOK') === '1') unlock();
}};
