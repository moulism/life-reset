// Sdílené formuláře a logika napříč stránkami (úkoly, události, poznámky, soubory, transakce).
import { db, profile } from './store.js';
import { award, revoke } from './game.js';
import { openForm, esc, icon, today, relDay, toast, download, money, fmtDay, parse, iso, addDays, diffDays } from './ui.js';
import { CAL_CATS, FIN_OUT, FIN_IN } from './data/defaults.js';
import { canUpload, uploadFile, fileUrl, removeFile } from './sync.js';
import { blocksOn, area as wArea } from './week-core.js';
import { finOut, finIn, accounts, account, defaultAccount, learn, guessCat } from './money-core.js';

export const cats = () => (profile() && profile().cats) || CAL_CATS;
export const cat = id => cats().find(c => c.id === id) || { id: '', name: 'Bez kategorie', color: '#5C6E7C' };
export { finOut, finIn };
export const hustles = () => db.all('hustles').slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const subjects = () => db.all('subjects').slice().sort((a, b) => a.name.localeCompare(b.name, 'cs'));
export const folders = () => db.all('folders').slice().sort((a, b) => a.name.localeCompare(b.name, 'cs'));

export const catOptions = (withNone = false) => [...(withNone ? [{ v: '', l: 'Bez kategorie' }] : []), ...cats().map(c => ({ v: c.id, l: c.name, c: c.color }))];

// ---------- úkoly ----------
export const PRIO = { 1: 'Nízká', 2: 'Střední', 3: 'Vysoká' };
export function taskFields() {
  return [
    { k: 'title', label: 'Úkol', ph: 'Co je potřeba udělat', req: true },
    { k: 'due', label: 'Termín', type: 'date', half: true },
    { k: 'prio', label: 'Priorita', type: 'select', half: true, options: [{ v: 1, l: 'Nízká' }, { v: 2, l: 'Střední' }, { v: 3, l: 'Vysoká' }], def: 2 },
    { k: 'cat', label: 'Kategorie', type: 'chips', options: catOptions(true) },
    { k: 'hustle', label: 'Projekt', type: 'select', half: true, options: [{ v: '', l: '—' }, ...hustles().map(h => ({ v: h.id, l: h.name }))] },
    { k: 'subject', label: 'Předmět', type: 'select', half: true, options: [{ v: '', l: '—' }, ...subjects().map(s => ({ v: s.id, l: s.name }))] },
    { k: 'notes', label: 'Poznámka', type: 'textarea', rows: 3 },
  ];
}
export function editTask(t = {}, after = () => {}) {
  openForm({
    title: t.id ? 'Upravit úkol' : 'Nový úkol',
    fields: taskFields(),
    values: t,
    onSave: v => { db.put('tasks', { ...t, ...v, prio: Number(v.prio) || 2, done: !!t.done, created: t.created || new Date().toISOString() }); toast('Úkol uložen'); after(); },
    onDelete: t.id ? () => { db.del(t.id); revoke('task:' + t.id); after(); } : null,
  });
}
export function toggleTask(id) {
  const t = db.get(id);
  if (!t) return;
  const done = !t.done;
  db.patch(id, { done, doneAt: done ? new Date().toISOString() : null });
  if (done) award('task:' + id, t.prio == 3 ? 25 : 15, 'Úkol'); else revoke('task:' + id);
}
export function taskRow(t) {
  const c = t.cat ? cat(t.cat) : null;
  const h = t.hustle ? db.get(t.hustle) : null;
  const s = t.subject ? db.get(t.subject) : null;
  const over = t.due && !t.done && t.due < today();
  const meta = [t.due ? `<span class="${over ? 'red' : ''}">${relDay(t.due)}</span>` : '', c ? `<span><i class="dot" style="--c:${c.color}"></i>${esc(c.name)}</span>` : '', h ? `<span>${esc(h.name)}</span>` : '', s ? `<span>${esc(s.name)}</span>` : ''].filter(Boolean).join('');
  return `<div class="row task ${t.done ? 'done' : ''}" data-act="task-edit" data-id="${t.id}">
    <button class="tick" data-act="task-toggle" data-id="${t.id}" aria-label="${t.done ? 'Označit jako nehotové' : 'Hotovo'}" aria-pressed="${!!t.done}">${icon('check', 14)}</button>
    <div class="row-main"><p class="row-title">${esc(t.title)}</p>${meta ? `<p class="row-meta">${meta}</p>` : ''}</div>
    ${t.prio == 3 ? `<span class="prio" title="Vysoká priorita">!</span>` : ''}
  </div>`;
}

