// Angličtina: překládá hotové obrazovky (texty, placeholdery, popisky) podle slovníku.
// Čísla v textu se nahradí znakem # a po překladu se vrátí zpět, takže sedí i texty typu „Ještě 300 kcal“.
// Uživatelská data (názvy úkolů, poznámky…) se nepřekládají – ve slovníku nejsou.
export const LANGS = [{ v: 'cs', l: 'Čeština' }, { v: 'en', l: 'English' }];
export const lang = () => { try { return localStorage.getItem('lr:lang') || 'cs'; } catch (e) { return 'cs'; } };
export function setLang(l) { try { localStorage.setItem('lr:lang', l); } catch (e) { /* */ } }

const EN = {
  // --- obecné ---
  'Dnes': 'Today', 'Včera': 'Yesterday', 'Zítra': 'Tomorrow', 'Týden': 'Week', 'Menu': 'Menu', 'Úkoly': 'Tasks', 'Peníze': 'Money', 'Kalendář': 'Calendar',
  'Poznámky': 'Notes', 'Trénink': 'Training', 'Jídlo': 'Food', 'Nákupy': 'Shopping', 'Nastavení': 'Settings', 'Domů': 'Home', 'Deník': 'Journal', 'Knihy': 'Books',
  'Škola': 'School', 'Projekty': 'Projects', 'Projekt': 'Project', 'Archiv': 'Archive', 'Finance': 'Finance', 'Návyky': 'Habits',
  'Uložit': 'Save', 'Smazat': 'Delete', 'Upravit': 'Edit', 'Zpět': 'Back', 'Dál': 'Next', 'Přidat': 'Add', 'Zavřít': 'Close', 'Hotovo': 'Done', 'Zrušit filtr': 'Clear filter',
  'Vše': 'All', 'Vše #': 'All #', 'Všechny': 'All', 'Další': 'Next', 'Teď': 'Now', 'Spustit': 'Start', 'OK': 'OK', 'Ne': 'Sun', 'Po': 'Mon', 'Út': 'Tue', 'St': 'Wed', 'Čt': 'Thu', 'Pá': 'Fri', 'So': 'Sat',
  'Uloženo': 'Saved', 'uloženo': 'saved', 'Zapsáno': 'Logged', 'Přesunout': 'Move', 'Vrátit': 'Undo', 'Detail': 'Details', 'Skrýt': 'Hide', 'Vyčistit': 'Clear', 'Připnout': 'Pin', 'Připnuto': 'Pinned',
  'Opravdu smazat? Tohle nejde vrátit.': 'Really delete? This can’t be undone.', 'Potvrzení': 'Confirm', 'Volitelné': 'Optional', 'Výchozí': 'Default', 'Aktivní': 'Active', 'aktivní': 'active',
  'Název': 'Name', 'Název (volitelné)': 'Name (optional)', 'Barva': 'Colour', 'Poznámka': 'Note', 'Priorita': 'Priority', 'Kategorie': 'Category', 'Datum': 'Date', 'Den': 'Day', 'Dny': 'Days',
  'Od': 'From', 'Do': 'To', 'do': 'to', 'Místo': 'Place', 'Místa': 'Places', 'Kdekoli': 'Anywhere', 'Oblast': 'Area', 'Termín': 'Due', 'Vysoká': 'High', 'Střední': 'Medium', 'Nízká': 'Low',
  'Nic tady není.': 'Nothing here.', 'Nic.': 'Nothing.', 'Zatím nic.': 'Nothing yet.', 'Bez názvu': 'Untitled', 'Bez kategorie': 'No category', 'Ostatní': 'Other', 'Celý den': 'All day', 'celý den': 'all day',
  'Hlavní navigace': 'Main navigation', 'Life Reset': 'Life Reset', 'Načítám tvůj den': 'Loading your day', 'Spouštím systémy': 'Starting systems',
  'Předchozí den': 'Previous day', 'Další den': 'Next day', 'Předchozí týden': 'Previous week', 'Další týden': 'Next week', 'Předchozí měsíc': 'Previous month', 'Další měsíc': 'Next month', 'Tento týden': 'This week', 'tento měsíc': 'this month',
  'Pondělí': 'Monday', 'Úterý': 'Tuesday', 'Středa': 'Wednesday', 'Čtvrtek': 'Thursday', 'Pátek': 'Friday', 'Sobota': 'Saturday', 'Neděle': 'Sunday',
  'Ráno': 'Morning', 'Přes den': 'During the day', 'Večer': 'Evening', 'každý den': 'every day', 'Každý den': 'Every day', 'Pracovní dny': 'Weekdays',
  // --- přihlášení ---
  'Přihlásit': 'Sign in', 'Nový účet': 'New account', 'E-mail': 'Email', 'Heslo': 'Password', 'Aspoň # znaků': 'At least # characters', 'Vytvořit účet': 'Create account', 'Zapomenuté heslo?': 'Forgot password?',
  'Ukázat heslo': 'Show password', 'Poslat e-mail': 'Send email', 'Zpět na přihlášení': 'Back to sign in', 'Jiný e-mail': 'Different email', 'Vložit ze schránky': 'Paste from clipboard', 'Potvrdit': 'Confirm',
  'Pošlu ti e-mail s odkazem. Po přihlášení si v Nastavení → Účet nastavíš nové heslo.': 'I’ll email you a link. After signing in, set a new password in Settings → Account.',
  'E-mail je na cestě na': 'Email is on its way to', '(mrkni i do spamu).': '(check spam too).', 'podrž prst na odkazu': 'press and hold the link', 'Kopírovat odkaz': 'Copy link',
  'Vlož ho sem a dej Potvrdit.': 'Paste it here and tap Confirm.', 'Odkaz (nebo kód) z e-mailu': 'Link (or code) from the email', 'Poslat znovu': 'Send again', 'Moment…': 'One moment…',
  'Zadej e-mail': 'Enter your email', 'Heslo musí mít aspoň # znaků': 'Password must be at least # characters', 'Přihlášeno': 'Signed in', 'Účet vytvořen': 'Account created', 'E-mail odeslán': 'Email sent',
  'Potvrď e-mail – zkopíruj odkaz z e-mailu sem.': 'Confirm your email – copy the link from the email here.', 'Vlož celý odkaz z e-mailu': 'Paste the whole link from the email',
  'Vlož odkaz ručně – podrž prst v poli → Vložit': 'Paste the link manually – press and hold in the field → Paste',
  'Tvůj týden, návyky, úkoly, peníze, trénink a poznámky na jednom místě. Každý den skóre a série.': 'Your week, habits, tasks, money, training and notes in one place. A daily score and streaks.',
  'Každý účet vidí jen svoje data.': 'Each account sees only its own data.',
  'Špatný e-mail nebo heslo. Zkus přihlášení kódem z e-mailu.': 'Wrong email or password. Try signing in with a code from email.', 'Tenhle e-mail už účet má – přihlas se heslem nebo kódem.': 'This email already has an account – sign in with password or code.',
  'Kód je špatný nebo vypršel. Pošli si nový.': 'The code is wrong or expired. Send a new one.', 'Moc pokusů za sebou – počkej minutu a zkus znovu.': 'Too many attempts – wait a minute and try again.',
  'Nejde se spojit se serverem – jsi online?': 'Can’t reach the server – are you online?', 'E-mail ještě není potvrzený – přihlas se kódem z e-mailu.': 'Email not confirmed yet – sign in with the code from the email.',
  'Heslo je moc krátké (aspoň # znaků).': 'Password is too short (at least # characters).',
  // --- průvodce ---
  'Nastavení profilu': 'Profile setup', 'Ahoj!': 'Hi!', 'Jak ti máme říkat? Všechno jde později změnit.': 'What should we call you? You can change everything later.', 'Jméno': 'Name', 'Napiš jméno': 'Enter your name',
  'Přivítání při spuštění (volitelné)': 'Startup greeting (optional)', 'Uvítání při spuštění (volitelné)': 'Startup greeting (optional)', '„Welcome, …“': '“Welcome, …”', 'Např. Matyáš': 'e.g. Alex', 'Např. Master M': 'e.g. Master A',
  'Vyber styl': 'Choose a style', 'Kdykoli přepneš v Nastavení → Vzhled.': 'Switch any time in Settings → Appearance.', 'JARVIS': 'JARVIS', 'Čistý': 'Clean', 'Tmavý HUD, záře, odemykací barvy': 'Dark HUD, glow, unlockable colours',
  'Jednoduchý, světlý nebo tmavý': 'Simple, light or dark', 'Tmavý HUD, záře': 'Dark HUD, glow', 'Jednoduchý': 'Simple', 'Režim': 'Mode', 'Podle telefonu': 'Follow phone', 'Světlý': 'Light', 'Tmavý': 'Dark',
  'Modrá': 'Blue', 'Zelená': 'Green', 'Fialová': 'Purple', 'Oranžová': 'Orange', 'Grafit': 'Graphite',
  'Co chceš používat?': 'What do you want to use?', 'Zapni jen to, co opravdu budeš používat. Ostatní se schová (data nezmizí).': 'Turn on only what you’ll actually use. The rest is hidden (data stays).',
  'Denní návyky': 'Daily habits', 'Co chceš každý den odškrtnout? Vyber pár, dole přidáš vlastní.': 'What do you want to tick off every day? Pick a few, add your own below.',
  'Vlastní – ráno…': 'Your own – morning…', 'Vlastní – přes den…': 'Your own – daytime…', 'Vlastní – večer…': 'Your own – evening…',
  'Na co máš týden?': 'What is your week for?', 'Oblasti, kterým chceš dávat čas, a kolik hodin týdně na každou. V Týdnu pak appka ukáže plán proti skutečnosti.': 'Areas you want to give time to, and how many hours a week each. The Week screen then shows plan vs. reality.',
  'Už máš:': 'You already have:', 'h/týd': 'h/wk', 'Vlastní oblast (např. MetroMood)…': 'Your own area (e.g. My brand)…', 'Žiješ na dvou místech? (volitelné)': 'Living in two places? (optional)', 'Např. Praha, Plzeň': 'e.g. London, Oxford',
  'Bloky pak můžeš vázat na místo a v neděli jen řekneš, kde budeš který den.': 'Blocks can be tied to a place, and on Sunday you just say where you’ll be each day.',
  'Denní cíle jídla': 'Daily food goals', 'Klidně odhadni, upravíš později.': 'A guess is fine, you can change it later.', 'Kalorie / den': 'Calories / day', 'Bílkoviny (g)': 'Protein (g)', 'Voda (ml)': 'Water (ml)', 'Tréninků / týden': 'Workouts / week',
  'Nová verze': 'New version', 'Life Reset je teď postavený na tvém týdnu: bloky v rozvrhu, rozpočet hodin, plán vs. skutečnost. Vyber si styl a moduly, které chceš vidět. Tvoje data zůstávají.': 'Life Reset is now built around your week: schedule blocks, an hour budget, plan vs. reality. Pick a style and the modules you want. Your data stays.',
  '# modulů · # oblastí týdne.': '# modules · # week areas.', 'Další krok: v Týdnu si naklikej bloky rozvrhu (škola, práce, trénink…).': 'Next step: add your schedule blocks in Week (school, work, training…).', 'Všechno upravíš v Nastavení.': 'You can change everything in Settings.',
  'Odhlásit': 'Sign out', 'Škola': 'School', 'Práce': 'Work', 'Učení': 'Study', 'Čtení': 'Reading',
  // --- moduly ---
  'Týden & hodiny': 'Week & hours', 'Rozvrh týdne, bloky a rozpočet hodin (plán vs. skutečnost)': 'Weekly schedule, blocks and hour budget (plan vs. reality)', 'Denní body k odškrtnutí – ráno, přes den, večer': 'Daily items to tick off – morning, day, evening',
  'Úkoly s termínem a prioritou': 'Tasks with due dates and priority', 'Události, opakování, export do iPhonu': 'Events, repeats, export to iPhone', 'Příjmy, výdaje, účty a cash flow': 'Income, spending, accounts and cash flow',
  'Poznámky se složkami, fotkami a soubory': 'Notes with folders, photos and files', 'Nákupy & wishlist': 'Shopping & wishlist', 'Nákupní seznam a přání s odkazem na e-shop': 'Shopping list and wishes with shop links',
  'Šablony tréninků, série a váhy z minula': 'Workout templates, sets and last weights', 'Kalorie, bílkoviny, recepty a vaření': 'Calories, protein, recipes and cooking', 'Předměty, materiály a termíny': 'Subjects, materials and deadlines',
  'Vlastní projekty s cíli, úkoly a penězi': 'Your projects with goals, tasks and money', 'Večerní zápis, nálada a spánek': 'Evening entry, mood and sleep', 'Knihovna, rozečtené a přečtené': 'Library, reading and finished',
  'Archiv souborů': 'File archive', 'Doklady, smlouvy a hledání ve všem': 'Documents, contracts and search everything', 'XP, levely & série': 'XP, levels & streaks', 'Skóre dne, série, levely a odznaky': 'Daily score, streaks, levels and badges',
  // --- Dnes ---
  'Dobré ráno': 'Good morning', 'Dobré odpoledne': 'Good afternoon', 'Dobrý večer': 'Good evening', 'Neděle = příprava týdne': 'Sunday = plan the week',
  'Jak dopadl týden + kde budeš příští dny. # minut.': 'How the week went + where you’ll be. # minutes.', '# minut: jak dopadl týden a kde budeš příští dny.': '# minutes: how the week went and where you’ll be next.',
  'Level': 'Level', 'XP': 'XP', 'Série': 'Streak', 'do levelu #': 'to level #', 'dnešek se počítá': 'today counts', 'ještě # bodů': '# points to go', 'Bloky': 'Blocks', 'Kalorie': 'Calories',
  'Dnešní bloky': 'Today’s blocks', 'Rozvrh je prázdný.': 'Your schedule is empty.', 'Nastavit rozvrh': 'Set up schedule', 'Dnes nic v rozvrhu.': 'Nothing scheduled today.',
  'Rychlý zápis…': 'Quick capture…', 'Rychlý zápis': 'Quick capture', 'Úkoly na dnes': 'Tasks for today', 'Na dnes nic nečeká.': 'Nothing due today.', 'Všechno na dnes hotové.': 'All done for today.', 'Úkol': 'Task',
  'Dnes v kalendáři': 'Today in calendar', 'Zapsat jídlo': 'Log food', 'Bílkoviny': 'Protein', 'Voda': 'Water', 'Večerní zápis': 'Evening entry', 'Spánek minulou noc': 'Sleep last night',
  'Jak šel den? Co se povedlo, co zítra jinak?': 'How did the day go? What worked, what to change tomorrow?', 'Zatím žádné návyky.': 'No habits yet.', 'Upravit dnešní zápis': 'Edit today’s entry', 'Napsat dnešní zápis': 'Write today’s entry',
  'Zápis uložen': 'Entry saved', 'Úkol na dnes přidán': 'Task added for today', 'Uloženo do poznámek': 'Saved to notes', 'Napiš aspoň pár slov': 'Write at least a few words',
  // --- Týden ---
  'Hodiny tento týden': 'Hours this week', 'Stopky': 'Timer', 'Zapsat čas ručně': 'Log time manually', 'Klepni, na čem začínáš pracovat. Po stopnutí se čas připíše do týdne.': 'Tap what you’re starting to work on. When you stop, the time is added to your week.',
  'Stop a zapsat': 'Stop and log', 'běží od #:#': 'running since #:#', 'Zapsat čas': 'Log time', 'Blok': 'Block', 'Upravit rozvrh': 'Edit schedule', 'Příprava týdne': 'Plan the week',
  'Na tenhle den nic v rozvrhu.': 'Nothing scheduled this day.', 'Rozvrh je prázdný. Přidej bloky – škola, práce, trénink…': 'Schedule is empty. Add blocks – school, work, training…',
  'Události mimo rozvrh (lékař, akce) patří do': 'One-off events (doctor, parties) belong in', 'zbývá # h': '# h left', 'bez cíle': 'no target', 'o # h víc než plán': '# h over plan',
  'Zatím žádné oblasti.': 'No areas yet.', 'Přidej je v rozvrhu': 'Add them in the schedule', 'vynecháno': 'skipped', 'Tento': 'This one',
  'Kolik jsi reálně odmakal (minuty)': 'How long did you actually work (minutes)', 'Vynechat dnes': 'Skip today', 'Upravit blok': 'Edit block', 'Přesunout na': 'Move to',
  'Zapsat odpracovaný čas': 'Log time worked', 'Minuty': 'Minutes', 'Na čem (volitelné)': 'On what (optional)', 'Zadej minuty': 'Enter minutes',
  'Rozvrh týdne': 'Weekly schedule', 'Tvůj ideální týden. Každý blok se opakuje ve vybrané dny. Bez času = flexibilní blok (jen délka), třeba „Práce # h“ kdykoli během dne.': 'Your ideal week. Each block repeats on the chosen days. No time = flexible block (just a length), e.g. “Work # h” any time that day.',
  'Oblasti a cíl hodin': 'Areas and hour targets', 'Začni oblastmi – na co chceš mít čas (škola, práce, projekt, trénink…).': 'Start with areas – what you want time for (school, work, project, training…).',
  'Volno.': 'Free.', 'Do kalendáře v iPhonu': 'To iPhone Calendar', 'Exportovat rozvrh (.ics)': 'Export schedule (.ics)', 'Rozvrh nemá bloky s časem': 'Schedule has no timed blocks',
  'Stáhne rozvrh (bloky s časem) jako opakované události. Na iPhonu soubor otevři → Přidat vše. Připomínky pak hlídá systém, i když je appka zavřená.': 'Downloads your schedule (timed blocks) as repeating events. On iPhone open the file → Add All. Reminders then come from the system even when the app is closed.',
  'Když žiješ na dvou místech (např. Praha a Plzeň), bloky můžeš vázat na místo. Ukážou se jen ve dny, kdy tam jsi.': 'If you live in two places, you can tie blocks to a place. They only show on days you’re there.',
  'Kde bývám obvykle': 'Where I usually am', 'Nejdřív přidej oblast': 'Add an area first', 'Nová oblast': 'New area', 'Upravit oblast': 'Edit area', 'Cíl hodin za týden': 'Target hours per week',
  'Nech prázdné = cíl se spočítá z bloků v rozvrhu': 'Leave empty = target comes from scheduled blocks', 'Nový blok': 'New block', 'Délka bez času (min)': 'Length without time (min)', 'Jen když nevyplníš Od–Do': 'Only if From–To is empty',
  'Připomínka': 'Reminder', 'Bez připomínky': 'No reminder', 'V čas začátku': 'At start time', '# min předem': '# min before', 'Vyber aspoň jeden den': 'Pick at least one day', 'Vyber oblast': 'Pick an area', 'Vyplň Od i Do, nebo nic': 'Fill both From and To, or neither',
  'Nedělní příprava': 'Sunday planning', 'Hodiny': 'Hours', 'Plnění': 'Completion', 'Nejlíp:': 'Best:', '. Nejvíc zaostalo:': '. Fell behind most:', '– zkus mu příští týden dát pevný čas.': '– try giving it a fixed time next week.',
  'Kde budeš příští týden': 'Where you’ll be next week', '# priority na příští týden': '# priorities for next week', 'Přidat je jako úkoly na pondělí': 'Add them as tasks for Monday', 'Týden připravený': 'Week planned',
  'Např. Odevzdat esej': 'e.g. Hand in essay', 'Např. #× trénink': 'e.g. #× workout', 'Např. Drop # – focení': 'e.g. Photo shoot',
  'Např. Škola, Práce, MetroMood': 'e.g. School, Work, My brand', 'Např. Přednášky, Gym – nohy, Focení': 'e.g. Lectures, Gym – legs, Shoot', 'cíl # h / týden': 'target # h / week', 'v rozvrhu # h': '# h scheduled', 'pozastaveno': 'paused',
  // --- Finance ---
  'Přehled': 'Overview', 'Pohyby': 'Transactions', 'Pravidelné': 'Recurring', 'Trend': 'Trend', 'Celkem na účtech': 'Total in accounts', 'Začátek měsíce': 'Start of month', 'Příjmy': 'Income', 'Výdaje': 'Spending',
  'Konec měsíce': 'End of month', 'Ještě odejde (pravidelné)': 'Still going out (recurring)', 'Ještě přijde': 'Still coming in', 'Volné do konce měsíce': 'Free until month end', 'Příjem': 'Income', 'Výdaj': 'Expense', 'Převod': 'Transfer',
  'Účty': 'Accounts', 'Účet': 'Account', '· hlavní': '· main', 'nepočítá se do celku': 'not in total', 'Nadcházející platby': 'Upcoming payments', 'Import výpisu z banky': 'Import bank statement',
  'Přidej svoje účty': 'Add your accounts', 'Přidat účet': 'Add account', 'Zadej, kolik máš teď na kartě, v hotovosti a na spoření. Appka pak hlídá zůstatek, celkový majetek a kolik ti zbyde do konce měsíce.': 'Enter what you have on your card, in cash and in savings now. The app then tracks your balance, net worth and what’s left until month end.',
  'Žádné. Přidej nájem, předplatné nebo výplatu jako pravidelnou platbu – zapíše se sama.': 'None. Add rent, subscriptions or salary as a recurring payment – it logs itself.',
  'Pravidelně odchází': 'Recurring out', 'Pravidelně přichází': 'Recurring in', 'Rozdíl / měsíc': 'Difference / month', 'Pravidelné platby': 'Recurring payments',
  'Nájem, telefon, Spotify, gym, výplata… Zadej jednou a appka je každý měsíc zapíše sama.': 'Rent, phone, Spotify, gym, salary… Enter once and the app logs them every month.',
  'měsíčně': 'monthly', 'týdně': 'weekly', 'ročně': 'yearly', 'jen připomenout': 'reminder only', 'zapisuje se samo': 'logs automatically', 'Nová pravidelná platba': 'New recurring payment', 'Upravit pravidelnou platbu': 'Edit recurring payment',
  'Typ': 'Type', 'Částka (Kč)': 'Amount (CZK)', 'Jak často': 'How often', 'Každý měsíc': 'Every month', 'Každý týden': 'Every week', 'Každý rok': 'Every year', 'Den v měsíci': 'Day of month', 'Měsíc (u ročních)': 'Month (yearly)',
  'Den v týdnu (u týdenních)': 'Weekday (weekly)', 'Zapisovat automaticky': 'Log automatically', 'Zadej částku': 'Enter an amount', 'Např. Nájem, Spotify, Výplata': 'e.g. Rent, Spotify, Salary',
  'Kvůli kratším měsícům jde nastavit den #–#. Už zapsané platby zůstanou, i když tuhle smažeš.': 'Because of short months, days #–# only. Already logged payments stay even if you delete this.',
  'Nový účet': 'New account', 'Upravit účet': 'Edit account', 'Druh': 'Kind', 'Účet / karta': 'Account / card', 'Hotovost': 'Cash', 'Spoření': 'Savings', 'Jiné': 'Other', 'Kolik tam máš teď (Kč)': 'Balance now (CZK)', 'Počáteční zůstatek (Kč)': 'Starting balance (CZK)',
  'Ke dni': 'As of', 'Hlavní účet (předvybraný u plateb)': 'Main account (preselected for payments)', 'Nepočítat do celkového zůstatku': 'Exclude from total balance', 'Např. Karta, Hotovost, Spořák': 'e.g. Card, Cash, Savings',
  'Zůstatek = počáteční částka + všechny příjmy − výdaje od toho dne. Když nesedí, oprav tu počáteční částku.': 'Balance = starting amount + all income − spending since that day. If it’s off, fix the starting amount.',
  'Nový výdaj': 'New expense', 'Nový příjem': 'New income', 'Upravit pohyb': 'Edit transaction', 'Za co / od koho': 'For what / from whom', 'Např. Albert, výplata, nájem': 'e.g. Groceries, salary, rent', 'Z účtu': 'From account', 'Na účet': 'To account', 'Vyber dva různé účty': 'Pick two different accounts',
  'pravidelná': 'recurring', 'V internetovém bankovnictví stáhni pohyby jako': 'In your online banking download transactions as', 'Vybrat soubor CSV': 'Choose CSV file', 'Datum': 'Date', 'Částka': 'Amount', 'Protistrana': 'Counterparty', 'Zpráva / popis': 'Message / description',
  '(George, KB, ČSOB, Air Bank, Fio, mBank, Revolut…) a vyber soubor. Duplicity se přeskočí, kategorie se odhadnou a appka se je učí podle toho, jak je opravíš.': '(most banks and Revolut) and choose the file. Duplicates are skipped, categories are guessed and the app learns from your corrections.',
  'Nenašel jsem žádné pohyby – zkontroluj sloupce.': 'No transactions found – check the columns.', 'Na účet': 'To account',
  'Bilance': 'Balance', 'Kam jdou peníze': 'Where money goes', 'Výdaje podle kategorií': 'Spending by category', 'Výdaje po dnech': 'Spending by day', 'Rozpočty': 'Budgets', 'Nastavit měsíční rozpočet': 'Set monthly budget',
  'Tento měsíc zatím nic. Zapisuj hned po zaplacení – trvá to # sekund.': 'Nothing this month yet. Log right after paying – it takes # seconds.', 'Příjmy vs. výdaje': 'Income vs. spending', 'Ø příjmy / měsíc': 'Avg income / month', 'Ø výdaje / měsíc': 'Avg spending / month',
  'Rozpočet na výdaje': 'Spending budget', 'Celkový měsíční rozpočet na výdaje (Kč)': 'Total monthly spending budget (CZK)', 'Rozpočty kategorií jsou volitelné – ukážou se jako lišta u grafu.': 'Category budgets are optional – they show as a bar by the chart.', 'Rozpočet uložen': 'Budget saved',
  'Výplata': 'Salary', 'Doprava': 'Transport', 'Oblečení': 'Clothes', 'Předplatné & apky': 'Subscriptions & apps', 'Zábava & párty': 'Fun & parties', 'Gym & suplementy': 'Gym & supplements', 'Dárky': 'Gifts', 'Business': 'Business', 'Jídlo & nákup': 'Food & groceries',
  'Průměr # Kč / den.': 'Average # CZK / day.',
  // --- Nákupy / wishlist ---
  'Nákupní seznam': 'Shopping list', 'Wishlist': 'Wishlist', 'Přidat položku… (např. Kuřecí prsa # kg)': 'Add item… (e.g. Chicken breast # kg)', 'Seznam je prázdný. Přidej, co potřebuješ koupit.': 'The list is empty. Add what you need to buy.',
  'V košíku #': 'In cart #', 'Odstranit všechno, co máš v košíku?': 'Remove everything in your cart?', 'Mám': 'Got it', 'Tip: nákup zapiš jako výdaj na Dnes → ikona peněženky': 'Tip: log the purchase as an expense on Today → wallet icon',
  'Vlož odkaz z e-shopu nebo napiš, co chceš': 'Paste a shop link or type what you want', 'Vložit odkaz ze schránky': 'Paste link from clipboard', 'Odkaz nebo název': 'Link or name',
  'Wishlist je prázdný. V e-shopu zkopíruj odkaz na věc a vlož ho sem – načte se název, fotka i cena.': 'Your wishlist is empty. Copy a product link in a shop and paste it here – name, photo and price load automatically.',
  'Musím mít': 'Must have', 'Chci': 'Want', 'Jednou': 'Someday', 'E-shop': 'Shop', 'Koupeno': 'Bought', 'cena ?': 'price ?', 'Zkontrolovat cenu': 'Check price', 'Cena beze změny': 'Price unchanged', 'Načítám odkaz…': 'Loading link…',
  'Nové přání': 'New wish', 'Upravit přání': 'Edit wish', 'Co': 'What', 'Cena (Kč)': 'Price (CZK)', 'Velikost / varianta': 'Size / variant', 'Odkaz': 'Link', 'Obrázek (odkaz)': 'Image (link)', 'načte se samo': 'loads automatically', 'Přidáno na wishlist': 'Added to wishlist',
  'Schránka je prázdná nebo nepovolená – vlož odkaz do pole (podrž prst → Vložit)': 'Clipboard empty or blocked – paste the link into the field (press and hold → Paste)', 'Pro načtení odkazu musíš být online a přihlášený.': 'You must be online and signed in to load a link.',
  'Odkaz se nepodařilo načíst': 'Couldn’t load the link', 'Všechno už na seznamu je': 'Everything is already on the list', 'Přidáno do nákupního seznamu': 'Added to the shopping list',
  'Ovoce & zelenina': 'Fruit & veg', 'Maso & ryby': 'Meat & fish', 'Mléčné & vejce': 'Dairy & eggs', 'Pečivo': 'Bread', 'Trvanlivé': 'Pantry', 'Mražené': 'Frozen', 'Koření & omáčky': 'Spices & sauces',
  // --- Poznámky ---
  'Hledat v poznámkách': 'Search notes', 'Složka': 'Folder', 'Složky': 'Folders', 'Nová složka': 'New folder', 'Upravit složku': 'Edit folder', 'Např. Škola, Nápady, Recepty': 'e.g. School, Ideas, Recipes',
  'Žádné poznámky.': 'No notes.', 'Žádné poznámky. Začni první.': 'No notes. Start the first one.', 'Nová poznámka': 'New note', 'Nadpis': 'Title', 'Piš…': 'Write…', 'Štítky (oddělené čárkou)': 'Tags (comma separated)', 'nápad, metromood, škola': 'idea, project, school',
  'Přílohy': 'Attachments', 'Vyfotit': 'Take photo', 'Fotky': 'Photos', 'Soubor / PDF': 'File / PDF', 'Fotky z tabule, PDF z přednášky, cokoli. Ukládá se do tvého cloudu.': 'Whiteboard photos, lecture PDFs, anything. Stored in your cloud.',
  'Smazat poznámku?': 'Delete note?', 'Poznámka nenalezena.': 'Note not found.', 'Ukládá se automaticky · vytvořeno po #. #.': 'Saves automatically · created Mon #/#',
  // --- Trénink ---
  'Začít trénink': 'Start workout', 'Upravit šablony': 'Edit templates', 'Prázdný': 'Empty', 'vlastní cviky': 'your own exercises', 'Sport': 'Sport', 'fotbal, běh, cokoli': 'football, running, anything', 'Tréninky po týdnech': 'Workouts per week',
  'Tělesná váha': 'Body weight', 'Zapsat váhu': 'Log weight', 'Važ se #× týdně ráno nalačno – graf ukáže trend.': 'Weigh yourself #× a week in the morning – the chart shows the trend.', 'Osobní rekordy': 'Personal records', 'Historie #': 'History #',
  'Rozpracovaný trénink': 'Workout in progress', 'Zatím žádný trénink.': 'No workouts yet.', 'Minule:': 'Last time:', 'Stejně jako minule': 'Same as last time', 'kg': 'kg', 'Opak.': 'Reps', 'Přidat cvik': 'Add exercise', 'Dokončit trénink': 'Finish workout', 'Uložit trénink': 'Save workout',
  'Poznámka – jak to šlo, bolesti, co příště': 'Note – how it went, pain, what next', 'Trénink uložen. Dobrá práce.': 'Workout saved. Good job.', 'Smazat tento trénink?': 'Delete this workout?', 'Šablony tréninků': 'Workout templates', 'Nová šablona': 'New template', 'Upravit šablonu': 'Edit template',
  'Cviky (každý na nový řádek)': 'Exercises (one per line)', 'Váha (kg)': 'Weight (kg)', 'Váha': 'Weight', 'Tento týden': 'This week', 'Celkem': 'Total', 'Minut': 'Minutes', 'Trénink nenalezen.': 'Workout not found.', 'Tréninky': 'Workouts',
  // --- Jídlo ---
  'Tracker': 'Tracker', 'Recepty': 'Recipes', 'Grafy': 'Charts', 'Plán': 'Plan', 'Pravidla': 'Rules', 'Rychle přidat': 'Quick add', 'Podle plánu': 'From plan', 'Moje jídla': 'My foods', 'Moje recepty': 'My recipes', 'Vlastní jídlo': 'Custom food',
  'Snědeno': 'Eaten', 'Zatím nic. Přidej jídlo výš.': 'Nothing yet. Add food above.', 'Cíl na dnes splněn.': 'Today’s goal reached.', 'Ještě # kcal.': '# kcal to go.', 'Snídaně': 'Breakfast', 'Oběd': 'Lunch', 'Svačina / shake': 'Snack / shake', 'Večeře': 'Dinner',
  'Recept': 'Recipe', 'Nový recept': 'New recipe', 'Upravit recept': 'Edit recipe', 'kcal / porce': 'kcal / serving', 'Bílkoviny / porce (g)': 'Protein / serving (g)', 'Suroviny na # porci (každá na řádek)': 'Ingredients for # serving (one per line)', 'Postup': 'Method',
  'Ulož si, co vaříš. Suroviny pak jedním klepnutím pošleš do nákupního seznamu (vynásobené počtem porcí) a porci zapíšeš do trackeru.': 'Save what you cook. Send ingredients to the shopping list in one tap (scaled by servings) and log a serving in the tracker.',
  'Do nákupu': 'To shopping', 'Snědl jsem porci': 'I ate a serving', 'Suroviny': 'Ingredients', 'Porce': 'Servings', 'Upravit jídlo': 'Edit food', 'Kdy': 'When', 'Uložit do mých jídel (příště na # klik)': 'Save to my foods (# tap next time)',
  'Kalorie – # dní': 'Calories – # days', 'Bílkoviny – # dní': 'Protein – # days', 'Průměr # dní': '# day average', 'Splněné dny': 'Days hit', 'Úpravy podle váhy': 'Adjust by weight',
  'Zapnout plán krabiček na nabírání (# týdnů)': 'Turn on the bulking meal-prep plan (# weeks)', 'Vypnout plán krabiček na nabírání': 'Turn off the bulking meal-prep plan',
  'Potřebuju vážení aspoň ze # týdnů (#× týdně ráno nalačno). Pak ti řeknu, jestli přidat nebo ubrat.': 'I need weigh-ins from at least # weeks (#× a week, mornings). Then I’ll tell you whether to eat more or less.',
  // --- Úkoly / kalendář / deník ---
  'Nový úkol': 'New task', 'Upravit úkol': 'Edit task', 'Co je potřeba udělat': 'What needs doing', 'Bez termínu': 'No due date', 'Po termínu': 'Overdue', 'S termínem': 'With due date', 'Žádné otevřené úkoly.': 'No open tasks.', 'Nedávno hotové': 'Recently done',
  'Žádné úkoly. Čistý stůl.': 'No tasks. Clean desk.', 'Úkol uložen': 'Task saved', 'Označit jako nehotové': 'Mark as not done', 'Nová událost': 'New event', 'Upravit událost': 'Edit event', 'Událost': 'Event', 'Události': 'Events', 'Událost uložena': 'Event saved',
  'Žádné události. Klepni na „Událost“ a přidej.': 'No events. Tap “Event” to add one.', 'Opakování': 'Repeat', 'Opakovat do': 'Repeat until', 'Exportovat celý kalendář do iPhonu (.ics)': 'Export whole calendar to iPhone (.ics)',
  'Nálada': 'Mood', 'Hledat v deníku': 'Search journal', 'Deník je zatím prázdný. První zápis zabere # minuty.': 'Your journal is empty. The first entry takes # minutes.', 'Uložit zápis': 'Save entry', 'Smazat zápis z tohoto dne?': 'Delete this day’s entry?',
  'Co se povedlo': 'What went well', 'Co zítra jinak': 'What to change tomorrow', 'Za co jsem vděčný': 'Grateful for',
  // --- Menu / nastavení ---
  'Účet, vzhled, moduly': 'Account, appearance, modules', 'Účet & synchronizace': 'Account & sync', 'Vzhled': 'Appearance', 'Moduly': 'Modules', 'Profil & cíle': 'Profile & goals', 'Kategorie kalendáře': 'Calendar categories', 'Kategorie financí': 'Finance categories',
  'Upozornění': 'Notifications', 'Záloha & data': 'Backup & data', 'zapnutá': 'on', 'vypnutá': 'off', 'zapnuté': 'on', 'vypnuté': 'off', '# zapnutých': '# on', '# bodů': '# items',
  'Vypnutý modul zmizí z menu a z Dnes. Data v něm zůstanou.': 'A disabled module disappears from the menu and Today. Its data stays.', 'Barvy': 'Colours', 'odemykáš levely a sériemi': 'unlocked with levels and streaks', 'použít': 'use', 'Tohle je ještě zamčené.': 'This is still locked.',
  'Upozornění na telefon': 'Phone notifications', 'Přijdou i při zamčeném telefonu a zavřené appce – posílá je server.': 'They arrive even when the phone is locked and the app closed – sent by the server.', 'Zapnout upozornění': 'Turn on notifications', 'Vypnout': 'Turn off',
  'Poslat zkušební': 'Send test', 'Co připomínat': 'What to remind', 'Bloky rozvrhu a události mají vlastní čas připomenutí (u každého bloku / události).': 'Schedule blocks and events have their own reminder time (on each block / event).',
  'Ranní návyky': 'Morning habits', 'Prázdné = vypnuto': 'Empty = off', 'Nedělní příprava týdne (#:#)': 'Sunday week planning (#:#)', 'Den před pravidelnou platbou': 'Day before a recurring payment', 'Nejbližší připomínky': 'Upcoming reminders', 'V příštích # hodinách nic.': 'Nothing in the next # hours.',
  'Upozornění zapnutá': 'Notifications on', 'Vypnuto': 'Off', 'Odesláno – dorazí do minuty. Klidně zamkni telefon.': 'Sent – it arrives within a minute. Feel free to lock your phone.', 'Upozornění fungují. Přijde to i při zamčeném telefonu.': 'Notifications work. They arrive even when the phone is locked.',
  'Na iPhonu fungují upozornění jen v appce přidané na plochu (Sdílet → Přidat na plochu).': 'On iPhone, notifications only work in the app added to the Home Screen (Share → Add to Home Screen).', 'Upozornění nejsou povolená. Povol je v Nastavení iPhonu → Oznámení → Life Reset.': 'Notifications are not allowed. Allow them in iPhone Settings → Notifications → Life Reset.',
  'Upozornění jsou zablokovaná. Povol je v Nastavení iPhonu → Oznámení → Life Reset.': 'Notifications are blocked. Allow them in iPhone Settings → Notifications → Life Reset.', 'Pro upozornění musíš být online a přihlášený.': 'You must be online and signed in for notifications.', 'Tenhle prohlížeč upozornění nepodporuje.': 'This browser doesn’t support notifications.',
  'Odškrtni, co máš hotové.': 'Tick off what you’ve done.', 'Jak šel den? # sekund a máš to.': 'How was your day? # seconds and done.', 'Den před pravidelnou platbou': 'Day before a recurring payment',
  'Odhlásit? Tvoje data zůstanou v cloudu a po přihlášení se vrátí.': 'Sign out? Your data stays in the cloud and returns when you sign in.', 'Přihlášení zůstává uložené, dokud se neodhlásíš.': 'You stay signed in until you sign out.', 'Změnit heslo': 'Change password', 'Nové heslo': 'New password', 'Uložit heslo': 'Save password', 'Heslo uloženo': 'Password saved',
  'Synchronizováno': 'Synced', 'Synchronizace vypnutá': 'Sync off', 'nepřihlášen': 'not signed in', 'Nepřihlášen': 'Not signed in', 'Jazyk': 'Language',
  'Stáhne všechno (kromě souborů v cloudu) do jednoho JSON souboru.': 'Downloads everything (except cloud files) into one JSON file.', 'Záloha': 'Backup', 'Nahrát zálohu': 'Upload backup', 'Stáhnout zálohu': 'Download backup', 'Export všech událostí (.ics)': 'Export all events (.ics)',
  'Nebezpečná zóna': 'Danger zone', 'Vymazat data v zařízení': 'Clear data on this device', 'Smaže data jen v tomto zařízení. Pokud jsi přihlášený, po novém přihlášení se stáhnou z cloudu zpátky.': 'Deletes data on this device only. If signed in, it downloads again from the cloud.',
  'Moje hlavní „proč“': 'My main “why”', 'Školy (každá na nový řádek)': 'Schools (one per line)', 'Nový bod rutiny': 'New habit', 'Upravit bod rutiny': 'Edit habit', 'Dny (nic = každý den)': 'Days (none = every day)',
  'Co odškrtáváš každý den. Body můžeš omezit jen na některé dny (třeba trénink Po/St/Pá).': 'What you tick off daily. Limit items to some days if you like (e.g. training Mon/Wed/Fri).',
  'Kategorie příjmů': 'Income categories', 'Kategorie výdajů': 'Expense categories', 'Výchozí kategorie': 'Default categories', 'Osobní': 'Personal', 'Akce & přátelé': 'Events & friends',
  'Odznaky': 'Badges', 'Jak získat XP': 'How to earn XP', 'Splněný blok rozvrhu': 'Completed schedule block', 'Nedělní příprava týdne': 'Sunday week planning', 'Bod rutiny': 'Habit item', 'Celá rutina za den': 'Whole routine in a day',
  'Úkol (vysoká priorita)': 'Task (high priority)', 'Zápis do deníku': 'Journal entry', 'Trénink / fotbal': 'Workout / sport', 'Splněné kalorie za den': 'Calories hit in a day', 'Čtení (za den)': 'Reading (per day)', 'Dočtená kniha': 'Finished book',
  'Splněný cíl projektu': 'Project goal reached', 'Vážení, výdaj, rychlý zápis': 'Weigh-in, expense, quick note', 'Level # potřebuje # XP celkem. Den se počítá do série při skóre #+.': 'Level # needs # XP total. A day counts for the streak at a score of #+.',
  '# XP celkem · další hodnost „Učeň“ na levelu #': '# XP total · next rank “Apprentice” at level #', 'nejvyšší hodnost': 'top rank', 'Rekrut': 'Recruit', 'Učeň': 'Apprentice', 'Level # · Rekrut': 'Level # · Recruit',
  '# h z # h tento týden': '# h of # h this week', '# na seznamu · # přání': '# on list · # wishes', '# jídel dnes': '# meals today', '# otevřených': '# open', '# poznámek': '# notes', '# souborů · hledání ve všem': '# files · search all',
  '# přání · celkem # Kč': '# wishes · # CZK total', 'Hledat ve všem – poznámky, deník, soubory, úkoly…': 'Search everything – notes, journal, files, tasks…',

  // --- doplněk ---
  'Zapni upozornění': 'Turn on notifications', 'Připomínky bloků, večerního zápisu a plateb i při zamčeném telefonu.': 'Reminders for blocks, evening entry and payments, even with the phone locked.', 'Zapnout': 'Turn on', 'Skrýt': 'Hide',
  'skóre dne': 'day score', 'ne': 'no', 'ano': 'yes', 'Ano': 'Yes',
  '# Kč': '# CZK', '+# Kč': '+# CZK', '-# Kč': '-# CZK', '−# Kč': '−# CZK', '# Kč tento měsíc': '# CZK this month', '+# až +#': '+# to +#',
  '# cviků': '# exercises', '# hotových úkolů': '# tasks done', '# kategorií': '# categories', '# odpracovaných hodin': '# hours worked', '# položek': '# items', '# předmětů': '# subjects', '# tréninků': '# workouts',
  '# událostí': '# events', '# zapsaných jídel': '# meals logged', '# zápisů': '# entries', '# zápisů v deníku': '# journal entries', '#/# přečteno': '#/# read', '#/# zápisů': '#/# entries',
  'Barvy událostí v kalendáři a úkolů. Každá kategorie = jedna barva.': 'Colours of calendar events and tasks. One colour per category.', 'Celá police': 'Whole shelf', 'Celý deník': 'Whole journal', 'Chci číst': 'Want to read',
  'Databáze': 'Archive', 'Dobrý': 'Good', 'Skvělý': 'Great', 'Slabší': 'Meh', 'Na dně': 'Rock bottom', 'Dosáhni levelu #': 'Reach level #', 'Dočti # knih': 'Finish # books', 'Dočti knihu': 'Finish a book', 'Hotové': 'Done',
  'Ještě # # kcal.': '# # kcal to go.', 'Kalendáře': 'Calendars', 'Každý projekt má vlastní cíle, úkoly, poznámky, soubory a peníze.': 'Each project has its own goals, tasks, notes, files and money.',
  'Krabičkář': 'Meal prepper', 'Kronikář': 'Chronicler', 'Měsíc disciplíny': 'Month of discipline', 'Týden v kuse': 'Week straight', 'První den': 'First day', 'První kniha': 'First book', 'Železo': 'Iron', 'Deep work': 'Deep work',
  'Life Reset · # záznamů ·': 'Life Reset · # records ·', 'Nahrát': 'Upload', 'Např. #': 'e.g. #', 'Nejdelší': 'Longest', 'Nová položka': 'New item', 'Nový člověk': 'New person', 'Posledních # dní': 'Last # days',
  'Předmět': 'Subject', 'Předměty': 'Subjects', 'Přečteno': 'Finished', 'Rozečteno': 'Reading', 'Čtu': 'Reading', 'Přečíst # stran': 'Read # pages', 'Přidat knihu': 'Add book', 'Přidat projekt': 'Add project', 'Nový projekt': 'New project', 'Upravit projekt': 'Edit project',
  'Přihlas se a data se budou synchronizovat mezi telefonem, aplikací na ploše a počítačem. Dokumenty a knihy nad # MB jde nahrát jen po přihlášení.': 'Sign in and your data syncs between phone, home-screen app and computer. Documents and books over # MB need sign-in.',
  'Soubory ze školy a projektů najdeš v jejich sekcích.': 'School and project files are in their own sections.', 'Stran za # dní': 'Pages in # days', 'Série # dní': '# day streak', 'Upravit seznam škol': 'Edit schools',
  'Volné soubory': 'Loose files', 'Vytvoř si složky třeba Smlouvy, Doklady, Inspirace, Fotky.': 'Create folders like Contracts, Receipts, Inspiration, Photos.', 'Všechny dokumenty': 'All documents', 'Za # měsíců': 'In # months',
  'Zatím nic hotového.': 'Nothing done yet.', 'Zatím žádný projekt.': 'No projects yet.', 'export, import, kalendář .ics': 'export, import, calendar .ics', 'výdaje': 'spending', 'Úkol na dnes': 'Task for today', 'Úkol na tento den': 'Task for this day',
  'Úkoly s termínem': 'Tasks with due dates', 'Nová kniha': 'New book', 'Upravit knihu': 'Edit book', 'Nový předmět': 'New subject', 'Upravit předmět': 'Edit subject', 'Nový cíl': 'New goal', 'Upravit cíl': 'Edit goal', 'plán # h': 'plan # h',
  'Stopky: #': 'Timer: #', 'Hodnocení': 'Rating', 'Vyučující': 'Teacher', 'Učebna / odkaz': 'Room / link', 'Čím se to zabývá': 'What it covers', 'Výsledky': 'Results', 'Cíl': 'Goal', 'Cílová hodnota': 'Target value', 'Aktuálně': 'Current',
  'Dokumenty': 'Documents', 'Brzy': 'Soon', 'Později': 'Later', 'Čas': 'Time', 'Zápis': 'Entry', 'Vážení': 'Weigh-in', 'Kalorie splněny': 'Calories hit', 'Celá rutina': 'Full routine',

  // --- přátelé & XP ---
  'Kde budeš tento týden': 'Where you’ll be this week', '# priority na tento týden': '# priorities for this week', 'Přidat je jako úkoly na dnes': 'Add them as tasks for today', 'Série # / # / # / # / # / # dní': 'Streak # / # / # / # / # / # days', 'Vítěz týdne mezi přáteli': 'Weekly winner among friends', '+# až +#': '+# to +#',
  'Přátelé': 'Friends', 'Přátelé & soutěž': 'Friends & competition', 'Žebříček s kamarády – kdo je tento týden disciplinovanější': 'Leaderboard with friends – who is more disciplined this week',
  'Přidat kamaráda': 'Add a friend', 'Kód kamaráda (např. KA#B#M)': 'Friend’s code (e.g. KA8B7M)', 'Tvůj kód': 'Your code', 'Kopírovat': 'Copy', 'Pozvat': 'Invite', 'Kód zkopírován': 'Code copied', 'Pozvánka zkopírována': 'Invite copied',
  'Pošli kamarádovi pozvánku. Když nemá Life Reset, udělá si účet a pak otevře odkaz znovu.': 'Send your friend an invite. If they don’t have Life Reset, they create an account and open the link again.',
  'Čeká na potvrzení:': 'Waiting for approval:', 'zrušit': 'cancel', 'Žádosti o přátelství': 'Friend requests', 'Žádost o přátelství': 'Friend request', 'chce tě přidat': 'wants to add you', 'Odmítnout': 'Decline', 'Přijmout': 'Accept', 'Někdo tě chce přidat.': 'Someone wants to add you.',
  'Soutěž s kamarády': 'Compete with friends', 'Přidej kamarády a každý týden uvidíte, kdo je disciplinovanější: kdo nasbírá víc XP, má lepší skóre dne a delší sérii. Vítěz týdne dostane +# XP a odznak. Kamarádi vidí jen tvoje čísla, žádná data.': 'Add friends and every week you’ll see who is more disciplined: who earns more XP, has a better daily score and a longer streak. The weekly winner gets +# XP and a badge. Friends only see your numbers, never your data.',
  'Jste přátelé!': 'You’re friends now!', 'Žádost odeslána – až ji potvrdí, uvidíte se v žebříčku.': 'Request sent – once accepted, you’ll see each other on the leaderboard.', 'Kód neexistuje – zkontroluj ho.': 'That code doesn’t exist – check it.', 'To je tvůj vlastní kód.': 'That’s your own code.',
  'Už jste přátelé.': 'You’re already friends.', 'Žádost už čeká na potvrzení.': 'The request is already waiting.', 'Pro přátele musíš být online a přihlášený.': 'You need to be online and signed in for friends.', 'Pro přátele musíš být přihlášený a online.': 'You need to be signed in and online for friends.',
  'Vedeš! Udrž to.': 'You’re leading! Keep it up.', 'Na # ti chybí # XP. Týden končí v neděli o půlnoci.': '# XP behind. The week ends Sunday at midnight.', 'Vyhrál jsi minulý týden!': 'You won last week!', 'Vedeš tento týden': 'You’re leading this week',
  'Popíchnout': 'Nudge', 'Přijde mu to jako upozornění (max # za hodinu).': 'They get it as a notification (max # per hour).', 'Odebrat z přátel': 'Remove friend', 'Odebrat': 'Remove', 'Odesláno': 'Sent', 'Ty': 'You', 'ty': 'you',
  'XP tento týden': 'XP this week', 'Skóre dnes': 'Score today', 'Průměr skóre (týden)': 'Average score (week)', 'Nejdelší série': 'Longest streak', 'Týden': 'Week', 'Jak se sbírají XP': 'How to earn XP', 'Všechny bloky dne': 'All blocks of the day',
  'Skvělý den (skóre #+)': 'Great day (score #+)', 'Perfektní den (#)': 'Perfect day (#)', 'Série # / # / # / # dní': 'Streak # / # / # / # days', 'Ranní ptáče (před #:#)': 'Early bird (before #:#)', 'Vítěz týdne': 'Weekly winner',
  'Tohohle kamaráda jsi už popíchl – zkus to za hodinu.': 'You already nudged this friend – try again in an hour.', 'Hej, makej! 💪': 'Hey, get to work! 💪', 'Dneska tě předběhnu.': 'I’m beating you today.', 'Kde je tvoje série?': 'Where’s your streak?', 'Jdu do gymu, a ty?': 'Going to the gym, you?',
  'Skvělý den (#+)': 'Great day (#+)', 'Perfektní den': 'Perfect day', 'Ranní ptáče': 'Early bird', 'První kamarád': 'First friend', 'Přidej kamarády a soutěžte': 'Add friends and compete', 'Operativec': 'Operative', 'Strážce noci': 'Night watchman', 'Temný rytíř': 'Dark knight',
  'Miliardář ve stínu': 'Shadow billionaire', 'Mistr systému': 'System master', 'Architekt': 'Architect', 'Legenda': 'Legend', 'Titán': 'Titan', 'Nesmrtelný': 'Immortal', 'Mýtus': 'Myth', 'Bůh disciplíny': 'God of discipline',
  'Dva týdny': 'Two weeks', 'Nezastavitelný': 'Unstoppable', 'Stovka': 'Hundred', 'Celý rok': 'Full year', 'Stroj': 'Machine', 'Vstávám s jistotou': 'Rise and shine', 'Workaholik': 'Workaholic', 'Účetní': 'Accountant', 'Parťák': 'Buddy', 'Parta': 'Crew', 'Šampion': 'Champion', 'Dynastie': 'Dynasty',
  'Skóre dne #': 'Daily score #', '# dní se skóre #': '# days with score #', '#× otevřeno před #:#': 'Opened before #:# #×', '# odpracovaných hodin': '# hours worked', '# zapsaných pohybů': '# transactions logged', 'Přidej kamaráda': 'Add a friend', '# přátel': '# friends',
  'Vyhraj týden mezi přáteli': 'Win a week among friends', 'Vyhraj # týdnů': 'Win # weeks', 'Série # dní': '# day streak', 'Dosáhni levelu #': 'Reach level #', '# přátel · žebříček týdne': '# friends · weekly leaderboard',
  // --- výchozí návyky ---
  'Sklenice vody hned po probuzení': 'Glass of water right after waking', 'Ustlat postel': 'Make the bed', '# min protažení': '# min stretching', 'Napsat # priority dne': 'Write # priorities for the day', 'Prvních # min bez telefonu': 'First # min without phone',
  'Oběd z krabičky': 'Packed lunch', '#–# l vody': '#–# l water', 'Hodina práce na projektu': 'One hour on my project', 'Škola – úkoly a učení': 'School – homework and study', '# min kliky': '# min push-ups', 'Připravit věci na zítřek': 'Prepare things for tomorrow',
  'Číst # min': 'Read # min', 'Telefon pryč do #:#': 'Phone away by #:#', 'Zkontrolovat finance za den': 'Check today’s finances', 'Studená sprcha': 'Cold shower',
};

