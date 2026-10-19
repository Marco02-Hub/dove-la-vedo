// Aggiornamento automatico e gratuito di data/matches.json, senza AI né chiavi.
// Gira su GitHub Actions ogni 6 ore (.github/workflows/update-feed.yml); in locale: npm run update-feed
//
// Fonti (tutte pubbliche):
//  - ESPN (API JSON pubblica): calendario e orari di Serie A e Champions League
//  - Sky (programmi.sky.it): le 3 partite di Serie A per giornata trasmesse anche da Sky
//  - Goal (guida TV): canali italiani della settimana, compresi Prime Video e TV8
//  - fussballgucken.info (guida TV): partite in chiaro su SRF zwei / RSI LA 2
//  - data/manual.json: correzioni a mano che hanno sempre la precedenza
//
// Se una fonte non risponde si tengono i dati precedenti per quella parte: mai cancellare dati buoni.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'matches.json');
const MANUAL = path.join(ROOT, 'data', 'manual.json');
const DAYS_AHEAD = Number(process.env.DAYS_AHEAD ?? 21);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const TZ = 'Europe/Zurich';

const URLS = {
  espn: (league, day) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${day}`,
  skySerieA: 'https://programmi.sky.it/sport/calcio/serie-a',
  goal: 'https://www.goal.com/it/notizie/guida-tv-dove-vedere-tutto-il-calcio-in-diretta-e-streaming/1674frahvw8qt1nojf0cwjwlzr',
  guides: [
    { name: 'SRF zwei', url: 'https://fussballgucken.info/sender/srf-zwei' },
    { name: 'RSI LA 2', url: 'https://fussballgucken.info/sender/rsi-la-2' },
  ],
  dazn: 'https://www.dazn.com/it-IT/news/calcio/calendario-completo-serie-a-dove-vedere-le-partite/1qtugc7g9k7w71sjt6einxmm8w',
};

/** Champions: oltre alle italiane, le partite con almeno una di queste squadre. */
const TOP_TEAMS = [
  'Real Madrid', 'Barcellona', 'Atlético Madrid', 'Bayern', 'Dortmund', 'PSG', 'Liverpool', 'Manchester City',
  'Arsenal', 'Chelsea', 'Manchester United', 'Tottenham', 'Leverkusen', 'Benfica', 'Porto',
];

// ---------- nomi delle squadre ----------

const norm = (s) =>
  s
    .replace(/ø/gi, 'o')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Varianti (inglese, tedesco, abbreviazioni) → nome italiano usato nell'app. */
const ALIASES = {
  Inter: ['internazionale', 'inter milan', 'inter', 'fc internazionale milano'],
  Milan: ['ac milan', 'milan'],
  Roma: ['as roma', 'roma'],
  Lazio: ['ss lazio', 'lazio'],
  Napoli: ['ssc napoli', 'napoli'],
  Juventus: ['juventus', 'juve'],
  Verona: ['hellas verona', 'verona'],
  Bayern: ['bayern munich', 'bayern munchen', 'bayern', 'fc bayern munchen', 'fc bayern'],
  Barcellona: ['barcelona', 'fc barcelona', 'barcellona', 'barca'],
  'Atlético Madrid': ['atletico madrid', 'atletico de madrid', 'atletico'],
  'Real Madrid': ['real madrid'],
  Dortmund: ['borussia dortmund', 'dortmund', 'bvb'],
  PSG: ['paris saint germain', 'paris sg', 'psg', 'paris'],
  Leverkusen: ['bayer leverkusen', 'leverkusen', 'bayer 04 leverkusen'],
  'Manchester City': ['manchester city', 'man city'],
  'Manchester United': ['manchester united', 'man united', 'man utd'],
  Tottenham: ['tottenham hotspur', 'tottenham', 'spurs'],
  Lipsia: ['rb leipzig', 'leipzig', 'lipsia', 'rasenballsport leipzig'],
  Stoccarda: ['vfb stuttgart', 'stuttgart', 'stoccarda'],
  Shakhtar: ['shakhtar donetsk', 'shakhtar', 'schachtar donezk'],
  Sporting: ['sporting cp', 'sporting', 'sporting lisbona', 'sporting lissabon'],
  'AEK Atene': ['aek athens', 'aek atene', 'aek', 'aek athen'],
  'Slavia Praga': ['slavia prague', 'slavia praha', 'slavia praga', 'slavia prag'],
  PSV: ['psv eindhoven', 'psv'],
  'Club Brugge': ['club brugge', 'bruges', 'brugge', 'club brugge kv'],
  Betis: ['real betis', 'betis'],
  Fenerbahçe: ['fenerbahce'],
  'Bodø/Glimt': ['bodo glimt', 'bodoe glimt', 'fk bodo glimt'],
  Feyenoord: ['feyenoord rotterdam', 'feyenoord'],
  LASK: ['lask linz', 'lask'],
  Viking: ['viking fk', 'viking'],
  Sabah: ['sabah fk', 'sabah'],
  Benfica: ['benfica', 'sl benfica'],
  Porto: ['fc porto', 'porto'],
  Lille: ['lille', 'lilla', 'losc lille'],
  Marsiglia: ['marseille', 'olympique marseille', 'marsiglia'],
  Monaco: ['as monaco', 'monaco'],
  Galatasaray: ['galatasaray'],
  Liverpool: ['liverpool'],
  Arsenal: ['arsenal'],
  Chelsea: ['chelsea'],
};
const ALIAS = new Map(Object.entries(ALIASES).flatMap(([it, list]) => list.map((a) => [a, it])));
const canon = (name) => ALIAS.get(norm(name)) ?? name.trim();

// ---------- utilità ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'it-CH,it;q=0.9' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'json' ? res.json() : res.text();
}

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([aou])uml;/gi, (_, v) => ({ a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' })[v])
    .replace(/\s+/g, ' ')
    .trim();

/** "2026-10-21T19:00Z" → "2026-10-21T21:00:00+02:00" (ora di Zurigo, con l'offset giusto per ora legale/solare). */
function toZurich(utc) {
  const d = new Date(utc);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const off = Math.round((local - d.getTime()) / 60000);
  const sign = off >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
  const mm = String(Math.abs(off) % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00${sign}${hh}:${mm}`;
}

