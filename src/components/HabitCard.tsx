import { Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate } from '@/lib/date';
import { getHabitStreakStatus } from '@/lib/streaks';
import { createCommonStyles } from '@/styles/commonStyles';
import { Habit } from '@/types/models';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceCard } from './SurfaceCard';

type HabitCardProps = {
  habit: Habit;
  helperText?: string;
  actionLabel?: string;
  onToggle: () => void;
};

export function HabitCard({ actionLabel = 'Check in', habit, helperText, onToggle }: HabitCardProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const checkedToday = habit.checkIns.includes(formatFriendlyDate(new Date(), 'key'));
  const streakStatus = getHabitStreakStatus(habit);
  const streakLine = getHabitCardStreakLine(streakStatus);

  return (
    <SurfaceCard>
      <View style={commonStyles.rowBetween}>
        <View style={commonStyles.cardCopyBlock}>
          <Text style={commonStyles.cardTitle}>
            {habit.emoji} {habit.title}
          </Text>
          <Text style={commonStyles.cardCopy}>{helperText || habit.category}</Text>
          <Text style={commonStyles.smallMuted}>{streakLine}</Text>
        </View>
        <PrimaryButton
          label={checkedToday ? 'Checked in' : actionLabel}
          onPress={onToggle}
          variant={checkedToday ? 'secondary' : 'primary'}
        />
      </View>
    </SurfaceCard>
  );
}

function getHabitCardStreakLine(streakStatus: ReturnType<typeof getHabitStreakStatus>) {
  if (streakStatus.currentStreak > 0) {
    const dayLabel = streakStatus.currentStreak === 1 ? 'day' : 'days';
    return `${streakStatus.currentStreak}-${dayLabel} streak`;
  }

  if (streakStatus.restoreEligibility.canRestoreStreak) {
    return `Lost ${streakStatus.restoreEligibility.lostStreak}-day streak / second chance available`;
  }

  return 'No streak yet';
}
