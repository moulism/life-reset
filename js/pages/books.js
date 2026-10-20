// Knihy – police, postup čtení, poznámky a hlavní myšlenky.
import { db } from '../store.js';
import { award, revoke } from '../game.js';
import { esc, icon, today, fmtDay, openForm, toast, empty, segTabs, clamp, confirmSheet } from '../ui.js';
import { BOOKS, bookInfo, shopLinks } from '../data/books.js';
import { fileRow, pickFiles, handleFileAct, openFile } from '../common.js';

let tab = 'all';
const ST = { want: 'Chci číst', reading: 'Čtu', done: 'Přečteno' };

const books = () => db.all('books').slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const pct = b => b.status === 'done' ? 100 : clamp(Math.round((b.page || 0) / (b.pages || 1) * 100), 0, 100);

function cover(b, size = '') {
  const words = b.title.split(' ');
  return `<div class="cover ${size}" style="--c:${b.color || '#4FD8FF'}"><b>${esc(words.slice(0, 4).join(' '))}</b><small>${esc((b.author || '').split(' ').pop())}</small></div>`;
}

function editBook(b = {}, after) {
  openForm({
    title: b.id ? 'Upravit knihu' : 'Nová kniha',
    fields: [
      { k: 'title', label: 'Název', req: true },
      { k: 'author', label: 'Autor' },
      { k: 'pages', label: 'Stran', type: 'number', half: true, def: 300 },
      { k: 'status', label: 'Stav', type: 'select', half: true, options: Object.entries(ST).map(([v, l]) => ({ v, l })), def: 'want' },
      { k: 'color', label: 'Barva obálky', type: 'color' },
    ],
    values: b,
    onSave: v => { db.put('books', { page: 0, notes: '', takeaways: [], order: books().length, ...b, ...v }); after(); },
    onDelete: b.id ? () => { db.del(b.id); location.hash = '#/books'; } : null,
  });
}

function logPages(b, page) {
  const p = clamp(Math.round(page), 0, b.pages || 9999);
  const patch = { page: p, lastRead: today() };
  if (b.status === 'want' && p > 0) { patch.status = 'reading'; patch.started = b.started || today(); }
  if (p > (b.page || 0)) {
    award(`read:${today()}`, 10, 'Čtení');
    const log = db.find('readlog', l => l.date === today() && l.book === b.id);
    db.put('readlog', { ...(log || {}), date: today(), book: b.id, pages: ((log && log.pages) || 0) + (p - (b.page || 0)) });
  }
  if (b.pages && p >= b.pages && b.status !== 'done') { patch.status = 'done'; patch.finished = today(); award('book:' + b.id, 100, 'Dočtená kniha'); toast(`${icon('star', 18)} Dočteno: ${esc(b.title)}`, 'gold long'); }
  db.patch(b.id, patch);
}

export default {
  title: a => a[0] ? ((db.get(a[0]) || {}).title || 'Kniha') : 'Knihy',
  render(root, args, { refresh }) {
    if (args[0]) return detail(root, args[0], refresh);
    if (!db.all('books').length) BOOKS.forEach((b, i) => db.put('books', { ...b, status: 'want', page: 0, notes: '', takeaways: [], order: i }));
    const all = books();
    const list = tab === 'all' ? all : all.filter(b => b.status === tab);
    const reading = all.filter(b => b.status === 'reading');
    const pagesWeek = db.filter('readlog', l => l.date > fmtISO(-7)).reduce((a, l) => a + (l.pages || 0), 0);
    root.innerHTML = `
      <section class="panel hud"><div class="kpis">
        <div><span>Přečteno</span><b>${all.filter(b => b.status === 'done').length}<small>/${all.length}</small></b></div>
        <div><span>Rozečteno</span><b>${reading.length}</b></div>
        <div><span>Stran za 7 dní</span><b>${pagesWeek}</b></div>
      </div></section>
      ${reading.map(b => `<section class="panel reading">
        <a href="#/books/${b.id}" class="reading-top">${cover(b, 'sm')}<div><h3>${esc(b.title)}</h3><p class="muted small">${esc(b.author || '')} · str. ${b.page || 0} z ${b.pages || '?'}</p><div class="bar" style="--c:${b.color}"><i style="width:${pct(b)}%"></i></div></div></a>
        <div class="row-btns"><button class="btn sm" data-act="plus" data-id="${b.id}" data-v="10">+10 stran</button><button class="btn sm" data-act="plus" data-id="${b.id}" data-v="25">+25</button><button class="btn sm ghost" data-act="page" data-id="${b.id}">Stránka…</button></div>
      </section>`).join('')}
      ${segTabs([['all', 'Vše'], ['want', 'Chci číst'], ['reading', 'Čtu'], ['done', 'Přečteno']], tab)}
      <section class="shelf">${list.map(b => `<a class="book" href="#/books/${b.id}">${cover(b)}<div class="book-bar"><i style="width:${pct(b)}%;--c:${b.color}"></i></div><small>${ST[b.status] || ''}${db.find('files', f => f.book === b.id) ? ' · ' + icon('file', 11) : ''}</small></a>`).join('')}</section>
      ${list.length ? '' : empty('Nic tady není.')}
      <button class="btn ghost" data-act="new">${icon('plus', 18)} Přidat knihu</button>`;
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tab') { tab = b.dataset.v; refresh(); }
      else if (act === 'new') editBook({}, refresh);
      else if (act === 'plus') { const bk = db.get(b.dataset.id); logPages(bk, (bk.page || 0) + Number(b.dataset.v)); refresh(); }
      else if (act === 'page') pageForm(db.get(b.dataset.id), refresh);
    };
  }
};
const fmtISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function pageForm(b, after) {
  openForm({ title: 'Kde jsi?', fields: [{ k: 'page', label: `Stránka (z ${b.pages || '?'})`, type: 'number', req: true }], values: { page: b.page || 0 }, onSave: v => { logPages(b, v.page); after(); } });
}

