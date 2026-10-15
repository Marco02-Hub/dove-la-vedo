import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { timeOf } from '../format';
import { colors, fonts } from '../theme';
import type { Filter, Match } from '../types';
import { Chip } from './ui';

export function MatchCard({ match, filters }: { match: Match; filters: Set<Filter> }) {
  const visible = match.broadcasters.filter((b) =>
    b.kind === 'free_ch' || b.kind === 'free_it' ? filters.has('gratis') : filters.has(b.kind),
  );
  const unconfirmedFree = visible.some((b) => (b.kind === 'free_ch' || b.kind === 'free_it') && !b.confirmed);

  return (
    <Link href={{ pathname: '/partita/[id]', params: { id: match.id } }} asChild>
      <Pressable accessibilityRole="link" style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.teams}>
            {match.home} – {match.away}
          </Text>
          <Text style={styles.time}>{timeOf(match.kickoff)}</Text>
        </View>
        <View style={styles.chips}>
          {visible.map((b) => (
            <Chip key={`${b.kind}-${b.name}`} b={b} />
          ))}
        </View>
        {match.warning ? <Text style={styles.warn}>{match.warning}</Text> : null}
        {unconfirmedFree && !match.warning ? <Text style={styles.warn}>Gratis: candidata, da confermare</Text> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  teams: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 17, flexShrink: 1 },
  time: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  warn: { color: colors.warn, fontFamily: fonts.body, fontSize: 12 },
});
