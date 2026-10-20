// Databáze – jedna velká složka: všechno na jednom místě + vyhledávání napříč aplikací.
import { db } from '../store.js';
import { esc, icon, openForm, empty, fmtDay } from '../ui.js';
import { folders, fileRow, pickFiles, handleFileAct, noteCard, newNote, cat } from '../common.js';

let q = '';

const SOURCES = [
  { col: 'notes', name: 'Poznámky', icon: 'note', href: () => '#/notes', text: x => `${x.title} ${x.body} ${(x.tags || []).join(' ')}`, title: x => x.title || 'Bez názvu', link: x => `#/notes/${x.id}` },
  { col: 'files', name: 'Dokumenty', icon: 'file', href: () => '#/archive', text: x => x.name, title: x => x.name, link: null },
  { col: 'journal', name: 'Deník', icon: 'diary', href: () => '#/diary', text: x => `${x.text} ${x.win} ${x.lesson} ${(x.grateful || []).join(' ')}`, title: x => fmtDay(x.date, true), link: x => `#/diary/${x.date}` },
  { col: 'tasks', name: 'Úkoly', icon: 'tasks', href: () => '#/tasks', text: x => `${x.title} ${x.notes}`, title: x => x.title, link: () => '#/tasks' },
  { col: 'events', name: 'Události', icon: 'calendar', href: () => '#/calendar', text: x => `${x.title} ${x.place} ${x.notes}`, title: x => `${x.title} · ${fmtDay(x.date)}`, link: x => `#/calendar/${x.date}` },
  { col: 'books', name: 'Knihy', icon: 'book', href: () => '#/books', text: x => `${x.title} ${x.author} ${x.notes} ${(x.takeaways || []).join(' ')}`, title: x => x.title, link: x => `#/books/${x.id}` },
  { col: 'hustles', name: 'Side hustles', icon: 'briefcase', href: () => '#/hustles', text: x => `${x.name} ${x.desc} ${(x.ideas || []).join(' ')}`, title: x => x.name, link: x => `#/hustles/${x.id}` },
  { col: 'subjects', name: 'Předměty', icon: 'school', href: () => '#/school', text: x => `${x.name} ${x.teacher}`, title: x => x.name, link: x => `#/school/${x.id}` },
  { col: 'workouts', name: 'Tréninky', icon: 'gym', href: () => '#/gym', text: x => `${x.name} ${(x.exercises || []).map(e => e.name).join(' ')} ${x.note}`, title: x => `${x.name} · ${fmtDay(x.date)}`, link: x => `#/gym/w/${x.id}` },
  { col: 'tx', name: 'Finance', icon: 'wallet', href: () => '#/finance', text: x => `${x.note} ${x.amount}`, title: x => `${x.note || 'Pohyb'} · ${x.amount} Kč`, link: () => '#/finance' },
];

function editFolder(f = {}, after) {
  openForm({
    title: f.id ? 'Upravit složku' : 'Nová složka',
    fields: [{ k: 'name', label: 'Název složky', req: true }, { k: 'color', label: 'Barva', type: 'color' }],
    values: f,
    onSave: v => { db.put('folders', { ...f, ...v }); after(); },
    onDelete: f.id ? () => {
      db.filter('files', x => x.folder === f.id).forEach(x => db.patch(x.id, { folder: '' }));
      db.filter('notes', x => x.folder === f.id).forEach(x => db.patch(x.id, { folder: '' }));
      db.del(f.id); location.hash = '#/archive';
    } : null,
  });
}

