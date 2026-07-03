import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../src/api/client';
import type { GameListItem } from '../../src/api/types';
import { Badge, Button, Card } from '../../src/components/ui';
import { colors, font, radius, spacing } from '../../src/theme';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function GamesList() {
  const router = useRouter();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.listGames();
      setGames(res.games);
    } catch {
      // Leave existing list; errors surface elsewhere.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={games}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
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
        ListHeaderComponent={
          <Button
            title="+  Host a new home game"
            onPress={() => router.push('/game/create')}
            style={{ marginBottom: spacing.lg }}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="albums-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyBody}>
                Host your own game, or join one with a code from the Join tab.
              </Text>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/game/${item.id}`)}>
            <Card style={{ marginBottom: spacing.md }}>
              <View style={styles.rowBetween}>
                <Text style={styles.gameName}>{item.name}</Text>
                <Badge
                  label={item.role === 'host' ? 'HOST' : 'PLAYER'}
                  color={item.role === 'host' ? colors.gold : colors.felt}
                />
              </View>
              {item.location ? <Text style={styles.meta}>📍 {item.location}</Text> : null}
              <Text style={styles.meta}>
                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                {item.host?.name ? ` · Host: ${item.host.name}` : ''}
              </Text>
              {item.nextSession ? (
                <View style={styles.nextSession}>
                  <Ionicons name="calendar" size={14} color={colors.success} />
                  <Text style={styles.nextSessionText}>
                    Next: {formatDate(item.nextSession.scheduledAt)}
                  </Text>
                </View>
              ) : null}
              {item.joinCode ? (
                <Text style={styles.code}>Invite code: {item.joinCode}</Text>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameName: { color: colors.text, fontSize: font.h3, fontWeight: '700', flex: 1, marginRight: spacing.md },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
  nextSession: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  nextSessionText: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  code: {
    color: colors.gold,
    fontSize: font.small,
    marginTop: spacing.md,
    fontWeight: '700',
    backgroundColor: `${colors.gold}18`,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: spacing.md },
  emptyBody: {
    color: colors.textMuted,
    fontSize: font.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
