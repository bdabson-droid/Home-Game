import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/store/auth';
import { colors, font, spacing } from '../src/theme';

export default function Index() {
  const { loading, signedIn } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>♠ Home Game</Text>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return signedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  logo: {
    color: colors.text,
    fontSize: font.h1,
    fontWeight: '800',
  },
});
