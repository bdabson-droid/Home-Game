import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api, ApiError, MyInvitation } from '../../src/api';
import { Button, Card } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function Invites() {
  const router = useRouter();
  const [invites, setInvites] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.myInvitations();
      setInvites(res.invitations);
    } catch {
      // ignore
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

  async function accept(inv: MyInvitation) {
    setBusyId(inv.id);
    try {
      const res = await api.acceptInvitation(inv.id);
      await load();
      router.push(`/game/${res.gameId}`);
    } catch (err) {
      Alert.alert('Could not accept', err instanceof ApiError ? err.message : 'Try again');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invites}
        keyExtractor={(i) => i.id}
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
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.game.name}</Text>
            {item.game.stakes ? <Text style={styles.meta}>Stakes: {item.game.stakes}</Text> : null}
            {item.game.location ? <Text style={styles.meta}>📍 {item.game.location}</Text> : null}
            <Button
              title="Accept invitation"
              onPress={() => accept(item)}
              loading={busyId === item.id}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>No pending invites</Text>
              <Text style={styles.emptyText}>
                When a host invites your phone number to their home game, it shows up here. You can
                also join instantly with a 6-digit code from the My Games tab.
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
  listContent: { padding: spacing.lg },
  card: { marginBottom: spacing.md },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
