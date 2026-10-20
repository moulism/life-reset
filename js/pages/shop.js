// Nákupní seznam – položky podle kategorií, předvyplněné seznamy z plánu krabiček.
import { db } from '../store.js';
import { esc, icon, toast, empty, confirmSheet } from '../ui.js';
import { SHOP_CATS } from '../data/defaults.js';
import { LISTS, SHOP_INTRO, planFor } from '../data/mealplan.js';
import { today, addDays } from '../ui.js';

let showDone = true;

export function addList(key) {
  const keys = key === 'A' || key === 'B' ? ['base', key] : [key];
  let n = 0;
  keys.forEach(k => LISTS[k].items.forEach(([name, cat]) => {
    if (db.find('shop', s => s.name === name && !s.done)) return;
    db.put('shop', { name, cat, done: false, src: k, added: new Date().toISOString() });
    n++;
  }));
  return n;
}

export default {
  title: 'Nákupní seznam',
  render(root, args, { refresh }) {
    const items = db.all('shop');
    const open = items.filter(i => !i.done);
    const done = items.filter(i => i.done);
    const cats = [...SHOP_CATS, ...new Set(items.map(i => i.cat).filter(c => c && !SHOP_CATS.includes(c)))];
    const nextWeek = planFor(addDays(today(), 7)).week || planFor(today()).week;
    root.innerHTML = `
      <form class="inline-add big" data-form="add">
        <input name="name" placeholder="Přidat položku… (např. Kuřecí prsa 1 kg)" aria-label="Nová položka" autocomplete="off">
        <select name="cat" aria-label="Kategorie">${SHOP_CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select>
        <button class="btn primary sm" aria-label="Přidat">${icon('plus', 18)}</button>
      </form>
      <section class="panel">
        <div class="panel-head"><h3>${icon('food', 18)} Z plánu krabiček</h3>${nextWeek ? `<small class="muted">další: týden ${nextWeek.n} · ${nextWeek.ab}</small>` : ''}</div>
        <p class="small muted">${esc(SHOP_INTRO)}</p>
        <div class="preset-row">
          <button class="chip" data-act="list" data-v="A">${icon('plus', 14)} Základ + týden A</button>
          <button class="chip" data-act="list" data-v="B">${icon('plus', 14)} Základ + týden B</button>
          <button class="chip" data-act="list" data-v="base">${icon('plus', 14)} Jen základ</button>
          <button class="chip" data-act="list" data-v="once">${icon('plus', 14)} První nákup</button>
        </div>
      </section>
      ${open.length ? cats.map(c => {
        const l = open.filter(i => (i.cat || 'Ostatní') === c);
        if (!l.length) return '';
        return `<section class="panel shop-group"><div class="panel-head"><h3>${esc(c)}</h3><small class="muted">${l.length}</small></div>
          ${l.map(row).join('')}</section>`;
      }).join('') : empty('Seznam je prázdný. Přidej položku nebo vlož nákup z plánu.')}
      ${done.length ? `<section class="panel shop-group">
        <div class="panel-head"><h3>V košíku ${done.length}</h3><span><button class="link" data-act="toggle-done">${showDone ? 'Skrýt' : 'Zobrazit'}</button> · <button class="link" data-act="clear">Vyčistit</button></span></div>
        ${showDone ? done.map(row).join('') : ''}</section>` : ''}
    `;
    root.onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      const name = f.name.value.trim();
      if (!name) return;
      db.put('shop', { name, cat: f.cat.value, done: false, added: new Date().toISOString() });
      refresh();
      setTimeout(() => { const i = root.querySelector('[name="name"]'); i && i.focus(); }, 20);
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tick') { const it = db.get(b.dataset.id); db.patch(it.id, { done: !it.done }); refresh(); }
      else if (act === 'del') { e.stopPropagation(); db.del(b.dataset.id); refresh(); }
      else if (act === 'list') { const n = addList(b.dataset.v); toast(n ? `Přidáno ${n} položek` : 'Všechno už na seznamu je'); refresh(); }
      else if (act === 'toggle-done') { showDone = !showDone; refresh(); }
      else if (act === 'clear') { if (await confirmSheet('Odstranit všechno, co máš v košíku?', 'Vyčistit')) { done.forEach(i => db.del(i.id)); refresh(); } }
    };
  }
};

function row(i) {
  return `<div class="row shop ${i.done ? 'done' : ''}" data-act="tick" data-id="${i.id}">
    <button class="tick" aria-label="${i.done ? 'Vrátit' : 'Mám'}" aria-pressed="${!!i.done}">${icon('check', 14)}</button>
    <p class="row-main row-title">${esc(i.name)}</p>
    <button class="icon-btn sm" data-act="del" data-id="${i.id}" aria-label="Smazat">${icon('x', 14)}</button>
  </div>`;
}
