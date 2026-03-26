import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
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

  const warning = pickTopLeaderboardNotice(
    groupDetails.map((details) => getLeaderboardNotice(details.leaderboard, profile.uid, details.group.name))
  );

  return (
    <AppScreen scrollable>
      <View style={commonStyles.heroPanelAlt}>
        <Text style={commonStyles.eyebrow}>Groups</Text>
        <Text style={commonStyles.pageTitle}>Run the league with your people</Text>
        <Text style={commonStyles.pageCopy}>
          Keep invite codes handy, jump into group pages, and track which league needs attention this week.
        </Text>
      </View>

      {warning ? <LeaderboardNoticeCard title={warning.title} message={warning.message} /> : null}

      <View style={commonStyles.inlineActionRow}>
        <PrimaryButton label="Create group" onPress={() => router.push('/(app)/groups/new')} />
        <PrimaryButton label="Join group" onPress={() => router.push('/(app)/groups/join')} variant="secondary" />
      </View>

      <SectionHeader title="Your leagues" />
      {groupDetails.length ? (
        groupDetails.map((details) => (
          <SurfaceCard key={details.group.id} style={commonStyles.groupShowcaseCard}>
            <View style={commonStyles.rowBetween}>
              <View style={commonStyles.cardCopyBlock}>
                <Text style={commonStyles.cardTitle}>{details.group.name}</Text>
                <Text style={commonStyles.cardCopy}>{details.group.description}</Text>
              </View>
              <View style={commonStyles.badgePill}>
                <Text style={commonStyles.badgeText}>{details.members.length} members</Text>
              </View>
            </View>

            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.smallMuted}>Join code: {details.group.joinCode}</Text>
              <Text style={commonStyles.smallMuted}>
                Leader: {details.leaderboard[0]?.name ?? 'Nobody yet'} ({details.leaderboard[0]?.weeklyCheckIns ?? 0})
              </Text>
            </View>

            <Link href={`/(app)/groups/${details.group.id}`} style={commonStyles.inlineLink}>
              Open group page
            </Link>
          </SurfaceCard>
        ))
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No groups yet</Text>
          <Text style={commonStyles.cardCopy}>Create a group or join one with a code to start comparing weekly progress.</Text>
        </SurfaceCard>
      )}
    </AppScreen>
  );
}
