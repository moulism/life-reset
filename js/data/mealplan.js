// Krabičky na nabírání – plán na 2 měsíce (od 26. 10. 2026)

export const PLAN = {
  title: 'Krabičky na nabírání – plán na 2 měsíce',
  start: '2026-10-26', // pondělí týdne 1 (vaří se v neděli 25. 10.)
  goal: 'Cíl: cca 3 000 kcal a 140–160 g bílkovin denně, přibírat 0,25–0,5 kg týdně → za 2 měsíce +2 až +4 kg, hlavně svaly. Čísla vychází z odhadu ~63 kg / ~180 cm a tréninku 4–5× týdně; pokud jsi výrazně menší/větší, tabulka Úpravy to dorovná sama.',
  why: 'Svaly rostou jen když jíš víc, než spálíš (přebytek ~300–400 kcal), máš dost bílkovin (~2 g na kg váhy) a dáváš tělu důvod – trénink. Bez přebytku se nepřibírá, bez tréninku přibíráš tuk.',
  rules: [
    'Vážíš suroviny syrové / suché (rýže, těstoviny, maso) – uvařené váží jinak a čísla by nesedla.',
    'Jíš 4× denně: snídaně, krabička, shake, krabička. Žádné vynechávání – to je u nabírání chyba č. 1.',
    'Shake je tvůj „cheat“ na kalorie – 800 kcal vypiješ za 2 minuty, sníst by se to blbě.',
    'Vážíš se 3× týdně ráno po záchodě, nalačno. Počítá se týdenní průměr, ne jeden den.',
    'Pij 2,5–3 l vody denně, víc v tréninkové dny.',
  ],
  dayIntro: 'Dvě krabičky (oběd + večeře) připravuješ dopředu, snídani a shake děláš čerstvé za 5 minut. Dohromady ~3 000 kcal a ~160 g bílkovin.',
  day: [
    ['Snídaně', 'Varianta A nebo B', '600–790', '35 g'],
    ['Oběd', 'Krabička', '~800', '~45 g'],
    ['Svačina / po tréninku', 'Nabírací shake', '~800', '~38 g'],
    ['Večeře', 'Krabička', '~800', '~45 g'],
    ['Celkem', '', '~3 000', '~160 g'],
  ],
  weekend: 'Víkend: krabičky nemáš, jez normálně – ale drž snídani + shake, ať ti nespadnou kalorie.',
};

export const PRESETS = [
  { id: 'snA', name: 'Snídaně A – vejce', kcal: 650, protein: 36, slot: 'snidane',
    text: '4 vejce (míchaná/volská na 5 g másla), 2 krajíce chleba (100 g), 30 g sýra, paprika nebo rajče.' },
  { id: 'snB', name: 'Snídaně B – ovesná kaše', kcal: 790, protein: 37, slot: 'snidane',
    text: '80 g ovesných vloček uvařit v 250 ml mléka, vmíchat 125 g tvarohu, nahoru banán a 15 g arašídového másla.' },
  { id: 'shake', name: 'Nabírací shake', kcal: 800, protein: 38, slot: 'svacina',
    text: '400 ml plnotučného mléka, 50 g ovesných vloček, 1 banán, 20 g arašídového másla, 125 g tvarohu (nebo 1 odměrka proteinu), lžička medu nebo kakaa. Ideálně do 1–2 h po tréninku, v ostatní dny odpoledne.' },
];

