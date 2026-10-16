import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Filter } from './types';

export interface Prefs {
  filters: Filter[];
  /** Squadre seguite (nome come appare nel feed) */
  teams: string[];
  /** Avvisi per tutte le partite di Champions */
  allChampions: boolean;
  notifyBefore: boolean;
  notifyChange: boolean;
  language: 'it' | 'fr' | 'de';
}

const DEFAULT: Prefs = {
  filters: ['gratis', 'sky', 'dazn', 'prime'],
  teams: [],
  allChampions: false,
  notifyBefore: true,
  notifyChange: true,
  language: 'it',
};

const KEY = 'prefs:v1';

/** Legge le preferenze salvate (usato anche dal task in background, fuori da React). */
export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT;
}

interface Ctx {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<Ctx>({ prefs: DEFAULT, update: () => {} });

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const update = (patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return <PrefsContext.Provider value={{ prefs, update }}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
