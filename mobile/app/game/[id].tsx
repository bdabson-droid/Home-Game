import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  api,
  ApiError,
  Game,
  Invitation,
  Member,
  Session,
} from '../../src/api';
import { Badge, Button, Card, Input } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const [when, setWhen] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [sessLoc, setSessLoc] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const g = await api.getGame(id);
      setGame(g.game);
      const [m, s] = await Promise.all([api.listMembers(id), api.listSessions(id)]);
      setMembers(m.members);
      setSessions(s.sessions);
      if (g.game.isHost) {
        const inv = await api.listInvitations(id);
        setInvitations(inv.invitations);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load game');
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function shareCode() {
    if (!game?.joinCode) return;
    try {
      await Share.share({
        message: `Join my poker home game "${game.name}"! Open the Poker Home Game app and enter code ${game.joinCode}.`,
      });
    } catch {
      // ignore
    }
  }

  async function regenerate() {
    if (!game) return;
    Alert.alert('Regenerate code?', 'The old code will stop working immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: async () => {
          try {
            const res = await api.regenerateCode(game.id);
            setGame({ ...game, joinCode: res.joinCode });
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed');
          }
        },
      },
    ]);
  }

  async function invite() {
    if (!game || !invitePhone.trim()) return;
    setInviting(true);
    try {
      const res = await api.invite(game.id, invitePhone.trim());
      setInvitePhone('');
      await load();
      Alert.alert(
        res.autoAdded ? 'Added to game' : 'Invitation sent',
        res.autoAdded
          ? 'That player already had an account and was added directly.'
          : `We texted an invite to ${res.invited} with the join code.`,
      );
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not invite');
    } finally {
      setInviting(false);
    }
  }

  async function revoke(inv: Invitation) {
    if (!game) return;
    try {
      await api.revokeInvitation(game.id, inv.id);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function removeMember(m: Member) {
    if (!game) return;
    Alert.alert('Remove member?', `Remove ${m.displayName || m.phone} from this game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeMember(game.id, m.id);
            await load();
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed');
          }
        },
      },
    ]);
  }

  async function scheduleSession() {
    if (!game || !when.trim()) return;
    const parsed = new Date(when.trim());
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert('Invalid date', 'Use a format like 2026-08-15 19:30');
      return;
    }
    setScheduling(true);
    try {
      await api.createSession(game.id, {
        scheduledAt: parsed.toISOString(),
        buyIn: buyIn.trim() || undefined,
        location: sessLoc.trim() || undefined,
      });
      setWhen('');
      setBuyIn('');
      setSessLoc('');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not schedule');
    } finally {
      setScheduling(false);
    }
  }

  async function rsvp(session: Session, status: 'yes' | 'no' | 'maybe') {
    try {
      await api.rsvp(session.id, status);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function deleteGame() {
    if (!game) return;
    Alert.alert('Delete game?', 'This permanently deletes the game for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGame(game.id);
            router.replace('/(tabs)');
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed');
          }
        },
      },
    ]);
  }

  if (!game) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? 'Loading…'}</Text>
      </View>
    );
  }

  const isHost = game.isHost;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.gold}
        />
      }
    >
      <Stack.Screen options={{ title: game.name }} />

      <Card style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.h1}>{game.name}</Text>
          {isHost ? <Badge text="HOST" tone="gold" /> : <Badge text="PLAYER" />}
        </View>
        {game.stakes ? <Text style={styles.meta}>Stakes: {game.stakes}</Text> : null}
        {game.location ? <Text style={styles.meta}>📍 {game.location}</Text> : null}
        {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}
      </Card>

      {isHost && game.joinCode ? (
        <Card style={styles.section}>
          <Text style={styles.h2}>Game code</Text>
          <Text style={styles.code}>{game.joinCode}</Text>
          <Text style={styles.muted}>Share this code so players can join instantly.</Text>
          <View style={styles.rowGap}>
            <Button title="Share" onPress={shareCode} style={{ flex: 1 }} />
            <Button title="New code" variant="secondary" onPress={regenerate} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      {isHost ? (
        <Card style={styles.section}>
          <Text style={styles.h2}>Invite by phone</Text>
          <Text style={styles.muted}>
            Enter a player's phone number. If they already use the app they're added instantly;
            otherwise they get a text with the join code.
          </Text>
          <View style={{ height: spacing.md }} />
          <Input
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
            value={invitePhone}
            onChangeText={setInvitePhone}
          />
          <Button title="Send invite" onPress={invite} loading={inviting} disabled={!invitePhone.trim()} />
          {invitations.filter((i) => i.status === 'pending').length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.h3}>Pending invitations</Text>
              {invitations
                .filter((i) => i.status === 'pending')
                .map((inv) => (
                  <View key={inv.id} style={styles.rowItem}>
                    <Text style={styles.itemText}>{inv.phone}</Text>
                    <Button title="Revoke" variant="ghost" onPress={() => revoke(inv)} style={styles.smallBtn} />
                  </View>
                ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.h2}>Members ({members.length})</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>
                {m.displayName || m.phone || 'Player'}
                {m.role === 'host' ? '  ♚' : ''}
              </Text>
              {isHost && m.phone ? <Text style={styles.subText}>{m.phone}</Text> : null}
            </View>
            {isHost && m.role !== 'host' ? (
              <Button title="Remove" variant="ghost" onPress={() => removeMember(m)} style={styles.smallBtn} />
            ) : null}
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.h2}>Game nights</Text>
        {sessions.length === 0 ? (
          <Text style={styles.muted}>No game nights scheduled yet.</Text>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.sessionItem}>
              <Text style={styles.itemText}>{new Date(s.scheduledAt).toLocaleString()}</Text>
              {s.location ? <Text style={styles.subText}>📍 {s.location}</Text> : null}
              {s.buyIn ? <Text style={styles.subText}>Buy-in: {s.buyIn}</Text> : null}
              <Text style={styles.subText}>{s.going} going</Text>
              <View style={styles.rsvpRow}>
                {(['yes', 'maybe', 'no'] as const).map((opt) => (
                  <Button
                    key={opt}
                    title={opt === 'yes' ? "I'm in" : opt === 'maybe' ? 'Maybe' : 'Out'}
                    variant={s.myRsvp === opt ? 'primary' : 'secondary'}
                    onPress={() => rsvp(s, opt)}
                    style={styles.rsvpBtn}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        {isHost ? (
          <View style={styles.scheduleBox}>
            <Text style={styles.h3}>Schedule a game night</Text>
            <Input
              label="When (YYYY-MM-DD HH:MM)"
              placeholder="2026-08-15 19:30"
              value={when}
              onChangeText={setWhen}
            />
            <Input label="Buy-in" placeholder="$100" value={buyIn} onChangeText={setBuyIn} />
            <Input label="Location" placeholder="Optional" value={sessLoc} onChangeText={setSessLoc} />
            <Button title="Add game night" onPress={scheduleSession} loading={scheduling} disabled={!when.trim()} />
          </View>
        ) : null}
      </Card>

      {isHost ? (
        <Button title="Delete game" variant="danger" onPress={deleteGame} style={{ marginTop: spacing.sm }} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  section: { marginBottom: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1, marginRight: spacing.sm },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  h3: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  meta: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 14 },
  desc: { color: colors.text, marginTop: spacing.md, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  code: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 8,
    marginVertical: spacing.sm,
    textAlign: 'center',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  subText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  smallBtn: { height: 36, paddingHorizontal: spacing.md },
  sessionItem: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rsvpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rsvpBtn: { flex: 1, height: 40, paddingHorizontal: spacing.sm },
  scheduleBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
