import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { Avatar } from '../../components/Avatar';
import { colors, spacing } from '../../theme';
import { formatPhone } from '../../utils/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Profile'>,
  NativeStackScreenProps<AppStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const isHost = useSubscriptionStore((s) => (user ? s.isHost(user.id) : false));
  const sub = useSubscriptionStore((s) => (user ? s.getSubscription(user.id) : undefined));

  const [name, setName] = useState(user?.displayName ?? '');

  if (!user) return null;

  const save = () => {
    if (!name.trim()) return Alert.alert('Give yourself a name.');
    updateProfile({ displayName: name.trim() });
    Alert.alert('Saved', 'Profile updated.');
  };

  const logOut = () => {
    Alert.alert('Sign out?', 'You\'ll need to verify your phone again to come back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar name={user.displayName} size={72} />
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.phone}>{formatPhone(user.phone)}</Text>
        <View style={styles.pill}>
          {isHost ? <Pill label="Host subscription" tone="success" /> : <Pill label="Player" />}
        </View>
      </View>

      <Card>
        <Input
          label="Display name"
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoCapitalize="words"
        />
        <Button title="Save profile" onPress={save} />
      </Card>

      <Card
        onPress={() => navigation.navigate('Subscription')}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Host subscription</Text>
            <Text style={styles.rowSubtitle}>
              {isHost && sub
                ? `${sub.plan === 'annual' ? 'Annual' : 'Monthly'} · ${sub.renewsAt ? `renews ${new Date(sub.renewsAt).toLocaleDateString()}` : 'active'}`
                : 'Subscribe to host home games'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </Card>

      <View style={{ height: spacing.md }} />
      <Button title="Sign out" variant="danger" onPress={logOut} />

      <Text style={styles.legal}>
        Demo build. Phone verification, SMS invites, and subscription purchases are mocked. See the
        README for how to wire up real providers.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  name: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  phone: { color: colors.textMuted, marginTop: 4 },
  pill: { marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47,191,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSubtitle: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  legal: {
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
