// Úvodní obrazovka bez přihlášení – přihlášení nebo nový účet.
import { icon } from '../ui.js';
import { mountAuth } from '../auth-ui.js';
import { applyTheme } from '../game.js';
import { lang, setLang } from '../i18n.js';

export default {
  title: 'Life Reset',
  render(root) {
    applyTheme(null);
    root.innerHTML = `<section class="ob welcome">
      <div class="ob-hero">
        <div class="ob-mark">LR</div>
        <h1>Life Reset</h1>
        <p>Tvůj týden, návyky, úkoly, peníze, trénink a poznámky na jednom místě. Každý den skóre a série.</p>
      </div>
      <section class="panel"><div id="authBox"></div></section>
      <p class="small muted center">${icon('lock', 13)} Každý účet vidí jen svoje data.</p>
      <p class="small center no-tr"><button class="link" data-lang="${lang() === 'en' ? 'cs' : 'en'}">${lang() === 'en' ? 'Čeština' : 'English'}</button></p>
    </section>`;
    root.onclick = e => { const b = e.target.closest('[data-lang]'); if (b) { setLang(b.dataset.lang); location.reload(); } };
    mountAuth(root.querySelector('#authBox'), {
      start: localStorage.getItem('lr:lastEmail') ? 'in' : 'up',
      onDone: () => { location.hash = '#/home'; },
    });
  }
};
