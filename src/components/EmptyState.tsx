import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing } from '../theme';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
  secondaryCta?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = 'sparkles-outline', title, subtitle, cta, secondaryCta }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {cta ? (
        <View style={styles.cta}>
          <Button title={cta.label} onPress={cta.onPress} />
        </View>
      ) : null}
      {secondaryCta ? (
        <View style={styles.secondaryCta}>
          <Button title={secondaryCta.label} variant="secondary" onPress={secondaryCta.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: { marginTop: spacing.lg, alignSelf: 'stretch' },
  secondaryCta: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