export const RECIPES = [
  { id: 'r1', name: 'Kuřecí burrito bowl', kcal: 820, protein: 55,
    ing: ['100 g rýže', '150 g kuřecích prsou', '80 g červených fazolí (konzerva)', '50 g kukuřice', '30 g strouhaného čedaru', '10 g oleje', 'salsa nebo pár lžic passaty s chilli'],
    steps: ['Uvař rýži. Kuře nakrájej na kostky, okořeň (paprika, kmín, česnek, sůl), opeč na oleji 8–10 min.', 'Do krabičky rýže, kuře, fazole, kukuřice, salsa. Sýr nahoru (rozpustí se při ohřevu).'] },
  { id: 'r2', name: 'Těstoviny boloňské', kcal: 880, protein: 46,
    ing: ['110 g těstovin', '150 g mletého hovězího', '150 g passaty', '½ cibule, 1 stroužek česneku', '15 g parmazánu', '5 g oleje', 'oregano, bazalka'],
    steps: ['Na oleji osmahni cibuli a česnek, přidej maso a opeč dohněda (rozdrob ho).', 'Přilij passatu, koření, sůl, duš 15 min. Těstoviny uvař al dente, smíchej, parmazán navrch.'] },
  { id: 'r3', name: 'Kuře teriyaki s rýží', kcal: 750, protein: 48,
    ing: ['100 g rýže', '160 g kuřecích prsou', '150 g brokolice (mražená stačí)', '30 ml teriyaki omáčky', '10 g oleje', '5 g sezamu'],
    steps: ['Kuře na nudličky, opeč na oleji, posledních 2 min přilij teriyaki, ať zhoustne.', 'Brokolici povař 4 min nebo dej do mikrovlnky. Rýže + kuře + brokolice, sezam navrch.'] },
  { id: 'r4', name: 'Chili con carne s rýží', kcal: 810, protein: 41,
    ing: ['150 g mletého hovězího', '100 g červených fazolí', '150 g krájených rajčat (konzerva)', '½ cibule, ½ papriky', '90 g rýže', '5 g oleje', 'chilli, kmín, paprika, kakao (špetka)'],
    steps: ['Cibuli a papriku osmahni, přidej maso, opeč. Koření, rajčata, fazole, duš 20 min.', 'Podávej s rýží. Chili vydrží v lednici nejlíp ze všech.'] },
  { id: 'r5', name: 'Kuřecí wrapy / quesadilla', kcal: 730, protein: 55,
    ing: ['2 velké tortilly', '150 g kuřecích prsou', '40 g sýra (eidam/čedar)', '50 g řeckého jogurtu nebo zakysané smetany', 'paprika, ledový salát, okurka'],
    steps: ['Kuře okořeň a opeč (jako u burrito bowlu). Zeleninu a jogurt dej zvlášť do malé krabičky.', 'Plnění skládej až v den jídla – tortilla jinak zvlhne. Chceš teplé: sýr + kuře do tortilly a 2 min na suché pánvi.'] },
  { id: 'r6', name: 'Pečené batáty s mletým masem', kcal: 790, protein: 38,
    ing: ['350 g batátů (nebo brambor)', '150 g mletého hovězího', '½ cibule, ½ papriky', '20 g sýra', '10 g oleje', 'uzená paprika, česnek'],
    steps: ['Batáty na kostky, s polovinou oleje a kořením do trouby na 200 °C, 25–30 min.', 'Mezitím osmahni cibuli, papriku a maso. Smíchej, sýr navrch.'] },
  { id: 'r7', name: 'Tuňákové těstoviny', kcal: 760, protein: 47,
    ing: ['120 g těstovin', '1 konzerva tuňáka ve vlastní šťávě (cca 120 g netto)', '150 g passaty', '1 stroužek česneku', '20 g sýra', '10 g oleje', 'oregano'],
    steps: ['Česnek na oleji, přidej passatu a koření, 5 min povař. Vmíchej tuňáka jen na prohřátí.', 'Smíchej s uvařenými těstovinami, sýr navrch. Nejrychlejší recept – 15 minut.'] },
  { id: 'r8', name: 'Hovězí stir-fry s nudlemi', kcal: 760, protein: 43,
    ing: ['100 g vaječných / rýžových nudlí', '150 g hovězího na nudličky (roštěná, kýta)', '150 g wok zeleniny (mražená)', '2 lžíce sójové omáčky + 1 lžička medu', '10 g oleje', 'česnek, zázvor'],
    steps: ['Maso na rozpálené pánvi s olejem 2–3 min, vyndej. Na stejné pánvi zelenina 4 min.', 'Vrať maso, přidej uvařené nudle, sóju s medem, promíchej 1 min.'] },
];

