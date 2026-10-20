import { db, profile } from '../store.js';
import { stats, award, revoke, routinesFor, STREAK_MIN } from '../game.js';
import { esc, icon, today, fmtDay, num, toast, progress, sum, clamp } from '../ui.js';
import { taskRow, toggleTask, editTask, eventsOn, cat, newNote, editEvent } from '../common.js';
import { planFor, PLAN } from '../data/mealplan.js';

export function greeting(h = new Date().getHours()) {
  if (h >= 4 && h < 11) return 'Dobré ráno';
  if (h >= 11 && h < 17) return 'Dobré odpoledne';
  if (h >= 17 && h < 22) return 'Dobrý večer';
  return 'Dobrou noc';
}

const SLOTS = [['morning', 'Ráno', 'sunrise'], ['day', 'Přes den', 'sun'], ['evening', 'Večer', 'moon']];
const MOODS = ['Na dně', 'Slabší', 'OK', 'Dobrý', 'Skvělý'];

function reactor(score, s) {
  const N = 48;
  const on = Math.round(score / 100 * N);
  const ticks = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r1 = 78, r2 = i % 4 === 0 ? 92 : 88;
    const x1 = 100 + r1 * Math.cos(a), y1 = 100 + r1 * Math.sin(a);
    const x2 = 100 + r2 * Math.cos(a), y2 = 100 + r2 * Math.sin(a);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${i < on ? 'on' : ''}"/>`;
  }).join('');
  const lvlPct = clamp((s.xp - s.cur) / (s.next - s.cur), 0, 1);
  const C = 2 * Math.PI * 64;
  return `<svg viewBox="0 0 200 200" class="reactor-svg" role="img" aria-label="Skóre dne ${score} ze 100">
    <g class="ticks">${ticks}</g>
    <circle cx="100" cy="100" r="64" class="lvl-track"/>
    <circle cx="100" cy="100" r="64" class="lvl-fill" stroke-dasharray="${(C * lvlPct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 100 100)"/>
    <text x="100" y="104" class="score">${score}</text>
    <text x="100" y="126" class="score-l">skóre dne</text>
  </svg>`;
}

