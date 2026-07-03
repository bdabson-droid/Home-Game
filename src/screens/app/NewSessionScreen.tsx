import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewSession'>;

export function NewSessionScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const createSession = useGamesStore((s) => s.createSession);

  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const startNow = () => {
    const s = createSession({ gameId, location, notes, startNow: true });
    navigation.replace('SessionDetail', { sessionId: s.id });
  };

  const schedule = () => {
    const s = createSession({ gameId, location, notes });
    navigation.replace('SessionDetail', { sessionId: s.id });
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Text style={styles.title}>New session</Text>
      <Text style={styles.subtitle}>
        Track buy-ins and settle up at the end of the night.
      </Text>
      <Input
        label="Location (optional)"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Alex's place"
      />
      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="House rules for tonight…"
        multiline
        numberOfLines={4}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <Button title="Start now" onPress={startNow} size="lg" />
      <Button title="Save as draft" variant="secondary" onPress={schedule} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
});
