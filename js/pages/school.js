import { db, profile } from '../store.js';
import { esc, icon, openForm, segTabs, empty, today, relDay } from '../ui.js';
import { subjects, taskRow, toggleTask, editTask, noteCard, newNote, fileRow, pickFiles, handleFileAct } from '../common.js';
import { SCHOOLS } from '../data/defaults.js';

let tab = 'notes';
let lastId = '';

function editSubject(s = {}, after) {
  const schools = (profile() && profile().schools) || SCHOOLS;
  openForm({
    title: s.id ? 'Upravit předmět' : 'Nový předmět',
    fields: [
      { k: 'name', label: 'Předmět', req: true, ph: 'Např. Programování, Microeconomics' },
      { k: 'school', label: 'Škola', type: 'select', options: schools.map(x => ({ v: x, l: x })) },
      { k: 'teacher', label: 'Vyučující', half: true },
      { k: 'room', label: 'Učebna / odkaz', half: true },
      { k: 'color', label: 'Barva', type: 'color' },
    ],
    values: s,
    onSave: v => { db.put('subjects', { ...s, ...v }); after(); },
    onDelete: s.id ? () => { db.del(s.id); location.hash = '#/school'; } : null,
  });
}

export default {
  title: a => a[0] ? ((db.get(a[0]) || {}).name || 'Předmět') : 'Škola',
  render(root, args, { refresh }) {
    if (args[0]) return detail(root, args[0], refresh);
    const schools = (profile() && profile().schools) || SCHOOLS;
    const subs = subjects();
    const t = today();
    const deadlines = db.filter('tasks', x => x.subject && !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 6);
    root.innerHTML = `
      ${deadlines.length ? `<section class="panel"><div class="panel-head"><h3>${icon('clock', 18)} Nejbližší termíny</h3></div>${deadlines.map(taskRow).join('')}</section>` : ''}
      ${schools.map(sc => {
        const list = subs.filter(s => (s.school || schools[0]) === sc);
        return `<section class="school-group"><h3>${esc(sc)}</h3>
          <div class="subj-grid">${list.map(s => {
            const n = db.filter('notes', x => x.subject === s.id).length;
            const f = db.filter('files', x => x.subject === s.id).length;
            const d = db.filter('tasks', x => x.subject === s.id && !x.done).length;
            return `<a class="subj" href="#/school/${s.id}" style="--c:${s.color || '#6E8BFF'}"><b>${esc(s.name)}</b><small>${n} pozn. · ${f} dok. · ${d} úkolů</small></a>`;
          }).join('')}
          <button class="subj add" data-act="new" data-school="${esc(sc)}">${icon('plus', 18)} Předmět</button></div>
        </section>`;
      }).join('')}
      <p class="tiny-actions"><a class="link" href="#/settings/profile">Upravit seznam škol</a></p>
    `;
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') editSubject({ school: b.dataset.school }, refresh);
      else if (b.dataset.act === 'task-toggle') { e.stopPropagation(); toggleTask(b.dataset.id); refresh(); }
      else if (b.dataset.act === 'task-edit') editTask(db.get(b.dataset.id), refresh);
    };
  }
};

function detail(root, id, refresh) {
  const s = db.get(id);
  if (!s) { root.innerHTML = empty('Předmět neexistuje.'); return; }
  if (lastId !== id) { tab = 'notes'; lastId = id; }
  const notes = db.filter('notes', n => n.subject === id).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const files = db.filter('files', f => f.subject === id).sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  const tasks = db.filter('tasks', t => t.subject === id).sort((a, b) => (a.done - b.done) || (a.due || '9').localeCompare(b.due || '9'));
  let body = '';
  if (tab === 'notes') body = `<div class="notes-grid">${notes.map(noteCard).join('')}</div>${notes.length ? '' : empty('Zatím žádné zápisky z hodin.')}<button class="btn primary" data-act="note-new">${icon('plus', 18)} Nový zápis</button>`;
  else if (tab === 'docs') body = `<section class="panel">${files.length ? files.map(fileRow).join('') : '<p class="muted">Nahraj skripta, prezentace, zadání – PDF, Word, fotky.</p>'}<button class="btn primary sm" data-act="upload">${icon('upload', 16)} Nahrát dokument</button></section>`;
  else body = `<section class="panel">${tasks.length ? tasks.map(taskRow).join('') : '<p class="muted">Žádné termíny – testy, odevzdání, zkoušky si dej sem.</p>'}<button class="btn primary sm" data-act="task-new">${icon('plus', 16)} Termín / úkol</button></section>`;

  root.innerHTML = `
    <section class="hustle-hero" style="--c:${s.color || '#6E8BFF'}">
      <div><h2>${esc(s.name)}</h2><p>${esc([s.school, s.teacher, s.room].filter(Boolean).join(' · '))}</p></div>
      <button class="icon-btn" data-act="edit" aria-label="Upravit">${icon('edit')}</button>
    </section>
    ${segTabs([['notes', `Poznámky ${notes.length || ''}`], ['docs', `Dokumenty ${files.length || ''}`], ['tasks', `Termíny ${tasks.filter(t => !t.done).length || ''}`]], tab)}
    ${body}`;
  root.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'tab') { tab = b.dataset.v; refresh(); }
    else if (act === 'edit') editSubject(s, refresh);
    else if (act === 'note-new') { const nid = newNote({ subject: id, title: `${s.name} – ${relDay(today()).toLowerCase()}` }); location.hash = '#/notes/' + nid; }
    else if (act === 'upload') pickFiles({ subject: id }, refresh);
    else if (act === 'file-open' || act === 'file-del') handleFileAct(act, b.dataset.id, refresh);
    else if (act === 'task-new') editTask({ subject: id, cat: (s.school || '').startsWith('UNYP') ? 'unyp' : 'skola' }, refresh);
    else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(b.dataset.id); refresh(); }
    else if (act === 'task-edit') editTask(db.get(b.dataset.id), refresh);
  };
}
