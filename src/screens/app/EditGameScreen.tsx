import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditGame'>;

export function EditGameScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const game = useGamesStore((s) => s.getGame(gameId));
  const updateGame = useGamesStore((s) => s.updateGame);

  const [name, setName] = useState(game?.name ?? '');
  const [location, setLocation] = useState(game?.location ?? '');
  const [stakes, setStakes] = useState(game?.stakes ?? '');
  const [description, setDescription] = useState(game?.description ?? '');

  if (!game) {
    return (
      <Screen>
        <Text style={styles.title}>Game not found.</Text>
      </Screen>
    );
  }

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Give it a name', 'Your home game needs a name.');
      return;
    }
    updateGame(gameId, { name, location, stakes, description });
    navigation.goBack();
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Text style={styles.title}>Edit game</Text>
      <Text style={styles.subtitle}>Update the details players see.</Text>

      <Input label="Game name" value={name} onChangeText={setName} maxLength={60} />
      <Input label="Location" value={location} onChangeText={setLocation} maxLength={80} />
      <Input label="Stakes" value={stakes} onChangeText={setStakes} maxLength={40} />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <Button title="Save changes" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
});
