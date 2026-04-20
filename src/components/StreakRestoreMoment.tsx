import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { Habit, HabitStreakStatus } from '@/types/models';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceCard } from './SurfaceCard';

type StreakRestoreMomentProps = {
  visible: boolean;
  habit: Habit;
  streakStatus: HabitStreakStatus;
  hasRestoreCredit: boolean;
  busy?: boolean;
  onDismiss: () => void;
  onGetRestore: () => void;
  onRestore: () => void;
};

export function StreakRestoreMoment({
  visible,
  habit,
  streakStatus,
  hasRestoreCredit,
  busy,
  onDismiss,
  onGetRestore,
  onRestore,
}: StreakRestoreMomentProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const lostStreak = streakStatus.restoreEligibility.lostStreak;
  const restoreBy = streakStatus.restoreEligibility.restoreBy;

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.72)' : 'rgba(12,23,38,0.42)' }]}>
        <SurfaceCard style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.badge, { backgroundColor: theme.colors.noticeBackground, borderColor: theme.colors.noticeBorder }]}>
              <Text style={[styles.badgeText, { color: theme.colors.noticeText }]}>Second chance</Text>
            </View>
            <Pressable accessibilityLabel="Dismiss restore prompt" onPress={onDismiss} style={commonStyles.iconButton}>
              <Text style={commonStyles.iconButtonLabel}>x</Text>
            </Pressable>
          </View>

          <View style={styles.centerBlock}>
            <Text style={[styles.lostNumber, { color: theme.colors.primary }]}>{lostStreak}</Text>
            <Text style={[styles.lostLabel, { color: theme.colors.text }]}>day streak lost</Text>
            <Text style={[styles.habitName, { color: theme.colors.muted }]}>{habit.title}</Text>
          </View>

          <View style={[styles.messagePanel, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Text style={commonStyles.noticeMessage}>Restore your streak before this window closes.</Text>
            <Text style={commonStyles.smallMuted}>{restoreBy ? 'Time left to restore: today only.' : 'This restore window is almost over.'}</Text>
          </View>

          <Text style={commonStyles.cardCopy}>
            You built real momentum. If today got away from you, this is your clean second chance to keep the streak alive.
          </Text>

          <PrimaryButton
            disabled={busy}
            label={busy ? 'Restoring...' : hasRestoreCredit ? 'Use restore credit' : 'Get a restore'}
            onPress={hasRestoreCredit ? onRestore : onGetRestore}
          />
          <PrimaryButton label="Not now" onPress={onDismiss} variant="ghost" />
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  centerBlock: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  lostNumber: {
    fontSize: 76,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 82,
  },
  lostLabel: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '700',
  },
  messagePanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
