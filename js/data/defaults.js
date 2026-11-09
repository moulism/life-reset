// Výchozí hodnoty – všechno se dá později upravit v Nastavení.

export const CAL_CATS = [
  { id: 'osobni', name: 'Osobní', color: '#4FD8FF' },
  { id: 'skola', name: 'Škola', color: '#6E8BFF' },
  { id: 'prace', name: 'Práce', color: '#3DDC97' },
  { id: 'projekty', name: 'Projekty', color: '#FF6FB1' },
  { id: 'sport', name: 'Sport', color: '#FF5C6C' },
  { id: 'akce', name: 'Akce & přátelé', color: '#FF9F43' },
];

export const FIN_OUT = [
  { id: 'jidlo', name: 'Jídlo & nákup', color: '#3DDC97' },
  { id: 'doprava', name: 'Doprava', color: '#6E8BFF' },
  { id: 'zabava', name: 'Zábava & párty', color: '#FF6FB1' },
  { id: 'obleceni', name: 'Oblečení', color: '#B07CFF' },
  { id: 'gym', name: 'Gym & suplementy', color: '#FF5C6C' },
  { id: 'skola', name: 'Škola', color: '#4FD8FF' },
  { id: 'predplatne', name: 'Předplatné & apky', color: '#9AA7B4' },
  { id: 'business', name: 'Business', color: '#E0B65A' },
  { id: 'ostatni', name: 'Ostatní', color: '#FF9F43' },
];
export const FIN_IN = [
  { id: 'vyplata', name: 'Výplata', color: '#3DDC97' },
  { id: 'business', name: 'Business', color: '#E0B65A' },
  { id: 'darek', name: 'Dárky', color: '#FF6FB1' },
  { id: 'ostatni', name: 'Ostatní', color: '#9AA7B4' },
];

export const ROUTINE_SUGGEST = {
  morning: ['Sklenice vody hned po probuzení', 'Snídaně', 'Ustlat postel', '10 min protažení', 'Napsat 3 priority dne', 'Studená sprcha', 'Prvních 30 min bez telefonu', 'Přečíst 10 stran'],
  day: ['Oběd z krabičky', 'Trénink', '2,5–3 l vody', 'Hodina práce na projektu', 'Škola – úkoly a učení', '15 min kliky'],
  evening: ['Večeře', 'Zápis do deníku', 'Připravit věci na zítřek', 'Číst 15 min', 'Telefon pryč do 23:00', 'Zkontrolovat finance za den'],
};

// Návrhy projektů v průvodci – každý si je pojmenuje sám.
export const HUSTLE_SUGGEST = [];

export const GYM_TEMPLATES = [
  { name: 'Push', exercises: ['Bench press', 'Tlaky s jednoručkami na šikmé', 'Tlaky nad hlavu', 'Upažování', 'Dipy', 'Triceps na kladce'] },
  { name: 'Pull', exercises: ['Shyby', 'Přítahy v předklonu', 'Stahování kladky', 'Face pulls', 'Bicepsový zdvih', 'Kladivové zdvihy'] },
  { name: 'Legs', exercises: ['Dřep', 'Rumunský mrtvý tah', 'Leg press', 'Výpady', 'Zakopávání', 'Výpony'] },
  { name: 'Full body', exercises: ['Dřep', 'Bench press', 'Přítahy v předklonu', 'Tlaky nad hlavu', 'Plank'] },
];

export const SCHOOLS = [];

export const JOURNAL_PROMPTS = [
  'Co dnes posunulo věci dopředu?',
  'Za co jsem dnes vděčný?',
  'Co bych udělal jinak, kdyby šel den znovu?',
  'Kdy jsem se dnes cítil nejvíc v klidu?',
  'Jaký jeden krok udělám zítra pro svůj největší cíl?',
  'Co mě dnes stálo nejvíc energie – a stálo to za to?',
  'Co jsem se dnes naučil?',
];

export const SHOP_CATS = ['Maso & ryby', 'Mléčné & vejce', 'Pečivo', 'Ovoce & zelenina', 'Trvanlivé', 'Mražené', 'Koření & omáčky', 'Ostatní'];

