import { db } from '../store.js';
import { award } from '../game.js';
import { esc, icon, today, money, openForm, toast, segTabs, empty, progress, sum, confirmSheet } from '../ui.js';
import { hustles, taskRow, toggleTask, editTask, noteCard, newNote, editTx, txRow, fileRow, pickFiles, handleFileAct } from '../common.js';

let tab = 'overview';
let lastId = '';

function editHustle(h = {}, after) {
  openForm({
    title: h.id ? 'Upravit side hustle' : 'Nový side hustle',
    fields: [
      { k: 'name', label: 'Název', req: true, ph: 'Např. MetroMood' },
      { k: 'desc', label: 'Popis', ph: 'Čím se to zabývá' },
      { k: 'link', label: 'Odkaz', type: 'url', ph: 'https://' },
      { k: 'color', label: 'Barva', type: 'color' },
    ],
    values: h,
    onSave: v => { db.put('hustles', { goals: [], ideas: [], order: hustles().length, ...h, ...v }); after(); },
    onDelete: h.id ? () => { db.del(h.id); location.hash = '#/hustles'; } : null,
  });
}

export default {
  title: a => a[0] ? ((db.get(a[0]) || {}).name || 'Side hustle') : 'Side hustles',
  render(root, args, { refresh }) {
    if (args[0]) return detail(root, args[0], refresh);
    const m = today().slice(0, 7);
    const list = hustles();
    root.innerHTML = `
      <p class="lead">Každý projekt má vlastní cíle, úkoly, poznámky, soubory a peníze.</p>
      ${list.map(h => {
        const open = db.filter('tasks', t => t.hustle === h.id && !t.done).length;
        const tx = db.filter('tx', t => t.hustle === h.id && (t.date || '').startsWith(m));
        const net = sum(tx.filter(t => t.type === 'in'), t => t.amount) - sum(tx.filter(t => t.type !== 'in'), t => t.amount);
        const goals = h.goals || [];
        const gp = goals.length ? Math.round(sum(goals, g => Math.min(1, (g.current || 0) / (g.target || 1))) / goals.length * 100) : null;
        return `<a class="hustle-card" href="#/hustles/${h.id}" style="--c:${h.color || '#4FD8FF'}">
          <h3>${esc(h.name)}</h3>
          ${h.desc ? `<p>${esc(h.desc)}</p>` : ''}
          <div class="hc-stats">
            <span><b>${open}</b> otevřených úkolů</span>
            ${gp != null ? `<span><b>${gp} %</b> cílů</span>` : ''}
            <span><b class="${net < 0 ? 'red' : ''}">${money(net)}</b> tento měsíc</span>
          </div>
        </a>`;
      }).join('') || empty('Zatím žádný side hustle.')}
      <button class="btn ghost" data-act="new">${icon('plus', 18)} Přidat side hustle</button>
    `;
    root.onclick = e => { if (e.target.closest('[data-act="new"]')) editHustle({}, refresh); };
  }
};

