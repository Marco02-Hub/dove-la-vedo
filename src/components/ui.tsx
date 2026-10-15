import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import type { Broadcaster } from '../types';

export function Chip({ b }: { b: Broadcaster }) {
  const free = b.kind === 'free_ch' || b.kind === 'free_it';
  const filled = free && b.confirmed;
  return (
    <View
      style={[
        styles.chip,
        filled ? { backgroundColor: colors.accent } : free ? styles.chipOutline : { backgroundColor: colors.text },
      ]}
    >
      <Text style={[styles.chipText, { color: free && !filled ? colors.text : colors.onAccent }]}>
        {free ? (b.kind === 'free_ch' ? 'Gratis CH · ' : 'Gratis IT · ') : ''}
        {b.name}
      </Text>
    </View>
  );
}

export function Notice({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.notice, style]}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.toggle, active ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
    >
      <Text style={[styles.toggleText, { color: active ? colors.onAccent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const styles = StyleSheet.create({
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipOutline: { borderWidth: 1, borderColor: colors.warn },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  notice: {
    backgroundColor: colors.warnBg,
    borderColor: colors.warnBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noticeText: { color: colors.warnText, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  toggle: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  label: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
});
