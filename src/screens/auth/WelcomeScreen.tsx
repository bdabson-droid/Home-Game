import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.chip}>
          <View style={[styles.chipDot, { backgroundColor: colors.chipRed }]} />
          <View style={[styles.chipDot, { backgroundColor: colors.chipGreen }]} />
          <View style={[styles.chipDot, { backgroundColor: colors.chipBlack }]} />
        </View>
        <Text style={styles.brand}>Home Game</Text>
        <Text style={styles.tagline}>
          Run your poker home game. Invite the regulars, track buy-ins, and settle up when the
          chips fall.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Sign in with phone"
          size="lg"
          onPress={() => navigation.navigate('PhoneEntry', { intent: 'signIn' })}
        />
        <View style={styles.spacer} />
        <Button
          title="Have a code? Join a game"
          size="lg"
          variant="secondary"
          onPress={() => navigation.navigate('JoinWithCode')}
        />
      </View>

      <Text style={styles.legal}>
        Hosting a home game requires a subscription. Joining as a player is always free.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.bgCard,
    borderWidth: 4,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xl,
  },
  chipDot: { width: 12, height: 12, borderRadius: 6 },
  brand: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -0.5 },
  tagline: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    maxWidth: 320,
  },
  actions: { marginBottom: spacing.lg },
  spacer: { height: spacing.md },
  legal: {
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
