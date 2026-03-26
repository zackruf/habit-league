import { StyleSheet } from 'react-native';

import { AppColors, spacing } from '@/constants/theme';

export function createAuthStyles(colors: AppColors) {
  return StyleSheet.create({
    screenContent: {
      justifyContent: 'center',
      gap: spacing.xl,
    },
    hero: {
      gap: spacing.sm,
    },
    kicker: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 38,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 24,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    cardCopy: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    errorText: {
      color: colors.danger,
      fontWeight: '600',
    },
    inlineNote: {
      color: colors.muted,
      textAlign: 'center',
    },
    inlineLink: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
}
