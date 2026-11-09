// Nákupy: nákupní seznam (kategorie, odškrtávání) a wishlist (odkaz z e-shopu → název, fotka, cena; koupeno → výdaj).
import { db, profile } from '../store.js';
import { esc, icon, toast, empty, confirmSheet, segTabs, openForm, money, sum, today, addDays, sheet } from '../ui.js';
import { SHOP_CATS } from '../data/defaults.js';
import { LISTS, SHOP_INTRO, planFor } from '../data/mealplan.js';
import { linkPreview } from '../sync.js';
import { has } from '../mods.js';
import { editTx } from '../common.js';
import { guessCat } from '../money-core.js';

let showDone = true;
let tab = 'list';
let showBought = false;

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

const isUrl = s => /^https?:\/\/\S+\.\S+/i.test(String(s).trim()) || /^(www\.)\S+\.\S+/i.test(String(s).trim());
const normUrl = s => { s = String(s).trim(); const m = s.match(/https?:\/\/\S+/i); return m ? m[0] : (/^www\./i.test(s) ? 'https://' + s : s); };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

export default {
  title: 'Nákupy',
  render(root, args, { refresh }) {
    if (args[0] === 'wish') tab = 'wish';
    root.innerHTML = `${segTabs([['list', 'Nákupní seznam'], ['wish', 'Wishlist']], tab)}<div id="shopBody"></div>`;
    const body = root.querySelector('#shopBody');
    if (tab === 'wish') wishView(body, refresh); else listView(body, refresh);
    root.onclick = e => {
      const b = e.target.closest('[data-act="tab"]');
      if (b) { tab = b.dataset.v; refresh(); }
    };
  }
};

// ---------- nákupní seznam ----------
function listView(root, refresh) {
  const items = db.all('shop');
  const open = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  const cats = [...SHOP_CATS, ...new Set(items.map(i => i.cat).filter(c => c && !SHOP_CATS.includes(c)))];
  const plan = profile().mealPlan;
  const nextWeek = plan ? (planFor(addDays(today(), 7)).week || planFor(today()).week) : null;
  root.innerHTML = `
    <form class="inline-add big" data-form="add">
      <input name="name" placeholder="Přidat položku… (např. Kuřecí prsa 1 kg)" aria-label="Nová položka" autocomplete="off">
      <select name="cat" aria-label="Kategorie">${SHOP_CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <button class="btn primary sm" aria-label="Přidat">${icon('plus', 18)}</button>
    </form>
    ${plan ? `<section class="panel">
      <div class="panel-head"><h3>${icon('food', 18)} Z plánu krabiček</h3>${nextWeek ? `<small class="muted">další: týden ${nextWeek.n} · ${nextWeek.ab}</small>` : ''}</div>
      <p class="small muted">${esc(SHOP_INTRO)}</p>
      <div class="preset-row">
        <button class="chip" data-act="list" data-v="A">${icon('plus', 14)} Základ + týden A</button>
        <button class="chip" data-act="list" data-v="B">${icon('plus', 14)} Základ + týden B</button>
        <button class="chip" data-act="list" data-v="base">${icon('plus', 14)} Jen základ</button>
      </div>
    </section>` : ''}
    ${open.length ? cats.map(c => {
      const l = open.filter(i => (i.cat || 'Ostatní') === c);
      if (!l.length) return '';
      return `<section class="panel shop-group"><div class="panel-head"><h3>${esc(c)}</h3><small class="muted">${l.length}</small></div>${l.map(row).join('')}</section>`;
    }).join('') : empty('Seznam je prázdný. Přidej, co potřebuješ koupit.')}
    ${done.length ? `<section class="panel shop-group">
      <div class="panel-head"><h3>V košíku ${done.length}</h3><span><button class="link" data-act="toggle-done">${showDone ? 'Skrýt' : 'Zobrazit'}</button> · <button class="link" data-act="clear">Vyčistit</button></span></div>
      ${showDone ? done.map(row).join('') : ''}</section>` : ''}`;
  root.onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    if (!name) return;
    db.put('shop', { name, cat: f.cat.value, done: false, added: new Date().toISOString() });
    refresh();
    setTimeout(() => { const i = document.querySelector('#shopBody [name="name"]'); i && i.focus(); }, 20);
  };
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'tick') { const it = db.get(b.dataset.id); db.patch(it.id, { done: !it.done }); refresh(); }
    else if (act === 'del') { e.stopPropagation(); db.del(b.dataset.id); refresh(); }
    else if (act === 'list') { const n = addList(b.dataset.v); toast(n ? `Přidáno ${n} položek` : 'Všechno už na seznamu je'); refresh(); }
    else if (act === 'toggle-done') { showDone = !showDone; refresh(); }
    else if (act === 'clear') {
      if (!(await confirmSheet('Odstranit všechno, co máš v košíku?', 'Vyčistit'))) return;
      done.forEach(i => db.del(i.id));
      refresh();
      if (has('finance')) toast('Tip: nákup zapiš jako výdaj na Dnes → ikona peněženky', 'long');
    }
  };
}
function row(i) {
  return `<div class="row shop ${i.done ? 'done' : ''}" data-act="tick" data-id="${i.id}">
    <button class="tick" aria-label="${i.done ? 'Vrátit' : 'Mám'}" aria-pressed="${!!i.done}">${icon('check', 14)}</button>
    <p class="row-main row-title">${esc(i.name)}</p>
    <button class="icon-btn sm" data-act="del" data-id="${i.id}" aria-label="Smazat">${icon('x', 14)}</button>
  </div>`;
}

