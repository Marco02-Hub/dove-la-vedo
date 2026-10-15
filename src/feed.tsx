import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { bundledFeed, fetchFeed, loadCachedFeed } from './api';
import { notifyBroadcasterChanges, scheduleKickoffReminders } from './notifications';
import { usePrefs } from './prefs';
import type { Feed } from './types';

interface Ctx {
  feed: Feed;
  refreshing: boolean;
  /** true se l'ultimo tentativo di scaricare il feed è fallito */
  offline: boolean;
  refresh: () => Promise<void>;
}

const FeedContext = createContext<Ctx>({
  feed: bundledFeed,
  refreshing: false,
  offline: false,
  refresh: async () => {},
});

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePrefs();
  const [feed, setFeed] = useState<Feed>(bundledFeed);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const fresh = await fetchFeed();
    setOffline(!fresh);
    if (fresh) {
      setFeed(fresh);
      await notifyBroadcasterChanges(fresh, prefs).catch(() => {});
    }
    setRefreshing(false);
  }, [prefs]);

  useEffect(() => {
    loadCachedFeed().then(setFeed);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Riprogramma gli avvisi quando cambiano dati o preferenze.
  useEffect(() => {
    scheduleKickoffReminders(feed, prefs).catch(() => {});
  }, [feed, prefs]);

  return <FeedContext.Provider value={{ feed, refreshing, offline, refresh }}>{children}</FeedContext.Provider>;
}

export const useFeed = () => useContext(FeedContext);
