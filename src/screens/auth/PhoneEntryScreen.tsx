import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { normalizePhone } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation, route }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const intent = route.params?.intent ?? 'signIn';
  const code = route.params?.code;

  const submit = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid number', 'Please enter a valid phone number, including country code.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(normalized);
      navigation.navigate('OtpVerify', { phone: normalized, intent, code });
    } catch (e) {
      Alert.alert('Could not send code', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <Text style={styles.title}>What's your number?</Text>
      <Text style={styles.subtitle}>
        We'll text you a 6-digit code to sign in. Your phone number is used to invite you to home
        games.
      </Text>

      <View style={styles.form}>
        <Input
          label="Mobile number"
          placeholder="+1 555 000 1234"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoFocus
          value={phone}
          onChangeText={setPhone}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Button title="Send code" onPress={submit} loading={loading} size="lg" />
        <Text style={styles.mockHint}>
          Demo mode: any 6-digit code will verify successfully.
        </Text>
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
  form: { marginTop: spacing.md },
  mockHint: {
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