// Neděle: [oběd Po–St, večeře Po–St] po 3 porcích; Středa: [oběd Čt–Pá, večeře Čt–Pá] po 2 porcích
export const WEEKS = [
  { n: 1, ab: 'A', from: '2026-10-26', sun: ['r1', 'r2'], wed: ['r3', 'r5'], check: 'Změř startovní váhu' },
  { n: 2, ab: 'B', from: '2026-11-02', sun: ['r4', 'r6'], wed: ['r7', 'r8'], check: '' },
  { n: 3, ab: 'A', from: '2026-11-09', sun: ['r1', 'r2'], wed: ['r3', 'r5'], check: 'Vyhodnoť přírůstek (Úpravy)' },
  { n: 4, ab: 'B', from: '2026-11-16', sun: ['r4', 'r6'], wed: ['r7', 'r8'], check: '' },
  { n: 5, ab: 'A', from: '2026-11-23', sun: ['r3', 'r2'], wed: ['r1', 'r5'], check: 'Vyhodnoť přírůstek' },
  { n: 6, ab: 'B', from: '2026-11-30', sun: ['r8', 'r6'], wed: ['r4', 'r7'], check: '' },
  { n: 7, ab: 'A', from: '2026-12-07', sun: ['r1', 'r3'], wed: ['r2', 'r5'], check: 'Vyhodnoť přírůstek' },
  { n: 8, ab: 'B', from: '2026-12-14', sun: ['r4', 'r8'], wed: ['r6', 'r7'], check: 'Finální váha, srovnej s týdnem 1' },
];
export const WEEKS_NOTE = 'Týdny 5–8 mají přeházené dvojice, ať se jídla neopakují ve stejném pořadí. Nákupní seznam týdne A/B platí i pro ně – kupuješ stejné suroviny, jen v jiný den.';
export const COOK_INTRO = 'Vaříš 2× týdně: v neděli 6 krabiček (Po–St), ve středu večer 4 krabičky (Čt–Pá). Vždy 2 recepty najednou – jeden v hrnci, druhý na pánvi/v troubě, celé to zabere ~1–1,5 h. Střídáš týden A a B, ať tě to neomrzí.';
export const COOK_STEPS = [
  'Postav vodu na rýži/těstoviny a zapni troubu (batáty).',
  'Mezitím krájej maso a zeleninu.',
  'Vař recept 1 v hrnci, recept 2 na pánvi.',
  'Rozvaž porce do krabiček, nech 20–30 min vychladnout s otevřeným víkem, pak do lednice.',
];

export const SHOP_INTRO = 'Každý týden = Základ (snídaně + shake) + týden A nebo B. Orientačně 1 400–1 800 Kč týdně za všechno (podle akcí). V týdnech 5–8 se mění, který recept děláš na 3 porce – kup maso s rezervou ~300 g a co zbyde, zamraz.';
export const LISTS = {
  once: { name: 'Jednorázově (první nákup)', items: [
    ['10–12 skleněných krabiček s víkem (~800 ml) + 2 malé na omáčky/jogurt', 'Ostatní'],
    ['Kuchyňská váha (pokud nemáš)', 'Ostatní'],
    ['Olej, sůl, pepř, mletá paprika (sladká + uzená), kmín, chilli, oregano, česnek sušený', 'Koření & omáčky'],
    ['Teriyaki omáčka, sójová omáčka, med, sezam, kakao', 'Koření & omáčky'],
    ['Arašídové máslo (sklenice ~350 g, vydrží 2 týdny)', 'Trvanlivé'],
  ] },
  base: { name: 'Základ – každý týden', items: [
    ['Vejce 20 ks', 'Mléčné & vejce'],
    ['Plnotučné mléko 4 l', 'Mléčné & vejce'],
    ['Ovesné vločky 1 kg (vydrží ~1,5 týdne)', 'Trvanlivé'],
    ['Tvaroh polotučný 5× 250 g', 'Mléčné & vejce'],
    ['Banány 10 ks', 'Ovoce & zelenina'],
    ['Chléb 1 bochník', 'Pečivo'],
    ['Sýr eidam 150 g (na snídaně)', 'Mléčné & vejce'],
    ['Máslo 1 ks (vydrží déle)', 'Mléčné & vejce'],
    ['Rajčata / paprika na snídani', 'Ovoce & zelenina'],
  ] },
  A: { name: 'Týden A – Burrito bowl, Boloňské, Teriyaki, Wrapy', items: [
    ['Kuřecí prsa 1,2 kg', 'Maso & ryby'],
    ['Mleté hovězí 500 g', 'Maso & ryby'],
    ['Rýže 500 g', 'Trvanlivé'],
    ['Těstoviny 500 g', 'Trvanlivé'],
    ['Tortilly velké 1 balení (6 ks)', 'Pečivo'],
    ['Červené fazole 1 konzerva', 'Trvanlivé'],
    ['Kukuřice 1 konzerva', 'Trvanlivé'],
    ['Passata 1× 700 g', 'Trvanlivé'],
    ['Čedar strouhaný 200 g', 'Mléčné & vejce'],
    ['Parmazán ~80 g', 'Mléčné & vejce'],
    ['Brokolice mražená 400 g', 'Mražené'],
    ['Řecký jogurt nebo zakysaná smetana 1 kelímek', 'Mléčné & vejce'],
    ['Paprika 2, ledový salát 1, okurka 1, cibule 2, česnek', 'Ovoce & zelenina'],
  ] },
  B: { name: 'Týden B – Chili, Batáty s masem, Tuňákové těstoviny, Stir-fry', items: [
    ['Mleté hovězí 1 kg', 'Maso & ryby'],
    ['Hovězí na nudličky (roštěná/kýta) 300 g', 'Maso & ryby'],
    ['Tuňák ve vlastní šťávě 2 konzervy', 'Maso & ryby'],
    ['Batáty 1,2 kg', 'Ovoce & zelenina'],
    ['Rýže 300 g (zbytek z týdne A většinou stačí)', 'Trvanlivé'],
    ['Těstoviny 250 g (zbytek z týdne A)', 'Trvanlivé'],
    ['Nudle (vaječné/rýžové) 1 balení 250 g', 'Trvanlivé'],
    ['Červené fazole 2 konzervy', 'Trvanlivé'],
    ['Krájená rajčata 2 konzervy', 'Trvanlivé'],
    ['Passata 1× 500 g', 'Trvanlivé'],
    ['Wok zelenina mražená 450 g', 'Mražené'],
    ['Sýr eidam/čedar 150 g', 'Mléčné & vejce'],
    ['Cibule 3, paprika 3, česnek, kousek zázvoru', 'Ovoce & zelenina'],
  ] },
};

