// Přátelé: můj kód a pozvánka, přidání kamaráda, žádosti, žebříček (týden / dnes / série / level), detail a popíchnutí.
import { profile } from '../store.js';
import { esc, icon, toast, segTabs, sheet, confirmSheet, num, relDay } from '../ui.js';
import { stats, weekXP } from '../game.js';
import { sync } from '../sync.js';
import { myCode, cachedFriends, loadFriends, syncSocial, addFriend, respond, nudge, inviteUrl, myStats, lastWeekResult, mondayOfD } from '../social.js';
import { today, addDays } from '../ui.js';

let tab = 'week';
let loading = false;
let loadedAt = 0;

const BOARDS = [
  ['week', 'Týden', s => s.weekXP || 0, v => `${num(v)} XP`],
  ['today', 'Dnes', s => (s.day === today() ? s.score || 0 : 0), v => `${v} / 100`],
  ['streak', 'Série', s => s.streak || 0, v => `${v} ${v === 1 ? 'den' : v < 5 && v ? 'dny' : 'dní'}`],
  ['level', 'Level', s => s.xp || 0, (v, s) => `Lvl ${s.level || 1}`],
];
const initials = n => (String(n || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2) || '?').toUpperCase();
const avatar = (name, color) => `<span class="fr-av" style="--c:${esc(color || '#4FD8FF')}">${esc(initials(name))}</span>`;
const fresh = s => s && s.week === mondayOfD(today());

