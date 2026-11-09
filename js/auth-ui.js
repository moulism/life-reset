// Přihlášení a registrace (e-mail + heslo). Zapomenuté heslo / potvrzení účtu přes odkaz nebo kód z e-mailu,
// který se vloží přímo do aplikace (funguje i v aplikaci na ploše iPhonu, kde Safari nemá sdílené přihlášení).
import { signIn, signUp, sendCode, verifyCode } from './sync.js';
import { esc, icon, toast } from './ui.js';
import { getMeta, setMeta } from './store.js';

export function mountAuth(box, { onDone = () => {}, email = '', start = 'in' } = {}) {
  const st = { mode: start, email: email || getMeta('authEmail') || localStorage.getItem('lr:lastEmail') || '', sent: false, busy: false, name: '' };
  const draw = () => {
    const em = `<div class="field"><label for="auE">E-mail</label><input id="auE" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" required value="${esc(st.email)}"></div>`;
    const pw = (ac) => `<div class="field"><label for="auP">Heslo</label><div class="pw"><input id="auP" name="password" type="password" autocomplete="${ac}" minlength="6" required><button type="button" class="icon-btn sm" data-a="eye" aria-label="Ukázat heslo">${icon('eye', 16)}</button></div>${ac === 'new-password' ? '<small class="hint">Aspoň 6 znaků</small>' : ''}</div>`;
    let body = '';
    if (st.mode === 'code') {
      body = !st.sent
        ? `${em}<p class="small muted">Pošlu ti e-mail s odkazem. Po přihlášení si v Nastavení → Účet nastavíš nové heslo.</p>
           <button class="btn primary big" data-a="send">Poslat e-mail</button>
           <p class="small center"><button type="button" class="link" data-a="m-in">Zpět na přihlášení</button></p>`
        : `<p class="small">E-mail je na cestě na <b>${esc(st.email)}</b> (mrkni i do spamu).</p>
           <ol class="steps small"><li>V Mailu <b>podrž prst na odkazu</b> v e-mailu → <b>Kopírovat odkaz</b>.</li><li>Vlož ho sem a dej Potvrdit.</li></ol>
           <div class="field"><label for="auC">Odkaz (nebo kód) z e-mailu</label><input id="auC" name="code" autocomplete="one-time-code" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="https://… nebo 6 číslic" required></div>
           <div class="row-btns"><button type="button" class="btn ghost" data-a="paste">Vložit ze schránky</button><button class="btn primary" data-a="verify">Potvrdit</button></div>
           <p class="small center"><button type="button" class="link" data-a="send">Poslat znovu</button> · <button type="button" class="link" data-a="change">Jiný e-mail</button></p>`;
    } else if (st.mode === 'up') {
      body = `${em}${pw('new-password')}<button class="btn primary big" data-a="up">Vytvořit účet</button>`;
    } else {
      body = `${em}${pw('current-password')}<button class="btn primary big" data-a="in">Přihlásit</button>
        <p class="small center"><button type="button" class="link" data-a="forgot">Zapomenuté heslo?</button></p>`;
    }
    box.innerHTML = `${st.mode !== 'code' ? `<div class="seg auth-seg"><button type="button" class="${st.mode === 'in' ? 'on' : ''}" data-a="m-in">Přihlásit</button><button type="button" class="${st.mode === 'up' ? 'on' : ''}" data-a="m-up">Nový účet</button></div>` : ''}
      <form class="auth-form" novalidate>${body}</form>`;
    if (st.sent && st.mode === 'code') setTimeout(() => { const f = box.querySelector('[name=code]'); f && f.focus(); }, 50);
  };
  const val = n => { const i = box.querySelector(`[name=${n}]`); return i ? i.value.trim() : ''; };
  const run = async (btn, fn) => {
    if (st.busy) return;
    st.busy = true;
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Moment…'; }
    try { await fn(); } catch (e) { toast(esc(e.message || String(e)), 'warn long'); }
    finally { st.busy = false; if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } }
  };
  const remember = e => { setMeta('authEmail', e.toLowerCase()); try { localStorage.setItem('lr:lastEmail', e.toLowerCase()); } catch (x) { /* */ } };
  const act = async (a, btn) => {
    if (a === 'm-in' || a === 'm-up') { st.email = val('email') || st.email; st.mode = a.slice(2); st.sent = false; draw(); return; }
    if (a === 'change') { st.sent = false; draw(); return; }
    if (a === 'forgot') { st.email = val('email') || st.email; st.mode = 'code'; st.sent = false; draw(); return; }
    if (a === 'eye') { const i = box.querySelector('[name=password]'); i.type = i.type === 'password' ? 'text' : 'password'; return; }
    if (a === 'paste') {
      try { const t = await navigator.clipboard.readText(); box.querySelector('[name=code]').value = t.trim(); if (/token=/.test(t)) act('verify', box.querySelector('[data-a="verify"]')); }
      catch (e) { toast('Vlož odkaz ručně – podrž prst v poli → Vložit', 'long'); }
      return;
    }
    if (a === 'send') {
      const e = val('email') || st.email;
      if (!/^\S+@\S+\.\S+$/.test(e)) { toast('Zadej e-mail', 'warn'); return; }
      await run(btn, async () => { await sendCode(e); st.email = e; st.sent = true; remember(e); toast('E-mail odeslán'); draw(); });
    } else if (a === 'verify') {
      const c = val('code');
      if (!/token=/.test(c) && c.replace(/\D/g, '').length < 6) { toast('Vlož celý odkaz z e-mailu', 'warn'); return; }
      await run(btn, async () => { await verifyCode(st.email, c); toast('Přihlášeno'); onDone(st.email); });
    } else if (a === 'in' || a === 'up') {
      const e = val('email'), p = box.querySelector('[name=password]').value;
      if (!/^\S+@\S+\.\S+$/.test(e)) { toast('Zadej e-mail', 'warn'); return; }
      if (p.length < 6) { toast('Heslo musí mít aspoň 6 znaků', 'warn'); return; }
      remember(e);
      await run(btn, async () => {
        if (a === 'in') { await signIn(e, p); toast('Přihlášeno'); onDone(e); }
        else {
          const r = await signUp(e, p);
          if (r === 'in') { toast('Účet vytvořen'); onDone(e); }
          else { st.email = e; st.mode = 'code'; st.sent = true; draw(); toast('Potvrď e-mail – zkopíruj odkaz z e-mailu sem.', 'long'); }
        }
      });
    }
  };
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    e.preventDefault();
    act(b.dataset.a, b);
  });
  box.addEventListener('submit', e => {
    e.preventDefault();
    const a = st.mode === 'code' ? (st.sent ? 'verify' : 'send') : st.mode;
    act(a, box.querySelector(`[data-a="${a}"]`));
  });
  draw();
}
