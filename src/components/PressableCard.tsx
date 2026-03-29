import { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

type PressableCardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}>;

export function PressableCard({
  children,
  onPress,
  style,
  accessibilityHint,
  accessibilityLabel,
}: PressableCardProps) {
  const { theme } = useThemePreferences();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
});
