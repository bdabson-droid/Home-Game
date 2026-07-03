import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ApiError } from '../../src/api/client';
import type { GameDetail, GameSession } from '../../src/api/types';
import { Badge, Button, Card, Divider, Input } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, font, radius, spacing } from '../../src/theme';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

const sessionStatusColor: Record<string, string> = {
  scheduled: colors.gold,
  live: colors.success,
  completed: colors.textMuted,
  canceled: colors.danger,
};

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameId = id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  // New session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sDate, setSDate] = useState('');
  const [sTime, setSTime] = useState('19:00');
  const [sLocation, setSLocation] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getGame(gameId);
      setGame(res.game);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [gameId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!game) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const isHost = game.role === 'host';

  async function shareCode() {
    if (!game?.joinCode) return;
    await Share.share({
      message: `Join my poker home game "${game.name}" on Home Game. Use code ${game.joinCode} to sign up.`,
    });
  }

  async function sendInvite() {
    if (!invitePhone.trim()) return;
    setInviting(true);
    try {
      await api.invite(gameId, invitePhone.trim());
      setInvitePhone('');
      await load();
      Alert.alert('Invite sent', 'They will get a text with your game code.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not invite');
    } finally {
      setInviting(false);
    }
  }

  async function createSession() {
    const dateStr = sDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD.');
      return;
    }
    const timeStr = /^\d{2}:\d{2}$/.test(sTime.trim()) ? sTime.trim() : '19:00';
    const when = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(when.getTime())) {
      Alert.alert('Invalid date/time', 'Please check the values.');
      return;
    }
    setCreatingSession(true);
    try {
      await api.createSession(gameId, {
        scheduledAt: when.toISOString(),
        location: sLocation.trim() || undefined,
      });
      setShowSessionForm(false);
      setSDate('');
      setSLocation('');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not schedule');
    } finally {
      setCreatingSession(false);
    }
  }

  async function rsvp(session: GameSession, answer: 'yes' | 'no' | 'maybe') {
    try {
      await api.rsvp(gameId, session.id, { rsvp: answer });
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not RSVP');
    }
  }

  async function revokeInvite(inviteId: string) {
    await api.revokeInvite(gameId, inviteId);
    await load();
  }

  async function removeMember(userId: string, name: string | null) {
    Alert.alert('Remove player', `Remove ${name ?? 'this player'} from the game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.removeMember(gameId, userId);
          await load();
        },
      },
    ]);
  }

  function confirmDeleteOrLeave() {
    if (isHost) {
      Alert.alert('Delete game', 'This permanently deletes the game for everyone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await api.deleteGame(gameId);
            router.replace('/(tabs)');
          },
        },
      ]);
    } else {
      Alert.alert('Leave game', 'You can rejoin later with the code.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await api.leaveGame(gameId);
            router.replace('/(tabs)');
          },
        },
      ]);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
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
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{game.name}</Text>
          <Badge label={isHost ? 'HOST' : 'PLAYER'} color={isHost ? colors.gold : colors.felt} />
        </View>
        {game.location ? <Text style={styles.meta}>📍 {game.location}</Text> : null}
        {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}
        <Text style={styles.meta}>Default buy-in: ${game.defaultBuyIn}</Text>
      </Card>

      {/* Host: invite code */}
      {isHost && game.joinCode ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Invite code</Text>
          <Text style={styles.codeBig}>{game.joinCode}</Text>
          <Text style={styles.muted}>Anyone with this code can sign up for this game.</Text>
          <Button title="Share invite" onPress={shareCode} variant="secondary" style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}

      {/* Host: invite by phone */}
      {isHost ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Invite by phone</Text>
          <View style={styles.inviteRow}>
            <Input
              value={invitePhone}
              onChangeText={setInvitePhone}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
              style={{ flex: 1 }}
            />
            <Button
              title="Invite"
              onPress={sendInvite}
              loading={inviting}
              disabled={invitePhone.trim().length < 7}
              style={{ marginLeft: spacing.md, paddingHorizontal: spacing.lg }}
            />
          </View>
          {game.pendingInvites && game.pendingInvites.length > 0 ? (
            <>
              <Divider />
              <Text style={styles.muted}>Pending invites</Text>
              {game.pendingInvites.map((inv) => (
                <View key={inv.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{inv.phone}</Text>
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={colors.danger}
                    onPress={() => revokeInvite(inv.id)}
                  />
                </View>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {/* Members */}
      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.sectionTitle}>Players ({game.members.length})</Text>
        {game.members.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {m.name ?? 'Player'}
                {m.userId === user?.id ? ' (you)' : ''}
              </Text>
              {m.phone ? <Text style={styles.muted}>{m.phone}</Text> : null}
            </View>
            {m.role === 'host' ? (
              <Badge label="HOST" color={colors.gold} />
            ) : isHost ? (
              <Ionicons
                name="remove-circle"
                size={22}
                color={colors.danger}
                onPress={() => removeMember(m.userId, m.name)}
              />
            ) : null}
          </View>
        ))}
      </Card>

      {/* Sessions */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Game nights</Text>
          {isHost ? (
            <Ionicons
              name={showSessionForm ? 'close' : 'add-circle'}
              size={26}
              color={colors.gold}
              onPress={() => setShowSessionForm((s) => !s)}
            />
          ) : null}
        </View>

        {showSessionForm ? (
          <View style={styles.sessionForm}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <Input value={sDate} onChangeText={setSDate} placeholder="2026-07-10" />
            <Text style={[styles.label, { marginTop: spacing.md }]}>Time (HH:MM)</Text>
            <Input value={sTime} onChangeText={setSTime} placeholder="19:00" />
            <Text style={[styles.label, { marginTop: spacing.md }]}>Location (optional)</Text>
            <Input value={sLocation} onChangeText={setSLocation} placeholder={game.location ?? 'Where?'} />
            <Button title="Schedule game night" onPress={createSession} loading={creatingSession} style={{ marginTop: spacing.md }} />
          </View>
        ) : null}

        {game.sessions.length === 0 ? (
          <Text style={[styles.muted, { marginTop: spacing.md }]}>No game nights scheduled yet.</Text>
        ) : (
          game.sessions.map((s) => {
            const mySeat = s.seats?.find((seat) => seat.userId === user?.id);
            return (
              <View key={s.id} style={styles.sessionCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sessionDate}>{fmtDate(s.scheduledAt)}</Text>
                  <Badge label={s.status.toUpperCase()} color={sessionStatusColor[s.status] ?? colors.textMuted} />
                </View>
                {s.location ? <Text style={styles.muted}>📍 {s.location}</Text> : null}
                <Text style={styles.muted}>
                  {(s.seats?.filter((x) => x.rsvp === 'yes').length ?? 0)} going
                </Text>
                {s.status === 'scheduled' || s.status === 'live' ? (
                  <View style={styles.rsvpRow}>
                    {(['yes', 'maybe', 'no'] as const).map((ans) => (
                      <Button
                        key={ans}
                        title={ans === 'yes' ? "I'm in" : ans === 'maybe' ? 'Maybe' : 'Out'}
                        variant={mySeat?.rsvp === ans ? 'primary' : 'ghost'}
                        onPress={() => rsvp(s, ans)}
                        style={styles.rsvpBtn}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Card>

      <Button
        title={isHost ? 'Delete game' : 'Leave game'}
        variant="danger"
        onPress={confirmDeleteOrLeave}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '800', flex: 1, marginRight: spacing.md },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
  desc: { color: colors.text, fontSize: font.body, marginTop: spacing.sm, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
  label: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  codeBig: {
    color: colors.gold,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: spacing.sm,
  },
  inviteRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberName: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  sessionForm: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sessionCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sessionDate: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  rsvpRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  rsvpBtn: { flex: 1, height: 40 },
});
