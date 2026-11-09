// Finance – cash flow: účty a zůstatky, příjmy a výdaje, pravidelné platby, rozpočty, trend a import z banky.
import { db, profile, setProfile } from '../store.js';
import { esc, icon, today, money, sum, segTabs, chart, cssVar, MONTHS, openForm, progress, empty, parse, toast, sheet, addDays, relDay, fmtDay, SWATCHES, confirmSheet } from '../ui.js';
import { editTx, txRow, finOut, finIn } from '../common.js';
import {
  accounts, account, balance, totalBalance, monthTx, incOf, outOf, shiftMonth, monthEnd, recurring, postDueRecurring, upcoming, monthlyCost,
  ACC_TYPES, flowOf, parseCSV, guessColumns, importRows, txKey, guessCat, defaultAccount,
} from '../money-core.js';

let month = null;
let tab = 'flow';
let catF = '';

const mLabel = m => { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}`; };

export default {
  title: 'Finance',
  render(root, args, { refresh }) {
    if (!month) month = today().slice(0, 7);
    const p = profile();
    const posted = postDueRecurring();
    if (posted) toast(`Zapsáno ${posted} pravidelných plateb`);
    const all = db.all('tx').filter(t => t.type !== 'transfer');
    const mtxAll = db.all('tx').filter(t => (t.date || '').startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
    const mtx = mtxAll.filter(t => t.type !== 'transfer');
    const inc = incOf(mtx);
    const out = outOf(mtx);
    const budget = p.budget || 0;
    const outCats = finOut().map(c => ({ ...c, v: sum(mtx.filter(t => t.type === 'out' && t.cat === c.id), t => t.amount) })).filter(c => c.v > 0).sort((a, b) => b.v - a.v);
    const isCur = month === today().slice(0, 7);
    const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
    const dayN = isCur ? parse(today()).getDate() : dim;
    const perDay = dayN ? out / dayN : 0;
    const catBudgets = p.catBudgets || {};

    let body = '';
    if (tab === 'flow') body = flowTab(month, isCur, inc, out);
    else if (tab === 'rec') body = recTab();
    else if (tab === 'month') {
      const list = (catF ? mtx : mtxAll).filter(t => !catF || t.cat === catF);
      body = `
        <section class="panel hud">
          <div class="kpis">
            <div><span>Příjmy</span><b class="green">${money(inc)}</b></div>
            <div><span>Výdaje</span><b>${money(out)}</b></div>
            <div><span>Bilance</span><b class="${inc - out < 0 ? 'red' : 'green'}">${money(inc - out)}</b></div>
          </div>
          ${budget ? `<div class="macro"><span>Rozpočet na výdaje</span><b>${money(out)} / ${money(budget)}</b></div>${progress(out, budget, out > budget ? 'var(--red)' : '')}
            <p class="small muted">${out > budget ? `Přes rozpočet o ${money(out - budget)}.` : `Zbývá ${money(budget - out)}${isCur ? ` · cca ${money((budget - out) / Math.max(1, dim - dayN + 1))} na den` : ''}.`} Průměr ${money(perDay)} / den.</p>`
            : `<p class="small muted">Průměr ${money(perDay)} / den. <button class="link" data-act="budget">Nastavit měsíční rozpočet</button></p>`}
        </section>
        <div class="row-btns"><button class="btn ghost" data-act="new-in">${icon('plus', 18)} Příjem</button><button class="btn primary" data-act="new-out">${icon('plus', 18)} Výdaj</button></div>
        ${outCats.length ? `<section class="panel"><div class="panel-head"><h3>Kam jdou peníze</h3><button class="link" data-act="budget">Rozpočty</button></div>
          <div class="donut-wrap"><div class="chart-box donut"><canvas id="fDonut"></canvas><div class="donut-c"><b>${money(out)}</b><small>výdaje</small></div></div>
          <ul class="legend">${outCats.map(c => `<li><button class="link-plain ${catF === c.id ? 'on' : ''}" data-act="cat" data-v="${c.id}"><i class="dot" style="--c:${c.color}"></i><span>${esc(c.name)}</span><b>${money(c.v)}</b><small>${Math.round(c.v / out * 100)} %</small></button>
            ${catBudgets[c.id] ? progress(c.v, catBudgets[c.id], c.v > catBudgets[c.id] ? 'var(--red)' : c.color) : ''}</li>`).join('')}</ul></div>
        </section>` : ''}
        <section class="panel"><div class="panel-head"><h3>Výdaje po dnech</h3></div><div class="chart-box"><canvas id="fDays"></canvas></div></section>
        <section class="panel">
          <div class="panel-head"><h3>Pohyby${catF ? ` · ${esc((finOut().find(c => c.id === catF) || finIn().find(c => c.id === catF) || {}).name || '')}` : ''}</h3>${catF ? `<button class="link" data-act="cat" data-v="">Zrušit filtr</button>` : `<small class="muted">${mtx.length}</small>`}</div>
          ${list.length ? list.map(txRow).join('') : '<p class="muted">Tento měsíc zatím nic. Zapisuj hned po zaplacení – trvá to 5 sekund.</p>'}
        </section>
        <div class="row-btns"><button class="btn ghost" data-act="import">${icon('upload', 18)} Import výpisu z banky</button></div>`;
    } else {
      const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
      const rows = months.map(m => { const l = monthTx(m); return { m, inc: incOf(l), out: outOf(l) }; });
      const avgOut = sum(rows, r => r.out) / 6;
      body = `
        <section class="panel hud"><div class="kpis">
          <div><span>Ø výdaje / měsíc</span><b>${money(avgOut)}</b></div>
          <div><span>Ø příjmy / měsíc</span><b class="green">${money(sum(rows, r => r.inc) / 6)}</b></div>
          <div><span>Za 6 měsíců</span><b class="${sum(rows, r => r.inc - r.out) < 0 ? 'red' : 'green'}">${money(sum(rows, r => r.inc - r.out))}</b></div>
        </div></section>
        <section class="panel"><div class="panel-head"><h3>Příjmy vs. výdaje</h3></div><div class="chart-box tall"><canvas id="fMonths"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>Výdaje podle kategorií</h3></div><div class="chart-box tall"><canvas id="fStack"></canvas></div></section>
        <section class="panel">${rows.slice().reverse().map(r => `<div class="row"><div class="row-main"><p class="row-title">${esc(mLabel(r.m))}</p><p class="row-meta"><span class="green">+${money(r.inc)}</span><span>−${money(r.out)}</span></p></div><b class="${r.inc - r.out < 0 ? 'red' : 'green'}">${money(r.inc - r.out)}</b></div>`).join('')}</section>`;
      setTimeout(() => {
        chart(root.querySelector('#fMonths'), { type: 'bar', data: { labels: months.map(m => MONTHS[Number(m.slice(5)) - 1].slice(0, 3)), datasets: [
          { label: 'Příjmy', data: rows.map(r => r.inc), backgroundColor: cssVar('--green'), borderRadius: 4, maxBarThickness: 20 },
          { label: 'Výdaje', data: rows.map(r => r.out), backgroundColor: cssVar('--acc'), borderRadius: 4, maxBarThickness: 20 }] },
          options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
        chart(root.querySelector('#fStack'), { type: 'bar', data: { labels: months.map(m => MONTHS[Number(m.slice(5)) - 1].slice(0, 3)), datasets: finOut().map(c => ({ label: c.name, data: months.map(m => sum(all.filter(t => t.type === 'out' && t.cat === c.id && (t.date || '').startsWith(m)), t => t.amount)), backgroundColor: c.color, maxBarThickness: 26 })) },
          options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } } });
      });
    }

    root.innerHTML = `
      <section class="cal-head">
        <button class="icon-btn" data-act="m" data-v="-1" aria-label="Předchozí měsíc">${icon('left')}</button>
        <h2>${esc(mLabel(month))}</h2>
        <button class="icon-btn" data-act="m" data-v="1" aria-label="Další měsíc">${icon('right')}</button>
        ${isCur ? '' : '<button class="btn sm ghost" data-act="m-now">Teď</button>'}
      </section>
      ${segTabs([['flow', 'Přehled'], ['month', 'Pohyby'], ['rec', 'Pravidelné'], ['trend', 'Trend']], tab)}
      ${body}
      ${tab === 'flow' || tab === 'month' ? `<button class="fab" data-act="new-out" aria-label="Nový výdaj">${icon('plus', 26)}</button>` : ''}`;

    if (tab === 'month') {
      if (outCats.length) chart(root.querySelector('#fDonut'), { type: 'doughnut', data: { labels: outCats.map(c => c.name), datasets: [{ data: outCats.map(c => c.v), backgroundColor: outCats.map(c => c.color), borderWidth: 0, hoverOffset: 4 }] }, options: { cutout: '72%' } });
      const days = Array.from({ length: dim }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
      chart(root.querySelector('#fDays'), { type: 'bar', data: { labels: days.map((d, i) => i + 1), datasets: [{ data: days.map(d => sum(mtx.filter(t => t.type === 'out' && t.date === d), t => t.amount)), backgroundColor: cssVar('--acc'), borderRadius: 3, maxBarThickness: 12 }] }, options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } } } });
    }

    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'm') { month = shiftMonth(month, Number(b.dataset.v)); catF = ''; refresh(); }
      else if (act === 'm-now') { month = today().slice(0, 7); refresh(); }
      else if (act === 'tab') { tab = b.dataset.v; refresh(); }
      else if (act === 'cat') { catF = catF === b.dataset.v ? '' : b.dataset.v; refresh(); }
      else if (act === 'new-out' || act === 'new-in') editTx({ type: act === 'new-in' ? 'in' : 'out', date: isCur ? today() : `${month}-01` }, refresh);
      else if (act === 'tx-edit') editTx(db.get(b.dataset.id), refresh);
      else if (act === 'budget') editBudget(refresh);
      else if (act === 'new-tr') editTx({ type: 'transfer', date: today() }, refresh);
      else if (act === 'acc-new') editAccount({}, refresh);
      else if (act === 'acc') editAccount(db.get(b.dataset.id), refresh);
      else if (act === 'rec-new') editRec({}, refresh);
      else if (act === 'rec') editRec(db.get(b.dataset.id), refresh);
      else if (act === 'import') importSheet(refresh);
    };
  }
};

function editBudget(after) {
  const p = profile();
  const cb = p.catBudgets || {};
  const fields = [{ k: 'budget', label: 'Celkový měsíční rozpočet na výdaje (Kč)', type: 'number', ph: 'např. 8000' },
    ...finOut().map(c => ({ k: 'c_' + c.id, label: c.name, type: 'number', half: true, ph: '—' }))];
  const values = { budget: p.budget || '' };
  finOut().forEach(c => { values['c_' + c.id] = cb[c.id] || ''; });
  openForm({
    title: 'Rozpočty',
    fields,
    values,
    onSave: v => {
      const catBudgets = {};
      finOut().forEach(c => { if (v['c_' + c.id] > 0) catBudgets[c.id] = v['c_' + c.id]; });
      setProfile({ budget: v.budget || 0, catBudgets });
      toast('Rozpočet uložen');
      after();
    },
    extra: '<p class="small muted">Rozpočty kategorií jsou volitelné – ukážou se jako lišta u grafu.</p>',
  });
}

// ---------- Přehled (cash flow) ----------
function flowTab(m, isCur, inc, out) {
  const A = accounts();
  const end = isCur ? today() : monthEnd(m);
  const startBal = totalBalance(addDays(`${m}-01`, -1));
  const nowBal = totalBalance(end);
  const fl = flowOf(m, end);
  const up = isCur ? upcoming(monthEnd(m)) : [];
  const upOut = sum(up.filter(r => (r.type || 'out') === 'out'), r => r.amount);
  const upIn = sum(up.filter(r => r.type === 'in'), r => r.amount);
  const next30 = upcoming(addDays(today(), 30));
  if (!A.length) {
    return `<section class="panel hud">
        <div class="kpis"><div><span>Příjmy</span><b class="green">${money(inc)}</b></div><div><span>Výdaje</span><b>${money(out)}</b></div><div><span>Bilance</span><b class="${inc - out < 0 ? 'red' : 'green'}">${money(inc - out)}</b></div></div>
      </section>
      <section class="panel"><div class="panel-head"><h3>${icon('wallet', 18)} Přidej svoje účty</h3></div>
        <p class="muted">Zadej, kolik máš teď na kartě, v hotovosti a na spoření. Appka pak hlídá zůstatek, celkový majetek a kolik ti zbyde do konce měsíce.</p>
        <button class="btn primary" data-act="acc-new">${icon('plus', 18)} Přidat účet</button></section>
      ${recMini(next30)}`;
  }
  return `
    <section class="panel hud flow">
      <p class="flow-k">Celkem na účtech</p>
      <p class="flow-big ${nowBal < 0 ? 'red' : ''}">${money(nowBal)}</p>
      <div class="flow-steps">
        <div><span>Začátek měsíce</span><b>${money(startBal)}</b></div>
        <div><span>Příjmy</span><b class="green">+${money(fl.inc)}</b></div>
        <div><span>Výdaje</span><b class="red">−${money(fl.out)}</b></div>
        <div class="tot"><span>${isCur ? 'Teď' : 'Konec měsíce'}</span><b>${money(nowBal)}</b></div>
        ${isCur && (upOut || upIn) ? `<div><span>Ještě odejde (pravidelné)</span><b class="red">−${money(upOut)}</b></div>${upIn ? `<div><span>Ještě přijde</span><b class="green">+${money(upIn)}</b></div>` : ''}
        <div class="tot"><span>Volné do konce měsíce</span><b class="${nowBal - upOut + upIn < 0 ? 'red' : 'green'}">${money(nowBal - upOut + upIn)}</b></div>` : ''}
      </div>
    </section>
    <div class="row-btns"><button class="btn ghost" data-act="new-in">${icon('plus', 18)} Příjem</button>${A.length > 1 ? `<button class="btn ghost" data-act="new-tr">${icon('sync', 18)} Převod</button>` : ''}<button class="btn primary" data-act="new-out">${icon('plus', 18)} Výdaj</button></div>
    <section class="panel">
      <div class="panel-head"><h3>${icon('wallet', 18)} Účty</h3><button class="btn sm ghost" data-act="acc-new">${icon('plus', 16)} Účet</button></div>
      ${A.map(a => { const b = balance(a.id, end); return `<button class="row" data-act="acc" data-id="${a.id}"><i class="cat-dot" style="--c:${a.color || '#4FD8FF'}"></i><div class="row-main"><p class="row-title">${esc(a.name)}${a.main ? ' <small class="muted">· hlavní</small>' : ''}</p><p class="row-meta"><span>${esc((ACC_TYPES.find(t => t.v === a.type) || {}).l || '')}</span>${a.hidden ? '<span>nepočítá se do celku</span>' : ''}</p></div><b class="amt ${b < 0 ? 'red' : ''}">${money(b)}</b></button>`; }).join('')}
    </section>
    ${recMini(next30)}
    <div class="row-btns"><button class="btn ghost" data-act="import">${icon('upload', 18)} Import výpisu z banky</button></div>`;
}
function recMini(list) {
  return `<section class="panel">
    <div class="panel-head"><h3>${icon('calendar', 18)} Nadcházející platby</h3><button class="link" data-act="tab" data-v="rec">Pravidelné</button></div>
    ${list.length ? list.slice(0, 6).map(r => `<button class="row" data-act="rec" data-id="${r.id}"><span class="ev-time"><small>${esc(relDay(r.due))}</small></span><div class="row-main"><p class="row-title">${esc(r.name)}</p></div><b class="amt ${r.type === 'in' ? 'in' : ''}">${r.type === 'in' ? '+' : '−'}${money(r.amount)}</b></button>`).join('')
      : `<p class="muted small">Žádné. Přidej nájem, předplatné nebo výplatu jako pravidelnou platbu – zapíše se sama.</p>`}
  </section>`;
}

// ---------- Pravidelné ----------
function recTab() {
  const R = recurring();
  const outM = sum(R.filter(r => r.active !== false && (r.type || 'out') === 'out'), monthlyCost);
  const inM = sum(R.filter(r => r.active !== false && r.type === 'in'), monthlyCost);
  const FQ = { monthly: 'měsíčně', weekly: 'týdně', yearly: 'ročně' };
  return `
    <section class="panel hud"><div class="kpis">
      <div><span>Pravidelně odchází</span><b>${money(outM)}</b></div>
      <div><span>Pravidelně přichází</span><b class="green">${money(inM)}</b></div>
      <div><span>Rozdíl / měsíc</span><b class="${inM - outM < 0 ? 'red' : 'green'}">${money(inM - outM)}</b></div>
    </div></section>
    <section class="panel">
      <div class="panel-head"><h3>Pravidelné platby</h3><button class="btn sm primary" data-act="rec-new">${icon('plus', 16)} Přidat</button></div>
      ${R.length ? R.map(r => `<button class="row ${r.active === false ? 'off' : ''}" data-act="rec" data-id="${r.id}"><i class="cat-dot" style="--c:${((r.type === 'in' ? finIn() : finOut()).find(c => c.id === r.cat) || {}).color || '#9AA7B4'}"></i><div class="row-main"><p class="row-title">${esc(r.name)}</p><p class="row-meta"><span>${FQ[r.freq || 'monthly']}${r.freq === 'weekly' ? '' : ` · ${r.day || 1}.`}</span>${r.auto === false ? '<span>jen připomenout</span>' : '<span>zapisuje se samo</span>'}${r.active === false ? '<span>pozastaveno</span>' : ''}</p></div><b class="amt ${r.type === 'in' ? 'in' : ''}">${r.type === 'in' ? '+' : '−'}${money(r.amount)}</b></button>`).join('')
        : '<p class="muted">Nájem, telefon, Spotify, gym, výplata… Zadej jednou a appka je každý měsíc zapíše sama.</p>'}
    </section>`;
}
function editRec(r = {}, after) {
  const type = r.type || 'out';
  const accs = accounts();
  const s = openForm({
    title: r.id ? 'Upravit pravidelnou platbu' : 'Nová pravidelná platba',
    fields: [
      { k: 'type', label: 'Typ', type: 'chips', options: [{ v: 'out', l: 'Výdaj' }, { v: 'in', l: 'Příjem' }], def: type },
      { k: 'name', label: 'Název', req: true, ph: 'Např. Nájem, Spotify, Výplata' },
      { k: 'amount', label: 'Částka (Kč)', type: 'number', step: '0.01', min: 0, req: true },
      { k: 'cat', label: 'Kategorie', type: 'chips', options: (type === 'in' ? finIn() : finOut()).map(c => ({ v: c.id, l: c.name, c: c.color })), def: r.cat || (type === 'in' ? finIn() : finOut())[0].id },
      { k: 'freq', label: 'Jak často', type: 'select', half: true, options: [{ v: 'monthly', l: 'Každý měsíc' }, { v: 'weekly', l: 'Každý týden' }, { v: 'yearly', l: 'Každý rok' }], def: 'monthly' },
      { k: 'day', label: 'Den v měsíci', type: 'number', min: 1, max: 28, half: true, def: Number(today().slice(8)) > 28 ? 28 : Number(today().slice(8)) },
      { k: 'month', label: 'Měsíc (u ročních)', type: 'select', half: true, options: MONTHS.map((m, i) => ({ v: i + 1, l: m })), def: Number(today().slice(5, 7)) },
      { k: 'weekday', label: 'Den v týdnu (u týdenních)', type: 'select', half: true, options: [[1, 'pondělí'], [2, 'úterý'], [3, 'středa'], [4, 'čtvrtek'], [5, 'pátek'], [6, 'sobota'], [0, 'neděle']].map(([v, l]) => ({ v, l })), def: 1 },
      ...(accs.length ? [{ k: 'account', label: 'Účet', type: 'select', options: accs.map(a => ({ v: a.id, l: a.name })), def: defaultAccount() }] : []),
      { k: 'auto', label: 'Zapisovat automaticky', type: 'check', def: true },
      { k: 'active', label: 'Aktivní', type: 'check', def: true },
    ],
    values: { ...r, auto: r.auto !== false, active: r.active !== false },
    onSave: v => {
      if (!(v.amount > 0)) { toast('Zadej částku', 'warn'); return false; }
      db.put('recurring', { since: today(), ...r, ...v, day: Math.min(28, Math.max(1, Number(v.day) || 1)) });
      postDueRecurring();
      after();
    },
    onDelete: r.id ? () => { db.del(r.id); after(); } : null,
    extra: '<p class="small muted">Kvůli kratším měsícům jde nastavit den 1–28. Už zapsané platby zůstanou, i když tuhle smažeš.</p>',
  });
  const form = s.body.querySelector('form');
  form.querySelector('input[name="type"]').addEventListener('change', e => {
    const list = e.target.value === 'in' ? finIn() : finOut();
    form.querySelector('[data-chips="cat"]').innerHTML = list.map((c, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-v="${c.id}" style="--c:${c.color}"><i class="dot"></i>${esc(c.name)}</button>`).join('');
    form.querySelector('input[name="cat"]').value = list[0].id;
  });
  const fq = form.querySelector('[name="freq"]');
  const vis = () => {
    form.querySelector('[name="day"]').closest('.field').hidden = fq.value === 'weekly';
    form.querySelector('[name="month"]').closest('.field').hidden = fq.value !== 'yearly';
    form.querySelector('[name="weekday"]').closest('.field').hidden = fq.value !== 'weekly';
  };
  fq.addEventListener('change', vis);
  vis();
}

