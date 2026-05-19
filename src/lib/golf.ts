import { Course, CourseLeaderboardEntry, Profile, Round } from '@/types/models';

export function buildCourseLeaderboard(courseId: string, rounds: Round[], members: Profile[]): CourseLeaderboardEntry[] {
  const byUser = new Map<string, { bestScore: number; lastScore: number; lastPlayedOn: string; roundsPlayed: number }>();

  rounds
    .filter((round) => round.courseId === courseId)
    .forEach((round) => {
      const current = byUser.get(round.userId);
      if (!current) {
        byUser.set(round.userId, {
          bestScore: round.score,
          lastScore: round.score,
          lastPlayedOn: round.playedOn,
          roundsPlayed: 1,
        });
        return;
      }

      byUser.set(round.userId, {
        bestScore: Math.min(current.bestScore, round.score),
        lastScore: round.playedOn >= current.lastPlayedOn ? round.score : current.lastScore,
        lastPlayedOn: round.playedOn >= current.lastPlayedOn ? round.playedOn : current.lastPlayedOn,
        roundsPlayed: current.roundsPlayed + 1,
      });
    });

  return Array.from(byUser.entries())
    .map(([userId, stats]) => ({
      userId,
      name:
        members.find((member) => member.uid === userId)?.name ??
        rounds
          .find((round) => round.courseId === courseId && round.userId === userId)
          ?.playerName ??
        'Player',
      bestScore: stats.bestScore,
      lastScore: stats.lastScore,
      roundsPlayed: stats.roundsPlayed,
    }))
    .sort((left, right) => left.bestScore - right.bestScore || right.roundsPlayed - left.roundsPlayed || left.name.localeCompare(right.name));
}

export function getPersonalBest(courseId: string, userId: string, rounds: Round[]) {
  const scores = rounds
    .filter((round) => round.courseId === courseId && round.userId === userId)
    .map((round) => round.score)
    .sort((left, right) => left - right);

  return scores[0] ?? null;
}

export function getLatestRoundForCourse(courseId: string, userId: string, rounds: Round[]) {
  return (
    rounds
      .filter((round) => round.courseId === courseId && round.userId === userId)
      .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt))[0] ?? null
  );
}

export function getFeaturedCourseLabel(course: Course | undefined, rounds: Round[]) {
  if (!course) {
    return 'Add the first golf course for this group';
  }

  const roundsPlayed = rounds.filter((round) => round.courseId === course.id).length;
  const roundLabel = roundsPlayed === 1 ? '1 round logged' : `${roundsPlayed} rounds logged`;
  return `${course.name} / Par ${course.par} / ${roundLabel}`;
}
