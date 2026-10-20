// Nastavení – profil, rutina, kategorie, synchronizace, záloha.
import { db, profile, setProfile, exportAll, importAll, wipe, flush } from '../store.js';
import { sync, syncNow, signIn, signUp, magicLink, signOut } from '../sync.js';
import { esc, icon, openForm, toast, confirmSheet, download, DAYS_SHORT, SWATCHES, sheet, bindChips, fieldHTML, readForm, today } from '../ui.js';
import { cats, finOut, finIn, exportICS } from '../common.js';
import { CAL_CATS, FIN_OUT, FIN_IN, ROUTINE_SUGGEST, SCHOOLS } from '../data/defaults.js';

const SUB = { profile: 'Profil & cíle', routines: 'Rutina', cats: 'Kategorie kalendáře', fincats: 'Kategorie financí', sync: 'Synchronizace', notify: 'Připomínky', data: 'Záloha & data' };
const SLOTS = [['morning', 'Ráno'], ['day', 'Přes den'], ['evening', 'Večer']];

export default {
  title: a => SUB[a[0]] || 'Nastavení',
  render(root, args, { refresh, go }) {
    const s = args[0];
    if (s === 'profile') return profileView(root, refresh);
    if (s === 'routines') return routinesView(root, refresh);
    if (s === 'cats') return catsView(root, refresh, 'cats');
    if (s === 'fincats') return finCatsView(root, refresh);
    if (s === 'sync') return syncView(root, refresh);
    if (s === 'notify') return notifyView(root, refresh);
    if (s === 'data') return dataView(root, refresh, go);
    const p = profile();
    const items = [
      ['profile', 'settings', `${p.name || ''} · „${p.callName || ''}“`],
      ['routines', 'bolt', `${db.all('routine').length} bodů`],
      ['cats', 'calendar', `${cats().length} barev`],
      ['fincats', 'wallet', `${finOut().length + finIn().length} kategorií`],
      ['sync', 'sync', sync.user ? `přihlášen · ${sync.user.email}` : 'nepřihlášen – data jen v tomto zařízení'],
      ['notify', 'bell', 'Notification' in window ? ({ granted: 'zapnuté', denied: 'zablokované', default: 'vypnuté' }[Notification.permission]) : 'nepodporováno'],
      ['data', 'download', 'export, import, kalendář .ics'],
    ];
    root.innerHTML = `
      <section class="panel">${items.map(([k, ic, sub]) => `<a class="row" href="#/settings/${k}"><span class="ico">${icon(ic, 18)}</span><div class="row-main"><p class="row-title">${SUB[k]}</p><p class="row-meta"><span>${esc(sub)}</span></p></div>${icon('right', 18)}</a>`).join('')}</section>
      <a class="row panel" href="#/map"><span class="ico">${icon('star', 18)}</span><div class="row-main"><p class="row-title">Vzhled, levely a odznaky</p><p class="row-meta"><span>Mapa systému</span></p></div>${icon('right', 18)}</a>
      <p class="tiny-actions muted">Life Reset · ${db.count()} záznamů · <span class="sync-txt">${esc(sync.status)}</span></p>`;
  }
};

// ---------- profil ----------
function profileView(root, refresh) {
  const p = profile();
  const t = { kcal: 3000, protein: 160, water: 3000, gym: 4, ...(p.targets || {}) };
  const fields = [
    { k: 'name', label: 'Jméno' },
    { k: 'callName', label: 'Uvítání při spuštění', hint: '„Welcome, …“' },
    { k: 'sir', label: 'Oslovení', hint: '„Dobré ráno, …“' },
    { k: 'why', label: 'Moje hlavní „proč“', type: 'textarea', rows: 2 },
    { k: 'kcal', label: 'Kalorie / den', type: 'number', half: true },
    { k: 'protein', label: 'Bílkoviny (g)', type: 'number', half: true },
    { k: 'water', label: 'Voda (ml)', type: 'number', half: true },
    { k: 'gym', label: 'Tréninků / týden', type: 'number', half: true },
    { k: 'schools', label: 'Školy (každá na nový řádek)', type: 'textarea', rows: 3 },
  ];
  const values = { ...p, ...t, schools: (p.schools || SCHOOLS).join('\n') };
  root.innerHTML = `<form class="form panel">${fields.map(f => fieldHTML(f, values[f.k])).join('')}<div class="row-btns"><button class="btn primary">Uložit</button></div></form>`;
  root.onsubmit = e => {
    e.preventDefault();
    const v = readForm(root, fields);
    setProfile({
      name: v.name, callName: v.callName || 'Master M', sir: v.sir || 'pane', why: v.why,
      targets: { ...t, kcal: v.kcal || t.kcal, protein: v.protein || t.protein, water: v.water || t.water, gym: v.gym || t.gym },
      schools: v.schools.split('\n').map(x => x.trim()).filter(Boolean),
    });
    toast('Uloženo');
    refresh();
  };
}

