import { formatFriendlyDate } from '@/lib/date';
import { Habit, HabitStreakStatus } from '@/types/models';

export function getHabitStreakStatus(habit: Habit, now = new Date()): HabitStreakStatus {
  const todayKey = formatFriendlyDate(now, 'key');
  const yesterdayKey = shiftDayKey(todayKey, -1);
  const dayBeforeYesterdayKey = shiftDayKey(todayKey, -2);
  const normalizedCheckIns = normalizeCheckIns(habit.checkIns, todayKey);
  const checkInSet = new Set(normalizedCheckIns);
  const checkedInToday = checkInSet.has(todayKey);
  const checkedInYesterday = checkInSet.has(yesterdayKey);

  let currentStreak = 0;
  if (checkedInToday) {
    currentStreak = countConsecutiveDays(checkInSet, todayKey);
  } else if (checkedInYesterday) {
    currentStreak = countConsecutiveDays(checkInSet, yesterdayKey);
  }

  const lostStreak = !checkedInYesterday && checkInSet.has(dayBeforeYesterdayKey) ? countConsecutiveDays(checkInSet, dayBeforeYesterdayKey) : 0;
  const restoreUsed = habit.restoreUsedForDate === yesterdayKey;
  const canRestoreStreak = lostStreak > 0 && !restoreUsed;

  return {
    currentStreak,
    checkedInToday,
    checkedInYesterday,
    justBroken: lostStreak > 0,
    lastCompletedDate: normalizedCheckIns.at(-1) ?? null,
    restoreEligibility: {
      canRestoreStreak,
      brokenOn: lostStreak > 0 ? yesterdayKey : null,
      lostStreak,
      restoreBy: lostStreak > 0 ? todayKey : null,
      restoreUsed,
      premiumRestorePlaceholder: lostStreak > 0,
    },
  };
}

export function pickTopRestoreOpportunity(habits: Habit[]) {
  return habits
    .map((habit) => ({ habit, streakStatus: getHabitStreakStatus(habit) }))
    .filter((entry) => entry.streakStatus.restoreEligibility.canRestoreStreak)
    .sort((left, right) => right.streakStatus.restoreEligibility.lostStreak - left.streakStatus.restoreEligibility.lostStreak)[0] ?? null;
}

function normalizeCheckIns(checkIns: string[], todayKey: string) {
  return [...new Set(checkIns.filter(Boolean).filter((entry) => entry <= todayKey))].sort();
}

function countConsecutiveDays(checkInSet: Set<string>, anchorKey: string) {
  let streak = 0;
  let currentKey = anchorKey;

  while (checkInSet.has(currentKey)) {
    streak += 1;
    currentKey = shiftDayKey(currentKey, -1);
  }

  return streak;
}

function shiftDayKey(key: string, amount: number) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatFriendlyDate(date, 'key');
}
