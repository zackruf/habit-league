import { StyleSheet } from 'react-native';

import { AppColors, radius, spacing } from '@/constants/theme';

export function createCommonStyles(colors: AppColors) {
  return StyleSheet.create({
    heroPanel: {
      backgroundColor: colors.heroPrimary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    heroPanelAlt: {
      backgroundColor: colors.heroAlt,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    heroPanelWarm: {
      backgroundColor: colors.heroWarm,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    noticeCard: {
      backgroundColor: colors.noticeBackground,
      borderColor: colors.noticeBorder,
    },
    noticeEyebrow: {
      color: colors.noticeText,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    noticeMessage: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
    },
    heroSubtitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
    },
    pageCopy: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    inlineActionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
    },
    statValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },
    statLabel: {
      color: colors.muted,
      fontSize: 14,
    },
    actionGrid: {
      gap: spacing.md,
    },
    groupShowcaseCard: {
      backgroundColor: colors.surface,
    },
    currentUserCard: {
      backgroundColor: colors.currentUserBackground,
      borderColor: colors.currentUserBorder,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    cardCopy: {
      color: colors.muted,
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
      color: colors.primary,
      fontWeight: '700',
    },
    smallMuted: {
      color: colors.muted,
      fontSize: 13,
    },
    badgePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.badgeBackground,
    },
    badgeText: {
      color: colors.badgeText,
      fontSize: 12,
      fontWeight: '700',
    },
    mutedText: {
      color: colors.muted,
      fontSize: 13,
    },
    errorText: {
      color: colors.danger,
      fontWeight: '600',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    sectionCard: {
      gap: spacing.md,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    avatarText: {
      color: colors.primaryText,
      fontSize: 24,
      fontWeight: '800',
    },
    profileMeta: {
      flex: 1,
      gap: spacing.xs,
    },
    usernameText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    settingsSectionTitle: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    settingLabelWrap: {
      flex: 1,
      gap: spacing.xs,
    },
    settingTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    settingSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    segmentedButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    segmentedButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentedLabel: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },
    segmentedLabelActive: {
      color: colors.primaryText,
    },
  });
}