// dny a měsíce v datech (fmtDay vrací např. „pondělí 9. listopadu“ / „po 9. 11.“)
const D = { 'neděle': 'Sunday', 'pondělí': 'Monday', 'úterý': 'Tuesday', 'středa': 'Wednesday', 'čtvrtek': 'Thursday', 'pátek': 'Friday', 'sobota': 'Saturday' };
const DS = { ne: 'Sun', po: 'Mon', 'út': 'Tue', st: 'Wed', 'čt': 'Thu', 'pá': 'Fri', so: 'Sat' };
const MG = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const MN = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const ME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dates(t) {
  let r = t.replace(new RegExp(`(${Object.keys(D).join('|')}) (\\d{1,2})\\. (${MG.join('|')})`, 'g'), (m, d, n, mo) => `${D[d]}, ${ME[MG.indexOf(mo)]} ${n}`);
  r = r.replace(/(^|\s)(ne|po|út|st|čt|pá|so) (\d{1,2})\. (\d{1,2})\./g, (m, s, d, n, mo) => `${s}${DS[d]} ${mo}/${n}`);
  r = r.replace(new RegExp(`^(${MN.join('|')})( \\d{4})?$`), (m, mo, y) => `${ME[MN.indexOf(mo)]}${y || ''}`);
  return r === t ? null : r;
}