// ---------- rutina ----------
function routinesView(root, refresh) {
  const all = db.all('routine').slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  root.innerHTML = `
    <p class="lead">Co odškrtáváš každý den. Body můžeš omezit jen na některé dny (třeba trénink Po/St/Pá).</p>
    ${SLOTS.map(([k, l]) => {
      const list = all.filter(r => (r.slot || 'morning') === k);
      return `<section class="panel"><div class="panel-head"><h3>${l}</h3><button class="btn sm ghost" data-act="new" data-slot="${k}">${icon('plus', 16)} Přidat</button></div>
        ${list.map((r, i) => `<div class="row rt-edit ${r.active === false ? 'off' : ''}">
          <div class="order"><button class="icon-btn sm" data-act="up" data-id="${r.id}" ${i === 0 ? 'disabled' : ''} aria-label="Nahoru">${icon('left', 14, 'rot90')}</button><button class="icon-btn sm" data-act="down" data-id="${r.id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Dolů">${icon('right', 14, 'rot90')}</button></div>
          <button class="row-main link-plain" data-act="edit" data-id="${r.id}"><p class="row-title">${esc(r.name)}</p><p class="row-meta"><span>${r.days && r.days.length ? r.days.map(d => DAYS_SHORT[d]).join(' ') : 'každý den'}</span>${r.active === false ? '<span>pozastaveno</span>' : ''}</p></button>
        </div>`).join('') || '<p class="muted">Nic.</p>'}
        <div class="preset-row">${ROUTINE_SUGGEST[k].filter(x => !all.some(r => r.name === x)).slice(0, 4).map(x => `<button class="chip sm" data-act="quick" data-slot="${k}" data-v="${esc(x)}">${icon('plus', 12)} ${esc(x)}</button>`).join('')}</div>
      </section>`;
    }).join('')}`;
  root.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'new') editRoutine({ slot: b.dataset.slot }, refresh);
    else if (act === 'edit') editRoutine(db.get(b.dataset.id), refresh);
    else if (act === 'quick') { db.put('routine', { name: b.dataset.v, slot: b.dataset.slot, days: [], active: true, order: all.length }); refresh(); }
    else if (act === 'up' || act === 'down') {
      const r = db.get(b.dataset.id);
      const list = all.filter(x => (x.slot || 'morning') === (r.slot || 'morning'));
      const i = list.findIndex(x => x.id === r.id), j = act === 'up' ? i - 1 : i + 1;
      if (!list[j]) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((x, k) => db.patch(x.id, { order: k + (SLOTS.findIndex(s => s[0] === (r.slot || 'morning')) * 100) }));
      refresh();
    }
  };
}
function editRoutine(r, after) {
  const days = r.days || [];
  const order = [1, 2, 3, 4, 5, 6, 0];
  openForm({
    title: r.id ? 'Upravit bod rutiny' : 'Nový bod rutiny',
    fields: [
      { k: 'name', label: 'Co', req: true, ph: 'Např. 20 kliků' },
      { k: 'slot', label: 'Kdy', type: 'chips', options: SLOTS.map(([v, l]) => ({ v, l })), def: 'morning' },
      { k: 'active', label: 'Aktivní', type: 'check', def: true },
    ],
    values: { active: r.active !== false, ...r },
    extra: `<div class="field"><label>Dny (nic = každý den)</label><div class="days-pick">${order.map(d => `<label><input type="checkbox" name="day" value="${d}" ${days.includes(d) ? 'checked' : ''}><span>${DAYS_SHORT[d]}</span></label>`).join('')}</div></div>`,
    onSave: (v, form) => {
      const ds = [...form.querySelectorAll('[name="day"]:checked')].map(x => Number(x.value));
      db.put('routine', { order: 999, ...r, ...v, days: ds.length === 7 ? [] : ds });
      after();
    },
    onDelete: r.id ? () => { db.del(r.id); after(); } : null,
  });
}

