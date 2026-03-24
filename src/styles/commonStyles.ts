import { StyleSheet } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

export const commonStyles = StyleSheet.create({
  heroPanel: {
    backgroundColor: '#DDF3EC',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  pageTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
  },
  pageCopy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: palette.muted,
    fontSize: 14,
  },
  actionGrid: {
    gap: spacing.md,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  cardCopyBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inlineLink: {
    color: palette.primary,
    fontWeight: '700',
  },
  smallMuted: {
    color: palette.muted,
    fontSize: 13,
  },
  mutedText: {
    color: palette.muted,
    fontSize: 13,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