// ---------- wishlist ----------
const PR = { 3: 'Musím mít', 2: 'Chci', 1: 'Jednou' };
function wishView(root, refresh) {
  const all = db.all('wish');
  const open = all.filter(w => !w.bought).sort((a, b) => (b.prio || 2) - (a.prio || 2) || (b.added || '').localeCompare(a.added || ''));
  const bought = all.filter(w => w.bought).sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || ''));
  const total = sum(open, w => w.price);
  root.innerHTML = `
    <form class="inline-add big one" data-form="wish">
      <input name="v" placeholder="Vlož odkaz z e-shopu nebo napiš, co chceš" aria-label="Odkaz nebo název" autocomplete="off" autocapitalize="none">
      <button class="btn primary sm" aria-label="Přidat">${icon('plus', 18)}</button>
    </form>
    <div class="row-btns tight"><button class="btn ghost sm" data-act="paste">${icon('link', 16)} Vložit odkaz ze schránky</button></div>
    ${open.length ? `<p class="small muted wish-sum">${open.length} přání${total ? ` · celkem ${money(total)}` : ''}</p>
      <div class="wish-grid">${open.map(card).join('')}</div>`
      : empty('Wishlist je prázdný. V e-shopu zkopíruj odkaz na věc a vlož ho sem – načte se název, fotka i cena.')}
    ${bought.length ? `<section class="panel"><div class="panel-head"><h3>Koupeno ${bought.length}</h3><button class="link" data-act="show-bought">${showBought ? 'Skrýt' : 'Zobrazit'}</button></div>
      ${showBought ? bought.map(w => `<div class="row" data-act="w-edit" data-id="${w.id}">${w.image ? `<img class="wish-thumb" src="${esc(w.image)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<span class="ico">${icon('cart', 18)}</span>`}<div class="row-main"><p class="row-title">${esc(w.title)}</p><p class="row-meta"><span>${w.price ? money(w.price) : ''}</span><span>${esc((w.boughtAt || '').slice(0, 10))}</span></p></div></div>`).join('') : ''}
    </section>` : ''}`;
  root.onsubmit = async e => {
    e.preventDefault();
    const v = e.target.v.value.trim();
    if (!v) return;
    e.target.v.value = '';
    await addWish(v, refresh);
  };
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const w = b.dataset.id ? db.get(b.dataset.id) : null;
    if (act === 'paste') {
      try { const t = (await navigator.clipboard.readText()).trim(); if (!t) throw new Error(); await addWish(t, refresh); }
      catch (err) { toast('Schránka je prázdná nebo nepovolená – vlož odkaz do pole (podrž prst → Vložit)', 'long'); }
    } else if (act === 'show-bought') { showBought = !showBought; refresh(); }
    else if (act === 'w-edit' && w) editWish(w, refresh);
    else if (act === 'w-buy' && w) {
      e.stopPropagation();
      db.patch(w.id, { bought: true, boughtAt: new Date().toISOString() });
      toast(`Koupeno: ${esc(w.title)}`);
      if (has('finance')) editTx({ type: 'out', amount: w.price || null, note: w.title, cat: guessCat(w.title + ' ' + (w.site || ''), 'out'), date: today() }, refresh);
      else refresh();
    } else if (act === 'w-refresh' && w) {
      e.stopPropagation();
      b.disabled = true;
      try {
        const d = await linkPreview(w.url);
        const hist = [...(w.history || []), ...(w.price ? [{ d: today(), p: w.price }] : [])].slice(-12);
        const np = d.price || w.price;
        db.patch(w.id, { price: np, image: w.image || d.image, history: hist, checked: today() });
        toast(d.price && w.price && d.price !== w.price ? `Cena ${d.price < w.price ? 'klesla' : 'stoupla'}: ${money(w.price)} → ${money(d.price)}` : 'Cena beze změny');
        refresh();
      } catch (err) { toast(esc(err.message), 'warn'); b.disabled = false; }
    }
  };
}
function card(w) {
  const prev = (w.history || []).slice(-1)[0];
  const drop = prev && w.price && w.price < prev.p;
  return `<article class="wish" data-act="w-edit" data-id="${w.id}">
    <div class="wish-img">${w.image ? `<img src="${esc(w.image)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : icon('cart', 30)}
      <span class="wish-prio p${w.prio || 2}">${esc(PR[w.prio || 2])}</span></div>
    <div class="wish-body">
      <h4>${esc(w.title || 'Bez názvu')}</h4>
      <p class="wish-meta">${w.site ? esc(w.site) : ''}${w.size ? ` · vel. ${esc(w.size)}` : ''}</p>
      <p class="wish-price">${w.price ? `${money(w.price)}${w.currency && w.currency !== 'CZK' ? ` <small>${esc(w.currency)}</small>` : ''}` : '<span class="muted">cena ?</span>'}${drop ? ` <small class="green">↓ z ${money(prev.p)}</small>` : ''}</p>
      <div class="wish-act">
        ${w.url ? `<a class="btn xs ghost" href="${esc(w.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icon('link', 14)} E-shop</a>` : ''}
        ${w.url ? `<button class="btn xs ghost" data-act="w-refresh" data-id="${w.id}" aria-label="Zkontrolovat cenu">${icon('sync', 14)}</button>` : ''}
        <button class="btn xs primary" data-act="w-buy" data-id="${w.id}">${icon('check', 14)} Koupeno</button>
      </div>
    </div>
  </article>`;
}
async function addWish(v, after) {
  if (isUrl(v)) {
    const url = normUrl(v);
    const s = sheet({ title: 'Načítám odkaz…', body: `<p class="muted">${esc(host(url))}</p><div class="loading-bar"><i></i></div>` });
    let d = {};
    try { d = await linkPreview(url); }
    catch (e) { toast(`${esc(e.message)} – vyplň to ručně.`, 'warn long'); }
    s.close();
    editWish({ url: d.url || url, title: d.title || '', image: d.image || '', price: d.price || null, currency: d.currency || 'CZK', site: d.site || host(url), prio: 2 }, after, true);
  } else {
    editWish({ title: v, prio: 2 }, after, true);
  }
}
function editWish(w, after, isNew = false) {
  openForm({
    title: isNew ? 'Nové přání' : 'Upravit přání',
    fields: [
      { k: 'title', label: 'Co', req: true, ph: 'Např. Nike Air Max 90' },
      { k: 'price', label: 'Cena (Kč)', type: 'number', step: '1', min: 0, half: true },
      { k: 'size', label: 'Velikost / varianta', half: true, ph: 'Např. 43, M, černá' },
      { k: 'prio', label: 'Priorita', type: 'chips', options: [{ v: 3, l: PR[3] }, { v: 2, l: PR[2] }, { v: 1, l: PR[1] }], def: 2 },
      { k: 'url', label: 'Odkaz', type: 'url', ph: 'https://…' },
      { k: 'image', label: 'Obrázek (odkaz)', type: 'url', ph: 'načte se samo' },
      { k: 'note', label: 'Poznámka', type: 'textarea', rows: 2 },
      ...(isNew ? [] : [{ k: 'bought', label: 'Koupeno', type: 'check' }]),
    ],
    values: w,
    extra: w.image ? `<img class="wish-preview" src="${esc(w.image)}" alt="" referrerpolicy="no-referrer">` : '',
    onSave: v => {
      db.put('wish', { added: new Date().toISOString(), ...w, ...v, prio: Number(v.prio) || 2, site: w.site || host(v.url), boughtAt: v.bought ? (w.boughtAt || new Date().toISOString()) : null });
      toast(isNew ? 'Přidáno na wishlist' : 'Uloženo');
      after();
    },
    onDelete: isNew ? null : () => { db.del(w.id); after(); },
  });
}