// ---------- moduly ----------
// core = vždy zapnuté. Ostatní si každý uživatel zapne v průvodci nebo v Nastavení → Moduly.
export const MODULES = [
  { id: 'week', name: 'Týden & hodiny', ic: 'clock', c: '#4FD8FF', desc: 'Rozvrh týdne, bloky a rozpočet hodin (plán vs. skutečnost)', def: true },
  { id: 'habits', name: 'Návyky', ic: 'bolt', c: '#E0B65A', desc: 'Denní body k odškrtnutí – ráno, přes den, večer', def: true },
  { id: 'tasks', name: 'Úkoly', ic: 'tasks', c: '#6E8BFF', desc: 'Úkoly s termínem a prioritou', def: true },
  { id: 'calendar', name: 'Kalendář', ic: 'calendar', c: '#4FD8FF', desc: 'Události, opakování, export do iPhonu', def: true },
  { id: 'finance', name: 'Finance', ic: 'wallet', c: '#3DDC97', desc: 'Příjmy, výdaje, účty a cash flow', def: true },
  { id: 'notes', name: 'Poznámky', ic: 'note', c: '#2EC4B6', desc: 'Poznámky se složkami, fotkami a soubory', def: true },
  { id: 'shop', name: 'Nákupy & wishlist', ic: 'cart', c: '#FF9F43', desc: 'Nákupní seznam a přání s odkazem na e-shop', def: true },
  { id: 'gym', name: 'Trénink', ic: 'gym', c: '#FF5C6C', desc: 'Šablony tréninků, série a váhy z minula', def: true },
  { id: 'food', name: 'Jídlo', ic: 'food', c: '#3DDC97', desc: 'Kalorie, bílkoviny, recepty a vaření', def: false },
  { id: 'school', name: 'Škola', ic: 'school', c: '#B07CFF', desc: 'Předměty, materiály a termíny', def: false },
  { id: 'hustles', name: 'Projekty', ic: 'briefcase', c: '#FF6FB1', desc: 'Vlastní projekty s cíli, úkoly a penězi', def: false },
  { id: 'diary', name: 'Deník', ic: 'diary', c: '#B07CFF', desc: 'Večerní zápis, nálada a spánek', def: true },
  { id: 'books', name: 'Knihy', ic: 'book', c: '#FF9F43', desc: 'Knihovna, rozečtené a přečtené', def: false },
  { id: 'archive', name: 'Archiv souborů', ic: 'folder', c: '#E0B65A', desc: 'Doklady, smlouvy a hledání ve všem', def: false },
  { id: 'friends', name: 'Přátelé & soutěž', ic: 'star', c: '#FF9F43', desc: 'Žebříček s kamarády – kdo je tento týden disciplinovanější', def: true },
  { id: 'game', name: 'XP, levely & série', ic: 'star', c: '#E0B65A', desc: 'Skóre dne, série, levely a odznaky', def: true },
];
export const defaultModules = () => MODULES.filter(m => m.def).map(m => m.id);

// Návrhy oblastí pro rozpočet hodin (týden)
export const AREA_SUGGEST = [
  { name: 'Škola', color: '#6E8BFF', budget: 15 },
  { name: 'Práce', color: '#3DDC97', budget: 10 },
  { name: 'Projekt', color: '#FF6FB1', budget: 8 },
  { name: 'Trénink', color: '#FF5C6C', budget: 4 },
  { name: 'Učení', color: '#B07CFF', budget: 5 },
  { name: 'Čtení', color: '#FF9F43', budget: 2 },
];

// Barevné styly – „hud“ (JARVIS) má odemykací témata, „clean“ má volné akcenty.
export const CLEAN_ACCENTS = [
  { id: 'blue', name: 'Modrá', color: '#2F6BFF' },
  { id: 'green', name: 'Zelená', color: '#13A36B' },
  { id: 'violet', name: 'Fialová', color: '#7B5CFF' },
  { id: 'orange', name: 'Oranžová', color: '#F2731C' },
  { id: 'graphite', name: 'Grafit', color: '#3A4250' },
];
