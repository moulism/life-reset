// Knihovna – počty stran jsou orientační, dají se přepsat. Shrnutí jsou vlastními slovy.
export const BOOKS = [
  { title: 'Mnich, který prodal své ferrari', author: 'Robin Sharma', pages: 200, color: '#FF9F43', q: 'Mnich který prodal své ferrari',
    summary: 'Úspěšný právník po kolapsu odejde do Himálaje a vrací se s jednoduchým systémem: ovládni myšlenky, měj jasný cíl, dodržuj ranní rituály a chraň svůj čas. Bajka o tom, že klid a disciplína jsou dovednosti.',
    ideas: ['Ranní rituál nastaví celý den', 'Myšlenky jsou zahrada – co pěstuješ, to roste', 'Jasný cíl + každodenní malý krok', 'Čas je nejcennější zdroj, ne peníze'] },
  { title: 'Atomic Habits', author: 'James Clear', pages: 320, color: '#E0B65A', q: 'Atomic Habits',
    summary: 'Malé návyky, které se sčítají jako složený úrok. Kniha dává 4 pravidla: udělej to zřejmé, lákavé, snadné a uspokojivé – a obráceně pro zlozvyky. Hlavní je identita: „jsem člověk, který…“.',
    ideas: ['Zlepši se o 1 % denně', 'Systém je víc než cíl', 'Návyk = signál → touha → reakce → odměna', 'Změň identitu, ne jen chování', 'Pravidlo 2 minut na začátek'] },
  { title: 'Rich Dad, Poor Dad', author: 'Robert T. Kiyosaki', pages: 336, color: '#B07CFF', q: 'Rich Dad Poor Dad',
    summary: 'Dva pohledy na peníze: táta, který pracuje pro peníze, a táta, který nechává peníze pracovat pro sebe. Klíčové je rozlišit aktiva (přinášejí peníze) a pasiva (berou je) a učit se finanční gramotnosti.',
    ideas: ['Aktivum ti dává peníze, pasivum bere', 'Bohatí kupují aktiva, ne věci', 'Nepracuj jen pro peníze, pracuj pro znalosti', 'Finanční gramotnost se ve škole neučí'] },
  { title: 'The Psychology of Money', author: 'Morgan Housel', pages: 256, color: '#3DDC97', q: 'Psychology of Money',
    summary: 'O penězích nerozhoduje inteligence, ale chování. Krátké kapitoly o trpělivosti, složeném úroku, rezervě a o tom, kdy je „dost“. Bohatství je to, co neutratíš.',
    ideas: ['Bohatství je to, co nevidíš – neutracené peníze', 'Složený úrok potřebuje čas', 'Měj rezervu na nečekané', 'Definuj, co je pro tebe „dost“'] },
  { title: 'Tiny Habits', author: 'BJ Fogg', pages: 320, color: '#4FD8FF', q: 'Tiny Habits',
    summary: 'Chování = motivace × schopnost × spouštěč. Místo velkých předsevzetí udělej návyk směšně malým, navaž ho na něco, co už děláš („po čištění zubů…“), a hned se odměň dobrým pocitem.',
    ideas: ['Udělej návyk co nejmenší', '„Po tom, co …, udělám …“', 'Oslav hned po splnění', 'Neviň sebe, uprav design'] },
  { title: 'Mindset', author: 'Carol S. Dweck', pages: 320, color: '#FF6FB1', q: 'Mindset Carol Dweck',
    summary: 'Pevné nastavení mysli věří, že talent je daný; růstové věří, že se schopnosti dají vypracovat. Kdo chápe chybu jako informaci, ne jako ortel, zkouší víc a roste rychleji.',
    ideas: ['Chyba = informace, ne ortel', 'Chval úsilí a postup, ne talent', '„Ještě to neumím“ místo „neumím“', 'Výzvy jsou trénink'] },
  { title: 'Make Time', author: 'Jake Knapp & John Zeratsky', pages: 304, color: '#FF5C6C', q: 'Make Time Knapp',
    summary: 'Každý den si vyber jednu hlavní věc (Highlight), chraň se před nekonečnými aplikacemi a notifikacemi, dobij energii pohybem a spánkem a večer krátce vyhodnoť, co fungovalo.',
    ideas: ['Jeden Highlight denně', 'Odstraň „nekonečné“ aplikace z telefonu', 'Energie: pohyb, jídlo, spánek, offline', 'Večer: co fungovalo, co zítra jinak'] },
];
export const bookInfo = title => BOOKS.find(b => b.title === title) || null;
export const shopLinks = b => {
  const q = encodeURIComponent((bookInfo(b.title) || {}).q || b.title);
  return [
    ['Martinus', `https://www.martinus.cz/search?q=${q}`],
    ['Databáze knih', `https://www.databazeknih.cz/search?q=${q}`],
    ['Audiolibrix', `https://www.audiolibrix.com/cs/Search?query=${q}`],
  ];
};
