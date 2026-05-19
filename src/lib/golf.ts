import { Course, CourseLeaderboardEntry, GameMode, PersonalBest, Profile, Round, RoundVisibility } from '@/types/models';

type LeaderboardScope = 'group' | 'public';

export function buildCourseLeaderboard(
  course: Course,
  rounds: Round[],
  members: Profile[],
  options?: {
    gameMode?: GameMode;
    scope?: LeaderboardScope;
  }
): CourseLeaderboardEntry[] {
  const gameMode = options?.gameMode ?? 'stroke';
  const scope = options?.scope ?? 'group';
  const relevantRounds = rounds.filter(
    (round) =>
      round.gameMode === gameMode &&
      matchesCourse(round, course, scope === 'public') &&
      (scope === 'group' ? round.groupId === course.groupId : round.visibility === 'public')
  );

  const grouped = new Map<
    string,
    {
      rounds: Round[];
      label: string;
      userId: string | null;
      teamName: string | null;
    }
  >();

  for (const round of relevantRounds) {
    const key = round.gameMode === 'scramble' ? `team:${round.teamName || round.id}` : `user:${round.userId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.rounds.push(round);
      continue;
    }

    grouped.set(key, {
      rounds: [round],
      label: round.gameMode === 'scramble' ? round.teamName || 'Scramble team' : resolvePlayerName(round.userId, round.playerName, members),
      userId: round.gameMode === 'scramble' ? null : round.userId,
      teamName: round.gameMode === 'scramble' ? round.teamName || 'Scramble team' : null,
    });
  }

  return Array.from(grouped.entries())
    .map(([entryId, entry]) => {
      const sortedRounds = entry.rounds
        .slice()
        .sort(
          (left, right) =>
            compareRounds(left, right) || right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt)
        );
      const bestRound = sortedRounds[0];

      return {
        entryId,
        userId: entry.userId,
        name: entry.label,
        totalScore: bestRound.totalScore,
        scoreToPar: bestRound.scoreToPar,
        playedOn: bestRound.playedOn,
        roundsPlayed: entry.rounds.length,
        gameMode,
        visibility: bestRound.visibility,
        groupId: bestRound.groupId,
        teamName: entry.teamName,
        indicatorLabel: bestRound.scoreToPar !== null ? formatScoreToPar(bestRound.scoreToPar) : `${bestRound.totalScore}`,
      };
    })
    .sort(
      (left, right) =>
        compareLeaderboardEntries(left, right) || right.roundsPlayed - left.roundsPlayed || left.name.localeCompare(right.name)
    );
}

export function getPersonalBest(course: Course, userId: string, rounds: Round[]): PersonalBest | null {
  const playerRounds = rounds
    .filter((round) => round.userId === userId && round.gameMode === 'stroke' && matchesCourse(round, course, true))
    .sort((left, right) => compareRounds(left, right) || left.playedOn.localeCompare(right.playedOn) || left.createdAt.localeCompare(right.createdAt));

  if (!playerRounds.length) {
    return null;
  }

  const bestRound = playerRounds[0];
  const previousBest = playerRounds.find((round) => round.id !== bestRound.id && compareRounds(round, bestRound) > 0);

  return {
    roundId: bestRound.id,
    totalScore: bestRound.totalScore,
    scoreToPar: bestRound.scoreToPar,
    playedOn: bestRound.playedOn,
    improvement: previousBest ? previousBest.totalScore - bestRound.totalScore : null,
  };
}

export function getLatestRoundForCourse(course: Course, userId: string, rounds: Round[]) {
  return (
    rounds
      .filter((round) => round.userId === userId && matchesCourse(round, course, true))
      .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt))[0] ?? null
  );
}

export function getFeaturedCourseLabel(course: Course | undefined, rounds: Round[]) {
  if (!course) {
    return 'Add the first golf course for this group';
  }

  const roundsPlayed = rounds.filter((round) => round.courseId === course.id).length;
  const roundLabel = roundsPlayed === 1 ? '1 round logged' : `${roundsPlayed} rounds logged`;
  const teeCountLabel = course.tees.length === 1 ? '1 tee set' : `${course.tees.length} tee sets`;
  return `${course.name} / Par ${course.par} / ${teeCountLabel} / ${roundLabel}`;
}

export function formatScoreToPar(scoreToPar: number | null) {
  if (scoreToPar === null) {
    return 'E';
  }
  if (scoreToPar === 0) {
    return 'E';
  }
  return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
}

export function getBestRoundForLeaderboard(course: Course, rounds: Round[], scope: LeaderboardScope, visibility: RoundVisibility = 'friends') {
  const scopedRounds = rounds.filter((round) => matchesCourse(round, course, scope === 'public') && round.visibility === visibility);
  return scopedRounds.sort((left, right) => compareRounds(left, right))[0] ?? null;
}

function compareLeaderboardEntries(left: CourseLeaderboardEntry, right: CourseLeaderboardEntry) {
  if (left.scoreToPar !== null && right.scoreToPar !== null && left.scoreToPar !== right.scoreToPar) {
    return left.scoreToPar - right.scoreToPar;
  }

  if (left.totalScore !== right.totalScore) {
    return left.totalScore - right.totalScore;
  }

  return left.playedOn.localeCompare(right.playedOn);
}

function compareRounds(left: Round, right: Round) {
  if (left.scoreToPar !== null && right.scoreToPar !== null && left.scoreToPar !== right.scoreToPar) {
    return left.scoreToPar - right.scoreToPar;
  }

  return left.totalScore - right.totalScore;
}

function matchesCourse(round: Round, course: Course, useSourceMatch: boolean) {
  if (round.courseId === course.id) {
    return true;
  }

  if (!useSourceMatch) {
    return false;
  }

  return round.courseSourceId === course.sourceId && round.courseSourceProvider === course.sourceProvider;
}

function resolvePlayerName(userId: string, fallback: string, members: Profile[]) {
  return members.find((member) => member.uid === userId)?.name ?? (fallback || 'Player');
}
