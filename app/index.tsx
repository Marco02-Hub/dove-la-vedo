import React, { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesFilter } from '@/api';
import { MatchCard } from '@/components/MatchCard';
import { Notice, SectionLabel, Toggle } from '@/components/ui';
import { useFeed } from '@/feed';
import { agoLabel, dayKey, dayOf } from '@/format';
import { usePrefs } from '@/prefs';
import { colors, fonts } from '@/theme';
import type { Competition, Filter, Match } from '@/types';

type CompFilter = 'all' | Competition;

const COMP_LABEL: Record<Competition, string> = { serie_a: 'Serie A', ucl: 'Champions' };

export default function WeekScreen() {
  const { feed, refreshing, offline, refresh } = useFeed();
  const { prefs, update } = usePrefs();
  const [comp, setComp] = useState<CompFilter>('all');
  const filters = useMemo(() => new Set<Filter>(prefs.filters), [prefs.filters]);

  const toggleFilter = (f: Filter) => {
    const next = new Set(filters);
    next.has(f) ? next.delete(f) : next.add(f);
    if (next.size === 0) return; // almeno un filtro attivo
    update({ filters: [...next] });
  };

  const sections = useMemo(() => {
    const now = Date.now() - 2 * 60 * 60 * 1000; // tiene le partite in corso
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000; // oltre: tab Calendario
    const list = feed.matches
      .filter((m) => new Date(m.kickoff).getTime() > now && new Date(m.kickoff).getTime() < limit)
      .filter((m) => comp === 'all' || m.competition === comp)
      .filter((m) => matchesFilter(m, filters))
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

    // Sezioni: giorno + competizione; in Champions prima le italiane, poi le top europee.
    const map = new Map<string, { title: string; sub?: string; data: Match[] }>();
    for (const m of list) {
      const sub = m.competition === 'ucl' ? (m.group === 'italiane' ? 'ITALIANE' : 'TOP EUROPEE') : undefined;
      const key = `${dayKey(m.kickoff)}|${m.competition}|${sub ?? ''}`;
      if (!map.has(key)) map.set(key, { title: `${COMP_LABEL[m.competition]} · ${dayOf(m.kickoff)}`, sub, data: [] });
      map.get(key)!.data.push(m);
    }
    return [...map.values()];
  }, [feed, comp, filters]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 8 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Dove la vedo</Text>
              <View style={styles.ch}>
                <Text style={styles.chText}>CH</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: offline ? colors.warn : colors.accent }]} />
              <Text style={styles.status}>
                Fonti controllate {agoLabel(feed.updatedAt)}
                {offline ? ' · dati salvati' : ''}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <SectionLabel>MOSTRA SOLO</SectionLabel>
              <View style={styles.row}>
                <Toggle label="Gratis" active={filters.has('gratis')} onPress={() => toggleFilter('gratis')} />
                <Toggle label="Sky" active={filters.has('sky')} onPress={() => toggleFilter('sky')} />
                <Toggle label="DAZN" active={filters.has('dazn')} onPress={() => toggleFilter('dazn')} />
              </View>
            </View>
            <View style={styles.row}>
              <Toggle label="Tutte" active={comp === 'all'} onPress={() => setComp('all')} />
              <Toggle label="Serie A" active={comp === 'serie_a'} onPress={() => setComp('serie_a')} />
              <Toggle label="Champions" active={comp === 'ucl'} onPress={() => setComp('ucl')} />
            </View>

            {(filters.has('sky') || filters.has('dazn')) && (
              <Notice>
                Sky e DAZN Italia funzionano in Italia e nell'UE. Dalla Svizzera di solito l'app è bloccata: la
                portabilità vale solo nell'UE.
              </Notice>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.sub ? <SectionLabel>{section.sub}</SectionLabel> : null}
          </View>
        )}
        renderItem={({ item }) => <MatchCard match={item} filters={filters} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nessuna partita con le opzioni scelte nei prossimi giorni.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30, textTransform: 'uppercase' },
  ch: { backgroundColor: colors.swiss, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  sectionHeader: { paddingTop: 20, paddingBottom: 10, gap: 4 },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase' },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, paddingTop: 24, textAlign: 'center' },
});
