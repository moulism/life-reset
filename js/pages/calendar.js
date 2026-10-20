import { db } from '../store.js';
import { esc, icon, today, parse, iso, addDays, MONTHS, fmtDay, sheet } from '../ui.js';
import { eventsOn, cats, cat, editEvent, exportICS, taskRow, toggleTask, editTask, REPEAT, REMIND } from '../common.js';

const FKEY = 'lr:calHidden';
const hidden = () => { try { return JSON.parse(localStorage.getItem(FKEY)) || []; } catch (e) { return []; } };

export default {
  title: 'Kalendář',
  render(root, args, { go, refresh }) {
    const sel = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : today();
    const d = parse(sel);
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1);
    const startOff = (first.getDay() + 6) % 7;
    const gridStart = iso(new Date(y, m, 1 - startOff));
    const hid = hidden();
    const visible = e => !hid.includes(e.cat);
    const t = today();
    const tasks = db.all('tasks');

    const cells = Array.from({ length: 42 }, (_, i) => {
      const day = addDays(gridStart, i);
      const dd = parse(day);
      const evs = eventsOn(day).filter(visible);
      const tk = tasks.filter(x => x.due === day && !x.done).length;
      const dots = evs.slice(0, 4).map(e => `<i style="--c:${cat(e.cat).color}"></i>`).join('');
      return `<button class="cal-cell ${dd.getMonth() !== m ? 'out' : ''} ${day === t ? 'today' : ''} ${day === sel ? 'sel' : ''}" data-act="day" data-v="${day}" aria-label="${fmtDay(day, true)}${evs.length ? `, ${evs.length} událostí` : ''}">
        <span class="n">${dd.getDate()}</span>
        <span class="dots">${dots}${tk ? '<i class="task-dot"></i>' : ''}</span>
      </button>`;
    }).join('');

    const evs = eventsOn(sel).filter(visible);
    const dayTasks = tasks.filter(x => x.due === sel);
    const weekStrip = Array.from({ length: 7 }, (_, i) => addDays(sel, i - 3));

    root.innerHTML = `
      <section class="cal-head">
        <button class="icon-btn" data-act="prev" aria-label="Předchozí měsíc">${icon('left')}</button>
        <h2>${MONTHS[m]} <span>${y}</span></h2>
        <button class="icon-btn" data-act="next" aria-label="Další měsíc">${icon('right')}</button>
        <button class="btn sm ghost" data-act="today">Dnes</button>
      </section>
      <div class="cal-legend">${cats().map(c => `<button class="chip sm ${hid.includes(c.id) ? 'off' : 'on'}" data-act="filter" data-v="${c.id}" style="--c:${c.color}" aria-pressed="${!hid.includes(c.id)}"><i class="dot"></i>${esc(c.name)}</button>`).join('')}</div>
      <section class="cal-grid" role="grid">
        ${['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(x => `<span class="cal-wd">${x}</span>`).join('')}
        ${cells}
      </section>
      <section class="week-strip">${weekStrip.map(day => {
        const n = eventsOn(day).filter(visible).length;
        return `<button class="ws ${day === sel ? 'on' : ''} ${day === t ? 'today' : ''}" data-act="day" data-v="${day}"><small>${fmtDay(day).split(' ')[0]}</small><b>${parse(day).getDate()}</b><i>${n ? n : ''}</i></button>`;
      }).join('')}</section>
      <section class="panel agenda">
        <div class="panel-head"><h3>${esc(fmtDay(sel, true))}</h3><button class="btn primary sm" data-act="new">${icon('plus', 16)} Událost</button></div>
        ${evs.length ? evs.map(e => `<button class="row ev" data-act="ev" data-id="${e.id}" style="--c:${cat(e.cat).color}">
            <span class="ev-time">${e.allDay || !e.start ? 'celý den' : `${esc(e.start)}${e.end ? `<br><small>${esc(e.end)}</small>` : ''}`}</span>
            <div class="row-main"><p class="row-title">${esc(e.title)}</p><p class="row-meta"><span><i class="dot" style="--c:${cat(e.cat).color}"></i>${esc(cat(e.cat).name)}</span>${e.place ? `<span>${esc(e.place)}</span>` : ''}${e.repeat && e.repeat !== 'none' ? `<span>${icon('sync', 12)} opakuje se</span>` : ''}${Number(e.remind) >= 0 ? `<span>${icon('bell', 12)}</span>` : ''}</p></div>
          </button>`).join('') : `<p class="muted">Žádné události. Klepni na „Událost“ a přidej.</p>`}
        ${dayTasks.length ? `<h4 class="sub">Úkoly s termínem</h4>${dayTasks.map(taskRow).join('')}` : ''}
        <button class="btn ghost sm" data-act="task-new">${icon('plus', 16)} Úkol na tento den</button>
      </section>
      <p class="tiny-actions"><button class="link" data-act="ics-all">${icon('download', 14)} Exportovat celý kalendář do iPhonu (.ics)</button> · <a class="link" href="#/settings/cats">Upravit kategorie a barvy</a></p>
    `;

    const move = n => { const nd = new Date(y, m + n, 1); go('calendar/' + iso(nd)); };
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'day') go('calendar/' + b.dataset.v);
      else if (act === 'prev') move(-1);
      else if (act === 'next') move(1);
      else if (act === 'today') go('calendar/' + today());
      else if (act === 'new') editEvent({ date: sel }, refresh);
      else if (act === 'filter') {
        const h = hidden(); const v = b.dataset.v;
        const nh = h.includes(v) ? h.filter(x => x !== v) : [...h, v];
        localStorage.setItem(FKEY, JSON.stringify(nh));
        refresh();
      }
      else if (act === 'ev') showEvent(db.get(b.dataset.id), sel, refresh);
      else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(b.dataset.id); refresh(); }
      else if (act === 'task-edit') editTask(db.get(b.dataset.id), refresh);
      else if (act === 'task-new') editTask({ due: sel }, refresh);
      else if (act === 'ics-all') exportICS(db.all('events'), 'life-reset-kalendar.ics');
    };

    // swipe mezi měsíci
    const grid = root.querySelector('.cal-grid');
    let sx = null;
    grid.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    grid.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1);
      sx = null;
    });
  }
};

