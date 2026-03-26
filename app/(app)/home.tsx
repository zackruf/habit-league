import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { HabitCard } from '@/components/HabitCard';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
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
    <AppScreen scrollable>
      <View style={commonStyles.heroPanel}>
        <Text style={commonStyles.eyebrow}>This week</Text>
        <Text style={commonStyles.heroTitle}>Welcome back, {profile.name}.</Text>
        <Text style={commonStyles.heroSubtitle}>
          {completedToday} of {habits.length} habits checked in today. {getCurrentWeekLabel()} is live.
        </Text>
      </View>

      {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

      <View style={commonStyles.statsRow}>
        <SurfaceCard style={commonStyles.statCard}>
          <Text style={commonStyles.statValue}>{habits.length}</Text>
          <Text style={commonStyles.statLabel}>Active habits</Text>
        </SurfaceCard>
        <SurfaceCard style={commonStyles.statCard}>
          <Text style={commonStyles.statValue}>{groups.length}</Text>
          <Text style={commonStyles.statLabel}>Groups joined</Text>
        </SurfaceCard>
      </View>

      <SectionHeader
        title="Quick actions"
        action={
          <Link href="/(app)/(tabs)/profile" style={commonStyles.inlineLink}>
            Edit profile
          </Link>
        }
      />
      <View style={commonStyles.actionGrid}>
        <PrimaryButton label="Create habit" onPress={() => router.push('/(app)/habits/new')} />
        <PrimaryButton label="Create group" onPress={() => router.push('/(app)/groups/new')} variant="secondary" />
        <PrimaryButton label="Join group" onPress={() => router.push('/(app)/groups/join')} variant="ghost" />
      </View>

      <SectionHeader title="Daily check-in" action={refreshing ? <Text style={commonStyles.mutedText}>Syncing...</Text> : null} />
      {habits.length ? (
        habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabitCheckIn(habit.id)} />)
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No habits yet</Text>
          <Text style={commonStyles.cardCopy}>Start with one small daily action and build momentum from there.</Text>
        </SurfaceCard>
      )}

      <SectionHeader title="Your groups" />
      {groups.length ? (
        groups.map((group) => (
          <SurfaceCard key={group.id}>
            <Text style={commonStyles.cardTitle}>{group.name}</Text>
            <Text style={commonStyles.cardCopy}>{group.description}</Text>
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.smallMuted}>Join code: {group.joinCode}</Text>
              <Link href={`/(app)/groups/${group.id}`} style={commonStyles.inlineLink}>
                Open group
              </Link>
            </View>
          </SurfaceCard>
        ))
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>Bring in your people</Text>
          <Text style={commonStyles.cardCopy}>
            Create a private group for friends, roommates, or coworkers and compare your weekly check-ins.
          </Text>
        </SurfaceCard>
      )}
    </AppScreen>
  );
}
