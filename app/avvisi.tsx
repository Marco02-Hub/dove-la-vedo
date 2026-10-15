import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionLabel } from '@/components/ui';
import { useFeed } from '@/feed';
import { ensurePermission } from '@/notifications';
import { usePrefs, type Prefs } from '@/prefs';
import { colors, fonts } from '@/theme';

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

export default function AlertsScreen() {
  const { prefs, update } = usePrefs();
  const { feed } = useFeed();

  // Squadre disponibili = tutte quelle presenti nel feed.
  const allTeams = useMemo(
    () => [...new Set(feed.matches.flatMap((m) => [m.home, m.away]))].sort((a, b) => a.localeCompare(b)),
    [feed],
  );

  const setNotify = async (patch: Partial<Prefs>) => {
    if (Object.values(patch).some(Boolean)) await ensurePermission();
    update(patch);
  };

  const toggleTeam = async (t: string) => {
    const has = prefs.teams.includes(t);
    if (!has) await ensurePermission();
    update({ teams: has ? prefs.teams.filter((x) => x !== t) : [...prefs.teams, t] });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>Avvisi</Text>
          <Text style={styles.muted}>L'app controlla le fonti e ti avvisa solo quando serve.</Text>
        </View>

        <View style={styles.block}>
          <SectionLabel>SQUADRE CHE SEGUI</SectionLabel>
          <View style={styles.pills}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: prefs.allChampions }}
              onPress={() => setNotify({ allChampions: !prefs.allChampions })}
              style={[styles.pill, prefs.allChampions && styles.pillOn]}
            >
              <Text style={[styles.pillText, prefs.allChampions && { color: colors.onAccent }]}>Tutta la Champions</Text>
            </Pressable>
            {allTeams.map((t) => {
              const on = prefs.teams.includes(t);
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleTeam(t)}
                  style={[styles.pill, on && styles.pillOn]}
                >
                  <Text style={[styles.pillText, on && { color: colors.onAccent }]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <SectionLabel>NOTIFICHE</SectionLabel>
          <Row label="30 min prima del fischio" value={prefs.notifyBefore} onChange={(v) => setNotify({ notifyBefore: v })} />
          <Row label="Se cambia emittente" value={prefs.notifyChange} onChange={(v) => setNotify({ notifyChange: v })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30, textTransform: 'uppercase' },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, paddingTop: 4 },
  block: { gap: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
});
