import { db } from '../store.js';
import { award } from '../game.js';
import { esc, icon, today, fmtDay, toast, empty, diffDays, addDays } from '../ui.js';
import { JOURNAL_PROMPTS } from '../data/defaults.js';

const MOODS = ['Na dně', 'Slabší', 'OK', 'Dobrý', 'Skvělý'];
let q = '';

export default {
  title: a => a[0] ? 'Zápis' : 'Deník',
  render(root, args, { go, refresh }) {
    if (args[0]) return editor(root, args[0], go);
    const list = db.all('journal').filter(j => j.text || j.mood)
      .filter(j => !q || [j.text, j.win, j.lesson, ...(j.grateful || [])].join(' ').toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
    const t = today();
    const last30 = Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
    const byDate = Object.fromEntries(db.all('journal').map(j => [j.date, j]));
    root.innerHTML = `
      <section class="panel hud">
        <div class="panel-head"><h3>Posledních 30 dní</h3><small class="muted">${last30.filter(d => byDate[d] && (byDate[d].text || byDate[d].mood)).length}/30 zápisů</small></div>
        <div class="mood-strip">${last30.map(d => { const j = byDate[d]; return `<a href="#/diary/${d}" class="ms m${j && j.mood ? j.mood : 0}" title="${fmtDay(d)}${j && j.mood ? ' · ' + MOODS[j.mood - 1] : ''}"></a>`; }).join('')}</div>
        <a class="btn primary" href="#/diary/${t}">${icon('edit', 18)} ${byDate[t] ? 'Upravit dnešní zápis' : 'Napsat dnešní zápis'}</a>
      </section>
      <div class="search"><span>${icon('search', 18)}</span><input id="dq" placeholder="Hledat v deníku" value="${esc(q)}"></div>
      ${list.length ? list.map(j => `<a class="row diary-row" href="#/diary/${j.date}">
          <span class="mood-pill m${j.mood || 0}">${j.mood ? MOODS[j.mood - 1] : '—'}</span>
          <div class="row-main"><p class="row-title">${esc(fmtDay(j.date, true))}</p><p class="row-snip">${esc((j.text || j.win || '').slice(0, 120))}</p></div>
        </a>`).join('') : empty(q ? 'Nic nenalezeno.' : 'Deník je zatím prázdný. První zápis zabere 2 minuty.')}
    `;
    const inp = root.querySelector('#dq');
    inp.oninput = () => { q = inp.value; const pos = inp.selectionStart; refresh(); const n = document.querySelector('#dq'); n.focus(); n.setSelectionRange(pos, pos); };
  }
};

function editor(root, date, go) {
  const j = db.find('journal', x => x.date === date) || { date, grateful: ['', '', ''] };
  const prompt = JOURNAL_PROMPTS[Math.abs(diffDays(date, '2026-01-01')) % JOURNAL_PROMPTS.length];
  const g = j.grateful || ['', '', ''];
  root.innerHTML = `
    <section class="diary-ed">
      <div class="diary-nav">
        <a class="icon-btn" href="#/diary/${addDays(date, -1)}" aria-label="Předchozí den">${icon('left')}</a>
        <h2>${esc(fmtDay(date, true))}</h2>
        <a class="icon-btn" href="#/diary/${addDays(date, 1)}" aria-label="Další den">${icon('right')}</a>
      </div>
      <label class="lbl">Nálada</label>
      <div class="moods">${MOODS.map((m, i) => `<button class="mood m${i + 1} ${j.mood === i + 1 ? 'on' : ''}" data-mood="${i + 1}">${m}</button>`).join('')}</div>
      <label class="lbl">Energie</label>
      <div class="energy">${[1, 2, 3, 4, 5].map(n => `<button class="en ${j.energy >= n ? 'on' : ''}" data-en="${n}" aria-label="Energie ${n}">${icon('bolt', 18)}</button>`).join('')}</div>
      <label class="lbl" for="jt">${esc(prompt)}</label>
      <textarea id="jt" rows="7" placeholder="Piš volně…">${esc(j.text || '')}</textarea>
      <label class="lbl">Za co jsem vděčný</label>
      ${[0, 1, 2].map(i => `<input class="grat" data-g="${i}" value="${esc(g[i] || '')}" placeholder="${i + 1}.">`).join('')}
      <div class="two">
        <div><label class="lbl" for="jw">Co se povedlo</label><textarea id="jw" rows="2">${esc(j.win || '')}</textarea></div>
        <div><label class="lbl" for="jl">Co zítra jinak</label><textarea id="jl" rows="2">${esc(j.lesson || '')}</textarea></div>
      </div>
      <div class="row-btns">${j.id ? `<button class="btn danger ghost" data-del>${icon('trash', 18)} Smazat</button>` : ''}<button class="btn primary" data-save>Uložit zápis</button></div>
    </section>`;
  let mood = j.mood || 0, energy = j.energy || 0;
  root.onclick = async e => {
    const m = e.target.closest('[data-mood]');
    if (m) { mood = Number(m.dataset.mood); root.querySelectorAll('[data-mood]').forEach(x => x.classList.toggle('on', x === m)); return; }
    const en = e.target.closest('[data-en]');
    if (en) { energy = Number(en.dataset.en); root.querySelectorAll('[data-en]').forEach(x => x.classList.toggle('on', Number(x.dataset.en) <= energy)); return; }
    if (e.target.closest('[data-save]')) {
      const text = root.querySelector('#jt').value.trim();
      const grateful = [...root.querySelectorAll('.grat')].map(x => x.value.trim());
      db.put('journal', { ...j, date, mood, energy, text, grateful, win: root.querySelector('#jw').value.trim(), lesson: root.querySelector('#jl').value.trim() });
      if (text || mood) award('journal:' + date, 25, 'Deník');
      toast('Zápis uložen');
      go('diary');
    }
    if (e.target.closest('[data-del]')) {
      const { confirmSheet } = await import('../ui.js');
      if (await confirmSheet('Smazat zápis z tohoto dne?')) { db.del(j.id); go('diary'); }
    }
  };
}
