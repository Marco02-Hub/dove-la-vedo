import React, { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesFilter } from '@/api';
import { MatchCard } from '@/components/MatchCard';
import { SectionLabel, Toggle } from '@/components/ui';
import { useFeed } from '@/feed';
import { dayOf, weekKey, weekLabel } from '@/format';
import { usePrefs } from '@/prefs';
import { colors, fonts } from '@/theme';
import type { Competition, Filter, Match } from '@/types';

type CompFilter = 'all' | Competition;

export default function CalendarScreen() {
  const { feed, refreshing, refresh } = useFeed();
  const { prefs } = usePrefs();
  const [comp, setComp] = useState<CompFilter>('all');
  const filters = useMemo(() => new Set<Filter>(prefs.filters), [prefs.filters]);

  // Tutte le partite future raggruppate per settimana (lunedì–domenica, ora svizzera).
  const sections = useMemo(() => {
    const now = Date.now() - 2 * 60 * 60 * 1000;
    const list = feed.matches
      .filter((m) => new Date(m.kickoff).getTime() > now)
      .filter((m) => comp === 'all' || m.competition === comp)
      .filter((m) => matchesFilter(m, filters))
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

    const thisWeek = weekKey(new Date().toISOString());
    const map = new Map<string, { title: string; sub: string; data: Match[] }>();
    for (const m of list) {
      const key = weekKey(m.kickoff);
      if (!map.has(key)) {
        map.set(key, { title: key === thisWeek ? 'Questa settimana' : weekLabel(key), sub: '', data: [] });
      }
      map.get(key)!.data.push(m);
    }
    for (const s of map.values()) {
      const unconfirmed = s.data.filter((m) => m.broadcasters.every((b) => !b.confirmed)).length;
      s.sub = `${s.data.length} PARTITE${unconfirmed ? ` · ${unconfirmed} DA CONFERMARE` : ''}`;
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
            <View>
              <Text style={styles.title}>Calendario</Text>
              <Text style={styles.muted}>
                Le prossime settimane. Più la partita è lontana, più è probabile che l'emittente sia da confermare.
              </Text>
            </View>
            <View style={styles.row}>
              <Toggle label="Tutte" active={comp === 'all'} onPress={() => setComp('all')} />
              <Toggle label="Serie A" active={comp === 'serie_a'} onPress={() => setComp('serie_a')} />
              <Toggle label="Champions" active={comp === 'ucl'} onPress={() => setComp('ucl')} />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <SectionLabel>{section.sub}</SectionLabel>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const prev = section.data[index - 1];
          const newDay = !prev || dayOf(prev.kickoff) !== dayOf(item.kickoff);
          return (
            <View style={{ gap: 6 }}>
              {newDay ? <Text style={styles.day}>{dayOf(item.kickoff)}</Text> : null}
              <MatchCard match={item} filters={filters} />
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nessuna partita in calendario con le opzioni scelte.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30, textTransform: 'uppercase' },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, paddingTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  sectionHeader: { paddingTop: 20, paddingBottom: 10, gap: 4 },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase' },
  day: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13, paddingTop: 4 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, paddingTop: 24, textAlign: 'center' },
});
