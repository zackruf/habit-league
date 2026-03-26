import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { HabitCard } from '@/components/HabitCard';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate, getCurrentWeekLabel } from '@/lib/date';
import { getLeaderboardNotice, pickTopLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function HomeScreen() {
  const { getGroupDetails, groups, habits, profile, refreshing, toggleHabitCheckIn } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);

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

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${profile.name.split(' ')[0]}.`}
        subtitle={`${completedToday} of ${habits.length} habits checked in today. ${getCurrentWeekLabel()}.`}
      />

      {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

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
          groupDetails.map((details) => (
            <SurfaceCard key={details.group.id} style={commonStyles.listCard}>
              <View style={commonStyles.listRow}>
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.listRowTitle}>{details.group.name}</Text>
                  <Text style={commonStyles.listRowSubtitle}>
                    Leader: {details.leaderboard[0]?.name ?? 'Nobody yet'} with {details.leaderboard[0]?.weeklyCheckIns ?? 0} check-ins
                  </Text>
                </View>
                <Link href={`/(app)/groups/${details.group.id}`} style={commonStyles.inlineLink}>
                  Open
                </Link>
              </View>
            </SurfaceCard>
          ))
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
