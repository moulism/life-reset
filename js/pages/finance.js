// Finance – příjmy, výdaje, rozpočet a grafy.
import { db, profile, setProfile } from '../store.js';
import { esc, icon, today, money, sum, segTabs, chart, cssVar, MONTHS, openForm, progress, empty, parse, toast } from '../ui.js';
import { editTx, txRow, finOut, finIn } from '../common.js';

let month = null;
let tab = 'month';
let catF = '';

const shiftMonth = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const mLabel = m => { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}`; };

export default {
  title: 'Finance',
  render(root, args, { refresh }) {
    if (!month) month = today().slice(0, 7);
    const p = profile();
    const all = db.all('tx');
    const mtx = all.filter(t => (t.date || '').startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
    const inc = sum(mtx.filter(t => t.type === 'in'), t => t.amount);
    const out = sum(mtx.filter(t => t.type !== 'in'), t => t.amount);
    const budget = p.budget || 0;
    const outCats = finOut().map(c => ({ ...c, v: sum(mtx.filter(t => t.type !== 'in' && t.cat === c.id), t => t.amount) })).filter(c => c.v > 0).sort((a, b) => b.v - a.v);
    const isCur = month === today().slice(0, 7);
    const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
    const dayN = isCur ? parse(today()).getDate() : dim;
    const perDay = dayN ? out / dayN : 0;
    const catBudgets = p.catBudgets || {};

    let body = '';
    if (tab === 'month') {
      const list = mtx.filter(t => !catF || t.cat === catF);
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
        </section>`;
    } else {
      const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
      const rows = months.map(m => { const l = all.filter(t => (t.date || '').startsWith(m)); return { m, inc: sum(l.filter(t => t.type === 'in'), t => t.amount), out: sum(l.filter(t => t.type !== 'in'), t => t.amount) }; });
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
        chart(root.querySelector('#fStack'), { type: 'bar', data: { labels: months.map(m => MONTHS[Number(m.slice(5)) - 1].slice(0, 3)), datasets: finOut().map(c => ({ label: c.name, data: months.map(m => sum(all.filter(t => t.type !== 'in' && t.cat === c.id && (t.date || '').startsWith(m)), t => t.amount)), backgroundColor: c.color, maxBarThickness: 26 })) },
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
      ${segTabs([['month', 'Měsíc'], ['trend', 'Trend 6 měsíců']], tab)}
      ${body}
      ${tab === 'month' ? `<button class="fab" data-act="new-out" aria-label="Nový výdaj">${icon('plus', 26)}</button>` : ''}`;

    if (tab === 'month') {
      if (outCats.length) chart(root.querySelector('#fDonut'), { type: 'doughnut', data: { labels: outCats.map(c => c.name), datasets: [{ data: outCats.map(c => c.v), backgroundColor: outCats.map(c => c.color), borderWidth: 0, hoverOffset: 4 }] }, options: { cutout: '72%' } });
      const days = Array.from({ length: dim }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
      chart(root.querySelector('#fDays'), { type: 'bar', data: { labels: days.map((d, i) => i + 1), datasets: [{ data: days.map(d => sum(mtx.filter(t => t.type !== 'in' && t.date === d), t => t.amount)), backgroundColor: cssVar('--acc'), borderRadius: 3, maxBarThickness: 12 }] }, options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } } } });
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
void empty;
