import { TIMEZONE } from './theme';

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE });
}

export function dayOf(iso: string): string {
  const s = new Date(iso).toLocaleDateString('it-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: TIMEZONE,
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Chiave del giorno nel fuso svizzero, es. "2026-10-21" */
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
}

export function agoLabel(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h fa`;
  return `${Math.round(h / 24)} g fa`;
}

/** Lunedì della settimana della partita (fuso svizzero), es. "2026-10-19" */
export function weekKey(iso: string): string {
  const d = new Date(`${dayKey(iso)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Es. "19 ott – 25 ott" a partire dalla chiave di weekKey */
export function weekLabel(key: string): string {
  const fmt = (d: Date) => d.toLocaleDateString('it-CH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const start = new Date(`${key}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${fmt(start)} – ${fmt(end)}`;
}
