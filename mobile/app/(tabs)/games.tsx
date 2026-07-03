import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api, HomeGame, GameInvite } from '../../lib/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

export default function GamesScreen() {
  const { user } = useAuth();
  const [games, setGames] = useState<HomeGame[]>([]);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [gamesRes, invitesRes] = await Promise.all([
        api.getGames(),
        api.getPendingInvites(),
      ]);
      setGames(gamesRes.games);
      setInvites(invitesRes.invites);
    } catch {
      // handled silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const acceptInvite = async (inviteId: string) => {
    try {
      const res = await api.acceptInvite(inviteId);
      if (res.status === 'waiting') {
        alert(`Game is full. You're #${res.waitingPosition} on the waiting list.`);
      }
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to accept invite');
    }
  };

  const renderGame = ({ item }: { item: HomeGame }) => (
    <TouchableOpacity onPress={() => router.push(`/game/${item.id}`)}>
      <Card style={styles.gameCard}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameName}>{item.name}</Text>
          {item.hostId === user?.id && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>HOST</Text>
            </View>
          )}
        </View>
        {item.location ? <Text style={styles.gameMeta}>📍 {item.location}</Text> : null}
        {item.scheduledAt ? (
          <Text style={styles.gameMeta}>
            🗓 {new Date(item.scheduledAt).toLocaleString()}
          </Text>
        ) : null}
        <View style={styles.gameFooter}>
          <Text style={styles.memberCount}>
            {item.memberCount ?? 0}/{item.maxSeats ?? '?'} seats
            {item.userStatus === 'waiting' ? ' · Waiting' : ''}
          </Text>
          <Text style={styles.joinCode}>Code: {item.joinCode}</Text>
        </View>
        {item.userStatus === 'waiting' && item.waitingPosition ? (
          <Text style={styles.waitingBadge}>
            Waitlist position #{item.waitingPosition}
          </Text>
        ) : null}
        {item.isFull && item.waitingCount ? (
          <Text style={styles.waitingMeta}>{item.waitingCount} on waitlist</Text>
        ) : null}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {user?.isHost && (
        <View style={styles.createRow}>
          <Button
            title="+ New Home Game"
            onPress={() => router.push('/game/create')}
          />
        </View>
      )}

      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {invites.map((invite) => (
            <Card key={invite.id} style={styles.inviteCard}>
              <Text style={styles.inviteTitle}>{invite.gameName}</Text>
              <Text style={styles.inviteMeta}>From {invite.hostName}</Text>
              <Button
                title="Accept Invite"
                onPress={() => acceptInvite(invite.id)}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Your Games</Text>
      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        renderItem={renderGame}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🃏</Text>
              <Text style={styles.emptyText}>No games yet</Text>
              <Text style={styles.emptyHint}>
                Join a game with a code or wait for an invite
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  createRow: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  invitesSection: {
    marginBottom: spacing.md,
  },
  inviteCard: {
    marginBottom: spacing.sm,
  },
  inviteTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inviteMeta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  gameCard: {
    marginBottom: spacing.sm,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '800',
  },
  gameMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  memberCount: {
    color: colors.textMuted,
    fontSize: 13,
  },
  joinCode: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  waitingBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  waitingMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
