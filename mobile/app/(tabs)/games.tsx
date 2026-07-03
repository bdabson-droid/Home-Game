import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Subtitle, Title } from '../../components/ui';
import { api, type Game } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, spacing } from '../../lib/theme';

function formatWhen(ts: number | null): string {
  if (!ts) return 'No session scheduled';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GamesScreen() {
  const { token, canHost, user } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const { games } = await api.listGames(token);
      setGames(games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load games.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onCreate = () => {
    if (!canHost) {
      router.push('/subscription');
    } else {
      router.push('/games/new');
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>My Games</Title>
        <Pressable onPress={onCreate} hitSlop={10}>
          <Text style={{ color: colors.primary, fontSize: 32, fontWeight: '400' }}>＋</Text>
        </Pressable>
      </View>
      <Muted>
        Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Tap a game to see players and
        invites.
      </Muted>

      {error ? (
        <Card>
          <Muted>Error: {error}</Muted>
          <Button label="Retry" onPress={load} />
        </Card>
      ) : null}

      <FlatList
        data={games}
        keyExtractor={(g) => String(g.id)}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/games/${item.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Subtitle>{item.name}</Subtitle>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: item.is_host ? colors.primaryDark : colors.cardAlt },
                  ]}
                >
                  <Text
                    style={{
                      color: item.is_host ? colors.primary : colors.textMuted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {item.is_host ? 'HOST' : 'PLAYER'}
                  </Text>
                </View>
              </View>
              {item.stakes ? <Muted>Stakes: {item.stakes}</Muted> : null}
              {item.location ? <Muted>{item.location}</Muted> : null}
              <Muted>{formatWhen(item.next_session_at)}</Muted>
              <Muted>Join code: {item.join_code}</Muted>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <Muted>Loading…</Muted>
          ) : (
            <Card>
              <Subtitle>No games yet</Subtitle>
              <Muted>
                {canHost
                  ? 'Create your first game with the + button, or use the Join tab to enter a code.'
                  : 'Enter a numeric join code in the Join tab, or start a host subscription to run your own home game.'}
              </Muted>
              {!canHost ? (
                <Button label="Become a host" onPress={() => router.push('/subscription')} />
              ) : null}
            </Card>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