// ---------- kategorie ----------
function catEditor(list, save, after, title) {
  const s = sheet({
    title,
    body: `<div class="cat-list">${list.map((c, i) => `<div class="cat-row" data-i="${i}">
        <input value="${esc(c.name)}" data-k="name" aria-label="Název">
        <div class="swatches mini">${SWATCHES.map(x => `<button type="button" class="sw ${x === c.color ? 'on' : ''}" data-c="${x}" style="--c:${x}" aria-label="${x}"></button>`).join('')}</div>
        <button class="icon-btn sm" data-del="${i}" aria-label="Smazat">${icon('trash', 16)}</button>
      </div>`).join('')}</div>
      <div class="row-btns"><button class="btn ghost" data-add>${icon('plus', 18)} Přidat</button><button class="btn primary" data-save>Uložit</button></div>`
  });
  let cur = list.map(c => ({ ...c }));
  const collect = () => s.body.querySelectorAll('.cat-row').forEach(row => { cur[Number(row.dataset.i)].name = row.querySelector('[data-k="name"]').value.trim(); });
  s.body.onclick = e => {
    const sw = e.target.closest('[data-c]');
    if (sw) { const row = sw.closest('.cat-row'); cur[Number(row.dataset.i)].color = sw.dataset.c; row.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === sw)); return; }
    if (e.target.closest('[data-del]')) { collect(); if (cur.length <= 1) return toast('Aspoň jedna musí zůstat'); cur.splice(Number(e.target.closest('[data-del]').dataset.del), 1); s.close(); catEditor(cur, save, after, title); }
    if (e.target.closest('[data-add]')) { collect(); cur.push({ id: 'c' + Date.now().toString(36), name: 'Nová', color: SWATCHES[cur.length % SWATCHES.length] }); s.close(); catEditor(cur, save, after, title); }
    if (e.target.closest('[data-save]')) { collect(); save(cur.filter(c => c.name)); toast('Uloženo'); s.close(); after(); }
  };
}
function catsView(root, refresh) {
  const list = cats();
  root.innerHTML = `
    <p class="lead">Barvy událostí v kalendáři a úkolů. Každá kategorie = jedna barva.</p>
    <section class="panel">${list.map(c => `<div class="row"><i class="cat-dot" style="--c:${c.color}"></i><p class="row-main row-title">${esc(c.name)}</p><small class="muted">${db.filter('events', e => e.cat === c.id).length} událostí</small></div>`).join('')}</section>
    <div class="row-btns"><button class="btn ghost" data-act="reset">Výchozí</button><button class="btn primary" data-act="edit">${icon('edit', 18)} Upravit</button></div>`;
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'edit') catEditor(list, v => setProfile({ cats: v }), refresh, 'Kategorie kalendáře');
    if (b.dataset.act === 'reset' && await confirmSheet('Vrátit výchozí kategorie?', 'Vrátit')) { setProfile({ cats: CAL_CATS }); refresh(); }
  };
}
function finCatsView(root, refresh) {
  root.innerHTML = `
    <section class="panel"><div class="panel-head"><h3>Výdaje</h3><button class="btn sm ghost" data-act="out">${icon('edit', 16)} Upravit</button></div>
      ${finOut().map(c => `<div class="row"><i class="cat-dot" style="--c:${c.color}"></i><p class="row-main row-title">${esc(c.name)}</p></div>`).join('')}</section>
    <section class="panel"><div class="panel-head"><h3>Příjmy</h3><button class="btn sm ghost" data-act="in">${icon('edit', 16)} Upravit</button></div>
      ${finIn().map(c => `<div class="row"><i class="cat-dot" style="--c:${c.color}"></i><p class="row-main row-title">${esc(c.name)}</p></div>`).join('')}</section>
    <div class="row-btns"><button class="btn ghost" data-act="reset">Výchozí kategorie</button></div>`;
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'out') catEditor(finOut(), v => setProfile({ finOut: v }), refresh, 'Kategorie výdajů');
    if (b.dataset.act === 'in') catEditor(finIn(), v => setProfile({ finIn: v }), refresh, 'Kategorie příjmů');
    if (b.dataset.act === 'reset' && await confirmSheet('Vrátit výchozí kategorie financí?', 'Vrátit')) { setProfile({ finOut: FIN_OUT, finIn: FIN_IN }); refresh(); }
  };
}

