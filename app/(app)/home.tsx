import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { HabitCard } from '@/components/HabitCard';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PressableCard } from '@/components/PressableCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { StreakRestoreCard } from '@/components/StreakRestoreCard';
import { StreakRestoreMoment } from '@/components/StreakRestoreMoment';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate, getCurrentWeekLabel, getDaysUntilDateKey, getWeekUrgencyMessage } from '@/lib/date';
import { getLeaderboardNotice, pickTopLeaderboardNotice } from '@/lib/leaderboard';
import { pickTopRestoreOpportunity } from '@/lib/streaks';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails, Habit, LeaderboardEntry, LeagueChallenge } from '@/types/models';

const dismissedRestoreMomentKeys = new Set<string>();
const dismissedWeeklyRecapKeys = new Set<string>();

type RankSnapshot = {
  groupId: string;
  groupName: string;
  rank: number | null;
};

type RankFeedback = {
  title: string;
  message: string;
  groupId: string;
  groupName: string;
  spotsMoved: number;
  rank: number;
};

type WeeklyRecap = {
  key: string;
  title: string;
  message: string;
  detail: string;
};

export default function HomeScreen() {
  const { courses, getGroupDetails, groups, habits, profile, recordActivity, refreshing, restoreHabitStreak, rounds, shopInventory, toggleHabitCheckIn } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);
  const [activeRestoreMomentKey, setActiveRestoreMomentKey] = useState<string | null>(null);
  const [rankFeedback, setRankFeedback] = useState<RankFeedback | null>(null);
  const [dismissedWeeklyRecapKey, setDismissedWeeklyRecapKey] = useState<string | null>(null);

  const loadGroupDetailsSnapshot = useCallback(async () => {
    return (await Promise.all(groups.map((group) => getGroupDetails(group.id)))).filter(Boolean) as GroupDetails[];
  }, [getGroupDetails, groups]);

  useEffect(() => {
    let active = true;

    async function loadGroupDetails() {
      const details = await loadGroupDetailsSnapshot();
      if (active) {
        setGroupDetails(details);
      }
    }

    loadGroupDetails();

    return () => {
      active = false;
    };
  }, [loadGroupDetailsSnapshot]);

  const topRestoreOpportunity = pickTopRestoreOpportunity(habits);
  const weekUrgency = getWeekUrgencyMessage();
  const restoreMomentKey = topRestoreOpportunity
    ? `${topRestoreOpportunity.habit.id}:${topRestoreOpportunity.streakStatus.restoreEligibility.brokenOn ?? 'unknown'}`
    : null;
  const showRestoreMoment = Boolean(
    topRestoreOpportunity &&
      restoreMomentKey &&
      activeRestoreMomentKey === restoreMomentKey &&
      !dismissedRestoreMomentKeys.has(restoreMomentKey)
  );

  useEffect(() => {
    if (!restoreMomentKey || dismissedRestoreMomentKeys.has(restoreMomentKey)) {
      setActiveRestoreMomentKey(null);
      return;
    }

    setActiveRestoreMomentKey(restoreMomentKey);
  }, [restoreMomentKey]);

  if (!profile) {
    return <LoadingScreen message="Preparing your dashboard..." />;
  }

  const todayKey = formatFriendlyDate(new Date(), 'key');
  const challengeMap = new Map(groupDetails.flatMap((details) => details.challenges.map((challenge) => [challenge.id, challenge] as const)));
  const activeLeagueHabits =
    groupDetails.length === 0
      ? habits.filter((habit) => habit.groupId)
      : habits.filter((habit) => {
          const challenge = challengeMap.get(habit.challengeId);
          return habit.groupId && (!challenge || challenge.status === 'active');
        });
  const endingSoonChallenges = Array.from(challengeMap.values()).filter((challenge) => isChallengeEndingSoon(challenge));
  const completedToday = activeLeagueHabits.filter((habit) => habit.checkIns.includes(todayKey)).length;
  const leaderboardNotice = pickTopLeaderboardNotice(
    groupDetails.map((details) => getLeaderboardNotice(details.leaderboard, profile.uid, details.group.name))
  );
  const weeklyRecap = getWeeklyRecap(groupDetails, profile.uid);
  const showWeeklyRecap = Boolean(
    weeklyRecap &&
      weeklyRecap.key !== dismissedWeeklyRecapKey &&
      !dismissedWeeklyRecapKeys.has(weeklyRecap.key)
  );

  async function handleRestoreStreak(habitId: string) {
    setRestoreBusyId(habitId);
    const result = await restoreHabitStreak(habitId);
    if (result.ok && restoreMomentKey) {
      dismissedRestoreMomentKeys.add(restoreMomentKey);
      setActiveRestoreMomentKey(null);
    }
    setRestoreBusyId(null);
  }

  function handleDismissRestoreMoment() {
    if (restoreMomentKey) {
      dismissedRestoreMomentKeys.add(restoreMomentKey);
    }
    setActiveRestoreMomentKey(null);
  }

  function handleGetRestore() {
    handleDismissRestoreMoment();
    router.push('/(app)/(tabs)/shop');
  }

  async function handleToggleHabitCheckIn(habit: Habit) {
    if (!profile) {
      return;
    }

    const wasCheckedInToday = habit.checkIns.includes(todayKey);
    const beforeRanks = buildRankSnapshots(groupDetails, profile.uid);

    await toggleHabitCheckIn(habit.id);
    const nextDetails = await loadGroupDetailsSnapshot();
    setGroupDetails(nextDetails);

    if (!wasCheckedInToday) {
      const habitGroup = nextDetails.find((details) => details.group.id === habit.groupId);
      if (habitGroup) {
        await recordActivity({
          type: 'check_in',
          groupId: habitGroup.group.id,
          groupName: habitGroup.group.name,
          habitId: habit.id,
          habitTitle: habit.title,
        });
      }

      const feedback = getRankFeedback(beforeRanks, buildRankSnapshots(nextDetails, profile.uid));
      setRankFeedback(feedback);
      if (feedback && feedback.spotsMoved > 0) {
        await recordActivity({
          type: 'rank_movement',
          groupId: feedback.groupId,
          groupName: feedback.groupName,
          habitId: habit.id,
          habitTitle: habit.title,
          spotsMoved: feedback.spotsMoved,
          rank: feedback.rank,
        });
      }
    } else {
      setRankFeedback(null);
    }
  }

  function handleDismissWeeklyRecap() {
    if (!weeklyRecap) {
      return;
    }

    dismissedWeeklyRecapKeys.add(weeklyRecap.key);
    setDismissedWeeklyRecapKey(weeklyRecap.key);
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      {topRestoreOpportunity ? (
        <StreakRestoreMoment
          busy={restoreBusyId === topRestoreOpportunity.habit.id}
          habit={topRestoreOpportunity.habit}
          hasRestoreCredit={Boolean(shopInventory && shopInventory.streakRestoreCredits > 0)}
          onDismiss={handleDismissRestoreMoment}
          onGetRestore={handleGetRestore}
          onRestore={() => handleRestoreStreak(topRestoreOpportunity.habit.id)}
          streakStatus={topRestoreOpportunity.streakStatus}
          visible={showRestoreMoment}
        />
      ) : null}

      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${profile.name.split(' ')[0]}.`}
        subtitle={`${rounds.length} logged rounds, ${courses.length} tracked courses, and ${completedToday} active competition check-ins. ${getCurrentWeekLabel()}.`}
      />

      {rankFeedback ? (
        <SurfaceCard style={commonStyles.currentUserCard}>
          <Text style={commonStyles.noticeEyebrow}>{rankFeedback.title}</Text>
          <Text style={commonStyles.noticeMessage}>{rankFeedback.message}</Text>
        </SurfaceCard>
      ) : null}

      {showWeeklyRecap && weeklyRecap ? (
        <SurfaceCard style={commonStyles.weeklyPreviewCard}>
          <Text style={commonStyles.noticeEyebrow}>{weeklyRecap.title}</Text>
          <Text style={commonStyles.noticeMessage}>{weeklyRecap.message}</Text>
          <Text style={commonStyles.smallMuted}>{weeklyRecap.detail}</Text>
          <View style={commonStyles.actionRowTight}>
            <PrimaryButton label="Got it" onPress={handleDismissWeeklyRecap} variant="secondary" />
          </View>
        </SurfaceCard>
      ) : null}

      {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

      {weekUrgency ? (
        <SurfaceCard style={commonStyles.noticeCard}>
          <Text style={commonStyles.noticeEyebrow}>{weekUrgency.title}</Text>
          <Text style={commonStyles.noticeMessage}>{weekUrgency.message}</Text>
        </SurfaceCard>
      ) : null}

      {endingSoonChallenges.length ? (
        <SurfaceCard style={commonStyles.noticeCard}>
          <Text style={commonStyles.noticeEyebrow}>Ending soon</Text>
          <Text style={commonStyles.noticeMessage}>
            {endingSoonChallenges[0].title} in {groupDetails.find((details) => details.group.id === endingSoonChallenges[0].groupId)?.group.name ?? 'your league'} is in its final push.
          </Text>
        </SurfaceCard>
      ) : null}

      {topRestoreOpportunity ? (
        <StreakRestoreCard
          actionLabel={shopInventory && shopInventory.streakRestoreCredits > 0 ? 'Restore streak' : 'Open Shop'}
          busy={restoreBusyId === topRestoreOpportunity.habit.id}
          helper={
            shopInventory && shopInventory.streakRestoreCredits > 0
              ? 'One restore credit is ready. Use it before this second-chance window closes.'
              : 'Get a restore in the Shop to save this streak while the window is still open.'
          }
          message={`You lost your ${topRestoreOpportunity.streakStatus.restoreEligibility.lostStreak}-day streak. Restore it today.`}
          onRestore={() =>
            shopInventory && shopInventory.streakRestoreCredits > 0
              ? handleRestoreStreak(topRestoreOpportunity.habit.id)
              : router.push('/(app)/(tabs)/shop')
          }
          title="Second chance available"
        />
      ) : null}

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Join golf group" onPress={() => router.push('/(app)/groups/join')} />
        <PrimaryButton label="Create golf group" onPress={() => router.push('/(app)/groups/new')} variant="secondary" />
      </View>
      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Add course" onPress={() => router.push('/(app)/courses/new')} variant="secondary" />
        <PrimaryButton label="Log round" onPress={() => router.push('/(app)/rounds/new')} variant="secondary" />
      </View>

      <SectionHeader title="Legacy competition tracking" action={refreshing ? <Text style={commonStyles.mutedText}>Syncing...</Text> : undefined} />
      <View style={commonStyles.compactSection}>
        {activeLeagueHabits.length ? (
          activeLeagueHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              actionLabel="Check in for league"
              habit={habit}
              helperText={getDashboardHabitHelper(habit, challengeMap.get(habit.challengeId), groupDetails)}
              onToggle={() => handleToggleHabitCheckIn(habit)}
            />
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No competition tracking yet</Text>
            <Text style={commonStyles.cardCopy}>Add a course and log rounds first. The older challenge tracker is still here while Rivl pivots fully into golf.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Golf groups this week" />
      <View style={commonStyles.compactSection}>
        {groupDetails.length ? (
          groupDetails.map((details) => {
            const foundIndex = details.leaderboard.findIndex((entry) => entry.userId === profile.uid);
            const rank = foundIndex === -1 ? null : foundIndex + 1;
            const visibilityLabel = details.group.visibility === 'public' ? 'Public' : 'Private';
            const topChallenge = details.challenges.find((challenge) => challenge.status === 'active')?.title;
            const metadata = rank
              ? `#${rank} this week / ${visibilityLabel}${topChallenge ? ` / ${topChallenge}` : ''}`
              : `Leader: ${details.leaderboard[0]?.name ?? 'Nobody yet'} / ${visibilityLabel}`;

            return (
              <PressableCard
                key={details.group.id}
                accessibilityHint="Opens the selected group"
                accessibilityLabel={`Open ${details.group.name}`}
                onPress={() => router.push(`/(app)/groups/${details.group.id}`)}
                style={commonStyles.weeklyPreviewCard}
              >
                <View style={commonStyles.listRow}>
                  <View style={commonStyles.listRowMeta}>
                    <Text style={commonStyles.listRowTitle}>{details.group.name}</Text>
                    <Text style={commonStyles.listRowSubtitle}>{metadata}</Text>
                  </View>
                  <View style={commonStyles.rankPreviewBadge}>
                    <Text style={commonStyles.rankPreviewValue}>{rank ? `#${rank}` : '--'}</Text>
                  </View>
                </View>
              </PressableCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No golf group activity yet</Text>
            <Text style={commonStyles.cardCopy}>Create or join a golf group to see weekly movement here.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}

function getDashboardHabitHelper(habit: Habit, challenge: LeagueChallenge | undefined, groupDetails: GroupDetails[]) {
  const groupName = groupDetails.find((details) => details.group.id === habit.groupId)?.group.name ?? 'League';
  if (challenge && isChallengeEndingSoon(challenge)) {
    return `${groupName} / Final push / ${habit.category}`;
  }

  return `${groupName} / Legacy challenge tracker / ${habit.category}`;
}

function isChallengeEndingSoon(challenge: LeagueChallenge) {
  if (challenge.status !== 'active' || !challenge.endDateKey) {
    return false;
  }

  const daysUntil = getDaysUntilDateKey(challenge.endDateKey);
  return daysUntil >= 0 && daysUntil <= 1;
}

function buildRankSnapshots(groupDetails: GroupDetails[], userId: string): RankSnapshot[] {
  return groupDetails.map((details) => ({
    groupId: details.group.id,
    groupName: details.group.name,
    rank: getRank(details.leaderboard, userId),
  }));
}

function getRank(leaderboard: LeaderboardEntry[], userId: string) {
  const index = leaderboard.findIndex((entry) => entry.userId === userId);
  return index === -1 ? null : index + 1;
}

function getRankFeedback(beforeRanks: RankSnapshot[], afterRanks: RankSnapshot[]): RankFeedback | null {
  const movements = afterRanks
    .map((after) => {
      const before = beforeRanks.find((entry) => entry.groupId === after.groupId);
      if (!after.rank) {
        return null;
      }
      if (!before?.rank) {
        return {
          ...after,
          spotsMoved: 0,
          title: 'You are on the board',
          message: `You are now #${after.rank} in ${after.groupName}.`,
        };
      }
      if (after.rank < before.rank) {
        const spotsMoved = before.rank - after.rank;
        return {
          ...after,
          spotsMoved,
          title: spotsMoved === 1 ? 'You moved up 1 spot' : `You moved up ${spotsMoved} spots`,
          message: `You are now #${after.rank} in ${after.groupName}.`,
        };
      }

      return null;
    })
    .filter((movement): movement is NonNullable<typeof movement> => Boolean(movement))
    .sort((left, right) => right.spotsMoved - left.spotsMoved || (left.rank ?? 99) - (right.rank ?? 99));

  const bestMovement = movements[0];
  return bestMovement && bestMovement.rank
    ? {
        title: bestMovement.title,
        message: bestMovement.message,
        groupId: bestMovement.groupId,
        groupName: bestMovement.groupName,
        spotsMoved: bestMovement.spotsMoved,
        rank: bestMovement.rank,
      }
    : null;
}

function getWeeklyRecap(groupDetails: GroupDetails[], userId: string): WeeklyRecap | null {
  const today = new Date();
  if (today.getDay() !== 1) {
    return null;
  }

  const recaps = groupDetails
    .map((details) => {
      const leaderboard = details.previousWeekLeaderboard;
      const rank = getRank(leaderboard, userId);
      const topPerformer = leaderboard[0];
      if (!rank || !topPerformer || leaderboard.length < 2) {
        return null;
      }

      return {
        key: `${details.group.id}:${formatFriendlyDate(today, 'key')}`,
        title: 'Weekly recap',
        message: `Last week you finished #${rank} in ${details.group.name}.`,
        detail: `Top performer: ${topPerformer.name}. Fresh week, fresh start — check in early to set the pace.`,
        rank,
        groupSize: leaderboard.length,
      };
    })
    .filter((recap): recap is NonNullable<typeof recap> => Boolean(recap))
    .sort((left, right) => left.rank - right.rank || right.groupSize - left.groupSize);

  return recaps[0] ?? null;
}