function detail(root, id, refresh) {
  const h = db.get(id);
  if (!h) { root.innerHTML = empty('Tenhle projekt neexistuje.'); return; }
  if (lastId !== id) { tab = 'overview'; lastId = id; }
  const tasks = db.filter('tasks', t => t.hustle === id);
  const notes = db.filter('notes', n => n.hustle === id).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const files = db.filter('files', f => f.hustle === id);
  const tx = db.filter('tx', t => t.hustle === id).sort((a, b) => b.date.localeCompare(a.date));
  const m = today().slice(0, 7);
  const mtx = tx.filter(t => t.date.startsWith(m));
  const inc = sum(mtx.filter(t => t.type === 'in'), t => t.amount), out = sum(mtx.filter(t => t.type !== 'in'), t => t.amount);
  const goals = h.goals || [];
  const ideas = h.ideas || [];

  let body = '';
  if (tab === 'overview') {
    body = `
      <section class="panel">
        <div class="panel-head"><h3>${icon('target', 18)} Cíle</h3><button class="btn sm ghost" data-act="goal-new">${icon('plus', 16)} Cíl</button></div>
        ${goals.length ? goals.map((g, i) => `<div class="goal">
            <div class="goal-top"><button class="link-plain" data-act="goal-edit" data-i="${i}">${esc(g.text)}</button><b>${g.current || 0}${g.target > 1 ? ` / ${g.target}` : ''} ${esc(g.unit || '')}</b></div>
            ${progress(g.current || 0, g.target || 1, h.color)}
            <div class="goal-btns"><button class="btn xs" data-act="goal-dec" data-i="${i}" aria-label="Ubrat">−</button><button class="btn xs" data-act="goal-inc" data-i="${i}" aria-label="Přidat">+</button></div>
          </div>`).join('') : '<p class="muted">Nastav 1–3 konkrétní cíle, ať víš, kam to táhneš.</p>'}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('bolt', 18)} Nápady</h3></div>
        ${ideas.map((x, i) => `<div class="row idea"><p class="row-main">${esc(x)}</p><button class="icon-btn" data-act="idea-del" data-i="${i}" aria-label="Smazat nápad">${icon('x', 16)}</button></div>`).join('')}
        <form class="inline-add" data-form="idea"><input name="idea" placeholder="Nový nápad…"><button class="btn sm">${icon('plus', 16)}</button></form>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('wallet', 18)} Tento měsíc</h3></div>
        <div class="kpis"><div><span>Příjmy</span><b class="green">${money(inc)}</b></div><div><span>Výdaje</span><b>${money(out)}</b></div><div><span>Bilance</span><b class="${inc - out < 0 ? 'red' : 'green'}">${money(inc - out)}</b></div></div>
      </section>
      ${h.link ? `<a class="btn ghost" href="${esc(h.link)}" target="_blank" rel="noopener">${icon('link', 18)} ${esc(h.link.replace(/^https?:\/\//, ''))}</a>` : ''}`;
  } else if (tab === 'tasks') {
    const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done).slice(-10);
    body = `<section class="panel">${open.length ? open.map(taskRow).join('') : '<p class="muted">Žádné otevřené úkoly.</p>'}<button class="btn ghost sm" data-act="task-new">${icon('plus', 16)} Úkol</button></section>
      ${done.length ? `<section class="panel"><div class="panel-head"><h3>Nedávno hotové</h3></div>${done.map(taskRow).join('')}</section>` : ''}`;
  } else if (tab === 'notes') {
    body = `<div class="notes-grid">${notes.map(noteCard).join('')}</div>${notes.length ? '' : empty('Žádné poznámky.')}<button class="btn ghost" data-act="note-new">${icon('plus', 18)} Poznámka</button>`;
  } else if (tab === 'files') {
    body = `<section class="panel">${files.length ? files.map(fileRow).join('') : '<p class="muted">Žádné soubory.</p>'}<button class="btn ghost sm" data-act="upload">${icon('upload', 16)} Nahrát soubor</button></section>`;
  } else if (tab === 'money') {
    body = `<section class="panel"><div class="kpis"><div><span>Příjmy</span><b class="green">${money(inc)}</b></div><div><span>Výdaje</span><b>${money(out)}</b></div><div><span>Celkem vše</span><b>${money(sum(tx.filter(t => t.type === 'in'), t => t.amount) - sum(tx.filter(t => t.type !== 'in'), t => t.amount))}</b></div></div>
      <div class="row-btns"><button class="btn ghost sm" data-act="tx-out">${icon('plus', 16)} Výdaj</button><button class="btn primary sm" data-act="tx-in">${icon('plus', 16)} Příjem</button></div></section>
      <section class="panel">${tx.length ? tx.map(txRow).join('') : '<p class="muted">Zatím žádné pohyby.</p>'}</section>`;
  }

  root.innerHTML = `
    <section class="hustle-hero" style="--c:${h.color || '#4FD8FF'}">
      <div><h2>${esc(h.name)}</h2>${h.desc ? `<p>${esc(h.desc)}</p>` : ''}</div>
      <button class="icon-btn" data-act="edit" aria-label="Upravit">${icon('edit')}</button>
    </section>
    ${segTabs([['overview', 'Přehled'], ['tasks', `Úkoly ${tasks.filter(t => !t.done).length || ''}`], ['notes', 'Poznámky'], ['files', 'Soubory'], ['money', 'Peníze']], tab)}
    ${body}`;

  const saveGoals = g => { db.patch(id, { goals: g }); refresh(); };
  root.onsubmit = e => {
    e.preventDefault();
    const v = e.target.idea.value.trim();
    if (v) { db.patch(id, { ideas: [...ideas, v] }); refresh(); }
  };
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, i = Number(b.dataset.i);
    if (act === 'tab') { tab = b.dataset.v; refresh(); }
    else if (act === 'edit') editHustle(h, refresh);
    else if (act === 'goal-new' || act === 'goal-edit') {
      const g = act === 'goal-edit' ? goals[i] : {};
      openForm({
        title: g.text ? 'Upravit cíl' : 'Nový cíl',
        fields: [{ k: 'text', label: 'Cíl', req: true }, { k: 'target', label: 'Cílová hodnota', type: 'number', half: true, def: 1 }, { k: 'current', label: 'Aktuálně', type: 'number', half: true, def: 0 }, { k: 'unit', label: 'Jednotka', ph: 'Kč, objednávek, postů…' }],
        values: g,
        onSave: v => { const ng = goals.slice(); if (act === 'goal-edit') ng[i] = v; else ng.push(v); saveGoals(ng); },
        onDelete: act === 'goal-edit' ? () => saveGoals(goals.filter((_, k) => k !== i)) : null,
      });
    } else if (act === 'goal-inc' || act === 'goal-dec') {
      const ng = goals.map(x => ({ ...x }));
      const g = ng[i];
      const before = g.current || 0;
      g.current = Math.max(0, before + (act === 'goal-inc' ? 1 : -1));
      if (before < g.target && g.current >= g.target) { award(`goal:${id}:${i}:${g.text}`, 50, 'Cíl splněn'); toast(`Cíl splněn: ${esc(g.text)}`, 'gold'); }
      saveGoals(ng);
    } else if (act === 'idea-del') { db.patch(id, { ideas: ideas.filter((_, k) => k !== i) }); refresh(); }
    else if (act === 'task-new') editTask({ hustle: id }, refresh);
    else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(b.dataset.id); refresh(); }
    else if (act === 'task-edit') editTask(db.get(b.dataset.id), refresh);
    else if (act === 'note-new') { const nid = newNote({ hustle: id }); location.hash = '#/notes/' + nid; }
    else if (act === 'upload') pickFiles({ hustle: id }, refresh);
    else if (act === 'file-open' || act === 'file-del') { e.stopPropagation(); handleFileAct(act, b.dataset.id, refresh); }
    else if (act === 'tx-in' || act === 'tx-out') editTx({ type: act === 'tx-in' ? 'in' : 'out', hustle: id, date: today() }, refresh);
    else if (act === 'tx-edit') editTx(db.get(b.dataset.id), refresh);
  };
}
