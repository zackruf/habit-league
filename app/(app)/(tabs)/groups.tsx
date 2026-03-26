import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { getLeaderboardNotice, pickTopLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function GroupsTabScreen() {
  const { getGroupDetails, groups, profile } = useApp();
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
    return <LoadingScreen message="Loading your groups..." />;
  }

  const totalMembers = groupDetails.reduce((sum, details) => sum + details.members.length, 0);
  const warning = pickTopLeaderboardNotice(
    groupDetails.map((details) => getLeaderboardNotice(details.leaderboard, profile.uid, details.group.name))
  );

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Groups"
        title="Your leagues"
        subtitle="Everything important about your groups in one place: rank pressure, invite codes, and who is leading this week."
      />

      <View style={commonStyles.statsRow}>
        <MetricCard value={`${groups.length}`} label="Active groups" detail="Leagues you're tracking" />
        <MetricCard value={`${totalMembers}`} label="Visible members" detail="Combined heads across your groups" />
      </View>

      {warning ? <LeaderboardNoticeCard title={warning.title} message={warning.message} /> : null}

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Create group" onPress={() => router.push('/(app)/groups/new')} />
        <PrimaryButton label="Join group" onPress={() => router.push('/(app)/groups/join')} variant="secondary" />
      </View>

      <SectionHeader title="Group overview" />
      <View style={commonStyles.compactSection}>
        {groupDetails.length ? (
          groupDetails.map((details) => {
            const foundIndex = details.leaderboard.findIndex((entry) => entry.userId === profile.uid);
            const rank = foundIndex === -1 ? details.members.length : foundIndex + 1;

            return (
              <SurfaceCard key={details.group.id} style={commonStyles.listCard}>
                <View style={commonStyles.listRow}>
                  <View style={commonStyles.listRowMeta}>
                    <Text style={commonStyles.listRowTitle}>{details.group.name}</Text>
                    <Text style={commonStyles.listRowSubtitle}>
                      #{rank} of {details.members.length} this week
                    </Text>
                  </View>
                  <View style={commonStyles.badgePill}>
                    <Text style={commonStyles.badgeText}>{details.group.joinCode}</Text>
                  </View>
                </View>
                <Text style={commonStyles.cardCopy}>{details.group.description}</Text>
                <View style={commonStyles.listRow}>
                  <Text style={commonStyles.listRowSubtitle}>
                    Leader: {details.leaderboard[0]?.name ?? 'Nobody yet'} with {details.leaderboard[0]?.weeklyCheckIns ?? 0}
                  </Text>
                  <Link href={`/(app)/groups/${details.group.id}`} style={commonStyles.inlineLink}>
                    Open
                  </Link>
                </View>
              </SurfaceCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No groups yet</Text>
            <Text style={commonStyles.cardCopy}>Create a group or join one with a code to start comparing progress.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}