// ---------- synchronizace ----------
function syncView(root, refresh) {
  const cfg = window.LR_CONFIG || {};
  const label = { off: 'Nepřihlášen', idle: 'Připojeno', ok: 'Synchronizováno', syncing: 'Synchronizuji…', error: 'Chyba', offline: 'Offline' }[sync.status] || sync.status;
  if (sync.user) {
    root.innerHTML = `
      <section class="panel hud sync-card s-${sync.status}">
        <div class="sync-big">${icon('sync', 30)}</div>
        <h3>${esc(label)}</h3>
        <p class="muted">${esc(sync.user.email)}</p>
        ${sync.last ? `<p class="small muted">Naposledy ${sync.last.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>` : ''}
        ${sync.error ? `<p class="small red">${esc(sync.error)}</p>` : ''}
        <div class="row-btns"><button class="btn ghost" data-act="out">Odhlásit</button><button class="btn primary" data-act="now">${icon('sync', 18)} Synchronizovat teď</button></div>
      </section>
      <p class="small muted">Všechno se ukládá nejdřív v telefonu (funguje i offline) a do minuty se to pošle do cloudu. Na jiném zařízení se stačí přihlásit stejným účtem.</p>`;
  } else {
    root.innerHTML = `
      <section class="panel">
        <p>Přihlas se a data se budou synchronizovat mezi telefonem, počítačem a VS Code verzí. Dokumenty nad 1,5 MB jde nahrát jen po přihlášení.</p>
        <form class="form" data-form="auth">
          <div class="field"><label for="sE">E-mail</label><input id="sE" name="email" type="email" autocomplete="email" required value="${esc((profile() || {}).email || '')}"></div>
          <div class="field"><label for="sP">Heslo</label><input id="sP" name="password" type="password" autocomplete="current-password" minlength="6"></div>
          <div class="row-btns"><button class="btn ghost" type="button" data-act="up">Vytvořit účet</button><button class="btn primary" type="submit">Přihlásit</button></div>
          <button class="link" type="button" data-act="magic">Poslat přihlašovací odkaz na e-mail</button>
        </form>
        <p class="small muted">Stav: ${esc(label)}${sync.error ? ' · ' + esc(sync.error) : ''}${cfg.supabaseUrl ? '' : ' · chybí config.js'}</p>
      </section>`;
  }
  const busy = (b, on) => { if (b) { b.disabled = on; } };
  root.onsubmit = async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('[type=submit]');
    if (!f.password.value) { toast('Zadej heslo, nebo použij odkaz na e-mail', 'warn'); return; }
    busy(btn, true);
    try { await signIn(f.email.value.trim(), f.password.value); setProfile({ email: f.email.value.trim() }); toast('Přihlášeno a synchronizováno'); refresh(); }
    catch (err) { toast(esc(err.message), 'warn long'); busy(btn, false); }
  };
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const f = root.querySelector('form');
    const act = b.dataset.act;
    try {
      if (act === 'now') { busy(b, true); await syncNow(); toast(sync.status === 'error' ? 'Chyba: ' + esc(sync.error) : 'Hotovo'); refresh(); }
      else if (act === 'out') { if (await confirmSheet('Odhlásit? Data v tomto zařízení zůstanou.', 'Odhlásit')) { await signOut(); refresh(); } }
      else if (act === 'up') {
        if (!f.email.value || f.password.value.length < 6) { toast('E-mail a heslo (min. 6 znaků)', 'warn'); return; }
        busy(b, true);
        const r = await signUp(f.email.value.trim(), f.password.value);
        setProfile({ email: f.email.value.trim() });
        toast(r === 'in' ? 'Účet vytvořen, synchronizuji' : 'Potvrď e-mail – poslal jsem odkaz. Pak se tady přihlas.', 'long');
        refresh();
      } else if (act === 'magic') {
        if (!f.email.value) { toast('Zadej e-mail', 'warn'); return; }
        await magicLink(f.email.value.trim());
        toast('Odkaz je v e-mailu. Otevři ho v tomhle prohlížeči.', 'long');
      }
    } catch (err) { toast(esc(err.message), 'warn long'); busy(b, false); }
  };
}