export default {
  title: a => (a[0] === 'add' ? 'Přidat kamaráda' : 'Přátelé'),
  render(root, args, { refresh, go }) {
    if (!sync.user) { root.innerHTML = '<p class="muted">Pro přátele musíš být přihlášený a online.</p>'; return; }
    // pozvánka z odkazu: #/friends/add/KÓD
    if (args[0] === 'add' && args[1]) {
      const code = args[1].toUpperCase();
      go('friends');
      setTimeout(async () => {
        if (!(await confirmSheet(`Přidat kamaráda s kódem ${code}?`, 'Přidat'))) return;
        try { const r = await addFriend(code); toast(r === 'accepted' ? 'Jste přátelé!' : 'Žádost odeslána – až ji potvrdí, uvidíte se v žebříčku.', 'gold long'); }
        catch (e) { toast(esc(e.message), 'warn long'); }
        refresh();
      }, 50);
      return;
    }
    const list = cachedFriends();
    const fr = list.filter(f => f.status === 'accepted');
    const inc = list.filter(f => f.direction === 'in');
    const out = list.filter(f => f.direction === 'out');
    const code = myCode();
    const p = profile() || {};
    const me = { ...myStats(), name: p.name || 'Já', me: true };
    const [, , metric, fmt] = BOARDS.find(b => b[0] === tab);
    const rows = [{ name: me.name, color: null, stats: me, me: true }, ...fr.map(f => ({ ...f, stats: tab === 'week' && !fresh(f.stats) ? { ...f.stats, weekXP: 0 } : f.stats }))]
      .map(r => ({ ...r, v: metric(r.stats || {}) }))
      .sort((a, b) => b.v - a.v || (b.stats.xp || 0) - (a.stats.xp || 0));
    const myPos = rows.findIndex(r => r.me);
    const ahead = myPos > 0 ? rows[myPos - 1] : null;
    const last = lastWeekResult(list);

    root.innerHTML = `
      ${last && last.winner && new Date().getDay() !== 0 ? `<section class="panel banner win">${icon('star', 22)}<div><b>${last.winner.me ? 'Vyhrál jsi minulý týden!' : `Minulý týden vyhrál ${esc(last.winner.name)}`}</b><small>${last.rows.slice(0, 3).map((r, i) => `${i + 1}. ${esc(r.me ? 'ty' : r.name)} ${num(r.xp)} XP`).join(' · ')}</small></div></section>` : ''}

      ${inc.length ? `<section class="panel">
        <div class="panel-head"><h3>${icon('bell', 18)} Žádosti o přátelství</h3></div>
        ${inc.map(f => `<div class="row">${avatar(f.name, f.color)}<div class="row-main"><p class="row-title">${esc(f.name || 'Bez jména')}</p><p class="row-meta"><span>chce tě přidat</span></p></div>
          <button class="btn sm ghost" data-act="decline" data-id="${f.user_id}">Odmítnout</button><button class="btn sm primary" data-act="accept" data-id="${f.user_id}">Přijmout</button></div>`).join('')}
      </section>` : ''}

      ${fr.length ? `
      ${segTabs(BOARDS.map(b => [b[0], b[1]]), tab)}
      <section class="panel hud board">
        ${ahead && tab === 'week' ? `<p class="small board-hint">${icon('target', 14)} Na ${esc(ahead.name)} ti chybí <b>${num(ahead.v - rows[myPos].v + 1)} XP</b>. Týden končí v neděli o půlnoci.</p>` : (myPos === 0 && rows.length > 1 ? `<p class="small board-hint gold">${icon('star', 14)} Vedeš! Udrž to.</p>` : '')}
        ${rows.map((r, i) => `<button class="row fr-row ${r.me ? 'me' : ''}" ${r.me ? '' : `data-act="friend" data-id="${r.user_id}"`}>
          <b class="fr-pos ${i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : ''}">${i + 1}</b>
          ${avatar(r.name, r.me ? 'var(--acc)' : r.color)}
          <div class="row-main"><p class="row-title">${esc(r.me ? `${r.name} (ty)` : r.name || 'Bez jména')}</p>
            <p class="row-meta"><span>Lvl ${r.stats.level || 1} · ${esc(r.stats.rank || '')}</span><span>${r.stats.streak || 0}${icon('flame', 11)}</span>${!r.me && r.updated_at ? `<span>${esc(relDay(String(r.updated_at).slice(0, 10)).toLowerCase())}</span>` : ''}</p></div>
          <b class="fr-val">${fmt(r.v, r.stats)}</b>
        </button>`).join('')}
      </section>` : `<section class="panel"><div class="panel-head"><h3>${icon('star', 18)} Soutěž s kamarády</h3></div>
        <p class="muted">Přidej kamarády a každý týden uvidíte, kdo je disciplinovanější: kdo nasbírá víc XP, má lepší skóre dne a delší sérii. Vítěz týdne dostane +150 XP a odznak. Kamarádi vidí jen tvoje čísla, žádná data.</p></section>`}

      <section class="panel">
        <div class="panel-head"><h3>${icon('plus', 18)} Přidat kamaráda</h3></div>
        <form class="inline-add big one" data-form="add"><input name="code" placeholder="Kód kamaráda (např. KA8B7M)" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Kód kamaráda"><button class="btn primary sm">Přidat</button></form>
        <div class="my-code">
          <div><small>Tvůj kód</small><b class="code">${code ? esc(code) : '…'}</b></div>
          <button class="btn ghost sm" data-act="copy" ${code ? '' : 'disabled'}>${icon('file', 16)} Kopírovat</button>
          <button class="btn primary sm" data-act="share" ${code ? '' : 'disabled'}>${icon('link', 16)} Pozvat</button>
        </div>
        <p class="small muted">Pošli kamarádovi pozvánku. Když nemá Life Reset, udělá si účet a pak otevře odkaz znovu.</p>
        ${out.length ? `<p class="small">Čeká na potvrzení: ${out.map(f => `<b>${esc(f.name || '?')}</b> <button class="link" data-act="cancel" data-id="${f.user_id}">zrušit</button>`).join(', ')}</p>` : ''}
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Jak se sbírají XP</h3><a class="link" href="#/map">Vše</a></div>
        <ul class="xp-list">
          <li><span>Splněný blok rozvrhu</span><b>+10</b></li><li><span>Všechny bloky dne</span><b>+20</b></li>
          <li><span>Skvělý den (skóre 80+)</span><b>+25</b></li><li><span>Perfektní den (100)</span><b>+50</b></li>
          <li><span>Série 3 / 7 / 14 / 30 dní</span><b>+50 až +400</b></li><li><span>Ranní ptáče (před 8:00)</span><b>+10</b></li>
          <li><span>Trénink</span><b>+40</b></li><li><span>Příprava týdne</span><b>+40</b></li><li><span>Vítěz týdne</span><b>+150</b></li>
        </ul>
      </section>`;

    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act, id = b.dataset.id;
      try {
        if (a === 'tab') { tab = b.dataset.v; refresh(); }
        else if (a === 'accept') { await respond(id, true); toast('Jste přátelé!', 'gold'); refresh(); }
        else if (a === 'decline' || a === 'cancel') { await respond(id, false); refresh(); }
        else if (a === 'copy') { await navigator.clipboard.writeText(code); toast('Kód zkopírován'); }
        else if (a === 'share') {
          const text = `Pojď soutěžit, kdo je víc disciplinovaný. Můj kód v Life Reset: ${code}`;
          if (navigator.share) await navigator.share({ title: 'Life Reset', text, url: inviteUrl(code) }).catch(() => {});
          else { await navigator.clipboard.writeText(`${text}\n${inviteUrl(code)}`); toast('Pozvánka zkopírována'); }
        } else if (a === 'friend') friendSheet(fr.find(f => f.user_id === id), refresh);
      } catch (err) { toast(esc(err.message || String(err)), 'warn long'); }
    };
    root.onsubmit = async e => {
      e.preventDefault();
      const v = e.target.code.value.trim();
      if (!v) return;
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try { const r = await addFriend(v); toast(r === 'accepted' ? 'Jste přátelé!' : 'Žádost odeslána – až ji potvrdí, uvidíte se v žebříčku.', 'gold long'); refresh(); }
      catch (err) { toast(esc(err.message), 'warn long'); btn.disabled = false; }
    };

    // načíst čerstvá data (max jednou za 20 s)
    if (!loading && Date.now() - loadedAt > 20000) {
      loading = true;
      Promise.all([syncSocial(), loadFriends()]).then(() => { loadedAt = Date.now(); loading = false; if (location.hash.startsWith('#/friends')) refresh(); })
        .catch(err => { loading = false; loadedAt = Date.now(); toast(esc(err.message), 'warn'); });
    }
    void stats; void weekXP; void addDays;
  }
};

