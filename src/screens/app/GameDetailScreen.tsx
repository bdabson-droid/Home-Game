import React, { useLayoutEffect, useMemo } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { Avatar } from '../../components/Avatar';
import { colors, radius, spacing } from '../../theme';
import { formatPhone, formatRelative } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'GameDetail'>;

export function GameDetailScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const user = useAuthStore((s) => s.user);
  const game = useGamesStore((s) => s.getGame(gameId));
  const sessions = useGamesStore((s) => s.sessionsForGame(gameId));
  const regenerateInviteCode = useGamesStore((s) => s.regenerateInviteCode);
  const removeMember = useGamesStore((s) => s.removeMember);
  const leaveGame = useGamesStore((s) => s.leaveGame);

  const isHost = !!user && !!game && game.hostId === user.id;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: game?.name ?? 'Home game',
      headerRight: isHost
        ? () => (
            <Pressable
              hitSlop={10}
              onPress={() => navigation.navigate('EditGame', { gameId })}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, game?.name, isHost, gameId]);

  const activeSession = useMemo(() => sessions.find((s) => s.status === 'live'), [sessions]);

  if (!game || !user) {
    return (
      <Screen>
        <Text style={styles.title}>Game not found.</Text>
        <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const share = async () => {
    try {
      await Share.share({
        message:
          `Join my poker home game "${game.name}" on Home Game.\n` +
          `Open the app and enter code: ${game.inviteCode}`,
      });
    } catch {
      // user cancelled
    }
  };

  const rotateCode = () => {
    Alert.alert(
      'Regenerate code?',
      'The old code will stop working immediately. Anyone already in the game stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => regenerateInviteCode(game.id),
        },
      ],
    );
  };

  const kick = (memberId: string, name: string) => {
    Alert.alert('Remove player', `Remove ${name} from this game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMember(game.id, memberId),
      },
    ]);
  };

  const leave = () => {
    Alert.alert('Leave game', `Leave "${game.name}"? You'll need a new invite to rejoin.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveGame(game.id, user.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar name={game.name} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>{game.name}</Text>
          <Text style={styles.subtitle}>
            {game.stakes ? `${game.stakes} · ` : ''}Hosted by {game.hostName}
          </Text>
          {game.location ? <Text style={styles.meta}>{game.location}</Text> : null}
        </View>
      </View>

      {game.description ? (
        <Card>
          <Text style={styles.body}>{game.description}</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardLabel}>Invite code</Text>
            <Text style={styles.code}>{game.inviteCode}</Text>
          </View>
          <View style={styles.codeActions}>
            <Pressable onPress={share} style={styles.iconBtn}>
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </Pressable>
            {isHost ? (
              <Pressable onPress={rotateCode} style={styles.iconBtn}>
                <Ionicons name="refresh" size={20} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.helper}>
          Share this code with new players. They can join for free by entering it during sign-up.
        </Text>
        {isHost ? (
          <View style={styles.inviteBtn}>
            <Button
              title="Invite by phone number"
              onPress={() => navigation.navigate('InvitePlayers', { gameId })}
              variant="secondary"
              leftIcon={<Ionicons name="person-add-outline" size={16} color={colors.text} />}
            />
          </View>
        ) : null}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        {isHost ? (
          <Pressable
            hitSlop={8}
            onPress={() => navigation.navigate('NewSession', { gameId })}
            style={styles.linkBtn}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.linkText}>New session</Text>
          </Pressable>
        ) : null}
      </View>

      {activeSession ? (
        <Card onPress={() => navigation.navigate('SessionDetail', { sessionId: activeSession.id })}>
          <View style={styles.rowBetween}>
            <View>
              <Pill label="Live" tone="success" />
              <Text style={styles.sessionTitle}>Session in progress</Text>
              <Text style={styles.meta}>
                Started {formatRelative(activeSession.startedAt)} · {activeSession.buyIns.length} buy-in
                {activeSession.buyIns.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {sessions
        .filter((s) => s.id !== activeSession?.id)
        .slice(0, 8)
        .map((s) => (
          <Card key={s.id} onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <View style={styles.rowGap}>
                  {s.status === 'scheduled' ? (
                    <Pill label="Scheduled" tone="accent" />
                  ) : (
                    <Pill label="Settled" />
                  )}
                </View>
                <Text style={styles.sessionTitle}>
                  {s.status === 'scheduled' && s.scheduledFor
                    ? formatRelative(s.scheduledFor)
                    : `${s.buyIns.length} buy-in${s.buyIns.length === 1 ? '' : 's'}`}
                </Text>
                <Text style={styles.meta}>
                  {s.location ? `${s.location} · ` : ''}
                  {formatRelative(s.startedAt ?? s.scheduledFor ?? 0)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        ))}

      {sessions.length === 0 ? (
        <Card>
          <Text style={styles.body}>
            No sessions yet.{' '}
            {isHost ? 'Start one when the game kicks off tonight.' : 'Your host will schedule the next session.'}
          </Text>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Players ({game.members.length})</Text>
      {game.members.map((m) => (
        <Card key={m.userId}>
          <View style={styles.row}>
            <Avatar name={m.displayName} size={40} />
            <View style={styles.playerInfo}>
              <View style={styles.rowGap}>
                <Text style={styles.playerName}>{m.displayName}</Text>
                {m.role === 'host' ? <Pill label="Host" tone="success" /> : null}
                {m.userId === user.id ? <Pill label="You" tone="accent" /> : null}
              </View>
              <Text style={styles.meta}>{formatPhone(m.phone)}</Text>
            </View>
            {isHost && m.userId !== user.id ? (
              <Pressable onPress={() => kick(m.userId, m.displayName)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      ))}

      <View style={styles.footer}>
        {!isHost ? (
          <Button title="Leave game" variant="danger" onPress={leave} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  body: { color: colors.text, lineHeight: 20 },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  code: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 4,
  },
  codeActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 },
  inviteBtn: { marginTop: spacing.md },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  playerInfo: { flex: 1, marginLeft: spacing.md },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 6 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: colors.primary, fontWeight: '600' },
  footer: { marginTop: spacing.lg },
});
