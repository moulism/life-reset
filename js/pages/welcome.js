// Úvodní obrazovka bez přihlášení – přihlášení nebo nový účet.
import { icon } from '../ui.js';
import { mountAuth } from '../auth-ui.js';
import { applyTheme } from '../game.js';

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
    </section>`;
    mountAuth(root.querySelector('#authBox'), {
      start: localStorage.getItem('lr:lastEmail') ? 'in' : 'up',
      onDone: () => { location.hash = '#/home'; },
    });
  }
};
