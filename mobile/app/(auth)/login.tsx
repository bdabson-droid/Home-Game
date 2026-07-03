import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  ErrorText,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors, spacing } from '../../lib/theme';

export default function LoginScreen() {
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { devCode } = await auth.requestOtp(phone.trim());
      setDevCode(devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await auth.verifyOtp(phone.trim(), code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Screen>
            <Title>Home Game</Title>
            <Muted>
              Run poker home games with your crew. Hosts create games and invite players by
              phone number, or share a numeric join code.
            </Muted>

            {step === 'phone' ? (
              <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
                <Subtitle>Sign in</Subtitle>
                <Input
                  label="Phone number"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChangeText={setPhone}
                />
                <ErrorText>{error}</ErrorText>
                <Button
                  label="Send code"
                  loading={loading}
                  disabled={phone.trim().length < 7}
                  onPress={requestOtp}
                />
                <Muted>
                  We&apos;ll text you a 6-digit code. New here? Signing in will create your
                  account.
                </Muted>
              </Card>
            ) : (
              <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
                <Subtitle>Enter your code</Subtitle>
                <Muted>Sent to {phone}</Muted>
                <Input
                  label="6-digit code"
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  placeholder="123456"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                />
                {devCode ? <Muted>Dev code: {devCode}</Muted> : null}
                <ErrorText>{error}</ErrorText>
                <Button
                  label="Verify & sign in"
                  loading={loading}
                  disabled={code.trim().length < 4}
                  onPress={verifyOtp}
                />
                <Button
                  variant="ghost"
                  label="Use a different number"
                  onPress={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                    setDevCode(null);
                  }}
                />
              </Card>
            )}
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
