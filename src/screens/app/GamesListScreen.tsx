import React, { useLayoutEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing } from '../../theme';
import { formatRelative } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Games'>,
  NativeStackScreenProps<AppStackParamList>
>;

export function GamesListScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const games = useGamesStore((s) => s.games);
  const isHost = useSubscriptionStore((s) => s.isHost);

  const myGames = useMemo(
    () => (user ? games.filter((g) => g.members.some((m) => m.userId === user.id)) : []),
    [games, user],
  );

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      // no-op, ensures parent header stays consistent
    });
  }, [navigation]);

  const onNew = () => {
    if (!user) return;
    if (!isHost(user.id)) {
      navigation.navigate('Subscription', { fromCreateGame: true });
    } else {
      navigation.navigate('CreateGame');
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.hi}>Welcome back{user?.displayName ? `, ${user.displayName}` : ''}</Text>
          <Text style={styles.subtitle}>Your poker home games</Text>
        </View>
        <Pressable onPress={onNew} style={styles.newBtn}>
          <Ionicons name="add" size={22} color="#08120C" />
        </Pressable>
      </View>

      {myGames.length === 0 ? (
        <EmptyState
          icon="game-controller-outline"
          title="No home games yet"
          subtitle="Host a new game to invite the regulars, or join an existing game with a code."
          cta={{ label: 'Host a new home game', onPress: onNew }}
          secondaryCta={{ label: 'Join with code', onPress: () => navigation.navigate('Tabs', { screen: 'Join' }) }}
        />
      ) : (
        <FlatList
          data={myGames}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMyGame = user?.id === item.hostId;
            return (
              <Card onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}>
                <View style={styles.row}>
                  <Avatar name={item.name} size={44} />
                  <View style={styles.info}>
                    <View style={styles.rowTop}>
                      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                      {isMyGame ? <Pill label="Host" tone="success" /> : <Pill label="Player" />}
                    </View>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.stakes ? `${item.stakes} · ` : ''}
                      {item.members.length} {item.members.length === 1 ? 'player' : 'players'}
                    </Text>
                    <Text style={styles.meta}>Created {formatRelative(item.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  hi: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