export default {
  title: 'Domů',
  render(root, args, { refresh }) {
    const p = profile();
    const t = today();
    const s = stats();
    const parts = s.today.parts;

    // rutina
    const routines = routinesFor(t, db.all('routine').filter(r => r.active !== false)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const log = db.find('routinelog', l => l.date === t);
    const done = (log && log.done) || [];
    const slotHTML = SLOTS.map(([k, label, ic]) => {
      const list = routines.filter(r => (r.slot || 'morning') === k);
      if (!list.length) return '';
      const d = list.filter(r => done.includes(r.id)).length;
      return `<div class="rt-group"><h4>${icon(ic, 16)} ${label} <small>${d}/${list.length}</small></h4>
        ${list.map(r => `<button class="rt ${done.includes(r.id) ? 'on' : ''}" data-act="rt" data-id="${r.id}" aria-pressed="${done.includes(r.id)}"><span class="tick">${icon('check', 14)}</span><span>${esc(r.name)}</span></button>`).join('')}</div>`;
    }).join('');

    // úkoly
    const due = db.filter('tasks', x => !x.done && x.due && x.due <= t).sort((a, b) => (b.prio || 2) - (a.prio || 2));
    const doneToday = db.filter('tasks', x => x.done && x.due === t);
    // kalendář
    const evs = eventsOn(t);
    // jídlo
    const meals = db.filter('meals', m => m.date === t);
    const kcal = sum(meals, m => m.kcal), prot = sum(meals, m => m.protein);
    const tg = p.targets || {};
    const dl = db.find('daylog', d => d.date === t);
    const water = (dl && dl.water) || 0;
    const plan = planFor(t);
    let planHTML = '';
    if (plan.status === 'on') planHTML = `<p class="plan-line"><b>Oběd:</b> ${esc(plan.lunch.name)} · <b>Večeře:</b> ${esc(plan.dinner.name)}${plan.cookToday ? ` <br><span class="gold">Dnes večer vaříš na Čt–Pá.</span>` : ''}</p>`;
    else if (plan.status === 'weekend') planHTML = `<p class="plan-line">${esc(PLAN.weekend)}${plan.cookToday ? ` <br><span class="gold">Dnes vaříš 6 krabiček na Po–St.</span>` : ''}</p>`;
    else if (plan.status === 'before') planHTML = `<p class="plan-line">Plán krabiček startuje v neděli 25. 10. vařením na týden 1.</p>`;
    // deník
    const j = db.find('journal', x => x.date === t) || {};
    const h = new Date().getHours();
    const showJournalFirst = h >= 19 || h < 4;

    const journal = `<section class="panel" id="journal">
        <div class="panel-head"><h3>${icon('diary', 18)} Denní záznam</h3><a href="#/diary/${t}" class="link">Celý deník</a></div>
        <div class="moods" role="group" aria-label="Nálada">${MOODS.map((m, i) => `<button class="mood m${i + 1} ${j.mood === i + 1 ? 'on' : ''}" data-act="mood" data-v="${i + 1}" aria-pressed="${j.mood === i + 1}">${m}</button>`).join('')}</div>
        <textarea id="jText" rows="3" placeholder="Jak šel den? Co se povedlo, co zítra jinak?">${esc(j.text || '')}</textarea>
        <div class="row-btns end"><button class="btn primary sm" data-act="j-save">${j.id ? 'Uložit zápis' : 'Zapsat'}</button></div>
      </section>`;

    root.innerHTML = `
      <section class="hello">
        <p class="hello-date">${esc(fmtDay(t, true))}</p>
        <h2>${greeting()}, ${esc(p.sir || 'pane')}</h2>
      </section>

      <section class="panel hud reactor">
        ${reactor(s.today.score, s)}
        <div class="reactor-side">
          <div class="stat"><span class="k">Level</span><b>${s.level}</b><span class="v">${esc(s.rank)}</span></div>
          <div class="stat"><span class="k">XP</span><b>${num(s.xp - s.cur)}<small>/${num(s.next - s.cur)}</small></b><span class="v">do levelu ${s.level + 1}</span></div>
          <div class="stat ${s.streak ? 'hot' : ''}"><span class="k">Série</span><b>${s.streak}${icon('flame', 18)}</b><span class="v">${s.today.score >= STREAK_MIN ? 'dnešek se počítá' : `ještě ${STREAK_MIN - s.today.score} bodů`}</span></div>
        </div>
        <ul class="parts">
          <li><span>Rutina</span><b>${parts.routine[0]}/${parts.routine[1]}</b></li>
          <li><span>Úkoly</span><b>${parts.tasks[1] ? `${parts.tasks[0]}/${parts.tasks[1]}` : '–'}</b></li>
          <li><span>Deník</span><b>${parts.journal ? 'ano' : 'ne'}</b></li>
          <li><span>Kalorie</span><b>${num(parts.kcal)}</b></li>
        </ul>
      </section>

      <section class="capture">
        <input id="capIn" placeholder="Rychlý zápis – myšlenka, úkol, nápad…" aria-label="Rychlý zápis">
        <button class="btn sm" data-act="cap-note" title="Uložit jako poznámku">${icon('note', 18)}<span>Poznámka</span></button>
        <button class="btn sm" data-act="cap-task" title="Uložit jako úkol na dnes">${icon('tasks', 18)}<span>Úkol</span></button>
      </section>

      ${showJournalFirst ? journal : ''}

      <section class="panel">
        <div class="panel-head"><h3>${icon('bolt', 18)} Rutina dnes</h3><a href="#/settings/routines" class="link">Upravit</a></div>
        ${routines.length ? slotHTML : `<p class="muted">Zatím nemáš žádnou rutinu.</p><a class="btn ghost sm" href="#/settings/routines">${icon('plus', 16)} Přidat rutinu</a>`}
      </section>

      <section class="panel">
        <div class="panel-head"><h3>${icon('tasks', 18)} Úkoly na dnes</h3><a href="#/tasks" class="link">Všechny</a></div>
        ${due.length ? due.slice(0, 6).map(taskRow).join('') : `<p class="muted">${doneToday.length ? 'Všechno na dnes hotové.' : 'Na dnes nic nečeká.'}</p>`}
        ${due.length > 6 ? `<a class="link more" href="#/tasks">+ dalších ${due.length - 6}</a>` : ''}
        <button class="btn ghost sm" data-act="task-new">${icon('plus', 16)} Úkol</button>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>${icon('calendar', 18)} Dnes v kalendáři</h3><a href="#/calendar" class="link">Kalendář</a></div>
        ${evs.length ? evs.map(e => `<a class="row ev" href="#/calendar/${t}" style="--c:${cat(e.cat).color}"><span class="ev-time">${e.allDay || !e.start ? 'celý den' : esc(e.start)}</span><div class="row-main"><p class="row-title">${esc(e.title)}</p>${e.place ? `<p class="row-meta"><span>${esc(e.place)}</span></p>` : ''}</div></a>`).join('') : `<p class="muted">Žádné události.</p>`}
        <button class="btn ghost sm" data-act="ev-new">${icon('plus', 16)} Událost</button>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>${icon('food', 18)} Jídlo</h3><a href="#/food" class="link">Zapsat jídlo</a></div>
        <div class="macro"><span>Kalorie</span><b>${num(kcal)} / ${num(tg.kcal || 3000)} kcal</b></div>
        ${progress(kcal, tg.kcal || 3000)}
        <div class="macro"><span>Bílkoviny</span><b>${num(prot)} / ${num(tg.protein || 160)} g</b></div>
        ${progress(prot, tg.protein || 160, 'var(--gold)')}
        <div class="water">
          <span>${icon('drop', 16)} Voda <b>${num1l(water)}</b> / ${num1l(tg.water || 3000)} l</span>
          <button class="btn sm" data-act="water" data-v="250">+250 ml</button><button class="btn sm" data-act="water" data-v="500">+500 ml</button>
        </div>
        ${planHTML}
      </section>

      ${showJournalFirst ? '' : journal}
    `;

    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, id = b.dataset.id;
      if (act === 'rt') {
        const l = db.find('routinelog', x => x.date === t);
        const set = new Set((l && l.done) || []);
        const on = !set.has(id);
        on ? set.add(id) : set.delete(id);
        db.put('routinelog', { ...(l || {}), date: t, done: [...set] });
        const ref = `rt:${t}:${id}`;
        if (on) award(ref, 10, 'Rutina'); else revoke(ref);
        const all = routines.every(r => set.has(r.id));
        if (all && routines.length) award(`rtall:${t}`, 25, 'Celá rutina'); else revoke(`rtall:${t}`);
        refresh();
      } else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(id); refresh(); }
      else if (act === 'task-edit') editTask(db.get(id), refresh);
      else if (act === 'task-new') editTask({ due: t }, refresh);
      else if (act === 'ev-new') editEvent({ date: t }, refresh);
      else if (act === 'cap-note' || act === 'cap-task') {
        const v = root.querySelector('#capIn').value.trim();
        if (!v) { root.querySelector('#capIn').focus(); return; }
        if (act === 'cap-note') { newNote({ title: v.slice(0, 60), body: v.length > 60 ? v : '', tags: ['rychlý zápis'] }); award('cap:' + Date.now(), 2, 'Zápis'); toast('Uloženo do poznámek'); }
        else { db.put('tasks', { title: v, due: t, prio: 2, done: false, created: new Date().toISOString() }); toast('Úkol na dnes přidán'); }
        refresh();
      } else if (act === 'water') {
        const d = db.find('daylog', x => x.date === t);
        db.put('daylog', { ...(d || {}), date: t, water: ((d && d.water) || 0) + Number(b.dataset.v) });
        refresh();
      } else if (act === 'mood') {
        const cur = db.find('journal', x => x.date === t);
        const text = root.querySelector('#jText').value;
        db.put('journal', { ...(cur || {}), date: t, mood: Number(b.dataset.v), text });
        award('journal:' + t, 25, 'Deník');
        refresh();
      } else if (act === 'j-save') {
        const cur = db.find('journal', x => x.date === t);
        const text = root.querySelector('#jText').value.trim();
        if (!text && !(cur && cur.mood)) { toast('Napiš aspoň pár slov'); return; }
        db.put('journal', { ...(cur || {}), date: t, text });
        award('journal:' + t, 25, 'Deník');
        toast('Zápis uložen');
        refresh();
      }
    };
    root.querySelector('#capIn').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); root.querySelector('[data-act="cap-note"]').click(); }
    });
  }
};

function num1l(ml) { return (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace('.', ',').replace(/0$/, ''); }
