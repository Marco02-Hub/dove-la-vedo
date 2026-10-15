import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notice } from '@/components/ui';
import { useFeed } from '@/feed';
import { dayOf, timeOf } from '@/format';
import { usePrefs } from '@/prefs';
import { colors, fonts } from '@/theme';
import type { Broadcaster } from '@/types';

const KIND_LABEL: Record<Broadcaster['kind'], string> = {
  free_ch: 'Gratis in Svizzera',
  free_it: "Gratis in Italia (solo dall'Italia)",
  sky: 'Sky Italia / NOW',
  dazn: 'DAZN Italia',
};

// Ordine: prima il gratis visibile dalla Svizzera, poi il resto.
const ORDER: Broadcaster['kind'][] = ['free_ch', 'free_it', 'sky', 'dazn'];

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { feed } = useFeed();
  const { prefs, update } = usePrefs();
  const match = feed.matches.find((m) => m.id === id);

  if (!match) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.muted}>Partita non trovata.</Text>
      </SafeAreaView>
    );
  }

  const followed = prefs.teams.includes(match.home) || prefs.teams.includes(match.away);
  const hasFreeCh = match.broadcasters.some((b) => b.kind === 'free_ch');
  const sorted = [...match.broadcasters].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));

  const follow = () => {
    const teams = followed
      ? prefs.teams.filter((t) => t !== match.home && t !== match.away)
      : [...new Set([...prefs.teams, match.home, match.away])];
    update({ teams });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityLabel="Indietro" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.comp}>{match.competition === 'ucl' ? 'CHAMPIONS LEAGUE' : 'SERIE A'}</Text>
          <Text style={styles.teams}>
            {match.home}
            {'\n'}vs {match.away}
          </Text>
          <Text style={styles.muted}>
            {dayOf(match.kickoff)} · {timeOf(match.kickoff)}
          </Text>
        </View>

        <Text style={styles.h2}>Dove vederla</Text>

        {!hasFreeCh && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gratis in Svizzera</Text>
            <Text style={styles.muted}>Nessun canale svizzero in chiaro trovato per questa partita.</Text>
          </View>
        )}

        {sorted.map((b) => (
          <View key={`${b.kind}-${b.name}`} style={[styles.card, b.kind === 'free_ch' && { borderColor: colors.accent }]}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{b.name}</Text>
              <Text style={[styles.badge, !b.confirmed && { color: colors.warn, borderColor: colors.warn }]}>
                {b.confirmed ? 'Confermato' : 'Da confermare'}
              </Text>
            </View>
            <Text style={styles.muted}>
              {KIND_LABEL[b.kind]}
              {b.note ? ` · ${b.note}` : ''}
            </Text>
          </View>
        ))}

        {match.warning ? <Text style={styles.warn}>{match.warning}</Text> : null}

        {match.broadcasters.some((b) => b.kind === 'sky' || b.kind === 'dazn') && (
          <Notice>
            Da Losanna gli abbonamenti italiani sono di solito bloccati. Funzionano quando sei in Italia o in un Paese
            UE.
          </Notice>
        )}

        <View style={{ gap: 4 }}>
          <Text style={styles.small}>Fonti:</Text>
          {match.sources.map((s) => (
            <Text key={s} style={styles.link} onPress={() => Linking.openURL(s)} numberOfLines={1}>
              {s}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={follow} style={styles.cta}>
          <Text style={styles.ctaText}>{followed ? 'Smetti di seguire' : 'Avvisami (segui queste squadre)'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.text, fontSize: 26, marginTop: -3 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  comp: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  teams: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 38,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  h2: { color: colors.text, fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase', paddingTop: 8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16, flexShrink: 1 },
  badge: {
    color: colors.text,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  warn: { color: colors.warn, fontFamily: fonts.body, fontSize: 13 },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  link: { color: colors.accent, fontFamily: fonts.body, fontSize: 12 },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cta: { backgroundColor: colors.accent, borderRadius: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.onAccent, fontFamily: fonts.bodyBold, fontSize: 15 },
});
