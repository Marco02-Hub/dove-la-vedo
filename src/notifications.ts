import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { broadcasterSignature } from './api';
import type { Prefs } from './prefs';
import type { Feed, Match } from './types';

const SIG_KEY = 'signatures:v1';

export const notificationsAvailable = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function isFollowed(m: Match, prefs: Prefs): boolean {
  if (prefs.allChampions && m.competition === 'ucl') return true;
  return prefs.teams.some((t) => t === m.home || t === m.away);
}

function where(m: Match): string {
  return m.broadcasters.map((b) => b.name).join(' · ');
}

/** Riprogramma gli avvisi "30 minuti prima" per le partite seguite. */
export async function scheduleKickoffReminders(feed: Feed, prefs: Prefs) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.notifyBefore) return;
  const now = Date.now();
  for (const m of feed.matches) {
    if (!isFollowed(m, prefs)) continue;
    const at = new Date(m.kickoff).getTime() - 30 * 60 * 1000;
    if (at <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: `${m.home} – ${m.away} tra 30 minuti`, body: `Dove: ${where(m)}`, data: { id: m.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    });
  }
}

/** Confronta le emittenti con l'ultimo aggiornamento e avvisa se sono cambiate. */
export async function notifyBroadcasterChanges(feed: Feed, prefs: Prefs) {
  let previous: Record<string, string> = {};
  try {
    previous = JSON.parse((await AsyncStorage.getItem(SIG_KEY)) ?? '{}');
  } catch {}
  const next: Record<string, string> = {};
  for (const m of feed.matches) {
    const sig = broadcasterSignature(m);
    next[m.id] = sig;
    if (prefs.notifyChange && previous[m.id] && previous[m.id] !== sig && isFollowed(m, prefs)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: `Cambio emittente: ${m.home} – ${m.away}`, body: `Ora: ${where(m)}`, data: { id: m.id } },
        trigger: null,
      });
    }
  }
  await AsyncStorage.setItem(SIG_KEY, JSON.stringify(next));
}
