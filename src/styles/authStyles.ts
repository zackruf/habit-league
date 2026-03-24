import { StyleSheet } from 'react-native';

import { palette, spacing } from '@/constants/theme';

export const authStyles = StyleSheet.create({
  screenContent: {
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
  },
  kicker: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: palette.text,
    fontSize: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
  },
  inlineNote: {
    color: palette.muted,
    textAlign: 'center',
  },
  inlineLink: {
    color: palette.primary,
    fontWeight: '700',
  },
});
