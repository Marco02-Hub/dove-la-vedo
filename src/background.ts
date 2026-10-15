import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { fetchFeed } from './api';
import { notifyBroadcasterChanges, scheduleKickoffReminders } from './notifications';
import { loadPrefs } from './prefs';

const TASK = 'aggiorna-feed';

// Il task va definito a livello di modulo: il sistema può avviarlo ad app chiusa.
TaskManager.defineTask(TASK, async () => {
  try {
    const feed = await fetchFeed();
    if (!feed) return BackgroundTask.BackgroundTaskResult.Success; // offline o feed non configurato
    const prefs = await loadPrefs();
    await notifyBroadcasterChanges(feed, prefs);
    await scheduleKickoffReminders(feed, prefs);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Chiede al sistema di aggiornare il feed ogni ~3 ore (il momento esatto lo decide il sistema). */
export async function registerBackgroundUpdate() {
  if ((await BackgroundTask.getStatusAsync()) === BackgroundTask.BackgroundTaskStatus.Restricted) return;
  if (await TaskManager.isTaskRegisteredAsync(TASK)) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 180 });
}
