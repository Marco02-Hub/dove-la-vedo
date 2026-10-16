// Versione web (PWA): expo-notifications non funziona nel browser, quindi gli avvisi sono disattivati.
import type { Prefs } from './prefs';
import type { Feed } from './types';

export const notificationsAvailable = false;

export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function scheduleKickoffReminders(_feed: Feed, _prefs: Prefs) {}

export async function notifyBroadcasterChanges(_feed: Feed, _prefs: Prefs) {}
