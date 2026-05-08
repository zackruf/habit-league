import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PressableCard } from '@/components/PressableCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { JoinCodeChip } from '@/components/JoinCodeChip';
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
        subtitle={`Track ${groups.length} leagues, ${totalMembers} visible members, and the challenges driving this week's standings.`}
      />

      {warning ? <LeaderboardNoticeCard title={warning.title} message={warning.message} /> : null}

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Create league" onPress={() => router.push('/(app)/groups/new')} />
        <PrimaryButton label="Join league" onPress={() => router.push('/(app)/groups/join')} variant="secondary" />
      </View>

      <SectionHeader title="Your groups" />
      <View style={commonStyles.compactSection}>
        {groupDetails.length ? (
          groupDetails.map((details) => {
            const foundIndex = details.leaderboard.findIndex((entry) => entry.userId === profile.uid);
            const rank = foundIndex === -1 ? details.members.length : foundIndex + 1;
            const memberLabel = details.members.length === 1 ? '1 member' : `${details.members.length} members`;
            const visibilityLabel = details.group.visibility === 'public' ? 'Public' : 'Private';
            const challengeLabel = details.habits[0]?.title ? `Challenge: ${details.habits[0].title}` : 'Add the first group challenge';
            const statusLine = `#${rank} this week / ${memberLabel}`;
            const secondaryLine = details.group.stakesEnabled && details.group.stakesText ? `${visibilityLabel} / Stakes live` : visibilityLabel;

            return (
              <PressableCard
                key={details.group.id}
                accessibilityHint="Opens the selected group"
                accessibilityLabel={`Open ${details.group.name}`}
                onPress={() => router.push(`/(app)/groups/${details.group.id}`)}
                style={commonStyles.listCard}
              >
                <View style={commonStyles.listRow}>
                  <View style={commonStyles.listRowMeta}>
                    <Text style={commonStyles.listRowTitle}>{details.group.name}</Text>
                    <Text style={commonStyles.listRowSubtitle}>{statusLine}</Text>
                  </View>
                  <JoinCodeChip code={details.group.joinCode} />
                </View>
                <Text style={commonStyles.cardCopy}>{challengeLabel}</Text>
                {details.group.description ? <Text style={commonStyles.smallMuted}>{details.group.description}</Text> : null}
                <Text style={commonStyles.listRowSubtitle}>{secondaryLine}</Text>
              </PressableCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No leagues yet</Text>
            <Text style={commonStyles.cardCopy}>Create or join a league to start competing around shared challenges instead of tracking alone.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}
