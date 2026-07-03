import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { formatPhone } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route }: Props) {
  const { phone, intent, code: joinCode } = route.params;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmOtp = useAuthStore((s) => s.confirmOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const joinByCode = useGamesStore((s) => s.joinByCode);

  const verify = async () => {
    setLoading(true);
    try {
      const user = await confirmOtp(code, name || undefined);
      if (intent === 'joinCode' && joinCode) {
        try {
          joinByCode({ user, code: joinCode });
        } catch (e) {
          Alert.alert('Signed in', `We couldn't join that game: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      Alert.alert('Verification failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await sendOtp(phone);
      Alert.alert('Code sent', `A new code has been sent to ${formatPhone(phone)}.`);
    } catch (e) {
      Alert.alert('Could not resend', (e as Error).message);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to <Text style={styles.strong}>{formatPhone(phone)}</Text>.
      </Text>

      <View style={styles.form}>
        <Input
          label="Verification code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          value={code}
          onChangeText={setCode}
        />
        <Input
          label="Your name (shown to other players)"
          placeholder="e.g. Alex R."
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Button title="Verify & continue" onPress={verify} loading={loading} size="lg" />
        <View style={styles.resend}>
          <Text style={styles.resendText}>Didn't get it?</Text>
          <Button title="Resend code" variant="ghost" fullWidth={false} onPress={resend} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: spacing.md },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  strong: { color: colors.text, fontWeight: '600' },
  form: { marginTop: spacing.md },
  resend: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resendText: { color: colors.textMuted },
});