// ---------- připomínky ----------
function notifyView(root, refresh) {
  const has = 'Notification' in window;
  const perm = has ? Notification.permission : 'unsupported';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  root.innerHTML = `
    <section class="panel">
      <p>Připomínky událostí se ukazují jako upozornění, když je Life Reset otevřený nebo běží na pozadí. Každá událost má vlastní čas připomenutí.</p>
      <p class="small muted">${standalone ? 'Aplikace je nainstalovaná na ploše.' : 'Tip: na iPhonu otevři v Safari → Sdílet → „Přidat na plochu“. Upozornění na iOS fungují jen v aplikaci z plochy.'}</p>
      <p>Stav: <b>${{ granted: 'zapnuté', denied: 'zablokované v nastavení prohlížeče', default: 'vypnuté', unsupported: 'tento prohlížeč je nepodporuje' }[perm]}</b></p>
      ${perm === 'default' ? `<button class="btn primary" data-act="ask">${icon('bell', 18)} Zapnout upozornění</button>` : ''}
      ${perm === 'granted' ? `<button class="btn ghost" data-act="test">Vyzkoušet</button>` : ''}
      <p class="small muted">Spolehlivější pro důležité věci: v Kalendáři „Exportovat do iPhonu (.ics)“ – připomínky pak hlídá systémový kalendář.</p>
    </section>`;
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'ask') { await Notification.requestPermission(); refresh(); }
    if (b.dataset.act === 'test') {
      const reg = await navigator.serviceWorker.getRegistration();
      const p = profile();
      const opts = { body: `Systém připraven, ${p.sir || 'pane'}.`, icon: 'icons/icon-192.png' };
      if (reg) reg.showNotification('Life Reset', opts); else new Notification('Life Reset', opts);
    }
  };
}

// ---------- data ----------
function dataView(root, refresh, go) {
  root.innerHTML = `
    <section class="panel">
      <div class="panel-head"><h3>Záloha</h3></div>
      <p class="small muted">Stáhne všechno (kromě souborů v cloudu) do jednoho JSON souboru.</p>
      <div class="row-btns"><button class="btn ghost" data-act="import">${icon('upload', 18)} Nahrát zálohu</button><button class="btn primary" data-act="export">${icon('download', 18)} Stáhnout zálohu</button></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Kalendář</h3></div>
      <button class="btn ghost" data-act="ics">${icon('calendar', 18)} Export všech událostí (.ics)</button>
    </section>
    <section class="panel danger-zone">
      <div class="panel-head"><h3>Nebezpečná zóna</h3></div>
      <p class="small muted">Smaže data jen v tomto zařízení. Pokud jsi přihlášený, po novém přihlášení se stáhnou z cloudu zpátky.</p>
      <button class="btn danger ghost" data-act="wipe">${icon('trash', 18)} Vymazat data v zařízení</button>
    </section>`;
  root.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'export') download(`life-reset-zaloha-${today()}.json`, JSON.stringify(exportAll(), null, 1), 'application/json');
    else if (act === 'ics') exportICS(db.all('events'), 'life-reset-kalendar.ics');
    else if (act === 'import') {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        try { const n = importAll(JSON.parse(await inp.files[0].text())); toast(`Nahráno ${n} záznamů`); refresh(); }
        catch (err) { toast(esc(err.message), 'warn long'); }
      };
      inp.click();
    } else if (act === 'wipe') {
      if (await confirmSheet('Opravdu vymazat všechna data v tomto zařízení?', 'Vymazat')) {
        if (sync.user) await signOut();
        wipe(); flush();
        location.hash = '#/onboarding';
        location.reload();
      }
    }
  };
  void go; void bindChips;
}
