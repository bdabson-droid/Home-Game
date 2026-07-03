import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { Badge, Button, Card, Divider, Input } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, font, spacing } from '../../src/theme';

const statusColor: Record<string, string> = {
  active: colors.success,
  none: colors.textMuted,
  incomplete: colors.gold,
  past_due: colors.danger,
  canceled: colors.danger,
};

export default function Account() {
  const router = useRouter();
  const { user, subscription, signOut, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.updateProfile(name.trim());
      setUser(res.user);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const subStatus = subscription?.status ?? 'none';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <Divider />
        <Text style={styles.label}>Display name</Text>
        <Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        <Button title="Save name" onPress={saveName} loading={saving} style={{ marginTop: spacing.md }} />
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Host subscription</Text>
          <Badge label={subStatus.toUpperCase()} color={statusColor[subStatus] ?? colors.textMuted} />
        </View>
        <Text style={styles.subCopy}>
          {subStatus === 'active'
            ? 'You can host unlimited home games and invite players.'
            : 'Subscribe to host your own home games and invite players by phone.'}
        </Text>
        <Button
          title={subStatus === 'active' ? 'Manage subscription' : 'Become a host'}
          onPress={() => router.push('/subscription')}
          variant={subStatus === 'active' ? 'secondary' : 'primary'}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Button
        title="Sign out"
        variant="ghost"
        onPress={() => {
          Alert.alert('Sign out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                await signOut();
                router.replace('/login');
              },
            },
          ]);
        }}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  phone: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm },
  label: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCopy: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.md, lineHeight: 20 },
});
