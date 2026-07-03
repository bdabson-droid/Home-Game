import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateGame'>;

export function CreateGameScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const isHost = useSubscriptionStore((s) => s.isHost);
  const createGame = useGamesStore((s) => s.createGame);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [stakes, setStakes] = useState('');
  const [description, setDescription] = useState('');

  const create = () => {
    if (!user) return;
    if (!isHost(user.id)) {
      navigation.replace('Subscription', { fromCreateGame: true });
      return;
    }
    if (!name.trim()) {
      Alert.alert('Give it a name', 'Your home game needs a name.');
      return;
    }
    const g = createGame(user, { name, location, stakes, description });
    navigation.replace('GameDetail', { gameId: g.id });
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Text style={styles.title}>Set up your home game</Text>
      <Text style={styles.subtitle}>
        You'll get a unique 6-digit invite code and can invite players by phone number.
      </Text>

      <Input
        label="Game name"
        placeholder="e.g. Tuesday Night Poker"
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoFocus
      />
      <Input
        label="Location (optional)"
        placeholder="e.g. Alex's place"
        value={location}
        onChangeText={setLocation}
        maxLength={80}
      />
      <Input
        label="Stakes (optional)"
        placeholder="e.g. $1/$2 NLHE"
        value={stakes}
        onChangeText={setStakes}
        maxLength={40}
      />
      <Input
        label="Description (optional)"
        placeholder="House rules, buy-in, chip stack info…"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <Button title="Create game" onPress={create} size="lg" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
});