const slug = (s) => norm(s).replace(/ /g, '-');
const dayOf = (iso) => iso.slice(0, 10);
const hmOf = (iso) => iso.slice(11, 16);
const sameTeams = (m, home, away) => canon(home) === m.home && canon(away) === m.away;
const daysApart = (a, b) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000;

// ---------- fonti ----------

/** Calendario da ESPN, un giorno alla volta (l'API non accetta intervalli lunghi). */
async function fetchFixtures() {
  const out = [];
  for (const [league, competition] of [['ita.1', 'serie_a'], ['uefa.champions', 'ucl']]) {
    for (let i = 0; i <= DAYS_AHEAD; i++) {
      const day = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
      const j = await get(URLS.espn(league, day), 'json');
      for (const e of j.events ?? []) {
        if (e.status?.type?.completed) continue;
        const c = e.competitions?.[0];
        const home = c?.competitors?.find((x) => x.homeAway === 'home')?.team;
        const away = c?.competitors?.find((x) => x.homeAway === 'away')?.team;
        if (!home || !away) continue;
        out.push({
          espnId: e.id,
          competition,
          home: canon(home.displayName),
          away: canon(away.displayName),
          kickoff: toZurich(e.date),
        });
      }
      await sleep(250);
    }
  }
  // stessa partita restituita per due giorni diversi (fusi orari): tienila una volta sola
  return [...new Map(out.map((f) => [f.espnId, f])).values()];
}

