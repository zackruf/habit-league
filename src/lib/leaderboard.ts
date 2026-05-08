import { LeaderboardEntry } from '@/types/models';

type LeaderboardNotice = {
  title: string;
  message: string;
  priority: number;
};

export function getLeaderboardNotice(
  leaderboard: LeaderboardEntry[],
  userId: string,
  groupName?: string
): LeaderboardNotice | null {
  if (leaderboard.length < 2) {
    return null;
  }

  const index = leaderboard.findIndex((entry) => entry.userId === userId);
  if (index === -1) {
    return null;
  }

  const current = leaderboard[index];
  const nextAbove = index > 0 ? leaderboard[index - 1] : null;
  const gapToMoveUp = nextAbove ? nextAbove.weeklyCheckIns - current.weeklyCheckIns : null;
  const placeLabel = groupName ? ` in ${groupName}` : '';

  if (gapToMoveUp !== null && gapToMoveUp <= 1) {
    return {
      title: 'You can move up today',
      message:
        gapToMoveUp === 0
          ? `You are tied${placeLabel}. One more check-in can move you ahead.`
          : `You are 1 check-in away from moving up${placeLabel}.`,
      priority: index === leaderboard.length - 1 ? 3 : 2,
    };
  }

  if (index === leaderboard.length - 1) {
    return {
      title: 'Last-place warning',
      message: `You’re currently last${placeLabel}. Don’t lose this week.`,
      priority: 4,
    };
  }

  return null;
}

export function pickTopLeaderboardNotice(notices: Array<LeaderboardNotice | null>) {
  return notices.filter(Boolean).sort((left, right) => (right?.priority ?? 0) - (left?.priority ?? 0))[0] ?? null;
}