// ---------- události ----------
export const REPEAT = [{ v: 'none', l: 'Neopakovat' }, { v: 'daily', l: 'Každý den' }, { v: 'weekdays', l: 'Pracovní dny' }, { v: 'weekly', l: 'Každý týden' }, { v: 'monthly', l: 'Každý měsíc' }, { v: 'yearly', l: 'Každý rok' }];
export const REMIND = [{ v: -1, l: 'Bez připomínky' }, { v: 0, l: 'V čas začátku' }, { v: 10, l: '10 min předem' }, { v: 30, l: '30 min předem' }, { v: 60, l: '1 h předem' }, { v: 180, l: '3 h předem' }, { v: 1440, l: '1 den předem' }];
export function occursOn(ev, d) {
  if (!ev.date) return false;
  if (d === ev.date) return true;
  if (d < ev.date) return false;
  if (ev.until && d > ev.until) return false;
  const a = parse(ev.date), b = parse(d);
  switch (ev.repeat) {
    case 'daily': return true;
    case 'weekdays': return b.getDay() >= 1 && b.getDay() <= 5;
    case 'weekly': return a.getDay() === b.getDay();
    case 'monthly': return a.getDate() === b.getDate();
    case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    default: return false;
  }
}
export function eventsOn(d) {
  return db.all('events').filter(e => occursOn(e, d))
    .sort((a, b) => (a.allDay ? '' : a.start || '99').localeCompare(b.allDay ? '' : b.start || '99'));
}
export function eventFields() {
  return [
    { k: 'title', label: 'Název', ph: 'Např. Lékař, Narozeniny, Koncert', req: true },
    { k: 'date', label: 'Datum', type: 'date', req: true, half: true },
    { k: 'allDay', label: 'Celý den', type: 'check', half: true },
    { k: 'start', label: 'Od', type: 'time', half: true },
    { k: 'end', label: 'Do', type: 'time', half: true },
    { k: 'cat', label: 'Kategorie (barva)', type: 'chips', options: catOptions() },
    { k: 'repeat', label: 'Opakování', type: 'select', half: true, options: REPEAT, def: 'none' },
    { k: 'until', label: 'Opakovat do', type: 'date', half: true },
    { k: 'remind', label: 'Připomínka', type: 'select', options: REMIND, def: 30 },
    { k: 'place', label: 'Místo', ph: 'Volitelné' },
    { k: 'notes', label: 'Poznámka', type: 'textarea', rows: 2 },
  ];
}
export function editEvent(e = {}, after = () => {}) {
  openForm({
    title: e.id ? 'Upravit událost' : 'Nová událost',
    fields: eventFields(),
    values: { cat: cats()[0].id, ...e },
    onSave: v => {
      if (!v.allDay && v.start && v.end && v.end < v.start) { toast('Konec je dřív než začátek', 'warn'); return false; }
      db.put('events', { ...e, ...v, remind: Number(v.remind) });
      toast('Událost uložena');
      window.dispatchEvent(new CustomEvent('lr:events'));
      after();
    },
    onDelete: e.id ? () => { db.del(e.id); window.dispatchEvent(new CustomEvent('lr:events')); after(); } : null,
  });
}
const icsDate = d => d.replace(/-/g, '');
const icsTime = t => (t || '00:00').replace(':', '') + '00';
const icsEsc = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
export function icsFor(events) {
  const rr = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Reset//CZ', 'CALSCALE:GREGORIAN'];
  events.forEach(e => {
    lines.push('BEGIN:VEVENT', `UID:${e.id}@life-reset`, `DTSTAMP:${stamp}`, `SUMMARY:${icsEsc(e.title)}`);
    if (e.allDay || !e.start) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.date, 1))}`);
    } else {
      lines.push(`DTSTART:${icsDate(e.date)}T${icsTime(e.start)}`, `DTEND:${icsDate(e.date)}T${icsTime(e.end || e.start)}`);
    }
    if (rr[e.repeat]) lines.push(`RRULE:${rr[e.repeat]}${e.until ? ';UNTIL=' + icsDate(e.until) + 'T235959' : ''}`);
    if (e.place) lines.push(`LOCATION:${icsEsc(e.place)}`);
    if (e.notes) lines.push(`DESCRIPTION:${icsEsc(e.notes)}`);
    lines.push(`CATEGORIES:${icsEsc(cat(e.cat).name)}`);
    if (Number(e.remind) >= 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(e.title)}`, `TRIGGER:-PT${Number(e.remind)}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
export function exportICS(events, name = 'life-reset.ics') { download(name, icsFor(events), 'text/calendar'); }
// týdenní rozvrh → opakované události v kalendáři iPhonu (jen bloky s časem)
export function icsBlocks(blocks) {
  const BD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Reset//CZ', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Life Reset – rozvrh'];
  blocks.filter(b => b.start && b.active !== false && (b.days || []).length).forEach(b => {
    // první výskyt od dnešního týdne
    const first = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(today(), i)).find(d => b.days.includes(parse(d).getDay()));
    const end = b.end || b.start;
    lines.push('BEGIN:VEVENT', `UID:blk-${b.id}@life-reset`, `DTSTAMP:${stamp}`, `SUMMARY:${icsEsc(b.title || wArea(b.area).name)}`,
      `DTSTART:${icsDate(first)}T${icsTime(b.start)}`, `DTEND:${icsDate(first)}T${icsTime(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${b.days.map(d => BD[d]).join(',')}`);
    if (b.place) lines.push(`LOCATION:${icsEsc(b.place)}`);
    if (Number(b.remind) >= 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(b.title || '')}`, `TRIGGER:-PT${Number(b.remind)}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------- připomínky (když je aplikace otevřená) ----------
let remTimers = [];
export function scheduleReminders() {
  remTimers.forEach(clearTimeout);
  remTimers = [];
  const now = Date.now();
  const horizon = now + 26 * 3600 * 1000;
  const fired = JSON.parse(localStorage.getItem('lr:fired') || '{}');
  [today(), addDays(today(), 1)].forEach(d => {
    const bl = blocksOn(d).filter(b => b.start && b.remind != null && Number(b.remind) >= 0)
      .map(b => ({ id: 'b' + b.id, title: b.title || wArea(b.area).name, start: b.start, remind: b.remind, place: b.place || '' }));
    [...eventsOn(d), ...bl].forEach(e => {
      if (Number(e.remind) < 0 || e.remind == null) return;
      const [hh, mm] = (e.allDay || !e.start ? '09:00' : e.start).split(':').map(Number);
      const at = parse(d); at.setHours(hh, mm, 0, 0);
      const fire = at.getTime() - Number(e.remind) * 60000;
      const key = `${e.id}:${d}`;
      if (fired[key]) return;
      if (fire > horizon) return;
      const delay = fire - now;
      if (delay < -10 * 60000) return;
      remTimers.push(setTimeout(() => notify(e, d, key), Math.max(0, delay)));
    });
  });
}
async function notify(e, d, key) {
  const fired = JSON.parse(localStorage.getItem('lr:fired') || '{}');
  fired[key] = 1;
  localStorage.setItem('lr:fired', JSON.stringify(fired));
  const body = `${e.allDay || !e.start ? 'Celý den' : e.start}${e.place ? ' · ' + e.place : ''}`;
  toast(`${icon('bell', 18)} <b>${esc(e.title)}</b> – ${esc(body)}`, 'long');
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(e.title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key });
      else new Notification(e.title, { body });
    } catch (err) { /* ignore */ }
  }
}

// ---------- poznámky ----------
export function newNote(extra = {}) {
  return db.put('notes', { title: '', body: '', tags: [], pinned: false, color: '', created: new Date().toISOString(), updated: new Date().toISOString(), ...extra });
}
export function noteCard(n) {
  const body = (n.body || '').slice(0, 140);
  return `<a class="note-card" href="#/notes/${n.id}" style="${n.color ? `--c:${n.color}` : ''}">
    ${n.pinned ? `<span class="pin">${icon('pin', 14)}</span>` : ''}
    <h4>${esc(n.title || 'Bez názvu')}</h4>
    ${body ? `<p>${esc(body)}</p>` : ''}
    <small>${fmtDay((n.updated || n.created || new Date().toISOString()).slice(0, 10))}${(n.tags || []).length ? ' · ' + n.tags.map(esc).join(', ') : ''}${(() => { const k = db.filter('files', f => f.note === n.id).length; return k ? ` · ${icon('file', 11)} ${k}` : ''; })()}</small>
  </a>`;
}

// ---------- soubory ----------
const MAX_LOCAL = 1.5 * 1024 * 1024;
// velké fotky z telefonu zmenší (max 2000 px, JPEG), ať se rychle nahrají a nezabírají místo
async function shrink(f) {
  if (!/^image\/(jpeg|png|heic|heif|webp)$/i.test(f.type) || f.size < 1.2 * 1024 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) { return f; }
}
export function pickFiles(extra = {}, after = () => {}, opts = {}) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = !opts.capture;
  if (opts.accept) inp.accept = opts.accept;
  if (opts.capture) inp.setAttribute('capture', opts.capture);
  inp.onchange = async () => {
    for (const raw of inp.files) {
      try {
        const f = await shrink(raw);
        if (canUpload()) {
          toast(`Nahrávám ${esc(f.name)}…`);
          const path = await uploadFile(f);
          db.put('files', { name: f.name, size: f.size, type: f.type, path, added: new Date().toISOString(), ...extra });
        } else if (f.size <= MAX_LOCAL) {
          const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
          db.put('files', { name: f.name, size: f.size, type: f.type, dataUrl, added: new Date().toISOString(), ...extra });
        } else {
          toast(`${esc(f.name)} je velký – nahraje se, až budeš online.`, 'warn long');
          continue;
        }
        toast(`Uloženo: ${esc(f.name)}`);
      } catch (e) { toast(`Nahrání selhalo: ${esc(e.message)}`, 'warn long'); }
    }
    after();
  };
  inp.click();
}
// odkaz na náhled obrázku (podepsaná URL z cloudu, nebo data v zařízení)
const urlCache = new Map();
export async function thumbUrl(f) {
  if (f.dataUrl) return f.dataUrl;
  if (!f.path) return '';
  const c = urlCache.get(f.path);
  if (c && c.t > Date.now() - 50 * 60000) return c.u;
  const u = await fileUrl(f.path);
  urlCache.set(f.path, { u, t: Date.now() });
  return u;
}
export const isImage = f => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name || '');
export async function openFile(f) {
  // okno otevřít hned při klepnutí (iPhone jinak po čekání na odkaz okno zablokuje)
  const w = window.open('', '_blank');
  const go = url => { if (w && !w.closed) w.location.href = url; else location.href = url; };
  try {
    if (f.path) go(await fileUrl(f.path));
    else if (f.dataUrl) {
      const blob = await (await fetch(f.dataUrl)).blob();
      go(URL.createObjectURL(blob));
    }
  } catch (e) { if (w) w.close(); toast('Soubor nejde otevřít – jsi přihlášený a online?', 'warn'); }
}
export async function deleteFile(f) {
  if (f.path) { try { await removeFile(f.path); } catch (e) { /* zůstane v úložišti */ } }
  db.del(f.id);
}
export const fileSize = b => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' kB';
export function fileRow(f) {
  const ext = (f.name.split('.').pop() || '').slice(0, 4).toLowerCase();
  return `<div class="row file" data-act="file-open" data-id="${f.id}">
    <span class="ext">${esc(ext)}</span>
    <div class="row-main"><p class="row-title">${esc(f.name)}</p><p class="row-meta"><span>${fileSize(f.size || 0)}</span><span>${fmtDay((f.added || '').slice(0, 10) || today())}</span>${f.path ? '<span>cloud</span>' : '<span>v zařízení</span>'}</p></div>
    <button class="icon-btn" data-act="file-del" data-id="${f.id}" aria-label="Smazat soubor">${icon('trash', 18)}</button>
  </div>`;
}
export async function handleFileAct(act, id, after) {
  const f = db.get(id);
  if (!f) return false;
  if (act === 'file-open') { openFile(f); return true; }
  if (act === 'file-del') {
    const { confirmSheet } = await import('./ui.js');
    if (await confirmSheet(`Smazat soubor ${f.name}?`)) { await deleteFile(f); after(); }
    return true;
  }
  return false;
}

// ---------- finance ----------
export function editTx(t = {}, after = () => {}) {
  const type = t.type || 'out';
  const accs = accounts();
  const catList = ty => (ty === 'in' ? finIn() : finOut());
  const fields = [
    { k: 'type', label: 'Typ', type: 'chips', options: [{ v: 'out', l: 'Výdaj' }, { v: 'in', l: 'Příjem' }, ...(accs.length > 1 ? [{ v: 'transfer', l: 'Převod' }] : [])], def: type },
    { k: 'amount', label: 'Částka (Kč)', type: 'number', step: '0.01', min: 0, req: true, ph: '0' },
    { k: 'note', label: 'Za co / od koho', ph: 'Např. Albert, výplata, nájem' },
    { k: 'cat', label: 'Kategorie', type: 'chips', options: catList(type === 'transfer' ? 'out' : type).map(c => ({ v: c.id, l: c.name, c: c.color })), def: t.cat || (t.note ? guessCat(t.note, type) : catList(type)[0].id) },
    ...(accs.length ? [{ k: 'account', label: type === 'transfer' ? 'Z účtu' : 'Účet', type: 'select', half: true, options: accs.map(a => ({ v: a.id, l: a.name })), def: defaultAccount() }] : []),
    ...(accs.length > 1 ? [{ k: 'toAccount', label: 'Na účet', type: 'select', half: true, options: accs.map(a => ({ v: a.id, l: a.name })), def: (accs.find(a => a.id !== defaultAccount()) || {}).id }] : []),
    { k: 'date', label: 'Datum', type: 'date', half: true, def: today() },
    { k: 'hustle', label: 'Projekt', type: 'select', half: true, options: [{ v: '', l: '—' }, ...hustles().map(h => ({ v: h.id, l: h.name }))] },
  ];
  const s = openForm({
    title: t.id ? 'Upravit pohyb' : (type === 'in' ? 'Nový příjem' : type === 'transfer' ? 'Převod' : 'Nový výdaj'),
    fields,
    values: t,
    onSave: v => {
      if (!(v.amount > 0)) { toast('Zadej částku', 'warn'); return false; }
      if (v.type === 'transfer' && v.account === v.toAccount) { toast('Vyber dva různé účty', 'warn'); return false; }
      const rec = { ...t, ...v };
      if (v.type !== 'transfer') delete rec.toAccount; else delete rec.cat;
      const id = db.put('tx', rec);
      if (v.type !== 'transfer' && v.note && v.cat) learn(v.note, v.cat, v.type);
      if (!t.id) award('tx:' + id, 3, 'Finance');
      after();
    },
    onDelete: t.id ? () => { db.del(t.id); revoke('tx:' + t.id); after(); } : null,
  });
  const form = s.body.querySelector('form');
  const show = ty => {
    const catF = form.querySelector('[data-chips="cat"]').closest('.field');
    const to = form.querySelector('[name="toAccount"]');
    catF.hidden = ty === 'transfer';
    if (to) to.closest('.field').hidden = ty !== 'transfer';
    const accL = form.querySelector('label[for="f_account"]');
    if (accL) accL.textContent = ty === 'transfer' ? 'Z účtu' : 'Účet';
  };
  const setCats = (ty, pick) => {
    const list = catList(ty === 'in' ? 'in' : 'out');
    const box = form.querySelector('[data-chips="cat"]');
    const cur = pick && list.some(c => c.id === pick) ? pick : list[0].id;
    box.innerHTML = list.map(c => `<button type="button" class="chip ${c.id === cur ? 'on' : ''}" data-v="${c.id}" style="--c:${c.color}"><i class="dot"></i>${esc(c.name)}</button>`).join('');
    form.querySelector('input[name="cat"]').value = cur;
  };
  show(type);
  form.querySelector('input[name="type"]').addEventListener('change', e => { setCats(e.target.value, guessCat(form.note.value, e.target.value)); show(e.target.value); });
  let touched = !!t.cat;
  form.querySelector('[data-chips="cat"]').addEventListener('click', () => { touched = true; });
  form.note.addEventListener('change', () => { if (touched) return; const ty = form.querySelector('input[name="type"]').value; if (ty !== 'transfer') setCats(ty, guessCat(form.note.value, ty)); });
  return s;
}
export function txRow(t) {
  if (t.type === 'transfer') {
    const a = account(t.account), b = account(t.toAccount);
    return `<div class="row tx" data-act="tx-edit" data-id="${t.id}">
      <i class="cat-dot" style="--c:var(--mut)"></i>
      <div class="row-main"><p class="row-title">${esc(t.note || 'Převod')}</p><p class="row-meta"><span>${esc(a ? a.name : '?')} → ${esc(b ? b.name : '?')}</span><span>${relDay(t.date)}</span></p></div>
      <b class="amt muted">${money(t.amount)}</b>
    </div>`;
  }
  const list = t.type === 'in' ? finIn() : finOut();
  const c = list.find(x => x.id === t.cat) || { name: 'Ostatní', color: '#9AA7B4' };
  const acc = accounts().length > 1 && t.account ? account(t.account) : null;
  return `<div class="row tx" data-act="tx-edit" data-id="${t.id}">
    <i class="cat-dot" style="--c:${c.color}"></i>
    <div class="row-main"><p class="row-title">${esc(t.note || c.name)}</p><p class="row-meta"><span>${esc(c.name)}</span><span>${relDay(t.date)}</span>${acc ? `<span>${esc(acc.name)}</span>` : ''}${t.rec ? `<span>${icon('sync', 11)} pravidelná</span>` : ''}</p></div>
    <b class="amt ${t.type === 'in' ? 'in' : ''}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</b>
  </div>`;
}

export function monthKey(d) { return d.slice(0, 7); }
export { iso, diffDays };
