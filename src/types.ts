// Tipi condivisi tra app e backend (il backend produce data/matches.json con questa forma).

/** Solo queste opzioni vengono mostrate: tutto il resto a pagamento è escluso. */
export type BroadcasterKind =
  | 'free_ch' // in chiaro in Svizzera (SRG: RSI, SRF, RTS)
  | 'free_it' // in chiaro in Italia (TV8, Rai, Mediaset...) - visibile solo dall'Italia
  | 'sky' // Sky Italia / NOW
  | 'dazn'; // DAZN Italia

export interface Broadcaster {
  kind: BroadcasterKind;
  /** Nome visualizzato, es. "RSI LA2", "Sky Sport", "DAZN" */
  name: string;
  /** Nota breve, es. "commento IT", "solo dall'Italia" */
  note?: string;
  /** false = candidato o non ancora ufficiale */
  confirmed: boolean;
}

export type Competition = 'serie_a' | 'ucl';

export interface Match {
  /** id stabile: competizione-data-casa-ospite, es. "ucl-2026-10-21-bayern-arsenal" */
  id: string;
  competition: Competition;
  /** Per la Champions: "italiane" o "top"; per la Serie A sempre "serie_a" */
  group: 'italiane' | 'top' | 'serie_a';
  home: string;
  away: string;
  /** ISO 8601 con fuso, es. "2026-10-21T21:00:00+02:00" */
  kickoff: string;
  broadcasters: Broadcaster[];
  /** Avviso specifico, es. "il mercoledì Amazon sceglie una partita" */
  warning?: string;
  sources: string[];
}

export interface Feed {
  /** ISO 8601: quando il backend ha controllato le fonti */
  updatedAt: string;
  matches: Match[];
}

export type Filter = 'gratis' | 'sky' | 'dazn';
