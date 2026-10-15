# CLAUDE.md — Dove la vedo

App Expo (SDK 57, expo-router, TypeScript strict) che mostra dove vedere in Svizzera Serie A e Champions League.
L'utente parla italiano: testi UI, commenti e messaggi in italiano.

## Regole di prodotto
- Mostrare SOLO 4 tipi di emittente: `free_ch` (SRG: RSI/SRF/RTS), `free_it` (in chiaro in Italia), `sky`, `dazn`.
  Nessun'altra piattaforma a pagamento (niente Amazon, blue, Paramount...). Il filtro vale sia nel backend
  (`validate` in backend/update.mjs) sia nell'app (`matchesFilter` in src/api.ts).
- Champions: squadre italiane + top europee (lista `TOP_TEAMS` nel backend). In UI prima "ITALIANE", poi "TOP EUROPEE".
- Mai presentare come certo un dato non confermato: `confirmed: false` → "Da confermare".
- Orari sempre nel fuso `Europe/Zurich`.
- Sky/DAZN Italia di solito non funzionano dalla Svizzera (portabilità solo UE): mantenere l'avviso.

## Design
Riferimento: canvas "App partite in Svizzera" su claude.ai. Colori e font in `src/theme.ts`
(fondo #0D1411, accento lime #C8F25A, Barlow Condensed per i titoli, IBM Plex Sans per il testo).
Target touch ≥44px.

## Comandi
- `npx expo start` — avvio
- `npm run typecheck` — deve passare senza errori
- `npx expo export --platform android` — verifica che il bundle compili (poi cancella `dist/`)
- `npm run update-feed` — aggiorna data/matches.json (serve ANTHROPIC_API_KEY)
- Usare `npx expo install <pkg>` (non `npm install`) per le dipendenze native, così le versioni restano allineate all'SDK.

## Prossimi passi (TODO)
1. Messa online: repo GitHub pubblico, `extra.feedUrl` in app.json, secret `ANTHROPIC_API_KEY`, primo run del workflow.
2. Prova su telefono con build di sviluppo (`eas build -p android --profile development`): notifiche e
   aggiornamento in background (src/background.ts) non sono ancora stati verificati su un dispositivo.
3. Pubblicazione: `eas init`, build `production` e store.
4. Lingua del commento: per ora solo italiano (selettore tolto da Avvisi; `prefs.language` resta a 'it').
   In futuro il backend aggiunge `language: 'it'|'fr'|'de'` a ogni emittente e l'app ordina di conseguenza.
5. Icona: versione provvisoria generata via script (assets/); sostituire con una disegnata.
