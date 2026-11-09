// Poznámky – rychlé zápisky, štítky, připnutí, barvy a propojení se školou / projekty / složkami.
import { db } from '../store.js';
import { esc, icon, empty, SWATCHES, confirmSheet, toast, fmtDay, openForm } from '../ui.js';
import { noteCard, newNote, folders, subjects, hustles, pickFiles, fileRow, handleFileAct, thumbUrl, isImage, openFile } from '../common.js';
import { has } from '../mods.js';

let q = '';
let tag = '';
let folder = '';
let editing = null;

export default {
  title: a => a[0] ? 'Poznámka' : 'Poznámky',
  cleanup() {
    if (!editing || location.hash === '#/notes/' + editing) return;
    const n = db.get(editing);
    if (n && !n.title && !n.body) db.del(editing);
    editing = null;
  },
  render(root, args, { go, refresh }) {
    if (args[0]) return editor(root, args[0], go);
    const all = db.all('notes');
    const tags = [...new Set(all.flatMap(n => n.tags || []))].sort((a, b) => a.localeCompare(b, 'cs'));
    const needle = q.trim().toLowerCase();
    const F = folders();
    const S = has('school') ? subjects() : [];
    const inFolder = n => !folder || (folder.startsWith('s:') ? n.subject === folder.slice(2) : n.folder === folder);
    const files = db.all('files');
    const fileText = id => files.filter(f => f.note === id).map(f => f.name).join(' ');
    const list = all.filter(n => inFolder(n) && (!tag || (n.tags || []).includes(tag)) && (!needle || `${n.title} ${n.body} ${(n.tags || []).join(' ')} ${fileText(n.id)}`.toLowerCase().includes(needle)))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || '').localeCompare(a.updated || ''));
    root.innerHTML = `
      <div class="search"><span>${icon('search', 18)}</span><input id="nq" placeholder="Hledat v poznámkách" value="${esc(q)}" autocomplete="off"></div>
      <div class="cal-legend folders">
        <button class="chip sm ${!folder ? 'on' : 'off'}" data-act="folder" data-v="">Vše <small>${all.length}</small></button>
        ${F.map(f => `<button class="chip sm ${folder === f.id ? 'on' : 'off'}" data-act="folder" data-v="${f.id}" style="--c:${f.color || '#9AA7B4'}">${icon('folder', 13)} ${esc(f.name)} <small>${all.filter(n => n.folder === f.id).length}</small></button>`).join('')}
        ${S.map(x => `<button class="chip sm ${folder === 's:' + x.id ? 'on' : 'off'}" data-act="folder" data-v="s:${x.id}" style="--c:${x.color || '#6E8BFF'}">${icon('school', 13)} ${esc(x.name)}</button>`).join('')}
        <button class="chip sm off" data-act="folder-new">${icon('plus', 13)} Složka</button>
      </div>
      ${folder && !folder.startsWith('s:') ? `<p class="small right"><button class="link" data-act="folder-edit">Upravit složku</button></p>` : ''}
      ${tags.length ? `<div class="cal-legend"><button class="chip sm ${!tag ? 'on' : 'off'}" data-act="tag" data-v="">Vše</button>${tags.map(t => `<button class="chip sm ${tag === t ? 'on' : 'off'}" data-act="tag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
      ${list.length ? `<div class="notes-grid">${list.map(noteCard).join('')}</div>` : empty(needle || tag ? 'Nic nenalezeno.' : 'Žádné poznámky. Začni první.', 'Nová poznámka', 'new')}
      <button class="fab" data-act="new" aria-label="Nová poznámka">${icon('plus', 26)}</button>`;
    const inp = root.querySelector('#nq');
    let t;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { q = inp.value; const pos = inp.selectionStart; refresh(); const n = document.querySelector('#nq'); n.focus(); n.setSelectionRange(pos, pos); }, 200); };
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'tag') { tag = b.dataset.v; refresh(); }
      else if (b.dataset.act === 'new') go('notes/' + newNote({ ...(tag ? { tags: [tag] } : {}), ...(folder.startsWith('s:') ? { subject: folder.slice(2) } : folder ? { folder } : {}) }));
      else if (b.dataset.act === 'folder') { folder = b.dataset.v; refresh(); }
      else if (b.dataset.act === 'folder-new') editFolder({}, id => { folder = id; refresh(); });
      else if (b.dataset.act === 'folder-edit') editFolder(db.get(folder) || {}, () => { if (!db.get(folder)) folder = ''; refresh(); });
    };
  }
};

