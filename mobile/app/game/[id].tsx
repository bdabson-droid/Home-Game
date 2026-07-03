import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api, HomeGame, GameMember, PendingInvite } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [game, setGame] = useState<HomeGame | null>(null);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [invitePhone, setInvitePhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isHost = game?.hostId === user?.id;

  const loadGame = async () => {
    if (!id) return;
    try {
      const res = await api.getGame(id);
      setGame(res.game);
      setMembers(res.members);
      setPendingInvites(res.pendingInvites);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load game');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGame();
    }, [id])
  );

  const handleInvite = async () => {
    if (!id || !invitePhone) return;
    setLoading(true);
    try {
      const res = await api.inviteToGame(id, invitePhone.replace(/\D/g, ''));
      Alert.alert('Invite Sent', res.message);
      setInvitePhone('');
      loadGame();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (member: GameMember) => {
    Alert.alert('Remove Player', `Remove ${member.name} from this game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeMember(id!, member.id);
            loadGame();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove');
          }
        },
      },
    ]);
  };

  const shareCode = async () => {
    if (!game) return;
    await Share.share({
      message: `Join my poker home game "${game.name}"! Use code: ${game.joinCode}`,
    });
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.gameName}>{game.name}</Text>
        {game.description ? (
          <Text style={styles.description}>{game.description}</Text>
        ) : null}
        {game.location ? <Text style={styles.meta}>📍 {game.location}</Text> : null}
        {game.scheduledAt ? (
          <Text style={styles.meta}>
            🗓 {new Date(game.scheduledAt).toLocaleString()}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>Join Code</Text>
        <Text style={styles.code}>{game.joinCode}</Text>
        <Button title="Share Code" variant="secondary" onPress={shareCode} />
      </Card>

      {isHost && (
        <Card style={styles.inviteSection}>
          <Text style={styles.sectionTitle}>Invite by Phone</Text>
          <Text style={styles.sectionHint}>
            Enter a player's phone number to invite them to this game
          </Text>
          <Input
            placeholder="5559876543"
            value={invitePhone}
            onChangeText={setInvitePhone}
            keyboardType="phone-pad"
          />
          <Button title="Send Invite" onPress={handleInvite} loading={loading} />
        </Card>
      )}

      <Text style={styles.sectionTitle}>Players ({members.length})</Text>
      {members.map((member) => (
        <Card key={member.id} style={styles.memberCard}>
          <View style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberPhone}>{formatPhone(member.phone)}</Text>
            </View>
            <View style={styles.memberActions}>
              {member.role === 'host' && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>HOST</Text>
                </View>
              )}
              {isHost && member.role !== 'host' && (
                <Button
                  title="Remove"
                  variant="danger"
                  onPress={() => handleRemove(member)}
                  style={styles.removeBtn}
                />
              )}
            </View>
          </View>
        </Card>
      ))}

      {isHost && pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {pendingInvites.map((invite) => (
            <Card key={invite.id} style={styles.memberCard}>
              <Text style={styles.memberName}>{formatPhone(invite.phone)}</Text>
              <Text style={styles.memberPhone}>Invited by {invite.invitedBy}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function formatPhone(phone: string) {
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  gameName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  codeCard: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  code: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 8,
    marginVertical: spacing.sm,
  },
  inviteSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  memberCard: {
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  memberPhone: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '800',
  },
  removeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
});