function friendSheet(f, after) {
  if (!f) return;
  const s = f.stats || {};
  const mine = myStats();
  const cmp = (l, a, b, fmt = num) => `<div class="cmp"><span>${l}</span><b class="${a > b ? 'green' : ''}">${fmt(a)}</b><b class="${b > a ? 'green' : ''}">${fmt(b)}</b></div>`;
  const NUDGES = ['Hej, makej! 💪', 'Dneska tě předběhnu.', 'Kde je tvoje série?', 'Jdu do gymu, a ty?'];
  const sh = sheet({
    title: f.name || 'Kamarád',
    body: `<div class="fr-head">${avatar(f.name, f.color)}<div><b>Lvl ${s.level || 1} · ${esc(s.rank || '')}</b><small class="muted">${num(s.xp || 0)} XP · ${s.badges || 0} odznaků · ${s.wins || 0}× vítěz týdne</small></div></div>
      <div class="cmp head"><span></span><b>Ty</b><b>${esc(f.name || 'On')}</b></div>
      ${cmp('XP tento týden', mine.weekXP, fresh(s) ? s.weekXP || 0 : 0)}
      ${cmp('Skóre dnes', mine.score, s.day === today() ? s.score || 0 : 0)}
      ${cmp('Průměr skóre (týden)', mine.weekAvg, fresh(s) ? s.weekAvg || 0 : 0)}
      ${cmp('Série', mine.streak, s.streak || 0)}
      ${cmp('Nejdelší série', mine.best, s.best || 0)}
      ${cmp('Level', mine.level, s.level || 1)}
      <h4 class="sub">Popíchnout</h4>
      <div class="chips">${NUDGES.map((n, i) => `<button class="chip" data-n="${i}">${esc(n)}</button>`).join('')}</div>
      <p class="small muted">Přijde mu to jako upozornění (max 1× za hodinu).</p>
      <p class="small center"><button class="link red" data-rm>Odebrat z přátel</button></p>`,
  });
  sh.body.onclick = async e => {
    const n = e.target.closest('[data-n]');
    try {
      if (n) { await nudge(f.user_id, NUDGES[Number(n.dataset.n)]); toast('Odesláno'); sh.close(); }
      else if (e.target.closest('[data-rm]')) {
        sh.close();
        if (await confirmSheet(`Odebrat ${f.name || 'kamaráda'} z přátel?`, 'Odebrat')) { await respond(f.user_id, false); after(); }
      }
    } catch (err) { toast(esc(err.message), 'warn long'); }
  };
}
