// Mapa systému – rozcestník všech sekcí + level, hodnost a odemčené věci.
import { db, profile, setProfile } from '../store.js';
import { stats, UNLOCKS, unlocked, RANKS, levelStart, applyTheme } from '../game.js';
import { esc, icon, num, clamp, today, sum, money, toast } from '../ui.js';
import { planFor } from '../data/mealplan.js';

const SECTIONS = [
  { k: 'calendar', name: 'Kalendář', ic: 'calendar', c: '#4FD8FF', info: () => `${db.all('events').length} událostí` },
  { k: 'tasks', name: 'Úkoly', ic: 'tasks', c: '#6E8BFF', info: () => `${db.filter('tasks', t => !t.done).length} otevřených` },
  { k: 'diary', name: 'Deník', ic: 'diary', c: '#B07CFF', info: () => `${db.all('journal').filter(j => j.text || j.mood).length} zápisů` },
  { k: 'hustles', name: 'Side hustles', ic: 'briefcase', c: '#FF6FB1', info: () => db.all('hustles').map(h => h.name).slice(0, 3).join(' · ') || 'Projekty' },
  { k: 'school', name: 'Škola', ic: 'school', c: '#6E8BFF', info: () => `${db.all('subjects').length} předmětů` },
  { k: 'archive', name: 'Databáze', ic: 'folder', c: '#E0B65A', info: () => `${db.all('files').length} souborů · hledání ve všem` },
  { k: 'gym', name: 'Gym', ic: 'gym', c: '#FF5C6C', info: () => `${db.filter('workouts', w => w.done).length} tréninků` },
  { k: 'food', name: 'Kalorie & krabičky', ic: 'food', c: '#3DDC97', info: () => { const p = planFor(today()); return p.status === 'on' ? `Týden ${p.week.n} · ${p.week.ab}` : 'Plán na 8 týdnů'; } },
  { k: 'finance', name: 'Finance', ic: 'wallet', c: '#E0B65A', info: () => { const m = today().slice(0, 7); return `${money(sum(db.filter('tx', t => t.type !== 'in' && (t.date || '').startsWith(m)), t => t.amount))} tento měsíc`; } },
  { k: 'books', name: 'Knihy', ic: 'book', c: '#FF9F43', info: () => `${db.filter('books', b => b.status === 'done').length}/${db.all('books').length} přečteno` },
  { k: 'notes', name: 'Poznámky', ic: 'note', c: '#2EC4B6', info: () => `${db.all('notes').length} poznámek` },
  { k: 'shop', name: 'Nákupní seznam', ic: 'cart', c: '#3DDC97', info: () => `${db.filter('shop', s => !s.done).length} položek` },
  { k: 'settings', name: 'Nastavení', ic: 'settings', c: '#9AA7B4', info: () => 'Profil, rutina, sync, vzhled' },
];

export default {
  title: 'Mapa systému',
  render(root, args, { refresh }) {
    const p = profile();
    const s = stats();
    const un = unlocked(s);
    const pct = clamp((s.xp - s.cur) / (s.next - s.cur), 0, 1) * 100;
    const nextRank = RANKS.find(r => r[0] > s.level);
    const themes = UNLOCKS.filter(u => u.kind === 'theme');
    const badges = UNLOCKS.filter(u => u.kind === 'badge');
    root.innerHTML = `
      <section class="panel hud rank">
        <div class="rank-top">
          <div class="rank-lvl"><small>LEVEL</small><b>${s.level}</b></div>
          <div class="rank-main">
            <h2>${esc(s.rank)}</h2>
            <p class="muted">${num(s.xp)} XP celkem · ${nextRank ? `další hodnost „${esc(nextRank[1])}“ na levelu ${nextRank[0]}` : 'nejvyšší hodnost'}</p>
            <div class="bar"><i style="width:${pct}%"></i></div>
            <p class="small muted">${num(s.xp - s.cur)} / ${num(s.next - s.cur)} XP do levelu ${s.level + 1}</p>
          </div>
        </div>
        <div class="kpis">
          <div><span>Série</span><b>${s.streak}${icon('flame', 16)}</b></div>
          <div><span>Nejdelší</span><b>${s.best}</b></div>
          <div><span>Dnes</span><b>${s.today.score}<small>/100</small></b></div>
        </div>
        ${p.why ? `<p class="why">„${esc(p.why)}“</p>` : ''}
      </section>

      <section class="map-grid">
        ${SECTIONS.map(x => `<a class="map-tile" href="#/${x.k}" style="--c:${x.c}">
          <span class="mt-ic">${icon(x.ic, 22)}</span>
          <b>${esc(x.name)}</b>
          <small>${esc(x.info())}</small>
        </a>`).join('')}
      </section>

      <section class="panel">
        <div class="panel-head"><h3>${icon('bolt', 18)} Vzhled systému</h3><small class="muted">odemykáš levely a sériemi</small></div>
        <div class="theme-grid">${themes.map(t => {
          const ok = un.includes(t.id);
          const v = t.id.replace('theme-', '');
          return `<button class="theme-tile th-${v} ${p.theme === v ? 'on' : ''} ${ok ? '' : 'locked'}" data-act="theme" data-v="${v}" ${ok ? '' : 'aria-disabled="true"'}>
            <i class="th-sw"></i><b>${esc(t.name)}</b><small>${ok ? (p.theme === v ? 'aktivní' : 'použít') : `${icon('lock', 12)} ${esc(t.desc)}`}</small></button>`;
        }).join('')}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>${icon('star', 18)} Odznaky</h3><small class="muted">${badges.filter(b => un.includes(b.id)).length}/${badges.length}</small></div>
        <div class="badge-grid">${badges.map(b => `<div class="badge ${un.includes(b.id) ? 'on' : ''}">${icon(un.includes(b.id) ? 'star' : 'lock', 20)}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Jak získat XP</h3></div>
        <ul class="xp-list">
          <li><span>Bod rutiny</span><b>+10</b></li><li><span>Celá rutina za den</span><b>+25</b></li>
          <li><span>Úkol (vysoká priorita)</span><b>+15 (+25)</b></li><li><span>Zápis do deníku</span><b>+25</b></li>
          <li><span>Trénink / fotbal</span><b>+40</b></li><li><span>Splněné kalorie za den</span><b>+20</b></li>
          <li><span>Čtení (za den)</span><b>+10</b></li><li><span>Dočtená kniha</span><b>+100</b></li>
          <li><span>Splněný cíl projektu</span><b>+50</b></li><li><span>Vážení, výdaj, rychlý zápis</span><b>+2 až +5</b></li>
        </ul>
        <p class="small muted">Level ${s.level + 1} potřebuje ${num(levelStart(s.level + 1))} XP celkem. Den se počítá do série při skóre 60+.</p>
      </section>`;
    root.onclick = e => {
      const b = e.target.closest('[data-act="theme"]');
      if (!b) return;
      if (b.classList.contains('locked')) { toast('Tohle je ještě zamčené.'); return; }
      setProfile({ theme: b.dataset.v });
      applyTheme();
      refresh();
    };
  }
};
