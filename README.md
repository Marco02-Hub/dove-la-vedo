# Dove la vedo

App (Expo / React Native) che mostra dove vedere in Svizzera le partite di **Serie A** e **Champions League**:
solo opzioni **gratis**, **Sky Italia/NOW**, **DAZN Italia** e **Amazon Prime Video**.

## Come funziona

```
GitHub Actions (2 volte al giorno)
  └─ backend/update.mjs  → cerca sul web con l'API di Claude → scrive data/matches.json
                                                                   │
App sul telefono  ←── scarica il JSON da raw.githubusercontent.com ┘
  ├─ Settimana: prossimi 7 giorni filtrati (Gratis / Sky / DAZN, Serie A / Champions)
  ├─ Calendario: le settimane successive (fino a 3 settimane)
  ├─ Dettaglio: opzioni di visione, fonti, "segui queste squadre"
  └─ Avvisi: squadre seguite, notifica 30' prima, notifica se cambia emittente
     (anche ad app chiusa: il telefono riscarica il feed ogni ~3 ore)
```

Senza feed online l'app usa i dati inclusi in `data/matches.json` (settimana del 18–21 ottobre 2026).

## Avvio sul telefono (5 minuti)

1. Installa Node.js 20+ e l'app **Expo Go** sul telefono.
2. Nella cartella del progetto:
   ```bash
   npm install
   npx expo start
   ```
3. Scansiona il QR code con Expo Go (Android) o con la Fotocamera (iPhone).

> Le notifiche programmate e l'aggiornamento in background in Expo Go funzionano solo in parte; per provarli
> bene serve una build di sviluppo (`npx expo run:android` oppure EAS Build, vedi sotto).

## Attivare l'aggiornamento automatico (facoltativo, a pagamento)

Per ora i dati si aggiornano a mano con Claude Code (vedi CLAUDE.md) e il workflow parte solo se lanciato
dalla tab Actions. Per renderlo automatico servono una chiave API Anthropic (a consumo) e le righe `schedule`
in `.github/workflows/update-feed.yml`.

1. Crea un repository GitHub (anche privato va bene per le Actions, ma il JSON deve essere leggibile:
   usa un repo **pubblico** oppure sposta il feed su un hosting tuo).
2. Fai il push di questa cartella.
3. In GitHub → Settings → Secrets and variables → Actions aggiungi `ANTHROPIC_API_KEY`.
4. In `app.json` sostituisci `TUO-UTENTE` nell'URL `extra.feedUrl` con il tuo utente GitHub.
5. Lancia a mano la prima volta: tab **Actions** → "Aggiorna partite" → **Run workflow**.

Prova del backend in locale:
```bash
ANTHROPIC_API_KEY=sk-... npm run update-feed
```

Il backend usa `claude-opus-5-5` (cambiabile con `ANTHROPIC_MODEL`) e cerca le partite dei prossimi
21 giorni (`DAYS_AHEAD`). Costo indicativo: una richiesta con fino a 30 ricerche web per esecuzione,
2 esecuzioni al giorno.

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
- I dati arrivano da una ricerca web automatica: le opzioni non confermate sono marcate "da confermare".

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
  notifications.ts   avvisi locali
  background.ts      aggiornamento del feed ad app chiusa (expo-background-task)
  components/        MatchCard, Chip, Toggle, Notice
assets/              icona e splash
backend/update.mjs   ricerca web → data/matches.json
data/matches.json    feed (anche dati di riserva)
.github/workflows/   aggiornamento programmato
```