// ---------- účty ----------
function editAccount(a = {}, after) {
  openForm({
    title: a.id ? 'Upravit účet' : 'Nový účet',
    fields: [
      { k: 'name', label: 'Název', req: true, ph: 'Např. Karta, Hotovost, Spořák' },
      { k: 'type', label: 'Druh', type: 'chips', options: ACC_TYPES, def: accounts().length ? 'cash' : 'card' },
      { k: 'start', label: a.id ? 'Počáteční zůstatek (Kč)' : 'Kolik tam máš teď (Kč)', type: 'number', step: '0.01', ph: '0', half: true },
      { k: 'startDate', label: 'Ke dni', type: 'date', half: true, def: today() },
      { k: 'color', label: 'Barva', type: 'color' },
      { k: 'main', label: 'Hlavní účet (předvybraný u plateb)', type: 'check', def: !accounts().length },
      { k: 'hidden', label: 'Nepočítat do celkového zůstatku', type: 'check' },
    ],
    values: { color: SWATCHES[accounts().length % SWATCHES.length], ...a },
    onSave: v => {
      if (v.main) accounts().filter(x => x.main && x.id !== a.id).forEach(x => db.patch(x.id, { main: false }));
      db.put('accounts', { order: accounts().length, ...a, ...v, start: v.start || 0 });
      after();
    },
    onDelete: a.id ? () => {
      const n = db.filter('tx', t => t.account === a.id || t.toAccount === a.id).length;
      db.del(a.id);
      if (n) toast(`${n} pohybů zůstává, jen bez účtu`, 'long');
      after();
    } : null,
    extra: '<p class="small muted">Zůstatek = počáteční částka + všechny příjmy − výdaje od toho dne. Když nesedí, oprav tu počáteční částku.</p>',
  });
}

