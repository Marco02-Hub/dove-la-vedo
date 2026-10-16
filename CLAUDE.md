# CLAUDE.md — Dove la vedo

App Expo (SDK 57, expo-router, TypeScript strict) che mostra dove vedere in Svizzera Serie A e Champions League.
L'utente parla italiano: testi UI, commenti e messaggi in italiano.

## Regole di prodotto
- Mostrare SOLO 5 tipi di emittente: `free_ch` (SRG: RSI/SRF/RTS), `free_it` (in chiaro in Italia), `sky`, `dazn`,
  `prime` (Amazon Prime Video: l'utente lo vede dalla Svizzera). Nessun'altra piattaforma a pagamento (niente blue, Paramount...). Il filtro vale sia nel backend
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
- `npx expo start` — avvio (`--web` per la versione web)
- `npx expo export --platform web` — verifica la build web (poi cancella `dist/`)
- `npm run typecheck` — deve passare senza errori
- `npx expo export --platform android` — verifica che il bundle compili (poi cancella `dist/`)
- `npm run update-feed` — aggiorna data/matches.json (serve ANTHROPIC_API_KEY)
- Usare `npx expo install <pkg>` (non `npm install`) per le dipendenze native, così le versioni restano allineate all'SDK.

## Aggiornare le partite (a mano, gratis)
Il feed online è https://raw.githubusercontent.com/Marco02-Hub/dove-la-vedo/main/data/matches.json.
Il workflow GitHub è solo manuale (l'API Anthropic è a pagamento): i dati si aggiornano quando l'utente
chiede "aggiorna le partite". Procedura:
1. `git pull` (il repo è Marco02-Hub/dove-la-vedo).
2. Cercare sul web le partite dei prossimi ~3 settimane: Serie A (anticipi/posticipi con DAZN/Sky) e Champions
   (italiane + `TOP_TEAMS`), più la partita gratis del mercoledì (SRG: SRF zwei/RSI LA2/RTS 2; TV8) e
   l'esclusiva Prime Video del mercoledì.
3. Riscrivere data/matches.json (forma in src/types.ts, id `<competition>-<YYYY-MM-DD>-<casa>-<ospite>`).
   Attenzione al fuso: +02:00 fino all'ultima domenica di ottobre, poi +01:00 (fino all'ultima di marzo).
   Fonti discordanti o solo aggregatori → `confirmed: false` con una nota.
4. `npm run typecheck`, commit, e chiedere all'utente di fare `git push`.

## Versione web (PWA)
L'utente ha un iPhone senza account sviluppatore Apple: l'app principale è la versione web su GitHub Pages
(https://marco02-hub.github.io/dove-la-vedo/, `experiments.baseUrl` = `/dove-la-vedo`), pubblicata da
`.github/workflows/deploy-web.yml`. Il codice che non funziona nel browser ha una variante `*.web.ts`
(notifiche e background disattivati). Ogni modifica va verificata anche con l'export web.

## Prossimi passi (TODO)
1. Fatto: repo online e feedUrl impostato. Aggiornamento automatico disattivato (vedi sopra).
2. Prova su telefono con build di sviluppo (`eas build -p android --profile development`): notifiche e
   aggiornamento in background (src/background.ts) non sono ancora stati verificati su un dispositivo.
3. Pubblicazione: `eas init`, build `production` e store.
4. Lingua del commento: per ora solo italiano (selettore tolto da Avvisi; `prefs.language` resta a 'it').
   In futuro il backend aggiunge `language: 'it'|'fr'|'de'` a ogni emittente e l'app ordina di conseguenza.
5. Icona: versione provvisoria generata via script (assets/); sostituire con una disegnata.
