import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

type Props = {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
};

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.bgElevated, fg: colors.textMuted },
  success: { bg: 'rgba(47, 191, 113, 0.15)', fg: colors.primary },
  warning: { bg: 'rgba(245, 165, 36, 0.15)', fg: colors.warning },
  danger: { bg: 'rgba(229, 72, 77, 0.15)', fg: colors.danger },
  accent: { bg: 'rgba(61, 139, 253, 0.15)', fg: colors.accent },
};

export function Pill({ label, tone = 'neutral', style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
});
