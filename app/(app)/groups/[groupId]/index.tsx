import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { getLeaderboardNotice } from '@/lib/leaderboard';
import { commonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails, session } = useApp();
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

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Group page</Text>
      <Text style={commonStyles.pageTitle}>{details.group.name}</Text>
      <Text style={commonStyles.pageCopy}>{details.group.description}</Text>

      {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

      <View style={commonStyles.statsRow}>
        <SurfaceCard style={commonStyles.statCard}>
          <Text style={commonStyles.statValue}>{details.members.length}</Text>
          <Text style={commonStyles.statLabel}>Members</Text>
        </SurfaceCard>
        <SurfaceCard style={commonStyles.statCard}>
          <Text style={commonStyles.statValue}>{details.group.joinCode}</Text>
          <Text style={commonStyles.statLabel}>Join code</Text>
        </SurfaceCard>
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
      {details.members.map((member) => (
        <SurfaceCard key={member.uid}>
          <Text style={commonStyles.cardTitle}>{member.name}</Text>
          <Text style={commonStyles.cardCopy}>{member.bio || member.email}</Text>
        </SurfaceCard>
      ))}
    </AppScreen>
  );
}
