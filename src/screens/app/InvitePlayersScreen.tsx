import React, { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { colors, spacing } from '../../theme';
import { formatPhone, formatRelative, normalizePhone } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useGamesStore } from '../../store/useGamesStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'InvitePlayers'>;

export function InvitePlayersScreen({ route }: Props) {
  const { gameId } = route.params;
  const user = useAuthStore((s) => s.user);
  const game = useGamesStore((s) => s.getGame(gameId));
  const allInvites = useGamesStore((s) => s.invites);
  const inviteByPhone = useGamesStore((s) => s.inviteByPhone);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const gameInvites = useMemo(
    () => allInvites.filter((i) => i.gameId === gameId),
    [allInvites, gameId],
  );

  if (!game || !user) {
    return (
      <Screen>
        <Text style={styles.text}>Game not found.</Text>
      </Screen>
    );
  }

  const invite = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid number', 'Please enter a full phone number, including country code.');
      return;
    }
    setLoading(true);
    try {
      await inviteByPhone({ game, phone: normalized, invitedBy: user });
      setPhone('');
      Alert.alert(
        'Invite sent',
        `We texted ${formatPhone(normalized)} an invite to join "${game.name}".`,
      );
    } catch (e) {
      Alert.alert('Could not send invite', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message:
          `Join my poker home game "${game.name}" on Home Game.\n` +
          `Open the app and enter code: ${game.inviteCode}`,
      });
    } catch {
      // cancelled
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Text style={styles.title}>Invite players</Text>
      <Text style={styles.subtitle}>
        Send an SMS invite or share your 6-digit game code. Guests join for free.
      </Text>

      <Card>
        <Text style={styles.cardLabel}>Game code</Text>
        <Text style={styles.code}>{game.inviteCode}</Text>
        <View style={styles.shareBtn}>
          <Button
            title="Share code"
            variant="secondary"
            onPress={shareCode}
            leftIcon={<Ionicons name="share-outline" size={16} color={colors.text} />}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Invite by phone</Text>
        <Input
          placeholder="+1 555 000 1234"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoComplete="tel"
          textContentType="telephoneNumber"
          containerStyle={{ marginTop: spacing.sm }}
        />
        <Button title="Send SMS invite" onPress={invite} loading={loading} />
      </Card>

      <Text style={styles.sectionTitle}>Recent invites</Text>
      {gameInvites.length === 0 ? (
        <Card>
          <Text style={styles.text}>No invites sent yet.</Text>
        </Card>
      ) : (
        gameInvites.map((inv) => (
          <Card key={inv.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{formatPhone(inv.phone)}</Text>
                <Text style={styles.meta}>Sent {formatRelative(inv.createdAt)}</Text>
              </View>
              <Pill
                label={inv.status}
                tone={
                  inv.status === 'accepted'
                    ? 'success'
                    : inv.status === 'declined' || inv.status === 'expired'
                      ? 'danger'
                      : 'warning'
                }
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  code: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 4,
  },
  shareBtn: { marginTop: spacing.md },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  text: { color: colors.textMuted },
});
