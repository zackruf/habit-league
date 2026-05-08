import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityFeed } from '@/components/ActivityFeed';
import { AppScreen } from '@/components/AppScreen';
import { GroupChatPanel } from '@/components/GroupChatPanel';
import { GroupSummaryCard } from '@/components/GroupSummaryCard';
import { LeaderboardNoticeCard } from '@/components/LeaderboardNoticeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate } from '@/lib/date';
import { getLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { ActivityItem, ActivityShoutoutType, GroupDetails, LeagueChallenge } from '@/types/models';
import { spacing } from '@/constants/theme';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { addActivityShoutout, getActivityFeed, getGroupDetails, recordActivity, session, toggleHabitCheckIn } = useApp();
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

    async function loadFeed() {
      const feed = await getActivityFeed(groupId);
      if (active) {
        setActivities(feed);
      }
    }

    loadFeed();

    return () => {
      active = false;
    };
  }, [getActivityFeed, groupId]);

  if (!details) {
    return <LoadingScreen message="Loading your group..." />;
  }

  const leaderboardNotice = session ? getLeaderboardNotice(details.leaderboard, session.uid) : null;
  const isOwner = session?.uid === details.group.ownerId;
  const todayKey = formatFriendlyDate(new Date(), 'key');

  async function handleShoutout(activityId: string, shoutoutType: ActivityShoutoutType) {
    if (!details) {
      return;
    }

    await addActivityShoutout(activityId, shoutoutType);
    setActivities(await getActivityFeed(details.group.id));
  }

  async function handleChallengeCheckIn(challenge: LeagueChallenge) {
    if (!details || !session) {
      return;
    }

    const participation = details.challengeParticipations.find(
      (entry) => entry.challengeId === challenge.id && entry.userId === session.uid
    );
    if (!participation) {
      return;
    }

    const beforeRank = getRank(details.leaderboard, session.uid);
    const wasCheckedInToday = participation.checkIns.includes(todayKey);

    await toggleHabitCheckIn(participation.id);

    const nextDetails = await getGroupDetails(details.group.id);
    if (!nextDetails) {
      return;
    }

    setDetails(nextDetails);

    if (!wasCheckedInToday) {
      await recordActivity({
        type: 'check_in',
        groupId: nextDetails.group.id,
        groupName: nextDetails.group.name,
        habitId: participation.id,
        habitTitle: challenge.title,
      });

      const afterRank = getRank(nextDetails.leaderboard, session.uid);
      if (beforeRank && afterRank && afterRank < beforeRank) {
        await recordActivity({
          type: 'rank_movement',
          groupId: nextDetails.group.id,
          groupName: nextDetails.group.name,
          habitId: participation.id,
          habitTitle: challenge.title,
          spotsMoved: beforeRank - afterRank,
          rank: afterRank,
        });
      }
    }

    setActivities(await getActivityFeed(nextDetails.group.id));
  }

  return (
    <AppScreen contentContainerStyle={styles.screenContent} disableBottomPadding>
      <View style={commonStyles.pageStack}>
        <PageHeader
          eyebrow="League"
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

          <View style={commonStyles.actionRowTight}>
            <PrimaryButton label="Add challenge" onPress={() => router.push(`/(app)/habits/new?groupId=${details.group.id}`)} variant="secondary" />
          </View>

          <SectionHeader title="League challenges" />
          <View style={commonStyles.compactSection}>
            {details.challenges.length ? (
              details.challenges.map((challenge) => {
                const userParticipation = session
                  ? details.challengeParticipations.find(
                      (entry) => entry.challengeId === challenge.id && entry.userId === session.uid
                    )
                  : null;
                const checkedToday = Boolean(userParticipation?.checkIns.includes(todayKey));
                const checkedInCount = details.challengeParticipations.filter(
                  (entry) => entry.challengeId === challenge.id && entry.checkIns.includes(todayKey)
                ).length;
                const participantsLabel = checkedInCount === 1 ? '1 check-in today' : `${checkedInCount} check-ins today`;
                return (
                  <SurfaceCard key={challenge.id}>
                    <View style={commonStyles.rowBetween}>
                      <View style={commonStyles.cardCopyBlock}>
                        <Text style={commonStyles.cardTitle}>
                          {challenge.emoji} {challenge.title}
                        </Text>
                        <Text style={commonStyles.cardCopy}>
                          {challenge.frequency} / {challenge.category}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {challenge.description || 'Shared challenge for this league.'}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {checkedToday ? 'You checked in today.' : 'Ready for today.'} / {participantsLabel}
                        </Text>
                      </View>
                      {userParticipation ? (
                        <PrimaryButton
                          label={checkedToday ? 'Checked in' : 'Check in'}
                          onPress={() => handleChallengeCheckIn(challenge)}
                          variant={checkedToday ? 'secondary' : 'primary'}
                        />
                      ) : (
                        <Text style={commonStyles.smallMuted}>Joins automatically</Text>
                      )}
                    </View>
                  </SurfaceCard>
                );
              })
            ) : (
              <SurfaceCard>
                <Text style={commonStyles.cardTitle}>No league challenges yet</Text>
                <Text style={commonStyles.cardCopy}>Add the first challenge here so the league has something concrete to compete around this week.</Text>
              </SurfaceCard>
            )}
          </View>

          <SectionHeader title="Recent activity" />
          <ActivityFeed
            activities={activities.slice(0, 4)}
            currentUserId={session?.uid}
            emptyMessage="Check-ins, rank moves, and new joins for this group will show up here."
            emptyTitle="No group activity yet"
            onShoutout={handleShoutout}
          />

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

function getRank(leaderboard: GroupDetails['leaderboard'], userId: string) {
  const index = leaderboard.findIndex((entry) => entry.userId === userId);
  return index === -1 ? null : index + 1;
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
