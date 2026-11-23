import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const Screen: React.FC<{
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement;
  style?: StyleProp<ViewStyle>;
}> = ({ children, scroll, padded = true, refreshControl, style }) => {
  if (scroll) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[padded && styles.padded, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.screen, padded && styles.padded, style]}>
      {children}
    </View>
  );
};

export const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

export const Subtitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.subtitle}>{children}</Text>;

export const SectionTitle: React.FC<{
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ children, action }) => (
  <View style={styles.sectionRow}>
    <View style={styles.sectionHeading}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
    {action}
  </View>
);

export const Muted: React.FC<{ children: React.ReactNode; center?: boolean }> = ({
  children,
  center,
}) => (
  <Text style={[styles.muted, center && { textAlign: 'center' }]}>{children}</Text>
);

export const Card: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'glass';

export const Button: React.FC<{
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  small,
  style,
}) => {
  const palette = buttonPalettes[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.background, borderColor: palette.border },
        variant === 'primary' && shadows.button,
        variant === 'accent' && shadows.accent,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 19} color={palette.text} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: palette.text }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};


const buttonPalettes: Record<
  ButtonVariant,
  { background: string; border: string; text: string }
> = {
  primary: {
    background: colors.primary,
    border: colors.primary,
    text: colors.primaryDark,
  },
  secondary: {
    background: colors.surfaceAlt,
    border: colors.borderStrong,
    text: colors.text,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: colors.primary,
  },
  danger: {
    background: colors.danger,
    border: colors.danger,
    text: colors.primaryDark,
  },
  accent: {
    background: colors.accent,
    border: colors.accent,
    text: colors.primaryDark,
  },
  glass: {
    background: colors.glass,
    border: colors.glassBorder,
    text: colors.white,
  },
};


export const Input: React.FC<
  TextInputProps & {
    label?: string;
    error?: string;
    hint?: string;
    rightAccessory?: React.ReactNode;
  }
> = ({ label, error, hint, style, rightAccessory, ...props }) => (
  <View style={styles.field}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
        {...props}
      />
      {rightAccessory}
    </View>
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

export const Badge: React.FC<{
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ label, tone = 'neutral' }) => {
  const palette = badgePalettes[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const badgePalettes = {
  neutral: { background: colors.surfaceAlt, text: colors.textMuted },
  primary: { background: colors.primarySoft, text: colors.primary },
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
};

export const Avatar: React.FC<{
  name?: string;
  uri?: string | null;
  size?: number;
}> = ({ name, size = 48 }) => {
  const label = (name ?? 'SF')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{label}</Text>
    </View>
  );
};

export const Rating: React.FC<{
  value: number;
  count?: number;
  size?: number;
}> = ({ value, count, size = 14 }) => (
  <View style={styles.ratingRow}>
    <Ionicons name="star" size={size} color={colors.accent} />
    <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
    {count !== undefined ? (
      <Text style={styles.ratingCount}>({count})</Text>
    ) : null}
  </View>
);

export const LoadingView: React.FC<{ message?: string }> = ({
  message = 'Cargando...',
}) => (
  <View style={styles.loading}>
    <ActivityIndicator color={colors.primary} size="large" />
    <Text style={styles.muted}>{message}</Text>
  </View>
);

export const ErrorNotice: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <View style={styles.errorBox}>
    <Ionicons name="alert-circle" size={18} color={colors.danger} />
    <Text style={styles.errorText}>{message}</Text>
    {onRetry ? (
      <Pressable onPress={onRetry}>
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    ) : null}
  </View>
);

export const EmptyState: React.FC<{
  icon?: IconName;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}> = ({ icon = 'sparkles-outline', title, message, actionTitle, onAction }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={26} color={colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {message ? <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text> : null}
    {actionTitle && onAction ? (
      <Button title={actionTitle} onPress={onAction} small style={{ marginTop: spacing.md }} />
    ) : null}
  </View>
);

export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

export const Row: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => <View style={[styles.row, style]}>{children}</View>;

export const KeyValue: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.keyValue}>
    <Text style={styles.keyLabel}>{label}</Text>
    <Text style={styles.keyText}>{value}</Text>
  </View>
);

export const Chip: React.FC<{
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}> = ({ label, selected, onPress, icon }) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    {icon ? (
      <Ionicons
        name={icon}
        size={14}
        color={selected ? colors.white : colors.primary}
      />
    ) : null}
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

export const Checkbox: React.FC<{
  checked: boolean;
  onToggle: () => void;
  label: string;
}> = ({ checked, onToggle, label }) => (
  <Pressable style={styles.checkboxRow} onPress={onToggle}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </Pressable>
);

export const SectionCard: React.FC<{
  title: string;
  icon?: IconName;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <Card style={{ gap: spacing.md }}>
    <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </Row>
    {children}
  </Card>
);

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionMarker: {
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.text,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonSmall: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: colors.text,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
  },
  inputWrapError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  input: {
    flex: 1,
    minHeight: 50,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  ratingCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F3C7C1',
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  retryText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  keyValue: {
    flex: 1,
    minWidth: 120,
    gap: 2,
  },
  keyLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  keyText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
});
