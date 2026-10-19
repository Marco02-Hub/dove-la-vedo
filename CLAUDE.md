# CLAUDE.md — Dove la vedo

App Expo (SDK 57, expo-router, TypeScript strict) che mostra dove vedere in Svizzera Serie A e Champions League.
L'utente parla italiano: testi UI, commenti e messaggi in italiano.

## Regole di prodotto
- Mostrare SOLO 5 tipi di emittente: `free_ch` (SRG: RSI/SRF/RTS), `free_it` (in chiaro in Italia), `sky`, `dazn`,
  `prime` (Amazon Prime Video: l'utente lo vede dalla Svizzera). Nessun'altra piattaforma a pagamento (niente blue, Paramount...). Il filtro vale sia nel backend
  (`goalKinds` in backend/auto-update.mjs) sia nell'app (`matchesFilter` in src/api.ts).
- **Costo zero:** niente API a pagamento (nemmeno l'API Anthropic), niente servizi con carta di credito.
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
- `npm run update-feed` — aggiorna data/matches.json dalle fonti pubbliche (gratis, nessuna chiave)
- Usare `npx expo install <pkg>` (non `npm install`) per le dipendenze native, così le versioni restano allineate all'SDK.

## Aggiornamento dei dati
Il feed online è https://raw.githubusercontent.com/Marco02-Hub/dove-la-vedo/main/data/matches.json.
**Automatico:** `.github/workflows/update-feed.yml` lancia `backend/auto-update.mjs` ogni 6 ore (fonti e
logica descritte in testa al file e nel README). Se una fonte cambia formato, lo script la salta e tiene i
dati vecchi: controllare il log del workflow e correggere il parser.

**Quando l'utente chiede di aggiornare o correggere qualcosa:**
1. `git pull --rebase` (il bot fa commit ogni 6 ore).
2. Lanciare `npm run update-feed` e controllare il risultato. Per dati che le fonti automatiche non danno
   (es. Prime/TV8 oltre la settimana della guida Goal, conferme SRG ufficiali) cercare sul web e scriverli in
   `data/manual.json` (`{ "<id>": { broadcasters?, warning?, sources? } }`), poi rilanciare lo script.
   Fonti discordanti o solo aggregatori → `confirmed: false` con una nota.
3. `npm run typecheck`, commit e **`git push` fatto da Claude**: l'utente non deve usare né il terminale né
   GitHub. Se il push fallisce per conflitto col bot: `git pull --rebase` e ripetere.

## Versione web (PWA)
L'utente ha un iPhone senza account sviluppatore Apple: l'app principale è la versione web su GitHub Pages
(https://marco02-hub.github.io/dove-la-vedo/, `experiments.baseUrl` = `/dove-la-vedo`), pubblicata da
`.github/workflows/deploy-web.yml`. Il codice che non funziona nel browser ha una variante `*.web.ts`
(notifiche e background disattivati). Ogni modifica va verificata anche con l'export web.

## Prossimi passi (TODO)
1. Fatto: repo online, feedUrl impostato, aggiornamento automatico gratuito (vedi sopra).
2. Prova su telefono con build di sviluppo (`eas build -p android --profile development`): notifiche e
   aggiornamento in background (src/background.ts) non sono ancora stati verificati su un dispositivo.
3. Pubblicazione: `eas init`, build `production` e store.
4. Lingua del commento: per ora solo italiano (selettore tolto da Avvisi; `prefs.language` resta a 'it').
   In futuro il backend aggiunge `language: 'it'|'fr'|'de'` a ogni emittente e l'app ordina di conseguenza.
5. Icona: versione provvisoria generata via script (assets/); sostituire con una disegnata.
