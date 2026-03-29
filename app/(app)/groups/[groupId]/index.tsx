import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { getLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails, session } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then(setDetails);
  }, [getGroupDetails, groupId]);

  if (!details) {
    return <LoadingScreen message="Loading your group..." />;
  }

  const leaderboardNotice = session ? getLeaderboardNotice(details.leaderboard, session.uid) : null;
  const isOwner = session?.uid === details.group.ownerId;

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Group"
        title={details.group.name}
        subtitle={details.group.description || 'A focused accountability group built around showing up each week.'}
        trailing={
          isOwner ? (
            <Link href={`/(app)/groups/${details.group.id}/edit`} style={commonStyles.inlineLink}>
              Edit
            </Link>
          ) : undefined
        }
      />

      {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Summary" />
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Visibility</Text>
            <Text style={commonStyles.settingSubtitle}>
              {details.group.visibility === 'public' ? 'Public and marked discoverable' : 'Private and invite-only by code'}
            </Text>
          </View>
          <Text style={commonStyles.usernameText}>
            {details.group.visibility === 'public' ? 'Public' : 'Private'}
          </Text>
        </View>
        <View style={commonStyles.divider} />
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Join code</Text>
            <Text style={commonStyles.settingSubtitle}>Share this code with people you want in the group.</Text>
          </View>
          <Text style={commonStyles.usernameText}>{details.group.joinCode}</Text>
        </View>
        <View style={commonStyles.divider} />
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Member limit</Text>
            <Text style={commonStyles.settingSubtitle}>
              {details.group.memberLimit ? `${details.members.length} of ${details.group.memberLimit} spots used` : 'No limit set'}
            </Text>
          </View>
        </View>
        <View style={commonStyles.divider} />
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Stakes Mode</Text>
            <Text style={commonStyles.settingSubtitle}>
              {details.group.stakesEnabled ? details.group.stakesText : 'No challenge consequence set for this group.'}
            </Text>
          </View>
          <Text style={commonStyles.usernameText}>{details.group.stakesEnabled ? 'On' : 'Off'}</Text>
        </View>
      </SurfaceCard>

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Open chat" onPress={() => router.push(`/(app)/groups/${details.group.id}/chat`)} />
        {isOwner ? (
          <PrimaryButton label="Edit group" onPress={() => router.push(`/(app)/groups/${details.group.id}/edit`)} variant="secondary" />
        ) : null}
      </View>

      <SectionHeader
        title="Weekly leaderboard"
        action={
          <Link href={`/(app)/groups/${details.group.id}/leaderboard`} style={commonStyles.inlineLink}>
            Full view
          </Link>
        }
      />
      {details.leaderboard.slice(0, 3).map((entry, index) => (
        <SurfaceCard key={entry.userId}>
          <View style={commonStyles.rowBetween}>
            <Text style={commonStyles.cardTitle}>
              #{index + 1} {entry.name}
            </Text>
            <Text style={commonStyles.statValue}>{entry.weeklyCheckIns}</Text>
          </View>
          <Text style={commonStyles.cardCopy}>{entry.weeklyCheckIns} check-ins this week</Text>
        </SurfaceCard>
      ))}

      <SectionHeader title="Members" />
      <View style={commonStyles.compactSection}>
        {details.members.map((member) => (
          <SurfaceCard key={member.uid}>
            <Text style={commonStyles.cardTitle}>{member.name}</Text>
            <Text style={commonStyles.cardCopy}>{member.bio || member.email}</Text>
          </SurfaceCard>
        ))}
      </View>
    </AppScreen>
  );
}
