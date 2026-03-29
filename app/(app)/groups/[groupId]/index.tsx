import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GroupChatPanel } from '@/components/GroupChatPanel';
import { GroupSummaryCard } from '@/components/GroupSummaryCard';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { getLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';
import { spacing } from '@/constants/theme';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails, session } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');

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
    <AppScreen contentContainerStyle={styles.screenContent} disableBottomPadding>
      <View style={commonStyles.pageStack}>
        <PageHeader
          eyebrow="Group"
          title={details.group.name}
          subtitle={details.group.description || 'A focused accountability group built around showing up each week.'}
        />

        {leaderboardNotice ? <LeaderboardNoticeCard title={leaderboardNotice.title} message={leaderboardNotice.message} /> : null}

        <View style={commonStyles.segmentedRow}>
          {[
            { key: 'overview' as const, label: 'Overview' },
            { key: 'chat' as const, label: 'Chat' },
          ].map((option) => {
            const active = activeTab === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setActiveTab(option.key)}
                style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
              >
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.overviewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.body}
        >
          <GroupSummaryCard group={details.group} memberCount={details.members.length} onEdit={isOwner ? () => router.push(`/(app)/groups/${details.group.id}/edit`) : undefined} />

          <SectionHeader title="Weekly leaderboard" />
          <View style={commonStyles.compactSection}>
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
          </View>

          <SectionHeader title="Members" />
          <View style={commonStyles.compactSection}>
            {details.members.map((member) => (
              <SurfaceCard key={member.uid}>
                <Text style={commonStyles.cardTitle}>{member.name}</Text>
                <Text style={commonStyles.cardCopy}>{member.bio || member.email}</Text>
              </SurfaceCard>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <GroupChatPanel groupId={details.group.id} />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  overviewContent: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
