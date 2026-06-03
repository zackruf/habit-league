import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityFeed } from '@/components/ActivityFeed';
import { AppScreen } from '@/components/AppScreen';
import { GroupChatPanel } from '@/components/GroupChatPanel';
import { GroupSummaryCard } from '@/components/GroupSummaryCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { buildCourseLeaderboard, formatScoreToPar, getPersonalBest, getRoundDisplayName, getRoundFormatLabel } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';
import { ActivityItem, ActivityShoutoutType, GroupDetails } from '@/types/models';
import { spacing } from '@/constants/theme';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { addActivityShoutout, getActivityFeed, getGroupDetails, session } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then(setDetails);
  }, [getGroupDetails, groupId]);

  useEffect(() => {
    let active = true;
    if (!groupId) {
      return undefined;
    }

    getActivityFeed(groupId).then((feed) => {
      if (active) {
        setActivities(feed);
      }
    });

    return () => {
      active = false;
    };
  }, [getActivityFeed, groupId]);

  if (!details) {
    return <LoadingScreen message="Loading your golf group..." />;
  }

  async function handleShoutout(activityId: string, shoutoutType: ActivityShoutoutType) {
    if (!details) {
      return;
    }
    const currentGroupId = details.group.id;
    await addActivityShoutout(activityId, shoutoutType);
    setActivities(await getActivityFeed(currentGroupId));
  }

  const isOwner = session?.uid === details.group.ownerId;

  return (
    <AppScreen contentContainerStyle={styles.screenContent} disableBottomPadding>
      <View style={commonStyles.pageStack}>
        <PageHeader
          eyebrow="Golf group"
          title={details.group.name}
          subtitle={details.group.description || 'Chat, members, activity, leaderboards.'}
        />

        <View style={commonStyles.segmentedRow}>
          {[
            { key: 'overview' as const, label: 'Overview' },
            { key: 'chat' as const, label: 'Chat' },
          ].map((option) => {
            const active = activeTab === option.key;
            return (
              <Pressable key={option.key} onPress={() => setActiveTab(option.key)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
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

          <View style={commonStyles.actionRowTight}>
            <PrimaryButton label="Log scramble" onPress={() => router.push(`/(app)/rounds/new?groupId=${details.group.id}`)} />
            <PrimaryButton label="View courses" onPress={() => router.push('/(app)/(tabs)/courses')} variant="secondary" />
          </View>

          <SectionHeader title="Course scoreboards" />
          <View style={commonStyles.compactSection}>
            {details.courses.length ? (
              details.courses.map((course) => {
                const individualLeaderboard = buildCourseLeaderboard(course, details.rounds, details.members, { format: 'individual', scope: 'group', groupId: details.group.id });
                const scrambleLeaderboard = buildCourseLeaderboard(course, details.rounds, details.members, { format: 'scramble2', scope: 'group', groupId: details.group.id });
                const personalBest = session ? getPersonalBest(course, session.uid, details.rounds) : null;
                const individualLeader = individualLeaderboard[0];
                const scrambleLeader = scrambleLeaderboard[0];

                return (
                  <SurfaceCard key={course.id}>
                    <View style={commonStyles.rowBetween}>
                      <View style={commonStyles.cardCopyBlock}>
                        <Text style={commonStyles.cardTitle}>{course.name}</Text>
                        <Text style={commonStyles.cardCopy}>
                          {course.location} / Par {course.par} / {course.holesCount} holes
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {scrambleLeader ? `2-Man Scramble leader: ${scrambleLeader.name} / ${scrambleLeader.totalScore} (${scrambleLeader.indicatorLabel})` : 'No 2-Man Scramble scores yet.'}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {individualLeader ? `Individual leader: ${individualLeader.name} / ${individualLeader.totalScore} (${individualLeader.indicatorLabel})` : 'No individual scores yet.'}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {personalBest ? `Your best: ${personalBest.totalScore} (${formatScoreToPar(personalBest.scoreToPar)})` : 'Your best will appear after your first round.'}
                        </Text>
                      </View>
                      <PrimaryButton label="Open" onPress={() => router.push(`/(app)/courses/${course.id}`)} variant="secondary" />
                    </View>
                  </SurfaceCard>
                );
              })
            ) : (
              <SurfaceCard>
                <Text style={commonStyles.cardTitle}>No catalog courses yet</Text>
                <Text style={commonStyles.cardCopy}>Courses appear here when they are added to the database catalog.</Text>
              </SurfaceCard>
            )}
          </View>

          <SectionHeader title="Recent activity" />
          <ActivityFeed
            activities={activities.slice(0, 5)}
            currentUserId={session?.uid}
            emptyMessage="Rounds, leaderboard moves, and personal bests for this group will show up here."
            emptyTitle="No group golf activity yet"
            onShoutout={handleShoutout}
          />

          <SectionHeader title="Group scoreboard snapshot" />
          <View style={commonStyles.compactSection}>
            {details.rounds.length ? (
              details.rounds
                .slice()
                .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt))
                .slice(0, 3)
                .map((round) => (
                  <SurfaceCard key={round.id}>
                    <View style={commonStyles.rowBetween}>
                      <Text style={commonStyles.cardTitle}>{getRoundDisplayName(round)}</Text>
                      <Text style={commonStyles.statValue}>{round.totalScore}</Text>
                    </View>
                    <Text style={commonStyles.cardCopy}>
                      {round.courseName} / {getRoundFormatLabel(round.format)} / {formatScoreToPar(round.scoreToPar)}
                    </Text>
                    <Text style={commonStyles.smallMuted}>{round.dateKey}</Text>
                  </SurfaceCard>
                ))
            ) : (
              <SurfaceCard>
                <Text style={commonStyles.cardTitle}>No group rounds yet</Text>
                <Text style={commonStyles.cardCopy}>Once someone posts the first score, the group snapshot will start filling in here.</Text>
              </SurfaceCard>
            )}
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

          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>Legacy tools stay tucked away</Text>
            <Text style={commonStyles.cardCopy}>Chat, members, activity, filters.</Text>
          </SurfaceCard>
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
