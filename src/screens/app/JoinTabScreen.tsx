import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Join'>,
  NativeStackScreenProps<AppStackParamList>
>;

export function JoinTabScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [code, setCode] = useState('');
  const joinByCode = useGamesStore((s) => s.joinByCode);
  const acceptInvite = useGamesStore((s) => s.acceptInvite);
  const pendingInvitesForPhone = useGamesStore((s) => s.pendingInvitesForPhone);
  const games = useGamesStore((s) => s.games);

  const invites = useMemo(
    () => (user ? pendingInvitesForPhone(user.phone) : []),
    [pendingInvitesForPhone, user, games],
  );

  const join = () => {
    if (!user) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      Alert.alert('Invalid code', 'Enter the 6-digit numeric game code.');
      return;
    }
    try {
      const game = joinByCode({ user, code: trimmed });
      setCode('');
      navigation.navigate('GameDetail', { gameId: game.id });
    } catch (e) {
      Alert.alert('Could not join', (e as Error).message);
    }
  };

  const accept = (inviteId: string) => {
    if (!user) return;
    try {
      const game = acceptInvite({ user, inviteId });
      navigation.navigate('GameDetail', { gameId: game.id });
    } catch (e) {
      Alert.alert('Could not accept', (e as Error).message);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Join a home game</Text>
      <Text style={styles.subtitle}>
        Ask your host for the 6-digit code, or accept an invite sent to your phone number.
      </Text>

      <Card>
        <Input
          label="Game code"
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <Button title="Join game" onPress={join} />
      </Card>

      <Text style={styles.sectionTitle}>Invites for you</Text>
      {invites.length === 0 ? (
        <Card>
          <View style={styles.emptyRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={styles.emptyText}>No pending invites right now.</Text>
          </View>
        </Card>
      ) : (
        invites.map((inv) => {
          const game = games.find((g) => g.id === inv.gameId);
          if (!game) return null;
          return (
            <Card key={inv.id}>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameMeta}>
                Invited by {inv.invitedByName}
                {game.stakes ? ` · ${game.stakes}` : ''}
              </Text>
              <View style={styles.actions}>
                <Button title="Accept" onPress={() => accept(inv.id)} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.textMuted },
  gameName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  gameMeta: { color: colors.textMuted, marginTop: 4 },
  actions: { marginTop: spacing.md },
});
