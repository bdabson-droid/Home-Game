import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btnBase,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        variant === 'ghost' && styles.btnGhost,
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.text} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'primary' && styles.btnTextPrimary,
            variant === 'ghost' && styles.btnTextGhost,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'default' }: { text: string; tone?: 'default' | 'gold' | 'success' | 'danger' }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'gold' && { backgroundColor: colors.gold },
        tone === 'success' && { backgroundColor: colors.success },
        tone === 'danger' && { backgroundColor: colors.danger },
      ]}
    >
      <Text style={[styles.badgeText, tone === 'gold' && { color: colors.background }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.gold },
  btnSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: 'transparent' },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  btnTextPrimary: { color: colors.background },
  btnTextGhost: { color: colors.gold },
  label: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    color: colors.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
