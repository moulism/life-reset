# Life Reset

Osobní systém ve stylu JARVIS / Batcomputer – rutina, kalendář, úkoly, deník, side hustles (MetroMood, Anděl), škola, databáze souborů, gym, kalorie + krabičky na nabírání, finance s grafy, knihy, poznámky a nákupní seznam. Levely, XP, série a odemykání vzhledů.

Čistý HTML/CSS/JS (žádný build), data local-first v telefonu + synchronizace přes Supabase.

## Spuštění ve VS Code

1. Otevři složku `life-reset` ve VS Code.
2. Nainstaluj doporučená rozšíření (VS Code nabídne samo) – hlavně **Live Server**.
3. Pravý klik na `index.html` → **Open with Live Server** → běží na `http://localhost:5500`.

## GitHub (jednou)

1. Na github.com vytvoř prázdné repo **life-reset** (bez README).
2. Ve VS Code: **Source Control → Publish Branch / Publish to GitHub** (nebo v terminálu):
   ```bash
   git remote add origin https://github.com/moulism/life-reset.git
   git push -u origin main
   ```
3. Na GitHubu: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Za minutu běží na **https://moulism.github.io/life-reset/**.

Potom už jen: uprav → **Commit** → VS Code sám pushne (`git.postCommitCommand: sync`) → GitHub Actions nasadí novou verzi.

> Po větší změně zvyš `VERSION` v `sw.js`, ať telefon stáhne novou verzi hned.

## Supabase

- Projekt **work** (`gemjcncoeuzhytivixix`), tabulka `lr_items` + soukromý bucket `lr-files`. Každý vidí jen svá data (RLS).
- `config.js` obsahuje URL a **publishable** klíč – ten je veřejný, data chrání RLS.
- Doporučený upgrade synchronizace: v Supabase → **SQL Editor** spusť `supabase/migrations/20261020000000_life_reset.sql`
  (přidá serverový čas změn a ochranu, aby starší zařízení nepřepsalo novější data). Aplikace funguje i bez něj.
- **Authentication → URL Configuration → Redirect URLs**: přidej `https://moulism.github.io/life-reset/` a `http://localhost:5500/` (pro odkazy z e-mailu).

V aplikaci: **Mapa → Nastavení → Synchronizace** → vytvoř účet / přihlas se. Na dalším zařízení se jen přihlásíš a všechno se stáhne.

## iPhone

Safari → otevři web → **Sdílet → Přidat na plochu**. Běží na celou obrazovku, funguje offline a umí upozornění.

## Struktura

```
index.html, config.js, sw.js, manifest.webmanifest
css/app.css            vzhled + 5 motivů (Arc, Wayne, Stark, Steel, Gotham)
js/app.js              router, horní lišta, spodní menu
js/store.js            lokální databáze (localStorage)
js/sync.js             Supabase sync + soubory
js/game.js             XP, levely, skóre dne, série, odemykání
js/common.js, ui.js    sdílené komponenty
js/data/               výchozí hodnoty, knihy, plán krabiček
js/pages/              jednotlivé stránky
vendor/                Chart.js + supabase-js (offline)
supabase/migrations/   SQL schéma
```
