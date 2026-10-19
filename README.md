# Dove la vedo

App (Expo / React Native) che mostra dove vedere in Svizzera le partite di **Serie A** e **Champions League**:
solo opzioni **gratis**, **Sky Italia/NOW**, **DAZN Italia** e **Amazon Prime Video**.

## Come funziona

```
GitHub Actions (ogni 6 ore, gratis)
  └─ backend/auto-update.mjs → legge fonti pubbliche → scrive data/matches.json
                                                                   │
App sul telefono  ←── scarica il JSON da raw.githubusercontent.com ┘
  ├─ Settimana: prossimi 7 giorni filtrati (Gratis / Sky / DAZN, Serie A / Champions)
  ├─ Calendario: le settimane successive (fino a 3 settimane)
  ├─ Dettaglio: opzioni di visione, fonti, "segui queste squadre"
  └─ Avvisi: squadre seguite, notifica 30' prima, notifica se cambia emittente
     (anche ad app chiusa: il telefono riscarica il feed ogni ~3 ore)
```

Senza feed online l'app usa la copia di `data/matches.json` inclusa al momento della pubblicazione.

## App web su iPhone (consigliato, gratis)

L'app è pubblicata come sito su **https://marco02-hub.github.io/dove-la-vedo/** (workflow
`.github/workflows/deploy-web.yml`, a ogni push su main). Su iPhone: aprila in **Safari** → tasto
**Condividi** → **Aggiungi alla schermata Home**. Si apre a schermo intero come un'app.
Nella versione web non ci sono notifiche né aggiornamento in background.

Prova in locale: `npx expo start --web`.

## Avvio sul telefono con Expo Go (5 minuti)

1. Installa Node.js 20+ e l'app **Expo Go** sul telefono.
2. Nella cartella del progetto:
   ```bash
   npm install
   npx expo start
   ```
3. Scansiona il QR code con Expo Go (Android) o con la Fotocamera (iPhone).

> Le notifiche programmate e l'aggiornamento in background in Expo Go funzionano solo in parte; per provarli
> bene serve una build di sviluppo (`npx expo run:android` oppure EAS Build, vedi sotto).

## Aggiornamento automatico dei dati (gratis)

`.github/workflows/update-feed.yml` lancia `backend/auto-update.mjs` ogni 6 ore (e a mano dalla tab
Actions). Lo script non usa AI né chiavi: legge solo fonti pubbliche e salva `data/matches.json`.

| Dato | Fonte |
|---|---|
| Calendario e orari (prossimi 21 giorni) | API pubblica ESPN |
| Le 3 partite Sky per giornata di Serie A | programmi.sky.it ("trasmesse da Sky") |
| Prime Video, TV8, Sky in Champions (circa 7 giorni) | guida TV di Goal |
| Gratis in Svizzera (SRF zwei, RSI LA 2) | guide TV di fussballgucken.info |
| Correzioni a mano | `data/manual.json` |

Se una fonte non risponde lo script tiene i dati precedenti per quella parte. DAZN trasmette tutta la
Serie A, quindi è sempre indicato. Per correggere a mano una partita si aggiunge una voce in
`data/manual.json`, ad esempio:

```json
{ "ucl-2026-11-04-porto-napoli": { "broadcasters": [{ "kind": "prime", "name": "Prime Video", "confirmed": true }] } }
```

Prova in locale: `npm run update-feed`.

## Build per il telefono (EAS)

```bash
npm install -g eas-cli
eas login
eas init                                  # collega il progetto al tuo account Expo
eas build -p android --profile preview    # APK da installare direttamente
eas build -p android --profile development  # build di sviluppo: notifiche e background funzionano
```

Per gli store: `eas build -p android --profile production` e poi `eas submit -p android`
(serve un account Google Play Console).

## Limiti da sapere

- **Sky e DAZN Italia dalla Svizzera**: la portabilità degli abbonamenti vale solo nei Paesi UE, quindi
  dalla Svizzera le app sono di solito bloccate. L'app lo segnala con un avviso.
- I dati arrivano da guide TV pubbliche: le opzioni indicate solo da guide non ufficiali (es. SRG) sono
  marcate "da confermare".

## Struttura

```
app/                 schermate (expo-router)
  _layout.tsx        tab, font, provider
  index.tsx          Settimana
  calendario.tsx     Settimane successive
  partita/[id].tsx   Dettaglio partita
  avvisi.tsx         Preferenze e notifiche
src/
  types.ts           formato dei dati (condiviso col backend)
  api.ts             download/cache del feed, filtri
  feed.tsx           stato condiviso del feed
  prefs.tsx          preferenze salvate sul telefono
  notifications.ts   avvisi locali (notifications.web.ts: versione web senza notifiche)
  background.ts      aggiornamento del feed ad app chiusa (expo-background-task)
  components/        MatchCard, Chip, Toggle, Notice
assets/              icona e splash
public/              file del sito web: index.html (meta PWA), manifest.json, icone
backend/auto-update.mjs  fonti pubbliche → data/matches.json
data/matches.json    feed (anche dati di riserva)
data/manual.json     correzioni a mano, hanno la precedenza
.github/workflows/   aggiornamento programmato
```
