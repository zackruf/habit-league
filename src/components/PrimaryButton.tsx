import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function PrimaryButton({ label, onPress, disabled, variant = 'primary' }: PrimaryButtonProps) {
  const { theme } = useThemePreferences();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary'
          ? [styles.primary, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]
          : null,
        variant === 'secondary'
          ? [styles.secondary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]
          : null,
        variant === 'ghost' ? [styles.ghost, { borderColor: theme.colors.border }] : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? [styles.primaryLabel, { color: theme.colors.primaryText }] : null,
          variant === 'secondary' ? [styles.secondaryLabel, { color: theme.colors.text }] : null,
          variant === 'ghost' ? [styles.ghostLabel, { color: theme.colors.text }] : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
  },
  secondary: {
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
  },
  secondaryLabel: {
  },
  ghostLabel: {
  },
});
