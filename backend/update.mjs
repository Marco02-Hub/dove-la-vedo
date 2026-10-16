// Aggiorna data/matches.json cercando sul web dove vedere Serie A e Champions League.
// Usa l'API di Anthropic con lo strumento di ricerca web.
//
// Uso:  ANTHROPIC_API_KEY=... node backend/update.mjs
// Opzionali: ANTHROPIC_MODEL (default sotto), DAYS_AHEAD (default 21, serve al Calendario)

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'matches.json');
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5';
const DAYS_AHEAD = Number(process.env.DAYS_AHEAD ?? 21);

const TOP_TEAMS = [
  'Real Madrid', 'Barcellona', 'Atlético Madrid', 'Bayern', 'Dortmund', 'PSG', 'Liverpool',
  'Manchester City', 'Arsenal', 'Chelsea', 'Manchester United', 'Tottenham', 'Leverkusen', 'Benfica', 'Porto',
];

const ALLOWED_KINDS = new Set(['free_ch', 'free_it', 'sky', 'dazn', 'prime']);

function buildPrompt(today, until) {
  return `Oggi è ${today}. Cerca sul web le partite dal ${today} al ${until} (inclusi) di:
1. Serie A: TUTTE le partite.
2. UEFA Champions League: tutte le partite delle squadre italiane, più quelle in cui gioca almeno una di queste squadre top: ${TOP_TEAMS.join(', ')}.

Per ogni partita trova dove si può vedere, considerando SOLO queste opzioni (ignora qualsiasi altra piattaforma a pagamento, es. blue Sport, Paramount):
- "free_ch": in chiaro in Svizzera sulla SRG (RSI LA1/LA2, SRF zwei, RTS 2). La SRG trasmette una partita di Champions ogni mercoledì.
- "free_it": in chiaro in Italia (TV8, Rai, Canale 5...). TV8 trasmette il mercoledì il big match tra squadre straniere.
- "sky": Sky Italia / NOW (Serie A: 3 partite per giornata in co-esclusiva con DAZN; Champions: 185 partite su 203).
- "dazn": DAZN Italia (Serie A: tutte le partite).
- "prime": Amazon Prime Video (Champions: in esclusiva la miglior partita del mercoledì, di solito di un'italiana).

Regole:
- Usa fonti affidabili (palinsesti ufficiali, siti delle emittenti, UEFA, Lega Serie A, quotidiani sportivi). Annota gli URL usati.
- "confirmed": true solo se una fonte lo dice esplicitamente per QUELLA partita; altrimenti false e spiega nel campo "note" (es. "candidata").
- Orari in ISO 8601 con fuso orario di Zurigo (es. 2026-10-21T21:00:00+02:00).
- "group": "serie_a" per la Serie A; per la Champions "italiane" se gioca un'italiana, altrimenti "top".
- "id": "<competition>-<YYYY-MM-DD>-<casa>-<ospite>" in minuscolo con trattini, senza accenti.
- Nomi squadre in italiano (Barcellona, Lipsia, Stoccarda...).
- Per le partite delle settimane successive l'emittente spesso non è ancora annunciata: includile comunque con le opzioni probabili e "confirmed": false.
- Se una partita non ha nessuna delle cinque opzioni, non includerla.

Rispondi alla fine con SOLO un blocco \`\`\`json contenente un array di oggetti con questa forma esatta:
{"id": string, "competition": "serie_a"|"ucl", "group": "serie_a"|"italiane"|"top", "home": string, "away": string,
 "kickoff": string, "broadcasters": [{"kind": "free_ch"|"free_it"|"sky"|"dazn"|"prime", "name": string, "note"?: string, "confirmed": boolean}],
 "warning"?: string, "sources": string[]}`;
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  return JSON.parse(raw);
}

function validate(matches) {
  if (!Array.isArray(matches)) throw new Error('La risposta non è un array');
  const ids = new Set();
  return matches
    .filter((m) => m && m.id && m.home && m.away && !Number.isNaN(Date.parse(m.kickoff)))
    .map((m) => ({
      ...m,
      broadcasters: (m.broadcasters ?? []).filter((b) => ALLOWED_KINDS.has(b.kind)),
      sources: Array.isArray(m.sources) ? m.sources : [],
    }))
    .filter((m) => m.broadcasters.length > 0)
    .filter((m) => (ids.has(m.id) ? false : (ids.add(m.id), true)));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Manca ANTHROPIC_API_KEY');
  const client = new Anthropic();

  const fmt = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
  const now = new Date();
  const today = fmt(now);
  const until = fmt(new Date(now.getTime() + DAYS_AHEAD * 86400000));

  // La ricerca web gira sui server Anthropic: se il turno si ferma con "pause_turn"
  // si rimanda la conversazione così com'è e il modello riprende da dove era rimasto.
  const messages = [{ role: 'user', content: buildPrompt(today, until) }];
  let response;
  for (let i = 0; i < 5; i++) {
    response = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        output_config: { effort: 'high' },
        // Se il modello rifiuta la richiesta, l'API riprova da sola su un modello di riserva.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 30 }],
        messages,
      })
      .finalMessage();
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }

  if (response.stop_reason === 'refusal') throw new Error('Richiesta rifiutata dal modello: feed non aggiornato');
  if (response.stop_reason === 'max_tokens') console.warn('Risposta troncata (max_tokens): provo comunque a leggerla.');

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  const matches = validate(extractJson(text));

  if (matches.length === 0) {
    // Non sovrascrivere dati buoni con un risultato vuoto.
    const old = JSON.parse(await readFile(OUT, 'utf8'));
    console.warn(`Nessuna partita trovata: mantengo i ${old.matches.length} dati precedenti.`);
    return;
  }

  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const feed = { updatedAt: now.toISOString(), matches };
  await writeFile(OUT, JSON.stringify(feed, null, 2) + '\n');
  console.log(`Salvate ${matches.length} partite in data/matches.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