export const HOW_TO_SHOP = [
  'Jeden velký nákup v sobotu/neděli podle seznamu, ve středu jen dokoupíš čerstvé (zelenina, banány).',
  'Kde: Lidl / Kaufland / Albert na základ; maso se vyplatí brát ve větším balení (kuře 1 kg+), v akci klidně 2× a půlku zamrazit.',
  'Mražená zelenina je stejně dobrá jako čerstvá, nezkazí se a je levnější.',
  'Čti etikety: u tortill, sýrů a jogurtů hledej plnotučné verze – teď nehledáš „light“, hledáš kalorie.',
  'Rýže, těstoviny, vločky, konzervy – kupuj velká balení, vydrží měsíce.',
];
export const STORAGE = [
  'Uvařené krabičky drží v lednici 3 dny – proto vaření v neděli a ve středu.',
  'Krabičky dej do lednice do 1 hodiny od uvaření, rýži nenechávej stát přes noc venku.',
  'Chceš vařit jen jednou týdně? Krabičky na Čt–Pá rovnou zamraz a den předem přendej do lednice.',
  'Ohřev: mikrovlnka 2–3 min, v půlce promíchat, rýži pokapat lžící vody.',
];
export const ADJUST = [
  ['Méně než 0,4 kg', 'Přidej ~250 kcal: větší shake (+200 ml mléka, +10 g arašídového másla) nebo 30 g rýže/těstovin navíc do každé krabičky'],
  ['0,5–1 kg', 'Ideální, nic neměň'],
  ['Víc než 1,2 kg', 'Uber ~150 kcal: shake bez medu a s menším množstvím arašídového másla'],
];
export const HARD_TO_EAT = [
  'Pij u jídla méně vody, pij až po něm.',
  'Přidávej kalorie, které nejsou vidět: lžíce oleje navíc do krabičky (+90 kcal), víc sýra, plnotučné mléko místo vody.',
  'Rozděl shake na dvě poloviny během dne.',
];
export const AFTER = 'Po 8 týdnech: srovnej průměrnou váhu s týdnem 1 – podle výsledku uprav kalorie a obměň recepty na další blok.';

export const recipe = id => RECIPES.find(r => r.id === id);

// Co jíst v daný den podle plánu
export function planFor(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd = date.getDay(); // 0 ne
  const start = new Date(2026, 9, 26);
  const end = new Date(2026, 11, 20);
  if (date < new Date(2026, 9, 25)) return { status: 'before', days: Math.round((new Date(2026, 9, 25) - date) / 86400000), cook: WEEKS[0].sun };
  if (date > end) return { status: 'after' };
  // týden, do kterého den patří (po–ne)
  const monday = new Date(date); monday.setDate(date.getDate() - ((wd + 6) % 7));
  const idx = Math.round((monday - start) / (7 * 86400000));
  const week = WEEKS[idx];
  const next = WEEKS[idx + 1];
  if (wd === 0) return { status: 'weekend', week, cookToday: next ? next.sun : null, nextWeek: next };
  if (!week) return { status: 'before', days: 0, cook: WEEKS[0].sun };
  if (wd === 6) return { status: 'weekend', week };
  const pair = wd <= 3 ? week.sun : week.wed;
  return { status: 'on', week, lunch: recipe(pair[0]), dinner: recipe(pair[1]), cookToday: wd === 3 ? week.wed : null };
}
