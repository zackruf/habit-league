import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate, getCurrentWeekLabel, getWeekUrgencyMessage } from '@/lib/date';
import { getLeaderboardNotice, pickTopLeaderboardNotice } from '@/lib/leaderboard';
import { pickTopRestoreOpportunity } from '@/lib/streaks';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function HomeScreen() {
  const { getGroupDetails, groups, habits, profile, refreshing, restoreHabitStreak, shopInventory, toggleHabitCheckIn } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroupDetails() {
      const details = (await Promise.all(groups.map((group) => getGroupDetails(group.id)))).filter(Boolean) as GroupDetails[];
      if (active) {
        setGroupDetails(details);
      }
    }

    loadGroupDetails();

    return () => {
      active = false;
    };
  }, [getGroupDetails, groups]);

  if (!profile) {
    return <LoadingScreen message="Preparing your dashboard..." />;
  }

  const todayKey = formatFriendlyDate(new Date(), 'key');
  const completedToday = habits.filter((habit) => habit.checkIns.includes(todayKey)).length;
  const leaderboardNotice = pickTopLeaderboardNotice(
    groupDetails.map((details) => getLeaderboardNotice(details.leaderboard, profile.uid, details.group.name))
  );
  const topRestoreOpportunity = pickTopRestoreOpportunity(habits);
  const weekUrgency = getWeekUrgencyMessage();

  async function handleRestoreStreak(habitId: string) {
    setRestoreBusyId(habitId);
    await restoreHabitStreak(habitId);
    setRestoreBusyId(null);
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${profile.name.split(' ')[0]}.`}
        subtitle={`${completedToday} of ${habits.length} habits checked in today. ${getCurrentWeekLabel()}.`}
      />

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
              ? 'One restore credit is ready. Premium billing can gate this later without changing the streak flow.'
              : 'Pick up a restore in the Shop to save this streak while the 24-hour window is still open.'
          }
          message={`You lost your ${topRestoreOpportunity.streakStatus.restoreEligibility.lostStreak}-day streak. Save it within 24 hours.`}
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
          habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabitCheckIn(habit.id)} />)
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
