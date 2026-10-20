// Poznámky – rychlé zápisky, štítky, připnutí, barvy a propojení se školou / projekty / složkami.
import { db } from '../store.js';
import { esc, icon, empty, SWATCHES, confirmSheet, toast, fmtDay } from '../ui.js';
import { noteCard, newNote, folders, subjects, hustles } from '../common.js';

let q = '';
let tag = '';
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
    const list = all.filter(n => (!tag || (n.tags || []).includes(tag)) && (!needle || `${n.title} ${n.body} ${(n.tags || []).join(' ')}`.toLowerCase().includes(needle)))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || '').localeCompare(a.updated || ''));
    root.innerHTML = `
      <div class="search"><span>${icon('search', 18)}</span><input id="nq" placeholder="Hledat v poznámkách" value="${esc(q)}" autocomplete="off"></div>
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
      else if (b.dataset.act === 'new') go('notes/' + newNote(tag ? { tags: [tag] } : {}));
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
        <div class="field"><label for="nH">Side hustle</label><select id="nH">${opt(hustles(), n.hustle, '—')}</select></div>
      </div>
      <div class="field"><label for="nS">Předmět</label><select id="nS">${opt(subjects(), n.subject, '—')}</select></div>
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
      folder: root.querySelector('#nF').value, hustle: root.querySelector('#nH').value, subject: root.querySelector('#nS').value,
      color, pinned, updated: new Date().toISOString(),
    });
    const s = document.getElementById('nSaved'); if (s) s.textContent = 'Uloženo';
  };
  let t;
  root.oninput = e => { if (e.target === body) grow(); clearTimeout(t); t = setTimeout(save, 500); };
  root.onchange = () => { clearTimeout(t); save(); };
  root.onclick = async e => {
    const sw = e.target.closest('[data-c]');
    if (sw) { color = sw.dataset.c; root.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === sw)); root.querySelector('.note-ed').style.setProperty('--c', color || ''); save(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'pin') { pinned = !pinned; b.innerHTML = `${icon('pin', 18)} ${pinned ? 'Odepnout' : 'Připnout'}`; save(); toast(pinned ? 'Připnuto' : 'Odepnuto'); }
    else if (b.dataset.act === 'done') { clearTimeout(t); save(); history.length > 1 ? history.back() : go('notes'); }
    else if (b.dataset.act === 'del') { if (await confirmSheet('Smazat poznámku?')) { clearTimeout(t); db.del(id); editing = null; go('notes'); } }
  };
}
