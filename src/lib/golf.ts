import { Course, CourseLeaderboardEntry, PersonalBest, Profile, Round, RoundFormat, RoundVisibility } from '@/types/models';

export const ROUND_FORMATS: RoundFormat[] = ['individual', 'scramble2', 'scramble3', 'scramble4'];
export const SCRAMBLE_FIRST_FORMATS: RoundFormat[] = ['scramble2', 'scramble3', 'scramble4', 'individual'];

export const ROUND_FORMAT_LABELS: Record<RoundFormat, string> = {
  individual: 'Individual',
  scramble2: '2-Man Scramble',
  scramble3: '3-Man Scramble',
  scramble4: '4-Man Scramble',
};

type LeaderboardScope = 'group' | 'public' | 'friends';

export function getRequiredPlayerCount(format: RoundFormat) {
  if (format === 'individual') {
    return 1;
  }
  return Number(format.replace('scramble', '')) || 2;
}

export function isScrambleFormat(format: RoundFormat) {
  return format !== 'individual';
}

export function normalizeRoundFormat(value?: string | null): RoundFormat {
  if (value === 'individual' || value === 'scramble2' || value === 'scramble3' || value === 'scramble4') {
    return value;
  }
  if (value === 'stroke') {
    return 'individual';
  }
  if (value === 'scramble') {
    return 'scramble2';
  }
  return 'individual';
}

export function getRoundFormatLabel(format?: RoundFormat | string | null) {
  return ROUND_FORMAT_LABELS[normalizeRoundFormat(format)];
}

export function getRoundDisplayName(round: Round) {
  if (isScrambleFormat(round.format)) {
    return round.teamName || round.playerNames.join(' and ') || 'Scramble team';
  }
  return round.playerNames[0] || round.playerName || 'Player';
}

export function getRoundTrustLabel(round: Pick<Round, 'locationVerified' | 'distanceFromCourseMeters'>) {
  if (!round.locationVerified) {
    return 'Honor system';
  }
  if (typeof round.distanceFromCourseMeters === 'number') {
    const miles = round.distanceFromCourseMeters / 1609.344;
    return miles < 0.1 ? 'At course' : `Near course (${miles.toFixed(1)} mi)`;
  }
  return 'Nearest course suggested';
}