/** Partite di Serie A trasmesse da Sky: [{ day, time, home, away }]. */
async function fetchSkySerieA() {
  const html = await get(URLS.skySerieA);
  const start = html.indexOf('trasmesse da Sky</h2>');
  if (start < 0) throw new Error('Sky: sezione "trasmesse da Sky" non trovata');
  const re = /<strong>([^<(]+?) - ([^<(]+?) \([^)]*?(\d{2})\/(\d{2})\/(\d{4})\) ore (\d{2}):(\d{2})<\/strong>/g;
  const list = [];
  for (const m of html.slice(start).matchAll(re)) {
    list.push({ day: `${m[5]}-${m[4]}-${m[3]}`, time: `${m[6]}:${m[7]}`, home: m[1].trim(), away: m[2].trim() });
  }
  if (list.length === 0) throw new Error('Sky: nessuna partita letta');
  return list;
}

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Guida TV di Goal: [{ day, time, home, away, competition, channels }]. */
async function fetchGoal() {
  const html = await get(URLS.goal);
  const now = new Date();
  const list = [];
  const re = /<h2>(?:(?!<\/h2>).)*?(\d{1,2}) (GENNAIO|FEBBRAIO|MARZO|APRILE|MAGGIO|GIUGNO|LUGLIO|AGOSTO|SETTEMBRE|OTTOBRE|NOVEMBRE|DICEMBRE)\s*(?:<\/strong>)?<\/h2>\s*<ul>(.*?)<\/ul>/gis;
  for (const day of html.matchAll(re)) {
    const month = MONTHS.indexOf(day[2].toLowerCase());
    // anno: se il mese è molto prima di quello corrente, è l'anno prossimo (guida a cavallo di capodanno)
    const year = now.getFullYear() + (month < now.getMonth() - 6 ? 1 : 0);
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${day[1].padStart(2, '0')}`;
    for (const li of day[3].matchAll(/<li>(.*?)<\/li>/gis)) {
      const m = decode(li[1]).match(/^(\d{1,2})[.:](\d{2}) (.+?) \(([^)]+)\) - (.+)$/);
      if (!m || !/champions league|serie a/i.test(m[4]) || /youth/i.test(m[4])) continue;
      const teams = splitTeams(m[3]);
      if (!teams) continue;
      list.push({ day: date, time: `${m[1].padStart(2, '0')}:${m[2]}`, ...teams, competition: m[4], channels: m[5] });
    }
  }
  if (list.length === 0) throw new Error('Goal: nessuna partita letta');
  return list;
}

/** "Real Madrid-Lipsia" → { home, away }, anche con trattini nei nomi. */
function splitTeams(s) {
  const parts = s.split('-');
  if (parts.length < 2) return null;
  for (let i = 1; i < parts.length; i++) {
    const home = parts.slice(0, i).join('-').trim();
    const away = parts.slice(i).join('-').trim();
    if (ALIAS.has(norm(home)) || ALIAS.has(norm(away))) return { home, away };
  }
  return { home: parts[0].trim(), away: parts.slice(1).join('-').trim() };
}

/** Guide TV svizzere: [{ day, time, home, away, channel }] solo Champions e Serie A. */
async function fetchSwissGuides() {
  const list = [];
  for (const g of URLS.guides) {
    const html = await get(g.url);
    let day = null;
    let time = null;
    let comp = '';
    const tokens = html.matchAll(
      /(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), (\d{2})\.(\d{2})\.(\d{4})|>(\d{2}:\d{2})<|title="Infos zu diesem Wettbewerb">([^<]+)<|class="[^"]*team-home[^"]*"><a[^>]*>([^<]+)<\/a>(?:(?!team-guest).)*?team-guest[^"]*"><a[^>]*>([^<]+)</gs,
    );
    for (const t of tokens) {
      if (t[1]) day = `${t[3]}-${t[2]}-${t[1]}`;
      else if (t[4]) time = t[4];
      else if (t[5]) comp = t[5];
      else if (t[6] && day && /champions league|serie a/i.test(comp)) {
        list.push({ day, time, home: decode(t[6]), away: decode(t[7]), channel: g.name });
      }
    }
    await sleep(1000);
  }
  return list;
}

// ---------- costruzione del feed ----------

function goalKinds(channels) {
  // "DAZN 1 (canale 214 Sky)" è DAZN visto dal decoder Sky, non una partita Sky
  const c = channels.toUpperCase().replace(/\([^)]*\)/g, '');
  const b = [];
  if (/PRIME/.test(c)) b.push({ kind: 'prime', name: 'Prime Video', confirmed: true });
  if (/\bSKY\b|\bNOW\b/.test(c)) b.push({ kind: 'sky', name: 'Sky Sport / NOW', confirmed: true });
  if (/DAZN/.test(c)) b.push({ kind: 'dazn', name: 'DAZN', confirmed: true });
  const free = c.match(/\b(TV8|RAI ?\d|RAI SPORT|CANALE 5|ITALIA 1|20 MEDIASET)\b/);
  if (free) b.push({ kind: 'free_it', name: free[1].replace(/^RAI ?(\d)$/, 'Rai $1'), note: "solo dall'Italia", confirmed: true });
  return b;
}

function build(fixtures, src, old) {
  const italian = new Set(fixtures.filter((f) => f.competition === 'serie_a').flatMap((f) => [f.home, f.away]));
  const top = new Set(TOP_TEAMS);
  const oldById = new Map(old.matches.map((m) => [m.id, m]));
  const matches = [];

  for (const f of fixtures) {
    const isIta = italian.has(f.home) || italian.has(f.away);
    if (f.competition === 'ucl' && !isIta && !top.has(f.home) && !top.has(f.away)) continue;
    const day = dayOf(f.kickoff);
    const id = `${f.competition}-${day}-${slug(f.home)}-${slug(f.away)}`;
    const group = f.competition === 'serie_a' ? 'serie_a' : isIta ? 'italiane' : 'top';
    const sources = new Set([`https://www.espn.com/soccer/match/_/gameId/${f.espnId}`]);
    const b = new Map(); // kind → broadcaster
    const add = (x, url) => {
      if (!b.has(x.kind) || (!b.get(x.kind).confirmed && x.confirmed)) b.set(x.kind, x);
      if (url) sources.add(url);
    };
    const keepOld = (kinds) => {
      for (const x of oldById.get(id)?.broadcasters ?? []) if (kinds.includes(x.kind)) add(x);
    };

    // La guida di Goal copre circa una settimana: oltre, si tengono Prime e TV8 già noti
    const goal = src.goal?.find((g) => g.day === day && sameTeams(f, g.home, g.away));
    if (goal) for (const x of goalKinds(goal.channels)) add(x, URLS.goal);
    else if (!src.goal || !src.goal.some((g) => g.day === day)) keepOld(['prime', 'free_it']);

    if (f.competition === 'serie_a') {
      add({ kind: 'dazn', name: 'DAZN', confirmed: true }, URLS.dazn); // DAZN trasmette tutta la Serie A
      if (src.sky) {
        // ±1 giorno: la pagina Sky a volte sbaglia la data (es. "Mercoledì 29/10" per il 28)
        if (src.sky.some((s) => daysApart(s.day, day) <= 1 && sameTeams(f, s.home, s.away))) {
          add({ kind: 'sky', name: 'Sky Sport / NOW', confirmed: true }, URLS.skySerieA);
        }
      } else keepOld(['sky']);
    } else if (!b.has('sky') && !b.has('prime')) {
      // Champions: Sky ha tutte le partite tranne l'esclusiva Prime del mercoledì (sempre di un'italiana)
      const wed = new Date(`${day}T12:00:00Z`).getUTCDay() === 3;
      if (wed && isIta) {
        add({ kind: 'sky', name: 'Sky Sport / NOW', note: 'il mercoledì Prime Video sceglie una partita delle italiane', confirmed: false });
      } else add({ kind: 'sky', name: 'Sky Sport / NOW', confirmed: true });
    }

    if (src.swiss) {
      const ch = src.swiss.filter((s) => s.day === day && sameTeams(f, s.home, s.away)).map((s) => s.channel);
      if (ch.length) {
        add({ kind: 'free_ch', name: `SRG (${[...new Set(ch)].join(' · ')})`, note: 'indicata dalle guide TV', confirmed: false });
        for (const g of URLS.guides) if (ch.includes(g.name)) sources.add(g.url);
      }
    } else keepOld(['free_ch']);

    const ORDER = ['free_ch', 'free_it', 'sky', 'dazn', 'prime'];
    matches.push({
      id,
      competition: f.competition,
      group,
      home: f.home,
      away: f.away,
      kickoff: f.kickoff,
      broadcasters: [...b.values()].sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind)),
      sources: [...sources],
    });
  }
  // Se l'esclusiva Prime di un mercoledì è nota, le altre partite delle italiane quel giorno sono su Sky
  const primeDays = new Set(matches.filter((m) => m.broadcasters.some((x) => x.kind === 'prime')).map((m) => dayOf(m.kickoff)));
  for (const m of matches) {
    const sky = m.broadcasters.find((x) => x.kind === 'sky' && !x.confirmed && x.note?.startsWith('il mercoledì Prime'));
    if (sky && primeDays.has(dayOf(m.kickoff))) Object.assign(sky, { confirmed: true, note: undefined });
  }
  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id));
}

