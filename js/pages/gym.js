import { db, profile } from '../store.js';
import { award, revoke } from '../game.js';
import { esc, icon, today, fmtDay, relDay, sheet, openForm, toast, empty, chart, cssVar, addDays, mondayOf, num1, confirmSheet, segTabs } from '../ui.js';

let tab = 'overview';

const vol = w => (w.exercises || []).reduce((a, e) => a + (e.sets || []).reduce((b, s) => b + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0), 0);

export default {
  title: a => a[0] === 'w' ? 'Trénink' : 'Gym',
  render(root, args, { refresh, go }) {
    if (args[0] === 'w' && args[1]) return editor(root, args[1], refresh, go);
    const p = profile();
    const target = (p.targets && p.targets.gym) || 4;
    const ws = db.filter('workouts', w => w.done).sort((a, b) => b.date.localeCompare(a.date));
    const drafts = db.filter('workouts', w => !w.done);
    const mon = mondayOf(today());
    const thisWeek = ws.filter(w => w.date >= mon).length;
    const tpls = db.all('gymtpl');
    const weights = db.all('weights').sort((a, b) => a.date.localeCompare(b.date));
    const lastW = weights[weights.length - 1];

    // PR
    const pr = {};
    ws.forEach(w => (w.exercises || []).forEach(e => (e.sets || []).forEach(s => {
      const kg = Number(s.kg) || 0;
      if (!pr[e.name] || kg > pr[e.name].kg) pr[e.name] = { kg, reps: s.reps, date: w.date };
    })));
    const prs = Object.entries(pr).filter(([, v]) => v.kg > 0).sort((a, b) => b[1].kg - a[1].kg).slice(0, 8);

    let body = '';
    if (tab === 'overview') {
      body = `
        <section class="panel hud">
          <div class="kpis">
            <div><span>Tento týden</span><b>${thisWeek}<small>/${target}</small></b></div>
            <div><span>Celkem</span><b>${ws.length}</b></div>
            <div><span>Váha</span><b>${lastW ? num1(lastW.kg) + '<small> kg</small>' : '–'}</b></div>
          </div>
          <div class="week-dots">${Array.from({ length: 7 }, (_, i) => { const d = addDays(mon, i); const n = ws.filter(w => w.date === d).length; return `<span class="${n ? 'on' : ''} ${d === today() ? 'today' : ''}">${['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][i]}</span>`; }).join('')}</div>
        </section>
        ${drafts.length ? `<section class="panel"><div class="panel-head"><h3>Rozpracovaný trénink</h3></div>${drafts.map(w => `<a class="row" href="#/gym/w/${w.id}"><span class="ico">${icon('gym', 18)}</span><div class="row-main"><p class="row-title">${esc(w.name)}</p><p class="row-meta"><span>${relDay(w.date)}</span></p></div>${icon('right', 18)}</a>`).join('')}</section>` : ''}
        <section class="panel">
          <div class="panel-head"><h3>Začít trénink</h3><button class="link" data-act="tpl-manage">Upravit šablony</button></div>
          <div class="tpl-grid">${tpls.map(t => `<button class="tpl" data-act="start" data-id="${t.id}"><b>${esc(t.name)}</b><small>${(t.exercises || []).length} cviků</small></button>`).join('')}
          <button class="tpl ghost" data-act="start-empty"><b>${icon('plus', 16)} Prázdný</b><small>vlastní cviky</small></button>
          <button class="tpl ghost" data-act="football"><b>Fotbal</b><small>trénink / zápas</small></button></div>
        </section>
        <section class="panel"><div class="panel-head"><h3>Tréninky po týdnech</h3></div><div class="chart-box"><canvas id="gWeeks"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>Tělesná váha</h3><button class="btn sm ghost" data-act="weight">${icon('plus', 16)} Zapsat váhu</button></div>
          ${weights.length > 1 ? '<div class="chart-box"><canvas id="gWeight"></canvas></div>' : '<p class="muted">Važ se 3× týdně ráno nalačno – graf ukáže trend.</p>'}</section>
        ${prs.length ? `<section class="panel"><div class="panel-head"><h3>${icon('star', 18)} Osobní rekordy</h3></div>${prs.map(([n, v]) => `<div class="row"><div class="row-main"><p class="row-title">${esc(n)}</p><p class="row-meta"><span>${fmtDay(v.date)}</span></p></div><b class="gold">${num1(v.kg)} kg × ${v.reps || 0}</b></div>`).join('')}</section>` : ''}`;
    } else {
      body = ws.length ? ws.map(w => `<a class="row" href="#/gym/w/${w.id}"><span class="ico">${icon(w.kind === 'football' ? 'target' : 'gym', 18)}</span><div class="row-main"><p class="row-title">${esc(w.name)}</p><p class="row-meta"><span>${fmtDay(w.date, true)}</span><span>${(w.exercises || []).length} cviků</span>${vol(w) ? `<span>${Math.round(vol(w))} kg objem</span>` : ''}${w.duration ? `<span>${w.duration} min</span>` : ''}</p></div></a>`).join('') : empty('Zatím žádný trénink.');
    }

    root.innerHTML = `${segTabs([['overview', 'Přehled'], ['history', `Historie ${ws.length || ''}`]], tab)}${body}`;

    if (tab === 'overview') {
      const weeks = Array.from({ length: 8 }, (_, i) => addDays(mon, (i - 7) * 7));
      chart(root.querySelector('#gWeeks'), {
        type: 'bar',
        data: { labels: weeks.map(w => fmtDay(w).slice(3)), datasets: [{ data: weeks.map(w => ws.filter(x => x.date >= w && x.date < addDays(w, 7)).length), backgroundColor: cssVar('--acc'), borderRadius: 4, maxBarThickness: 26 }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, suggestedMax: target }, x: { grid: { display: false } } } }
      });
      if (weights.length > 1) chart(root.querySelector('#gWeight'), {
        type: 'line',
        data: { labels: weights.map(w => fmtDay(w.date).slice(3)), datasets: [{ data: weights.map(w => w.kg), borderColor: cssVar('--gold'), backgroundColor: 'transparent', tension: .3, pointRadius: 3 }] },
        options: { scales: { x: { grid: { display: false } } } }
      });
    }

    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tab') { tab = b.dataset.v; refresh(); }
      else if (act === 'start') {
        const t = db.get(b.dataset.id);
        const id = db.put('workouts', { name: t.name, date: today(), done: false, started: new Date().toISOString(), exercises: (t.exercises || []).map(n => ({ name: n, sets: [{ kg: '', reps: '' }, { kg: '', reps: '' }, { kg: '', reps: '' }] })) });
        go('gym/w/' + id);
      } else if (act === 'start-empty') {
        const id = db.put('workouts', { name: 'Trénink', date: today(), done: false, started: new Date().toISOString(), exercises: [] });
        go('gym/w/' + id);
      } else if (act === 'football') {
        openForm({
          title: 'Fotbal', fields: [{ k: 'name', label: 'Typ', type: 'chips', options: [{ v: 'Fotbal – trénink', l: 'Trénink' }, { v: 'Fotbal – zápas', l: 'Zápas' }], def: 'Fotbal – trénink' }, { k: 'date', label: 'Datum', type: 'date', def: today(), half: true }, { k: 'duration', label: 'Minut', type: 'number', def: 90, half: true }, { k: 'note', label: 'Poznámka', type: 'textarea', rows: 2 }],
          onSave: v => { const id = db.put('workouts', { ...v, kind: 'football', exercises: [], done: true }); award('gym:' + id, 40, 'Trénink'); refresh(); }
        });
      } else if (act === 'weight') {
        openForm({
          title: 'Zapsat váhu', fields: [{ k: 'kg', label: 'Váha (kg)', type: 'number', step: '0.1', req: true, ph: '63,5' }, { k: 'date', label: 'Datum', type: 'date', def: today() }],
          onSave: v => { const ex = db.find('weights', w => w.date === v.date); db.put('weights', { ...(ex || {}), ...v }); award('weight:' + v.date, 5, 'Vážení'); refresh(); }
        });
      } else if (act === 'tpl-manage') manageTemplates(refresh);
    };
  }
};

function manageTemplates(refresh) {
  const tpls = db.all('gymtpl');
  const s = sheet({
    title: 'Šablony tréninků',
    body: `${tpls.map(t => `<button class="row" data-id="${t.id}"><div class="row-main"><p class="row-title">${esc(t.name)}</p><p class="row-meta"><span>${esc((t.exercises || []).join(', '))}</span></p></div>${icon('edit', 18)}</button>`).join('')}
      <button class="btn ghost" data-new>${icon('plus', 18)} Nová šablona</button>`
  });
  const edit = (t = {}) => {
    s.close();
    openForm({
      title: t.id ? 'Upravit šablonu' : 'Nová šablona',
      fields: [{ k: 'name', label: 'Název', req: true, ph: 'Např. Push' }, { k: 'ex', label: 'Cviky (každý na nový řádek)', type: 'textarea', rows: 8 }],
      values: { name: t.name, ex: (t.exercises || []).join('\n') },
      onSave: v => { db.put('gymtpl', { ...t, name: v.name, exercises: v.ex.split('\n').map(x => x.trim()).filter(Boolean) }); refresh(); },
      onDelete: t.id ? () => { db.del(t.id); refresh(); } : null,
    });
  };
  s.body.onclick = e => {
    const r = e.target.closest('[data-id]');
    if (r) edit(db.get(r.dataset.id));
    if (e.target.closest('[data-new]')) edit();
  };
}

function editor(root, id, refresh, go) {
  const w = db.get(id);
  if (!w) { root.innerHTML = empty('Trénink nenalezen.'); return; }
  const known = new Set();
  db.all('gymtpl').forEach(t => (t.exercises || []).forEach(x => known.add(x)));
  db.all('workouts').forEach(x => (x.exercises || []).forEach(e => known.add(e.name)));
  // poslední výkon pro nápovědu
  const lastOf = name => {
    const prev = db.filter('workouts', x => x.done && x.id !== id && (x.exercises || []).some(e => e.name === name)).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!prev) return '';
    const e = prev.exercises.find(x => x.name === name);
    return (e.sets || []).filter(s => s.kg || s.reps).map(s => `${s.kg || 0}×${s.reps || 0}`).join(', ');
  };
  root.innerHTML = `
    <section class="w-head">
      <input class="w-name" id="wName" value="${esc(w.name)}" aria-label="Název tréninku">
      <input type="date" id="wDate" value="${w.date}" aria-label="Datum">
    </section>
    <datalist id="exList">${[...known].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div id="exs">${(w.exercises || []).map((e, i) => {
      const last = lastOf(e.name);
      return `<section class="panel ex" data-i="${i}">
        <div class="ex-head"><input class="ex-name" value="${esc(e.name)}" list="exList" aria-label="Cvik"><button class="icon-btn" data-act="ex-del" data-i="${i}" aria-label="Odebrat cvik">${icon('trash', 18)}</button></div>
        ${last ? `<p class="ex-last">Minule: ${esc(last)}</p>` : ''}
        <div class="sets"><span class="sh">Série</span><span class="sh">kg</span><span class="sh">Opak.</span><span></span>
        ${(e.sets || []).map((s, j) => `<span class="sn">${j + 1}</span><input inputmode="decimal" data-k="kg" data-i="${i}" data-j="${j}" value="${esc(s.kg)}" aria-label="kg série ${j + 1}"><input inputmode="numeric" data-k="reps" data-i="${i}" data-j="${j}" value="${esc(s.reps)}" aria-label="opakování série ${j + 1}"><button class="icon-btn sm" data-act="set-del" data-i="${i}" data-j="${j}" aria-label="Odebrat sérii">${icon('x', 14)}</button>`).join('')}</div>
        <button class="btn xs ghost" data-act="set-add" data-i="${i}">${icon('plus', 14)} Série</button>
      </section>`;
    }).join('')}</div>
    <button class="btn ghost" data-act="ex-add">${icon('plus', 18)} Přidat cvik</button>
    <textarea id="wNote" rows="2" placeholder="Poznámka – jak to šlo, bolesti, co příště">${esc(w.note || '')}</textarea>
    <div class="row-btns">
      <button class="btn danger ghost" data-act="del">${icon('trash', 18)} Smazat</button>
      <button class="btn primary" data-act="finish">${w.done ? 'Uložit trénink' : 'Dokončit trénink'}</button>
    </div>`;

  const collect = () => {
    const exercises = (w.exercises || []).map((e, i) => {
      const sec = root.querySelector(`.ex[data-i="${i}"]`);
      return {
        name: sec.querySelector('.ex-name').value.trim() || e.name,
        sets: (e.sets || []).map((s, j) => ({
          kg: sec.querySelector(`[data-k="kg"][data-j="${j}"]`).value.replace(',', '.'),
          reps: sec.querySelector(`[data-k="reps"][data-j="${j}"]`).value,
        }))
      };
    });
    return { ...w, name: root.querySelector('#wName').value.trim() || 'Trénink', date: root.querySelector('#wDate').value || today(), note: root.querySelector('#wNote').value, exercises };
  };
  let saveT;
  root.oninput = () => { clearTimeout(saveT); saveT = setTimeout(() => db.put('workouts', collect()), 600); };
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, i = Number(b.dataset.i), j = Number(b.dataset.j);
    const cur = collect();
    if (act === 'set-add') { const s = cur.exercises[i].sets; const last = s[s.length - 1] || {}; s.push({ kg: last.kg || '', reps: last.reps || '' }); db.put('workouts', cur); refresh(); }
    else if (act === 'set-del') { cur.exercises[i].sets.splice(j, 1); db.put('workouts', cur); refresh(); }
    else if (act === 'ex-del') { cur.exercises.splice(i, 1); db.put('workouts', cur); refresh(); }
    else if (act === 'ex-add') { cur.exercises.push({ name: '', sets: [{ kg: '', reps: '' }, { kg: '', reps: '' }, { kg: '', reps: '' }] }); db.put('workouts', cur); refresh(); setTimeout(() => { const all = document.querySelectorAll('.ex-name'); all[all.length - 1] && all[all.length - 1].focus(); }, 50); }
    else if (act === 'finish') {
      const started = w.started ? Date.parse(w.started) : null;
      const duration = w.duration || (started && !w.done ? Math.min(240, Math.round((Date.now() - started) / 60000)) : null);
      cur.exercises = cur.exercises.filter(x => x.name);
      db.put('workouts', { ...cur, done: true, duration });
      award('gym:' + id, 40, 'Trénink');
      toast('Trénink uložen. Dobrá práce.', 'gold');
      go('gym');
    } else if (act === 'del') {
      if (await confirmSheet('Smazat tento trénink?')) { db.del(id); revoke('gym:' + id); go('gym'); }
    }
  };
}
