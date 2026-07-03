import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api, ApiError, Game } from '../../src/api';
import { Badge, Button, Card } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function GamesList() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listGames();
      setGames(res.games);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={games}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.listContent}
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
          <View style={styles.actions}>
            <Button title="+ Create home game" onPress={() => router.push('/create-game')} />
            <Button
              title="Join with a code"
              variant="secondary"
              onPress={() => router.push('/join')}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/game/${item.id}`)}>
            <Card style={styles.gameCard}>
              <View style={styles.gameHeader}>
                <Text style={styles.gameName}>{item.name}</Text>
                {item.isHost ? <Badge text="HOST" tone="gold" /> : <Badge text="PLAYER" />}
              </View>
              {item.stakes ? <Text style={styles.gameMeta}>Stakes: {item.stakes}</Text> : null}
              {item.location ? <Text style={styles.gameMeta}>📍 {item.location}</Text> : null}
              <Text style={styles.gameMembers}>
                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                {item.joinCode ? `  •  Code ${item.joinCode}` : ''}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyText}>
                {error
                  ? error
                  : 'Create your own home game as a host, or join a friend’s game with a 6-digit code.'}
              </Text>
            </Card>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  actions: { marginBottom: spacing.lg },
  gameCard: { marginBottom: spacing.md },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameName: { fontSize: 18, fontWeight: '800', color: colors.text, flex: 1, marginRight: spacing.sm },
  gameMeta: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 14 },
  gameMembers: { color: colors.gold, marginTop: spacing.sm, fontWeight: '600', fontSize: 13 },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
