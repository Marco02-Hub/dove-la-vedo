import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import bundled from '../data/matches.json';
import type { Feed, Filter, Match } from './types';

const CACHE_KEY = 'feed:v1';
const FEED_URL: string | undefined = (Constants.expoConfig?.extra as { feedUrl?: string } | undefined)?.feedUrl;

/** Dati di riserva inclusi nell'app, usati finché il feed online non risponde. */
export const bundledFeed = bundled as Feed;

export async function loadCachedFeed(): Promise<Feed> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Feed;
  } catch {}
  return bundledFeed;
}

/** Scarica il feed aggiornato dal backend. Restituisce null se offline o URL non configurato. */
export async function fetchFeed(): Promise<Feed | null> {
  if (!FEED_URL || FEED_URL.includes('TUO-UTENTE')) return null;
  try {
    const res = await fetch(`${FEED_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const feed = (await res.json()) as Feed;
    if (!Array.isArray(feed.matches)) return null;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed));
    return feed;
  } catch {
    return null;
  }
}

/** Una partita è visibile se ha almeno un'opzione tra quelle scelte (gratis / Sky / DAZN / Prime). */
export function matchesFilter(m: Match, filters: Set<Filter>): boolean {
  return m.broadcasters.some((b) => {
    if (b.kind === 'free_ch' || b.kind === 'free_it') return filters.has('gratis');
    return filters.has(b.kind);
  });
}

/** Firma delle emittenti, per capire se sono cambiate tra due aggiornamenti. */
export function broadcasterSignature(m: Match): string {
  return m.broadcasters
    .map((b) => `${b.kind}:${b.name}:${b.confirmed ? 1 : 0}`)
    .sort()
    .join('|');
}
