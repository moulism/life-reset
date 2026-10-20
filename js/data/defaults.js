// Výchozí hodnoty – všechno se dá později upravit v Nastavení.

export const CAL_CATS = [
  { id: 'osobni', name: 'Osobní', color: '#4FD8FF' },
  { id: 'skola', name: 'Škola', color: '#6E8BFF' },
  { id: 'unyp', name: 'UNYP', color: '#B07CFF' },
  { id: 'metromood', name: 'MetroMood', color: '#FF6FB1' },
  { id: 'andel', name: 'Anděl', color: '#E0B65A' },
  { id: 'prace', name: 'Kosatka / Republika', color: '#3DDC97' },
  { id: 'gym', name: 'Gym & fotbal', color: '#FF5C6C' },
  { id: 'dj', name: 'DJ & akce', color: '#FF9F43' },
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
  morning: ['Sklenice vody hned po probuzení', 'Snídaně (A nebo B)', 'Ustlat postel', '10 min protažení', 'Napsat 3 priority dne', 'Studená sprcha', 'Prvních 30 min bez telefonu', 'Přečíst 10 stran'],
  day: ['Krabička k obědu', 'Nabírací shake', 'Trénink nebo fotbal', '2,5–3 l vody', 'Hodina práce na side hustle', 'Škola – úkoly a učení'],
  evening: ['Krabička k večeři', 'Zápis do deníku', 'Připravit věci na zítřek', 'Číst 15 min', 'Telefon pryč do 23:00', 'Zkontrolovat finance za den'],
};

export const HUSTLE_SUGGEST = [
  { name: 'MetroMood', color: '#FF6FB1', desc: 'Streetwear značka · metromood.store', link: 'https://metromood.store',
    goals: [
      { text: 'Strategie relaunche schválená tátou', target: 1, current: 0, unit: '' },
      { text: 'Obsah na IG + TikTok týdně', target: 3, current: 0, unit: 'postů' },
      { text: 'Objednávky mimo kamarády', target: 20, current: 0, unit: 'obj.' },
    ],
    ideas: ['Propojit MetroMood s akcemi v Anděl', 'Drop 01 denim – plán na jaro'] },
  { name: 'Anděl', color: '#E0B65A', desc: 'Café · Music Club · Dvorek · Bistro · Station – Bezručova 7, Plzeň', link: '',
    goals: [
      { text: 'Program akcí na příští měsíc', target: 1, current: 0, unit: '' },
      { text: 'Web Anděl Plzeň spuštěný', target: 1, current: 0, unit: '' },
      { text: 'Menu Anděl Bistro hotové', target: 1, current: 0, unit: '' },
    ],
    ideas: [] },
  { name: 'Kosatka', color: '#3DDC97', desc: 'Kemp Hracholusky', link: '', goals: [], ideas: [] },
  { name: 'Republika', color: '#FF9F43', desc: '', link: '', goals: [], ideas: [] },
  { name: 'DJing', color: '#B07CFF', desc: 'Sety, akce, příprava', link: '', goals: [], ideas: [] },
];

export const GYM_TEMPLATES = [
  { name: 'Push', exercises: ['Bench press', 'Tlaky s jednoručkami na šikmé', 'Tlaky nad hlavu', 'Upažování', 'Dipy', 'Triceps na kladce'] },
  { name: 'Pull', exercises: ['Shyby', 'Přítahy v předklonu', 'Stahování kladky', 'Face pulls', 'Bicepsový zdvih', 'Kladivové zdvihy'] },
  { name: 'Legs', exercises: ['Dřep', 'Rumunský mrtvý tah', 'Leg press', 'Výpady', 'Zakopávání', 'Výpony'] },
  { name: 'Full body', exercises: ['Dřep', 'Bench press', 'Přítahy v předklonu', 'Tlaky nad hlavu', 'Plank'] },
];

export const SCHOOLS = ['VOŠ a SPŠE Plzeň (4.I)', 'UNYP – Business Administration'];

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