function detail(root, id, refresh) {
  const b = db.get(id);
  if (!b) { root.innerHTML = empty('Kniha nenalezena.'); return; }
  const tk = b.takeaways || [];
  const info = bookInfo(b.title);
  const files = db.filter('files', f => f.book === id).sort((a, c) => (c.added || '').localeCompare(a.added || ''));
  root.innerHTML = `
    <section class="book-hero">${cover(b, 'lg')}
      <div><h2>${esc(b.title)}</h2><p class="muted">${esc(b.author || '')}</p>
        <div class="chips">${Object.entries(ST).map(([k, l]) => `<button class="chip sm ${b.status === k ? 'on' : ''}" data-act="status" data-v="${k}">${l}</button>`).join('')}</div>
        <p class="small muted">${b.started ? `Začato ${fmtDay(b.started)}` : ''}${b.finished ? ` · dočteno ${fmtDay(b.finished)}` : ''}</p>
      </div></section>
    ${files.length ? `<button class="btn primary big" data-act="read" data-id="${files[0].id}">${icon('book', 18)} Otevřít ${esc(files[0].name.split('.').pop().toUpperCase())}</button>` : ''}
    ${info ? `<section class="panel">
      <div class="panel-head"><h3>${icon('note', 18)} O knize</h3></div>
      <p>${esc(info.summary)}</p>
      <ul class="ul">${info.ideas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>` : ''}
    <section class="panel">
      <div class="panel-head"><h3>${icon('file', 18)} Moje kopie</h3><button class="btn sm primary" data-act="upload">${icon('upload', 16)} Nahrát</button></div>
      ${files.length ? files.map(fileRow).join('') : '<p class="small muted">Nahraj svůj e-book (EPUB, PDF) nebo audioknihu (MP3, M4B), kterou máš koupenou nebo půjčenou. Otevřeš ji pak jedním klepnutím. Soubory nad 1,5 MB vyžadují přihlášení k synchronizaci.</p>'}
      <p class="small muted">Sehnat knihu: ${shopLinks(b).map(([n, u]) => `<a class="link" href="${u}" target="_blank" rel="noopener">${n}</a>`).join(' · ')}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Postup</h3><b>${pct(b)} %</b></div>
      <div class="bar" style="--c:${b.color}"><i style="width:${pct(b)}%"></i></div>
      <p class="small muted">Strana ${b.page || 0} z ${b.pages || '?'}</p>
      <div class="row-btns"><button class="btn sm" data-act="plus" data-v="10">+10</button><button class="btn sm" data-act="plus" data-v="25">+25</button><button class="btn sm ghost" data-act="page">Stránka…</button></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>${icon('bolt', 18)} Hlavní myšlenky</h3><small class="muted">co si odnáším</small></div>
      ${tk.map((x, i) => `<div class="row idea"><p class="row-main">${esc(x)}</p><button class="icon-btn" data-act="tk-del" data-i="${i}" aria-label="Smazat">${icon('x', 16)}</button></div>`).join('')}
      <form class="inline-add" data-form="tk"><input name="v" placeholder="Myšlenka, kterou chci použít…"><button class="btn sm" aria-label="Přidat">${icon('plus', 16)}</button></form>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Poznámky</h3><small class="muted" id="bSaved"></small></div>
      <textarea id="bNotes" rows="8" placeholder="Citáty, kapitoly, akční kroky…">${esc(b.notes || '')}</textarea>
      <div class="field"><label>Hodnocení</label><div class="energy">${[1, 2, 3, 4, 5].map(n => `<button class="en ${(b.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-label="${n} hvězd">${icon('star', 18)}</button>`).join('')}</div></div>
    </section>
    <div class="row-btns"><button class="btn ghost" data-act="edit">${icon('edit', 18)} Upravit knihu</button></div>`;
  let t;
  root.querySelector('#bNotes').oninput = e => { clearTimeout(t); t = setTimeout(() => { db.patch(id, { notes: e.target.value }); const s = document.getElementById('bSaved'); if (s) s.textContent = 'uloženo'; }, 500); };
  root.onsubmit = e => { e.preventDefault(); const v = e.target.v.value.trim(); if (v) { db.patch(id, { takeaways: [...tk, v] }); refresh(); } };
  root.onclick = async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const cur = db.get(id);
    if (act === 'status') {
      const v = btn.dataset.v;
      const patch = { status: v };
      if (v === 'reading' && !cur.started) patch.started = today();
      if (v === 'done') { patch.finished = today(); patch.page = cur.pages || cur.page; award('book:' + id, 100, 'Dočtená kniha'); }
      else revoke('book:' + id);
      db.patch(id, patch); refresh();
    } else if (act === 'plus') { logPages(cur, (cur.page || 0) + Number(btn.dataset.v)); refresh(); }
    else if (act === 'page') pageForm(cur, refresh);
    else if (act === 'tk-del') { db.patch(id, { takeaways: tk.filter((_, i) => i !== Number(btn.dataset.i)) }); refresh(); }
    else if (act === 'rate') { db.patch(id, { rating: Number(btn.dataset.v) }); refresh(); }
    else if (act === 'edit') editBook(cur, refresh);
    else if (act === 'upload') pickFiles({ book: id }, refresh);
    else if (act === 'read') { const f = db.get(btn.dataset.id); if (f) openFile(f); }
    else if (act === 'file-open' || act === 'file-del') { e.stopPropagation(); handleFileAct(act, btn.dataset.id, refresh); }
  };
  void confirmSheet;
}
