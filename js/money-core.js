// Finance – data a výpočty: účty, zůstatky, pravidelné platby, cash flow, import výpisu (CSV).
// Kolekce: accounts, tx (type: in | out | transfer), recurring, finrules (učení kategorií).
import { db, profile } from './store.js';
import { today, addDays, parse, iso, sum } from './ui.js';
import { FIN_OUT, FIN_IN } from './data/defaults.js';

export const finOut = () => (profile() && profile().finOut) || FIN_OUT;
export const finIn = () => (profile() && profile().finIn) || FIN_IN;
export const ACC_TYPES = [{ v: 'card', l: 'Účet / karta' }, { v: 'cash', l: 'Hotovost' }, { v: 'savings', l: 'Spoření' }, { v: 'other', l: 'Jiné' }];

export const accounts = () => db.all('accounts').slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const account = id => db.get(id) || null;
export const defaultAccount = () => { const a = accounts(); return (a.find(x => x.main) || a[0] || {}).id || ''; };

// vliv pohybu na zůstatek účtu
function effect(t, accId) {
  const a = Number(t.amount) || 0;
  if (t.type === 'transfer') return (t.account === accId ? -a : 0) + (t.toAccount === accId ? a : 0);
  if (t.account !== accId) return 0;
  return t.type === 'in' ? a : -a;
}
export function balance(accId, until = null) {
  const acc = account(accId);
  if (!acc) return 0;
  const from = acc.startDate || '0000-00-00';
  return (Number(acc.start) || 0) + sum(db.all('tx').filter(t => (!until || t.date <= until) && t.date >= from), t => effect(t, accId));
}
export const totalBalance = (until = null) => sum(accounts().filter(a => !a.hidden), a => balance(a.id, until));

// pohyby pro statistiky (převody mezi vlastními účty nejsou příjem ani výdaj)
export const monthTx = m => db.all('tx').filter(t => (t.date || '').startsWith(m) && t.type !== 'transfer');
export const incOf = list => sum(list.filter(t => t.type === 'in'), t => t.amount);
export const outOf = list => sum(list.filter(t => t.type === 'out' || !t.type), t => t.amount);

export const shiftMonth = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const monthEnd = m => { const [y, mo] = m.split('-').map(Number); return iso(new Date(y, mo, 0)); };

// ---------- pravidelné platby ----------
export const recurring = () => db.all('recurring').slice().sort((a, b) => (a.day || 1) - (b.day || 1));
export function nextDue(r, after) {
  // první termín >= after
  const d = parse(after);
  if (r.freq === 'weekly') {
    const wd = Number(r.weekday ?? 1);
    const diff = (wd - d.getDay() + 7) % 7;
    return addDays(after, diff);
  }
  const day = Math.min(28, Math.max(1, Number(r.day) || 1));
  if (r.freq === 'yearly') {
    const mo = Number(r.month || 1) - 1;
    let c = new Date(d.getFullYear(), mo, day);
    if (iso(c) < after) c = new Date(d.getFullYear() + 1, mo, day);
    return iso(c);
  }
  let c = new Date(d.getFullYear(), d.getMonth(), day);
  if (iso(c) < after) c = new Date(d.getFullYear(), d.getMonth() + 1, day);
  return iso(c);
}
// zapíše platby, které už proběhly (od posledního zápisu do dneška); vrací počet
export function postDueRecurring() {
  let n = 0;
  const t = today();
  recurring().filter(r => r.active !== false && r.auto !== false).forEach(r => {
    let from = r.lastPosted ? addDays(r.lastPosted, 1) : (r.since || t);
    let guard = 0;
    let last = r.lastPosted;
    for (let d = nextDue(r, from); d <= t && guard < 24; d = nextDue(r, addDays(d, 1)), guard++) {
      if (!db.find('tx', x => x.rec === r.id && x.date === d)) {
        db.put('tx', { type: r.type || 'out', amount: Number(r.amount) || 0, cat: r.cat, account: r.account || defaultAccount(), date: d, note: r.name, rec: r.id });
        n++;
      }
      last = d;
    }
    if (last && last !== r.lastPosted) db.patch(r.id, { lastPosted: last });
  });
  return n;
}
// nadcházející platby do data
export function upcoming(until) {
  const t = addDays(today(), 1);
  const out = [];
  recurring().filter(r => r.active !== false).forEach(r => {
    let guard = 0;
    for (let d = nextDue(r, r.lastPosted && r.lastPosted >= t ? addDays(r.lastPosted, 1) : t); d <= until && guard < 10; d = nextDue(r, addDays(d, 1)), guard++) out.push({ ...r, due: d });
  });
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
export const monthlyCost = r => { const a = Number(r.amount) || 0; return r.freq === 'weekly' ? a * 52 / 12 : r.freq === 'yearly' ? a / 12 : a; };

// ---------- učení kategorií (z poznámky / protistrany) ----------
const key = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ');
export function learn(note, cat, type) {
  const k = key(note);
  if (!k || !cat) return;
  const r = db.find('finrules', x => x.k === k && x.type === type);
  if (r) { if (r.cat !== cat) db.patch(r.id, { cat }); } else db.put('finrules', { k, cat, type });
}
export function guessCat(note, type) {
  const k = key(note);
  const r = k && db.find('finrules', x => x.k === k && x.type === type);
  if (r) return r.cat;
  const s = String(note || '').toLowerCase();
  const H = type === 'in' ? [
    [/vyplata|mzda|plat za|zamestnavatel|salary|payroll/, 'vyplata'],
    [/faktura|invoice|shopify|stripe|gopay|comgate/, 'business'],
  ] : [
    [/albert|lidl|billa|kaufland|tesco|penny|globus|rohlik|košík|kosik|potravin|dm drogerie|rossmann/, 'jidlo'],
    [/dpp|pid|regiojet|leo express|cd\.cz|české dráhy|bolt|uber|liftago|benzin|shell|omv|mol /, 'doprava'],
    [/netflix|spotify|apple\.com|icloud|google|youtube|hbo|disney|chatgpt|openai|anthropic|claude/, 'predplatne'],
    [/zara|h&m|hm |bershka|pull&bear|nike|adidas|zalando|aboutyou|footshop|reserved/, 'obleceni'],
    [/form factory|gym|fitness|protein|myprotein|gymbeam/, 'gym'],
    [/wolt|foodora|bageterie|mcdonald|kfc|burger|restaurace|bistro|kavárna|kavarna|starbucks|costa/, 'zabava'],
  ];
  const hit = H.find(([re]) => re.test(s));
  const list = type === 'in' ? finIn() : finOut();
  return hit && list.some(c => c.id === hit[1]) ? hit[1] : (list.find(c => c.id === 'ostatni') || list[0]).id;
}

// ---------- CSV import ----------
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/).find(l => l.trim()) || '';
  const delim = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}
