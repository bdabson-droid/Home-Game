import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'JoinWithCode'>;

export function JoinWithCodeScreen({ navigation }: Props) {
  const [code, setCode] = useState('');

  const submit = () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      Alert.alert('Invalid code', 'Enter the 6-digit numeric code your host shared with you.');
      return;
    }
    navigation.navigate('PhoneEntry', { intent: 'joinCode', code: trimmed });
  };

  return (
    <Screen keyboardAvoiding>
      <Text style={styles.title}>Got a code?</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit game code from your host, then verify your phone number. You'll be
        added to the game as soon as you sign in.
      </Text>
      <View style={styles.form}>
        <Input
          label="Game code"
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          value={code}
          onChangeText={setCode}
        />
        <Button title="Continue" onPress={submit} size="lg" />
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
});