// ---------- import z banky ----------
function importSheet(after) {
  const accs = accounts();
  const s = sheet({
    title: 'Import výpisu z banky',
    body: `<p class="small muted">V internetovém bankovnictví stáhni pohyby jako <b>CSV</b> (George, KB, ČSOB, Air Bank, Fio, mBank, Revolut…) a vyber soubor. Duplicity se přeskočí, kategorie se odhadnou a appka se je učí podle toho, jak je opravíš.</p>
      ${accs.length ? `<div class="field"><label for="impA">Na účet</label><select id="impA">${accs.map(a => `<option value="${a.id}" ${a.id === defaultAccount() ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      <button class="btn primary big" data-a="pick">${icon('upload', 18)} Vybrat soubor CSV</button>
      <div id="impOut"></div>`,
  });
  let parsed = null;
  s.body.onclick = e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'pick') {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        const buf = await f.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buf);
        if (text.includes('�')) text = new TextDecoder('windows-1250').decode(buf);
        const rows = parseCSV(text);
        const cols = guessColumns(rows);
        parsed = { rows, cols };
        drawPreview();
      };
      inp.click();
    } else if (b.dataset.a === 'go') {
      const accId = (s.body.querySelector('#impA') || {}).value || '';
      const list = importRows(parsed.rows, parsed.cols, accId);
      const have = new Set(db.all('tx').map(txKey));
      let n = 0, dup = 0;
      list.forEach(t => {
        if (have.has(txKey(t))) { dup++; return; }
        have.add(txKey(t));
        db.put('tx', { ...t, cat: guessCat(t.note, t.type), imported: true });
        n++;
      });
      toast(`Importováno ${n} pohybů${dup ? ` · ${dup} duplicit přeskočeno` : ''}`, 'long');
      s.close();
      after();
    }
  };
  s.body.onchange = e => {
    const sel = e.target.closest('[data-col]');
    if (!sel || !parsed) return;
    parsed.cols[sel.dataset.col] = Number(sel.value);
    drawPreview();
  };
  function drawPreview() {
    const { rows, cols } = parsed;
    const head = rows[cols.header] || [];
    const accId = (s.body.querySelector('#impA') || {}).value || '';
    const list = importRows(rows, cols, accId);
    const opt = k => `<select data-col="${k}"><option value="-1">—</option>${head.map((h, i) => `<option value="${i}" ${cols[k] === i ? 'selected' : ''}>${esc(h || `sloupec ${i + 1}`)}</option>`).join('')}</select>`;
    s.body.querySelector('#impOut').innerHTML = `
      <div class="imp-map">
        <label>Datum ${opt('date')}</label><label>Částka ${opt('amount')}</label>
        <label>Protistrana ${opt('party')}</label><label>Zpráva / popis ${opt('note')}</label>
      </div>
      <p class="small">${list.length ? `Nalezeno <b>${list.length}</b> pohybů · příjmy ${money(sum(list.filter(t => t.type === 'in'), t => t.amount))} · výdaje ${money(sum(list.filter(t => t.type === 'out'), t => t.amount))}` : '<span class="red">Nenašel jsem žádné pohyby – zkontroluj sloupce.</span>'}</p>
      ${list.slice(0, 5).map(t => `<div class="row tx"><div class="row-main"><p class="row-title">${esc(t.note || '—')}</p><p class="row-meta"><span>${esc(fmtDay(t.date))}</span></p></div><b class="amt ${t.type === 'in' ? 'in' : ''}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</b></div>`).join('')}
      ${list.length ? `<button class="btn primary big" data-a="go">${icon('check', 18)} Importovat ${list.length} pohybů</button>` : ''}`;
  }
}
void empty; void confirmSheet; void account; void parse;