export function buildCourseLeaderboard(
  course: Course,
  rounds: Round[],
  members: Profile[],
  options?: {
    format?: RoundFormat;
    gameMode?: RoundFormat;
    scope?: LeaderboardScope;
    currentUserId?: string;
    friendIds?: string[];
    groupId?: string | null;
  }
): CourseLeaderboardEntry[] {
  const format = options?.format ?? options?.gameMode ?? 'scramble2';
  const scope = options?.scope ?? 'public';
  const friendIds = new Set([options?.currentUserId, ...(options?.friendIds ?? [])].filter(Boolean) as string[]);
  const groupMemberIds = new Set(members.map((member) => member.uid));
  const targetGroupId = options?.groupId ?? course.groupId;

  const relevantRounds = rounds.filter((round) => {
    if (round.format !== format || !matchesCourse(round, course, true)) {
      return false;
    }
    if (scope === 'public') {
      return round.visibility === 'public';
    }
    if (scope === 'friends') {
      return round.playerIds.some((playerId) => friendIds.has(playerId)) || round.createdBy === options?.currentUserId;
    }
    return Boolean(
      targetGroupId &&
        (round.relatedGroupIds.includes(targetGroupId) ||
          round.groupId === targetGroupId ||
          round.playerIds.some((playerId) => groupMemberIds.has(playerId)))
    );
  });

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
    const key = isScrambleFormat(round.format)
      ? `team:${round.playerNames.join('|').toLowerCase() || round.teamName.toLowerCase() || round.id}`
      : `user:${round.playerIds[0] || round.userId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.rounds.push(round);
      continue;
    }

    grouped.set(key, {
      rounds: [round],
      label: getRoundDisplayName(round),
      userId: isScrambleFormat(round.format) ? null : round.playerIds[0] || round.userId,
      teamName: isScrambleFormat(round.format) ? getRoundDisplayName(round) : null,
    });
  }

  return Array.from(grouped.entries())
    .map(([entryId, entry]) => {
      const sortedRounds = entry.rounds
        .slice()
        .sort(
          (left, right) =>
            compareRounds(left, right) || right.dateKey.localeCompare(left.dateKey) || right.createdAt.localeCompare(left.createdAt)
        );
      const bestRound = sortedRounds[0];

      return {
        entryId,
        userId: entry.userId,
        name: entry.label,
        totalScore: bestRound.totalScore,
        scoreToPar: bestRound.scoreToPar,
        playedOn: bestRound.dateKey,
        roundsPlayed: entry.rounds.length,
        format,
        gameMode: format,
        visibility: bestRound.visibility,
        groupId: bestRound.groupId,
        teamName: entry.teamName,
        locationVerified: bestRound.locationVerified,
        distanceFromCourseMeters: bestRound.distanceFromCourseMeters,
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
    .filter((round) => round.playerIds.includes(userId) && round.format === 'individual' && matchesCourse(round, course, true))
    .sort((left, right) => compareRounds(left, right) || left.dateKey.localeCompare(right.dateKey) || left.createdAt.localeCompare(right.createdAt));

  if (!playerRounds.length) {
    return null;
  }

  const bestRound = playerRounds[0];
  const previousBest = playerRounds.find((round) => round.id !== bestRound.id && compareRounds(round, bestRound) > 0);

  return {
    roundId: bestRound.id,
    totalScore: bestRound.totalScore,
    scoreToPar: bestRound.scoreToPar,
    playedOn: bestRound.dateKey,
    improvement: previousBest ? previousBest.totalScore - bestRound.totalScore : null,
  };
}

export function getLatestRoundForCourse(course: Course, userId: string, rounds: Round[]) {
  return (
    rounds
      .filter((round) => round.playerIds.includes(userId) && matchesCourse(round, course, true))
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey) || right.createdAt.localeCompare(left.createdAt))[0] ?? null
  );
}

export function getFeaturedCourseLabel(course: Course | undefined, rounds: Round[]) {
  if (!course) {
    return 'Add a course to start comparing scores';
  }

  const roundsPlayed = rounds.filter((round) => round.courseId === course.id || round.courseSourceId === course.sourceId).length;
  const roundLabel = roundsPlayed === 1 ? '1 round logged' : `${roundsPlayed} rounds logged`;
  const teeCountLabel = course.tees.length === 1 ? '1 tee set' : `${course.tees.length} tee sets`;
  return `${course.name} / Par ${course.par} / ${teeCountLabel} / ${roundLabel}`;
}

export function formatScoreToPar(scoreToPar: number | null) {
  if (scoreToPar === null || scoreToPar === 0) {
    return 'E';
  }
  return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
}

export function getBestRoundForLeaderboard(course: Course, rounds: Round[], scope: LeaderboardScope, visibility: RoundVisibility = 'friends') {
  const scopedRounds = rounds.filter((round) => matchesCourse(round, course, scope === 'public') && round.visibility === visibility);
  return scopedRounds.sort((left, right) => compareRounds(left, right))[0] ?? null;
}

function compareLeaderboardEntries(left: CourseLeaderboardEntry, right: CourseLeaderboardEntry) {
  if (left.totalScore !== right.totalScore) {
    return left.totalScore - right.totalScore;
  }

  if (left.scoreToPar !== null && right.scoreToPar !== null && left.scoreToPar !== right.scoreToPar) {
    return left.scoreToPar - right.scoreToPar;
  }

  return left.playedOn.localeCompare(right.playedOn);
}

function compareRounds(left: Round, right: Round) {
  if (left.totalScore !== right.totalScore) {
    return left.totalScore - right.totalScore;
  }

  if (left.scoreToPar !== null && right.scoreToPar !== null && left.scoreToPar !== right.scoreToPar) {
    return left.scoreToPar - right.scoreToPar;
  }

  return 0;
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