// najde řádek s hlavičkou a odhadne sloupce (funguje pro většinu českých bank: George, KB, ČSOB, Air, Revolut, Fio, mBank)
export function guessColumns(rows) {
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let h = rows.findIndex(r => r.some(c => /datum|date|zauctovani|splatnost/.test(norm(c))) && r.some(c => /castka|amount|objem|suma/.test(norm(c))));
  if (h < 0) h = 0;
  const head = rows[h].map(norm);
  // zkouší vzory postupně (první vzor má přednost) a přeskakuje už použité sloupce
  const used = new Set();
  const find = (...res) => { for (const re of res) { const i = head.findIndex((c, k) => !used.has(k) && re.test(c)); if (i >= 0) { used.add(i); return i; } } return -1; };
  const date = find(/datum zauctovani/, /datum provedeni/, /^datum$/, /completed date/, /booking date/, /^date/, /datum/);
  const amount = find(/^castka$/, /castka v mene uctu/, /^amount$/, /castka/, /amount/, /objem/);
  const party = find(/nazev protiuctu/, /protistrana/, /nazev obchodnika/, /counterparty/, /obchodnik/, /merchant/, /prijemce/, /platce/);
  const note = find(/zprava/, /poznamka/, /popis/, /description/, /reference/, /informace/);
  return { header: h, date, amount, note, party };
}
export function parseAmount(s) {
  let v = String(s || '').replace(/\s| /g, '').replace(/[A-Za-zčČ$€£]+/g, '');
  if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.');
  else v = v.replace(/,/g, '');
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
export function parseDate(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}
export function importRows(rows, cols, accId) {
  const out = [];
  rows.slice(cols.header + 1).forEach(r => {
    const date = parseDate(r[cols.date]);
    const amt = parseAmount(r[cols.amount]);
    if (!date || amt == null || amt === 0) return;
    const party = cols.party >= 0 ? r[cols.party] : '';
    const msg = cols.note >= 0 ? r[cols.note] : '';
    const note = [party, msg !== party ? msg : ''].filter(Boolean).join(' · ').slice(0, 120);
    const type = amt > 0 ? 'in' : 'out';
    out.push({ date, amount: Math.abs(amt), type, note, account: accId });
  });
  return out;
}
export function txKey(t) { return `${t.date}|${t.type}|${Math.round(t.amount * 100)}|${key(t.note)}`; }

// příjmy a výdaje měsíce tak, jak se promítly do zůstatků (bez převodů a bez pohybů před počátečním zůstatkem účtu)
export function flowOf(m, until) {
  const A = accounts().filter(a => !a.hidden);
  let inc = 0, out = 0;
  db.all('tx').forEach(t => {
    if (!(t.date || '').startsWith(m) || (until && t.date > until)) return;
    A.forEach(a => {
      if (t.date < (a.startDate || '0000')) return;
      const e = effect(t, a.id);
      if (t.type === 'transfer') { const other = t.account === a.id ? t.toAccount : t.account; if (A.some(x => x.id === other)) return; }
      if (e > 0) inc += e; else out -= e;
    });
  });
  return { inc, out };
}
