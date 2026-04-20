import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { formatFriendlyDate, getCurrentWeekLabel, getWeekUrgencyMessage } from '@/lib/date';
import { getLeaderboardNotice, pickTopLeaderboardNotice } from '@/lib/leaderboard';
import { pickTopRestoreOpportunity } from '@/lib/streaks';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails, Habit, LeaderboardEntry } from '@/types/models';

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
  const { getGroupDetails, groups, habits, profile, recordActivity, refreshing, restoreHabitStreak, shopInventory, toggleHabitCheckIn } = useApp();
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
  const completedToday = habits.filter((habit) => habit.checkIns.includes(todayKey)).length;
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
      const activityGroups = nextDetails.filter((details) => details.group.memberIds.includes(profile.uid));
      await Promise.all(
        activityGroups.map((details) =>
          recordActivity({
            type: 'check_in',
            groupId: details.group.id,
            groupName: details.group.name,
            habitId: habit.id,
            habitTitle: habit.title,
          })
        )
      );

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
        subtitle={`${completedToday} of ${habits.length} habits checked in today. ${getCurrentWeekLabel()}.`}
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
        <PrimaryButton label="Create habit" onPress={() => router.push('/(app)/habits/new')} />
        <PrimaryButton label="Create group" onPress={() => router.push('/(app)/groups/new')} variant="secondary" />
      </View>

      <SectionHeader title="Today's habits" action={refreshing ? <Text style={commonStyles.mutedText}>Syncing...</Text> : undefined} />
      <View style={commonStyles.compactSection}>
        {habits.length ? (
          habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={() => handleToggleHabitCheckIn(habit)} />)
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No habits yet</Text>
            <Text style={commonStyles.cardCopy}>Add one habit and the dashboard will start feeling useful right away.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="This week" />
      <View style={commonStyles.compactSection}>
        {groupDetails.length ? (
          groupDetails.map((details) => {
            const foundIndex = details.leaderboard.findIndex((entry) => entry.userId === profile.uid);
            const rank = foundIndex === -1 ? null : foundIndex + 1;
            const visibilityLabel = details.group.visibility === 'public' ? 'Public' : 'Private';
            const metadata = rank ? `#${rank} this week / ${visibilityLabel}` : `Leader: ${details.leaderboard[0]?.name ?? 'Nobody yet'} / ${visibilityLabel}`;

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
            <Text style={commonStyles.cardTitle}>No competitive activity yet</Text>
            <Text style={commonStyles.cardCopy}>Create or join a group to see weekly movement here.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
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