export default {
  title: a => a[0] ? ((db.get(a[0]) || {}).name || 'Složka') : 'Databáze',
  render(root, args, { refresh }) {
    if (args[0]) return folderView(root, args[0], refresh);
    const fs = folders();
    let results = '';
    if (q.trim().length >= 2) {
      const needle = q.trim().toLowerCase();
      const hits = [];
      SOURCES.forEach(s => db.all(s.col).forEach(x => {
        if (String(s.text(x) || '').toLowerCase().includes(needle)) hits.push({ s, x });
      }));
      results = `<section class="panel"><div class="panel-head"><h3>Výsledky</h3><small class="muted">${hits.length}</small></div>
        ${hits.slice(0, 60).map(({ s, x }) => s.link
          ? `<a class="row" href="${s.link(x)}"><span class="ico">${icon(s.icon, 18)}</span><div class="row-main"><p class="row-title">${esc(s.title(x))}</p><p class="row-meta"><span>${s.name}</span></p></div></a>`
          : `<button class="row" data-act="file-open" data-id="${x.id}"><span class="ico">${icon(s.icon, 18)}</span><div class="row-main"><p class="row-title">${esc(s.title(x))}</p><p class="row-meta"><span>${s.name}</span></p></div></button>`).join('') || '<p class="muted">Nic nenalezeno.</p>'}</section>`;
    }
    const loose = db.filter('files', f => !f.folder && !f.subject && !f.hustle && !f.book).sort((a, b) => (b.added || '').localeCompare(a.added || ''));
    root.innerHTML = `
      <div class="search big"><span>${icon('search', 20)}</span><input id="aq" placeholder="Hledat ve všem – poznámky, deník, soubory, úkoly…" value="${esc(q)}" autocomplete="off"></div>
      ${results}
      <section class="db-tiles">${SOURCES.map(s => `<a class="db-tile" href="${s.href()}">${icon(s.icon, 20)}<b>${db.all(s.col).length}</b><span>${s.name}</span></a>`).join('')}</section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('folder', 18)} Složky</h3><button class="btn sm ghost" data-act="folder-new">${icon('plus', 16)} Složka</button></div>
        ${fs.length ? `<div class="folders">${fs.map(f => {
          const n = db.filter('files', x => x.folder === f.id).length + db.filter('notes', x => x.folder === f.id).length;
          return `<a class="folder" href="#/archive/${f.id}" style="--c:${f.color || '#4FD8FF'}">${icon('folder', 22)}<b>${esc(f.name)}</b><small>${n} položek</small></a>`;
        }).join('')}</div>` : '<p class="muted">Vytvoř si složky třeba Smlouvy, Doklady, Inspirace, Fotky.</p>'}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('file', 18)} Volné soubory</h3><button class="btn sm primary" data-act="upload">${icon('upload', 16)} Nahrát</button></div>
        ${loose.length ? loose.map(fileRow).join('') : '<p class="muted">Soubory ze školy a side hustles najdeš v jejich sekcích.</p>'}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Všechny dokumenty</h3><small class="muted">${db.all('files').length}</small></div>
        ${db.all('files').slice().sort((a, b) => (b.added || '').localeCompare(a.added || '')).slice(0, 30).map(f => {
          const where = f.subject ? (db.get(f.subject) || {}).name : f.hustle ? (db.get(f.hustle) || {}).name : f.folder ? (db.get(f.folder) || {}).name : f.book ? (db.get(f.book) || {}).title : 'Volné';
          return fileRow(f).replace('<p class="row-meta">', `<p class="row-meta"><span>${esc(where || '')}</span>`);
        }).join('') || '<p class="muted">Zatím nic.</p>'}
      </section>
    `;
    const inp = root.querySelector('#aq');
    let tmr;
    inp.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { q = inp.value; const pos = inp.selectionStart; refresh(); const n = document.querySelector('#aq'); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'folder-new') editFolder({}, refresh);
      else if (act === 'upload') pickFiles({}, refresh);
      else if (act === 'file-open' || act === 'file-del') handleFileAct(act, b.dataset.id, refresh);
    };
  }
};

function folderView(root, id, refresh) {
  const f = db.get(id);
  if (!f) { root.innerHTML = empty('Složka neexistuje.'); return; }
  const files = db.filter('files', x => x.folder === id);
  const notes = db.filter('notes', x => x.folder === id);
  root.innerHTML = `
    <section class="hustle-hero" style="--c:${f.color || '#4FD8FF'}"><div><h2>${esc(f.name)}</h2><p>${files.length} souborů · ${notes.length} poznámek</p></div><button class="icon-btn" data-act="edit" aria-label="Upravit">${icon('edit')}</button></section>
    <div class="row-btns"><button class="btn primary" data-act="upload">${icon('upload', 18)} Nahrát soubor</button><button class="btn ghost" data-act="note">${icon('note', 18)} Poznámka</button></div>
    <section class="panel">${files.length ? files.map(fileRow).join('') : '<p class="muted">Žádné soubory.</p>'}</section>
    <div class="notes-grid">${notes.map(noteCard).join('')}</div>`;
  root.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'edit') editFolder(f, refresh);
    else if (act === 'upload') pickFiles({ folder: id }, refresh);
    else if (act === 'note') { const nid = newNote({ folder: id }); location.hash = '#/notes/' + nid; }
    else if (act === 'file-open' || act === 'file-del') handleFileAct(act, b.dataset.id, refresh);
  };
  void cat;
}