/** data/manual.json: { "<id>": { broadcasters?, warning? } } sostituisce i campi indicati. */
function applyManual(matches, manual) {
  for (const m of matches) {
    const o = manual[m.id];
    if (!o) continue;
    if (o.broadcasters) m.broadcasters = o.broadcasters;
    if (o.warning) m.warning = o.warning;
    if (o.sources) m.sources = [...new Set([...m.sources, ...o.sources])];
  }
  return matches;
}

async function main() {
  const old = JSON.parse(await readFile(OUT, 'utf8'));
  const manual = JSON.parse(await readFile(MANUAL, 'utf8').catch(() => '{}'));

  const fixtures = await fetchFixtures();
  console.log(`ESPN: ${fixtures.length} partite in calendario`);

  const src = {};
  for (const [key, fn] of [['sky', fetchSkySerieA], ['goal', fetchGoal], ['swiss', fetchSwissGuides]]) {
    try {
      src[key] = await fn();
      console.log(`${key}: ${src[key].length} righe`);
    } catch (err) {
      console.warn(`${key}: fonte non disponibile, tengo i dati precedenti (${err.message})`);
    }
  }

  const matches = applyManual(build(fixtures, src, old), manual);
  if (matches.length === 0) {
    console.warn(`Nessuna partita trovata: mantengo i ${old.matches.length} dati precedenti.`);
    return;
  }
  await writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), matches }, null, 2) + '\n');
  console.log(`Salvate ${matches.length} partite in data/matches.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
