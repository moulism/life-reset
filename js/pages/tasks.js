import { db } from '../store.js';
import { esc, icon, today, addDays, segTabs, empty } from '../ui.js';
import { taskRow, toggleTask, editTask, cats } from '../common.js';

let tab = 'today';
let catF = '';

export default {
  title: 'Úkoly',
  render(root, args, { refresh }) {
    const t = today();
    const all = db.all('tasks').filter(x => !catF || x.cat === catF);
    const open = all.filter(x => !x.done);
    const sortFn = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (b.prio || 2) - (a.prio || 2);
    let groups = [];
    if (tab === 'today') {
      groups = [
        ['Po termínu', open.filter(x => x.due && x.due < t)],
        ['Dnes', open.filter(x => x.due === t)],
      ];
    } else if (tab === 'soon') {
      groups = [
        ['Zítra', open.filter(x => x.due === addDays(t, 1))],
        ['Tento týden', open.filter(x => x.due > addDays(t, 1) && x.due <= addDays(t, 7))],
        ['Později', open.filter(x => x.due > addDays(t, 7))],
      ];
    } else if (tab === 'all') {
      groups = [
        ['S termínem', open.filter(x => x.due).sort(sortFn)],
        ['Bez termínu', open.filter(x => !x.due)],
      ];
    } else {
      groups = [['Hotové', all.filter(x => x.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 100)]];
    }
    groups = groups.map(([n, l]) => [n, l.slice().sort(sortFn)]).filter(g => g[1].length);
    const counts = { today: open.filter(x => x.due && x.due <= t).length, soon: open.filter(x => x.due > t).length, all: open.length };

    root.innerHTML = `
      ${segTabs([['today', `Dnes ${counts.today || ''}`], ['soon', 'Brzy'], ['all', `Vše ${counts.all || ''}`], ['done', 'Hotové']], tab)}
      <div class="cal-legend"><button class="chip sm ${!catF ? 'on' : 'off'}" data-act="cat" data-v="">Všechny</button>${cats().map(c => `<button class="chip sm ${catF === c.id ? 'on' : 'off'}" data-act="cat" data-v="${c.id}" style="--c:${c.color}"><i class="dot"></i>${esc(c.name)}</button>`).join('')}</div>
      ${groups.length ? groups.map(([n, l]) => `<section class="panel"><div class="panel-head"><h3>${esc(n)}</h3><small class="muted">${l.length}</small></div>${l.map(taskRow).join('')}</section>`).join('')
        : empty(tab === 'done' ? 'Zatím nic hotového.' : 'Žádné úkoly. Čistý stůl.', 'Nový úkol', 'new')}
      <button class="fab" data-act="new" aria-label="Nový úkol">${icon('plus', 26)}</button>
    `;
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tab') { tab = b.dataset.v; refresh(); }
      else if (act === 'cat') { catF = b.dataset.v; refresh(); }
      else if (act === 'new') editTask({ due: tab === 'today' ? t : '', cat: catF }, refresh);
      else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(b.dataset.id); refresh(); }
      else if (act === 'task-edit') editTask(db.get(b.dataset.id), refresh);
    };
  }
};
