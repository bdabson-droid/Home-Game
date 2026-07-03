import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, ErrorText, Input, Muted, Screen, Subtitle, Title } from '../../components/ui';
import { api, type GameDetail } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, radius, spacing } from '../../lib/theme';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameId = Number(id);
  const { token } = useAuth();
  const router = useRouter();

  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.gameDetail(token, gameId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load game.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, gameId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const invite = async () => {
    if (!token) return;
    setInviteError(null);
    setInviteNotice(null);
    setInviting(true);
    try {
      const res = await api.invitePlayer(token, gameId, invitePhone.trim());
      setInvitePhone('');
      setInviteNotice(
        res.status === 'added'
          ? 'Added — they already had an account.'
          : 'Invite sent by SMS. They can join with the code too.',
      );
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed.');
    } finally {
      setInviting(false);
    }
  };

  const shareCode = async () => {
    if (!detail) return;
    await Share.share({
      message: `Join my poker home game "${detail.game.name}" — use join code ${detail.game.join_code} in the Home Game app.`,
    });
  };

  const removeMember = (userId: number, name: string | null) => {
    if (!token || !detail) return;
    Alert.alert('Remove player?', `Remove ${name || 'this player'} from ${detail.game.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeMember(token, gameId, userId);
            await load();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove player.');
          }
        },
      },
    ]);
  };

  const cancelInvite = async (inviteId: number) => {
    if (!token) return;
    try {
      await api.cancelInvite(token, gameId, inviteId);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel invite.');
    }
  };

  const leaveOrDelete = () => {
    if (!token || !detail) return;
    const isHost = detail.game.is_host;
    Alert.alert(
      isHost ? 'Delete game?' : 'Leave game?',
      isHost
        ? 'This deletes the game for everyone.'
        : 'You will need a new invite or code to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isHost ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isHost) {
                await api.deleteGame(token, gameId);
              } else {
                await api.leaveGame(token, gameId);
              }
              router.back();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed.');
            }
          },
        },
      ],
    );
  };

  if (loading || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        {error ? (
          <Screen>
            <ErrorText>{error}</ErrorText>
            <Button label="Retry" onPress={load} />
          </Screen>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const { game, players, pending_invites } = detail;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>{game.name}</Title>
          {game.is_host ? (
            <View style={styles.hostBadge}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>HOST</Text>
            </View>
          ) : null}
        </View>
        {game.stakes ? <Muted>Stakes: {game.stakes}</Muted> : null}
        {game.location ? <Muted>{game.location}</Muted> : null}
        {game.description ? <Muted>{game.description}</Muted> : null}

        <Card>
          <Subtitle>Join code</Subtitle>
          <Text style={styles.joinCode}>{game.join_code}</Text>
          <Muted>Share this 6-digit code with any player who wants to join.</Muted>
          <Button label="Share code" variant="ghost" onPress={shareCode} />
        </Card>

        {game.is_host ? (
          <Card>
            <Subtitle>Invite by phone</Subtitle>
            <Input
              label="Phone number"
              keyboardType="phone-pad"
              placeholder="+1 555 123 4567"
              value={invitePhone}
              onChangeText={setInvitePhone}
            />
            {inviteNotice ? <Muted>{inviteNotice}</Muted> : null}
            <ErrorText>{inviteError}</ErrorText>
            <Button
              label="Send invite"
              loading={inviting}
              disabled={invitePhone.trim().length < 7}
              onPress={invite}
            />
          </Card>
        ) : null}

        <Card>
          <Subtitle>Players ({players.length})</Subtitle>
          {players.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>
                  {p.name || 'Unnamed'} {p.role === 'host' ? '(host)' : ''}
                </Text>
                <Muted>{p.phone}</Muted>
              </View>
              {game.is_host && p.role !== 'host' ? (
                <Pressable onPress={() => removeMember(p.id, p.name)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>

        {game.is_host && pending_invites.length > 0 ? (
          <Card>
            <Subtitle>Pending invites</Subtitle>
            {pending_invites.map((inv) => (
              <View key={inv.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>{inv.phone}</Text>
                  <Muted>
                    Invited {new Date(inv.created_at).toLocaleDateString()} — not signed up yet.
                  </Muted>
                </View>
                <Pressable onPress={() => cancelInvite(inv.id)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        <Button
          variant="danger"
          label={game.is_host ? 'Delete game' : 'Leave game'}
          onPress={leaveOrDelete}
        />
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  joinCode: {
    color: colors.accent,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  hostBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
});