function editor(root, id, go) {
  const n = db.get(id);
  if (!n) { root.innerHTML = empty('Poznámka nenalezena.'); return; }
  editing = id;
  const opt = (list, cur, none) => `<option value="">${none}</option>${list.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;
  root.innerHTML = `
    <section class="note-ed" style="${n.color ? `--c:${n.color}` : ''}">
      <input id="nT" class="note-title" placeholder="Nadpis" value="${esc(n.title || '')}">
      <textarea id="nB" class="note-body" placeholder="Piš…">${esc(n.body || '')}</textarea>
      <div class="field"><label for="nTags">Štítky (oddělené čárkou)</label><input id="nTags" value="${esc((n.tags || []).join(', '))}" placeholder="nápad, metromood, škola"></div>
      <div class="two">
        <div class="field"><label for="nF">Složka</label><select id="nF">${opt(folders(), n.folder, '—')}</select></div>
        ${has('hustles') ? `<div class="field"><label for="nH">Projekt</label><select id="nH">${opt(hustles(), n.hustle, '—')}</select></div>` : (has('school') ? `<div class="field"><label for="nS">Předmět</label><select id="nS">${opt(subjects(), n.subject, '—')}</select></div>` : '')}
      </div>
      ${has('hustles') && has('school') ? `<div class="field"><label for="nS">Předmět</label><select id="nS">${opt(subjects(), n.subject, '—')}</select></div>` : ''}
      <div class="field"><label>Přílohy</label>
        <div class="att-grid" id="nAtt"></div>
        <div class="row-btns tight">
          <button type="button" class="btn ghost sm" data-act="att-cam">${icon('eye', 16)} Vyfotit</button>
          <button type="button" class="btn ghost sm" data-act="att-img">${icon('upload', 16)} Fotky</button>
          <button type="button" class="btn ghost sm" data-act="att-file">${icon('file', 16)} Soubor / PDF</button>
        </div>
      </div>
      <div class="field"><label>Barva</label><div class="swatches">${['', ...SWATCHES].map(c => `<button type="button" class="sw ${c === (n.color || '') ? 'on' : ''}" data-c="${c}" style="--c:${c || 'var(--line)'}" aria-label="${c || 'bez barvy'}"></button>`).join('')}</div></div>
      <div class="row-btns">
        <button class="btn danger ghost" data-act="del">${icon('trash', 18)} Smazat</button>
        <button class="btn ghost" data-act="pin" aria-pressed="${!!n.pinned}">${icon('pin', 18)} ${n.pinned ? 'Odepnout' : 'Připnout'}</button>
        <button class="btn primary" data-act="done">Hotovo</button>
      </div>
      <p class="small muted" id="nSaved">Ukládá se automaticky · vytvořeno ${fmtDay((n.created || new Date().toISOString()).slice(0, 10))}</p>
    </section>`;
  const body = root.querySelector('#nB');
  const grow = () => { body.style.height = 'auto'; body.style.height = Math.max(220, body.scrollHeight) + 'px'; };
  grow();
  let color = n.color || '', pinned = !!n.pinned;
  const save = () => {
    const cur = db.get(id) || n;
    db.put('notes', {
      ...cur,
      title: root.querySelector('#nT').value.trim(),
      body: body.value,
      tags: root.querySelector('#nTags').value.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean),
      folder: root.querySelector('#nF').value, hustle: (root.querySelector('#nH') || {}).value ?? (cur.hustle || ''), subject: (root.querySelector('#nS') || {}).value ?? (cur.subject || ''),
      color, pinned, updated: new Date().toISOString(),
    });
    const s = document.getElementById('nSaved'); if (s) s.textContent = 'Uloženo';
  };
  let t;
  root.oninput = e => { if (e.target === body) grow(); clearTimeout(t); t = setTimeout(save, 500); };
  root.onchange = () => { clearTimeout(t); save(); };
  drawAtt(root, id);
  root.onclick = async e => {
    const at = e.target.closest('[data-act^="att-"],[data-act^="file-"],[data-act="img-open"]');
    if (at) {
      const a = at.dataset.act;
      const redraw = () => { drawAtt(root, id); save(); };
      if (a === 'att-cam') pickFiles({ note: id }, redraw, { accept: 'image/*', capture: 'environment' });
      else if (a === 'att-img') pickFiles({ note: id }, redraw, { accept: 'image/*' });
      else if (a === 'att-file') pickFiles({ note: id }, redraw);
      else if (a === 'img-open') { const f = db.get(at.dataset.id); if (f) openFile(f); }
      else await handleFileAct(a, at.dataset.id, redraw);
      return;
    }
    const sw = e.target.closest('[data-c]');
    if (sw) { color = sw.dataset.c; root.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === sw)); root.querySelector('.note-ed').style.setProperty('--c', color || ''); save(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'pin') { pinned = !pinned; b.innerHTML = `${icon('pin', 18)} ${pinned ? 'Odepnout' : 'Připnout'}`; save(); toast(pinned ? 'Připnuto' : 'Odepnuto'); }
    else if (b.dataset.act === 'done') { clearTimeout(t); save(); history.length > 1 ? history.back() : go('notes'); }
    else if (b.dataset.act === 'del') { if (await confirmSheet('Smazat poznámku?')) { clearTimeout(t); db.del(id); editing = null; go('notes'); } }
  };
}

function drawAtt(root, id) {
  const box = root.querySelector('#nAtt');
  if (!box) return;
  const files = db.filter('files', f => f.note === id).sort((a, b) => (a.added || '').localeCompare(b.added || ''));
  const imgs = files.filter(isImage), other = files.filter(f => !isImage(f));
  box.innerHTML = `${imgs.length ? `<div class="att-imgs">${imgs.map(f => `<button type="button" class="att-img" data-act="img-open" data-id="${f.id}" aria-label="${esc(f.name)}"><img data-fid="${f.id}" alt=""><span class="x" data-act="file-del" data-id="${f.id}" aria-label="Smazat">${icon('x', 12)}</span></button>`).join('')}</div>` : ''}
    ${other.map(fileRow).join('')}
    ${files.length ? '' : '<p class="small muted">Fotky z tabule, PDF z přednášky, cokoli. Ukládá se do tvého cloudu.</p>'}`;
  imgs.forEach(async f => { try { const u = await thumbUrl(f); const im = box.querySelector(`img[data-fid="${f.id}"]`); if (im && u) im.src = u; } catch (e) { /* offline */ } });
}
function editFolder(f = {}, after) {
  openForm({
    title: f.id ? 'Upravit složku' : 'Nová složka',
    fields: [{ k: 'name', label: 'Název', req: true, ph: 'Např. Škola, Nápady, Recepty' }, { k: 'color', label: 'Barva', type: 'color' }],
    values: f,
    onSave: v => { const id = db.put('folders', { ...f, ...v }); after(id); },
    onDelete: f.id ? () => { db.filter('notes', n => n.folder === f.id).forEach(n => db.patch(n.id, { folder: '' })); db.del(f.id); after(); } : null,
  });
}
