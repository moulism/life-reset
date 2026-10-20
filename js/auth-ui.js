// Přihlašovací formulář: heslo, nebo přihlašovací e-mail, jehož odkaz se vloží přímo do aplikace (funguje i v aplikaci na ploše iPhonu).
import { signIn, signUp, sendCode, verifyCode } from './sync.js';
import { esc, icon, toast } from './ui.js';
import { getMeta, setMeta } from './store.js';

export function mountAuth(box, { onDone = () => {}, email = '' } = {}) {
  const st = { mode: 'pass', email: email || getMeta('authEmail') || '', sent: false, busy: false };
  const draw = () => {
    const em = `<div class="field"><label>E-mail</label><input name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" required value="${esc(st.email)}"></div>`;
    let body = '';
    if (st.mode === 'code' && !st.sent) {
      body = `${em}<p class="small muted">Pošlu ti přihlašovací e-mail. Funguje i když nevíš heslo.</p>
        <button class="btn primary big" data-a="send">${icon('bolt', 18)} Poslat přihlašovací e-mail</button>`;
    } else if (st.mode === 'code') {
      body = `<p class="small">E-mail je na cestě na <b>${esc(st.email)}</b> (mrkni i do spamu).</p>
        <ol class="steps small"><li>V Mailu <b>podrž prst na odkazu „Log In“</b> → <b>Kopírovat odkaz</b>.</li><li>Vlož ho sem a dej Přihlásit.</li></ol>
        <p class="small muted">Když odkaz jen otevřeš, přihlásí tě v Safari – ne v aplikaci na ploše (iPhone je od sebe odděluje).</p>
        <div class="field"><label>Odkaz (nebo kód) z e-mailu</label><input name="code" autocomplete="one-time-code" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="https://…supabase.co/auth/v1/verify?token=…" required></div>
        <div class="row-btns"><button type="button" class="btn ghost" data-a="paste">Vložit ze schránky</button><button class="btn primary" data-a="verify">Přihlásit</button></div>
        <p class="small"><button type="button" class="link" data-a="send">Poslat znovu</button> · <button type="button" class="link" data-a="change">Jiný e-mail</button></p>`;
    } else {
      body = `${em}<div class="field"><label>Heslo</label><div class="pw"><input name="password" type="password" autocomplete="current-password" minlength="6" required><button type="button" class="icon-btn sm" data-a="eye" aria-label="Ukázat heslo">${icon('eye', 16)}</button></div></div>
        <div class="row-btns"><button type="button" class="btn ghost" data-a="up">Nový účet</button><button class="btn primary" data-a="pass">Přihlásit</button></div>
        <p class="small"><button type="button" class="link" data-a="forgot">Zapomenuté heslo? Přihlas se přes e-mail</button> a pak si v Nastavení → Synchronizace nastav nové.</p>`;
    }
    box.innerHTML = `<div class="seg auth-seg"><button type="button" class="${st.mode === 'pass' ? 'on' : ''}" data-a="m-pass">Heslo</button><button type="button" class="${st.mode === 'code' ? 'on' : ''}" data-a="m-code">Bez hesla (e-mail)</button></div>
      <form class="auth-form" novalidate>${body}</form>`;
    const focus = box.querySelector(st.sent && st.mode === 'code' ? '[name=code]' : '[name=email]');
    if (focus && st.sent) setTimeout(() => focus.focus(), 50);
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
  const act = async (a, btn) => {
    if (a === 'm-code' || a === 'm-pass') { st.email = val('email') || st.email; st.mode = a.slice(2); draw(); return; }
    if (a === 'change') { st.sent = false; draw(); return; }
    if (a === 'forgot') { st.email = val('email') || st.email; st.mode = 'code'; st.sent = false; draw(); return; }
    if (a === 'paste') {
      try { const t = await navigator.clipboard.readText(); box.querySelector('[name=code]').value = t.trim(); if (/token=/.test(t)) act('verify', box.querySelector('[data-a="verify"]')); }
      catch (e) { toast('Vlož odkaz ručně – podrž prst v poli → Vložit', 'long'); }
      return;
    }
    if (a === 'eye') { const i = box.querySelector('[name=password]'); i.type = i.type === 'password' ? 'text' : 'password'; return; }
    if (a === 'send') {
      const e = val('email') || st.email;
      if (!/^\S+@\S+\.\S+$/.test(e)) { toast('Zadej e-mail', 'warn'); return; }
      await run(btn, async () => { await sendCode(e); st.email = e; st.sent = true; setMeta('authEmail', e.toLowerCase()); toast('E-mail odeslán'); draw(); });
    } else if (a === 'verify') {
      const c = val('code');
      if (!/token=/.test(c) && c.replace(/\D/g, '').length < 6) { toast('Vlož celý odkaz z e-mailu', 'warn'); return; }
      await run(btn, async () => { await verifyCode(st.email, c); toast('Přihlášeno – data synchronizována'); onDone(st.email); });
    } else if (a === 'pass' || a === 'up') {
      const e = val('email'), p = box.querySelector('[name=password]').value;
      if (!/^\S+@\S+\.\S+$/.test(e) || p.length < 6) { toast('E-mail a heslo (aspoň 6 znaků)', 'warn'); return; }
      setMeta('authEmail', e.toLowerCase());
      await run(btn, async () => {
        if (a === 'pass') { await signIn(e, p); toast('Přihlášeno – data synchronizována'); onDone(e); }
        else {
          const r = await signUp(e, p);
          if (r === 'in') { toast('Účet vytvořen'); onDone(e); }
          else { st.email = e; st.mode = 'code'; st.sent = true; draw(); toast('Potvrď účet – zkopíruj odkaz z e-mailu sem.', 'long'); }
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
    const a = st.mode === 'pass' ? 'pass' : (st.sent ? 'verify' : 'send');
    act(a, box.querySelector(`[data-a="${a}"]`));
  });
  draw();
}