function core(t) {
  if (EN[t] != null) return EN[t];
  const nums = [];
  const k = t.replace(/\d+(?:[.,]\d+)?/g, m => { nums.push(m); return '#'; });
  if (k !== t && EN[k] != null) { let i = 0; return EN[k].replace(/#/g, () => nums[i++] ?? '#'); }
  return null;
}
export function tr(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || !/[A-Za-zÀ-ž]/.test(t)) return null;
  let r = core(t);
  if (r == null) {
    // „Dobré ráno, Alex“ apod.
    const m = t.match(/^(Dobré ráno|Dobré odpoledne|Dobrý večer|Připraveno)(, .+)$/);
    if (m) r = (m[1] === 'Připraveno' ? 'Ready' : EN[m[1]]) + m[2];
    const m2 = t.match(/^(Stopky|Zapsáno|Koupeno|Přesunuto na|Týden) (.+)$/);
    if (r == null && m2) r = ({ Stopky: 'Timer:', Zapsáno: 'Logged', Koupeno: 'Bought:', 'Přesunuto na': 'Moved to', 'Týden': 'Week' }[m2[1]]) + ' ' + (core(m2[2].replace(/^: /, '')) ?? m2[2].replace(/^: /, ''));
    const m3 = t.match(/^(Ne|Po|Út|St|Čt|Pá|So) (\d{1,2})\.$/);
    if (r == null && m3) r = `${EN[m3[1]]} ${m3[2]}`;
    const m4 = t.match(/^(.*), (\d+) událostí$/);
    if (r == null && m4) r = `${dates(m4[1]) ?? m4[1]}, ${m4[2]} events`;
  }
  if (r == null) r = dates(t);
  if (r == null) {
    // „pondělí 9. listopadu · Praha“ – přeloží části oddělené tečkou
    const parts = t.split(' · ');
    if (parts.length > 1) {
      const out = parts.map(p => core(p) ?? dates(p) ?? p);
      if (out.some((x, i) => x !== parts[i])) r = out.join(' · ');
    }
  }
  if (r == null) return null;
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
  return lead + r + tail;
}

const ATTRS = ['placeholder', 'aria-label', 'title'];
function apply(root) {
  if (!root) return;
  if (root.nodeType === 3) { const r = tr(root.nodeValue); if (r != null && r !== root.nodeValue) root.nodeValue = r; return; }
  if (root.nodeType !== 1 || root.closest('textarea,script,style,[contenteditable],.no-tr')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = [];
  let n;
  while ((n = w.nextNode())) list.push(n);
  list.forEach(x => { const p = x.parentElement; if (p && p.closest('textarea,script,style,.no-tr')) return; const r = tr(x.nodeValue); if (r != null && r !== x.nodeValue) x.nodeValue = r; });
  [root, ...root.querySelectorAll('[placeholder],[aria-label],[title]')].forEach(el => ATTRS.forEach(a => { const v = el.getAttribute && el.getAttribute(a); if (v) { const r = tr(v); if (r != null && r !== v) el.setAttribute(a, r); } }));
  root.querySelectorAll('option').forEach(o => { const r = tr(o.textContent); if (r != null) o.textContent = r; });
}

let obs = null;
export function startI18n() {
  if (lang() !== 'en' || obs) return;
  document.documentElement.lang = 'en';
  apply(document.body);
  obs = new MutationObserver(muts => {
    obs.disconnect();
    muts.forEach(m => {
      if (m.type === 'characterData') apply(m.target);
      else m.addedNodes.forEach(apply);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
// toasty a potvrzovací dialogy, které se skládají přímo v kódu
export const t = s => (lang() === 'en' ? (tr(s) ?? s) : s);