function showEvent(e, day, refresh) {
  if (!e) return;
  const c = cat(e.cat);
  const s = sheet({
    title: e.title,
    body: `<div class="ev-detail" style="--c:${c.color}">
      <p><i class="dot"></i> ${esc(c.name)}</p>
      <p>${icon('calendar', 16)} ${esc(fmtDay(day, true))} · ${e.allDay || !e.start ? 'celý den' : `${esc(e.start)}${e.end ? '–' + esc(e.end) : ''}`}</p>
      ${e.repeat && e.repeat !== 'none' ? `<p>${icon('sync', 16)} ${esc(REPEAT.find(r => r.v === e.repeat).l)}${e.until ? ' do ' + esc(fmtDay(e.until)) : ''}</p>` : ''}
      ${Number(e.remind) >= 0 ? `<p>${icon('bell', 16)} ${esc((REMIND.find(r => r.v === Number(e.remind)) || {}).l || '')}</p>` : ''}
      ${e.place ? `<p>${icon('pin', 16)} ${esc(e.place)}</p>` : ''}
      ${e.notes ? `<p class="muted">${esc(e.notes)}</p>` : ''}
    </div>
    <div class="row-btns"><button class="btn ghost" data-ics>${icon('download', 18)} Do iPhone kalendáře</button><button class="btn primary" data-edit>${icon('edit', 18)} Upravit</button></div>`
  });
  s.body.querySelector('[data-edit]').onclick = () => { s.close(); editEvent(e, refresh); };
  s.body.querySelector('[data-ics]').onclick = () => exportICS([e], (e.title || 'udalost').replace(/[^\wěščřžýáíéůú]+/gi, '-') + '.ics');
}
