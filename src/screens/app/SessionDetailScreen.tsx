import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Pill } from '../../components/Pill';
import { Avatar } from '../../components/Avatar';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime, formatRelative, formatSignedCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList } from '../../navigation/types';
import type { Member } from '../../types';

type Props = NativeStackScreenProps<AppStackParamList, 'SessionDetail'>;

type Mode = 'buyIn' | 'cashOut';

export function SessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const user = useAuthStore((s) => s.user);
  const session = useGamesStore((s) => s.getSession(sessionId));
  const game = useGamesStore((s) => (session ? s.getGame(session.gameId) : undefined));
  const startSession = useGamesStore((s) => s.startSession);
  const endSession = useGamesStore((s) => s.endSession);
  const deleteSession = useGamesStore((s) => s.deleteSession);
  const addBuyIn = useGamesStore((s) => s.addBuyIn);
  const removeBuyIn = useGamesStore((s) => s.removeBuyIn);
  const setCashOut = useGamesStore((s) => s.setCashOut);
  const computeResults = useGamesStore((s) => s.computeResults);

  const [mode, setMode] = useState<Mode>('buyIn');
  const [selectedPlayer, setSelectedPlayer] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');

  const results = useMemo(
    () => (session ? computeResults(session.id) : []),
    [session, computeResults],
  );

  if (!session || !game || !user) {
    return (
      <Screen>
        <Text style={styles.text}>Session not found.</Text>
      </Screen>
    );
  }

  const isHost = game.hostId === user.id;
  const totalBuyIns = session.buyIns.reduce((sum, b) => sum + b.amount, 0);
  const totalCashOuts = session.cashOuts.reduce((sum, c) => sum + c.amount, 0);
  const netMismatch = totalBuyIns - totalCashOuts;

  const submitEntry = () => {
    if (!selectedPlayer) return Alert.alert('Pick a player');
    const raw = amount.replace(/[^0-9.]/g, '');
    const amt = Number(raw);
    if (Number.isNaN(amt) || amt < 0) return Alert.alert('Enter a valid amount');
    try {
      if (mode === 'buyIn') {
        if (amt <= 0) return Alert.alert('Buy-in must be greater than 0.');
        addBuyIn(session.id, selectedPlayer.userId, selectedPlayer.displayName, amt);
      } else {
        setCashOut(session.id, selectedPlayer.userId, selectedPlayer.displayName, amt);
      }
      setAmount('');
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    }
  };

  const start = () => startSession(session.id);
  const end = () =>
    Alert.alert(
      'End session?',
      netMismatch !== 0
        ? `Buy-ins and cash-outs don't match (${formatSignedCurrency(netMismatch)}). Settle up manually?`
        : 'Buy-ins and cash-outs match. Mark this session settled?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End session', style: 'destructive', onPress: () => endSession(session.id) },
      ],
    );

  const del = () =>
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSession(session.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.header}>
        <View style={styles.rowGap}>
          {session.status === 'live' ? (
            <Pill label="Live" tone="success" />
          ) : session.status === 'scheduled' ? (
            <Pill label="Scheduled" tone="accent" />
          ) : (
            <Pill label="Settled" />
          )}
        </View>
        <Text style={styles.title}>{game.name}</Text>
        <Text style={styles.subtitle}>
          {session.startedAt
            ? `Started ${formatDateTime(session.startedAt)}`
            : session.scheduledFor
              ? `Scheduled ${formatDateTime(session.scheduledFor)}`
              : `Created ${formatRelative(Date.now())}`}
        </Text>
      </View>

      <Card>
        <View style={styles.totals}>
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Buy-ins</Text>
            <Text style={styles.totalValue}>${totalBuyIns.toFixed(2)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Cash-outs</Text>
            <Text style={styles.totalValue}>${totalCashOuts.toFixed(2)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Off by</Text>
            <Text
              style={[
                styles.totalValue,
                { color: netMismatch === 0 ? colors.primary : colors.warning },
              ]}
            >
              {formatSignedCurrency(netMismatch)}
            </Text>
          </View>
        </View>
      </Card>

      {isHost && session.status !== 'settled' ? (
        <Card>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, mode === 'buyIn' && styles.tabActive]}
              onPress={() => setMode('buyIn')}
            >
              <Text style={[styles.tabText, mode === 'buyIn' && styles.tabTextActive]}>Buy-in</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'cashOut' && styles.tabActive]}
              onPress={() => setMode('cashOut')}
            >
              <Text style={[styles.tabText, mode === 'cashOut' && styles.tabTextActive]}>Cash-out</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>
            {mode === 'buyIn'
              ? 'Add a fresh buy-in whenever a player rebuys.'
              : 'Enter the final chip count for a player when they leave the table.'}
          </Text>
          <View style={styles.playersRow}>
            {game.members.map((m) => (
              <Pressable
                key={m.userId}
                onPress={() => setSelectedPlayer(m)}
                style={[
                  styles.playerChip,
                  selectedPlayer?.userId === m.userId && styles.playerChipActive,
                ]}
              >
                <Avatar name={m.displayName} size={26} />
                <Text style={styles.playerChipText} numberOfLines={1}>
                  {m.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowInput}>
            <Input
              placeholder="Amount ($)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <View style={{ width: spacing.sm }} />
            <Button title="Save" onPress={submitEntry} fullWidth={false} />
          </View>
          {session.status === 'scheduled' ? (
            <View style={styles.startBtn}>
              <Button title="Start session" onPress={start} />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Standings</Text>
      {results.length === 0 ? (
        <Card>
          <Text style={styles.text}>No activity yet. Add a buy-in to get started.</Text>
        </Card>
      ) : (
        results.map((r) => {
          const cashSet = session.cashOuts.some((c) => c.playerId === r.playerId);
          return (
            <Card key={r.playerId}>
              <View style={styles.row}>
                <Avatar name={r.playerName} size={38} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{r.playerName}</Text>
                  <Text style={styles.meta}>
                    In ${r.buyInTotal.toFixed(2)} · Out ${r.cashOutTotal.toFixed(2)}
                    {cashSet ? '' : ' · not cashed out'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.netAmount,
                    { color: r.net > 0 ? colors.primary : r.net < 0 ? colors.danger : colors.text },
                  ]}
                >
                  {formatSignedCurrency(r.net)}
                </Text>
              </View>
            </Card>
          );
        })
      )}

      {session.buyIns.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Buy-in log</Text>
          {session.buyIns
            .slice()
            .sort((a, b) => b.at - a.at)
            .map((b) => (
              <Card key={b.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>{b.playerName}</Text>
                    <Text style={styles.meta}>{formatDateTime(b.at)}</Text>
                  </View>
                  <Text style={styles.buyInAmount}>${b.amount.toFixed(2)}</Text>
                  {isHost && session.status !== 'settled' ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeBuyIn(session.id, b.id)}
                      style={{ marginLeft: spacing.sm }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ))}
        </>
      ) : null}

      {isHost ? (
        <View style={styles.footer}>
          {session.status !== 'settled' ? <Button title="End session" onPress={end} /> : null}
          <View style={{ height: spacing.sm }} />
          <Button title="Delete session" variant="danger" onPress={del} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 8 },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  totals: { flexDirection: 'row', alignItems: 'center' },
  totalCol: { flex: 1, alignItems: 'center' },
  totalDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
    marginHorizontal: spacing.sm,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  totalValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.bgCard },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  helper: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, lineHeight: 18 },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    maxWidth: 180,
  },
  playerChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(47,191,113,0.12)' },
  playerChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  rowInput: { flexDirection: 'row', alignItems: 'center' },
  startBtn: { marginTop: spacing.md },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  playerInfo: { flex: 1, marginLeft: spacing.md },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  netAmount: { fontSize: 16, fontWeight: '700' },
  buyInAmount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  footer: { marginTop: spacing.lg },
  text: { color: colors.textMuted },
});
