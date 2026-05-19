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
import { formatFriendlyDate, getCurrentWeekKeys, getDaysUntilDateKey, getPreviousWeekKeys } from '@/lib/date';
import { buildCourseLeaderboard, getPersonalBest } from '@/lib/golf';
import { getLeaderboardNotice } from '@/lib/leaderboard';
import { createCommonStyles } from '@/styles/commonStyles';
import { ActivityItem, ActivityShoutoutType, GroupDetails, LeagueChallenge } from '@/types/models';
import { spacing } from '@/constants/theme';

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { addActivityShoutout, getActivityFeed, getGroupDetails, recordActivity, session, toggleHabitCheckIn, updateLeagueChallengeLifecycle } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [challengeActionId, setChallengeActionId] = useState<string | null>(null);

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
  const activeChallenges = details.challenges.filter((challenge) => challenge.status === 'active');
  const pastChallenges = details.challenges.filter((challenge) => challenge.status !== 'active');

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

  async function handleChallengeAction(challenge: LeagueChallenge, action: 'archive' | 'complete' | 'reactivate') {
    if (!details) {
      return;
    }

    setChallengeActionId(`${challenge.id}:${action}`);
    const result = await updateLeagueChallengeLifecycle(challenge.id, action);
    if (result.ok) {
      const nextDetails = await getGroupDetails(details.group.id);
      if (nextDetails) {
        setDetails(nextDetails);
      }
      await recordActivity({
        type: 'challenge_update',
        groupId: details.group.id,
        groupName: details.group.name,
        habitId: challenge.id,
        habitTitle: challenge.title,
        summaryOverride: getChallengeActivitySummary(action, challenge.title, details.group.name),
      });
      setActivities(await getActivityFeed(details.group.id));
    }
    setChallengeActionId(null);
  }

  return (
    <AppScreen contentContainerStyle={styles.screenContent} disableBottomPadding>
      <View style={commonStyles.pageStack}>
        <PageHeader
          eyebrow="Golf group"
          title={details.group.name}
          subtitle={details.group.description || 'A golf group built around logged rounds, leaderboard pressure, and better scores over time.'}
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
            <PrimaryButton label="Add course" onPress={() => router.push('/(app)/courses/new')} variant="secondary" />
            <PrimaryButton label="Log round" onPress={() => router.push(`/(app)/rounds/new?groupId=${details.group.id}`)} variant="secondary" />
          </View>

          <SectionHeader title="Courses" />
          <View style={commonStyles.compactSection}>
            {details.courses.length ? (
              details.courses.map((course) => {
                const leaderboard = buildCourseLeaderboard(course.id, details.rounds, details.members);
                const personalBest = session ? getPersonalBest(course.id, session.uid, details.rounds) : null;
                const leader = leaderboard[0];

                return (
                  <SurfaceCard key={course.id}>
                    <View style={commonStyles.rowBetween}>
                      <View style={commonStyles.cardCopyBlock}>
                        <Text style={commonStyles.cardTitle}>{course.name}</Text>
                        <Text style={commonStyles.cardCopy}>
                          {course.location} / Par {course.par} / {course.teeName}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {leader ? `Course leader: ${leader.name} / Best ${leader.bestScore}` : 'Log the first round to establish the course leaderboard.'}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {personalBest ? `Your personal best: ${personalBest}` : 'No personal best logged yet.'}
                        </Text>
                      </View>
                      <PrimaryButton label="Log round" onPress={() => router.push(`/(app)/rounds/new?groupId=${details.group.id}&courseId=${course.id}`)} variant="secondary" />
                    </View>
                  </SurfaceCard>
                );
              })
            ) : (
              <SurfaceCard>
                <Text style={commonStyles.cardTitle}>No courses yet</Text>
                <Text style={commonStyles.cardCopy}>Add the first course so this group can start comparing real scores instead of just activity.</Text>
              </SurfaceCard>
            )}
          </View>

          <SectionHeader title="Legacy competition tracking" />
          <View style={commonStyles.compactSection}>
            {activeChallenges.length ? (
              activeChallenges.map((challenge) => {
                const userParticipation = session
                  ? details.challengeParticipations.find(
                      (entry) => entry.challengeId === challenge.id && entry.userId === session.uid
                    )
                  : null;
                const canManage = Boolean(session && (session.uid === details.group.ownerId || session.uid === challenge.createdBy));
                const checkedToday = Boolean(userParticipation?.checkIns.includes(todayKey));
                const checkedInCount = details.challengeParticipations.filter(
                  (entry) => entry.challengeId === challenge.id && entry.checkIns.includes(todayKey)
                ).length;
                const participantsLabel = checkedInCount === 1 ? '1 check-in today' : `${checkedInCount} check-ins today`;
                const currentLeader = getChallengeLeaderLabel(challenge, details, 'current');
                const endingLabel = getChallengeEndingLabel(challenge);
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
                          {challenge.description || 'Older shared challenge data kept live during the golf pivot.'}
                        </Text>
                        <Text style={commonStyles.smallMuted}>
                          {checkedToday ? 'You checked in today.' : 'Ready for today.'} / {participantsLabel}
                        </Text>
                        {currentLeader ? <Text style={commonStyles.smallMuted}>{currentLeader}</Text> : null}
                        {endingLabel ? <Text style={commonStyles.smallMuted}>{endingLabel}</Text> : null}
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
                    {canManage ? (
                      <View style={commonStyles.actionRowTight}>
                        <PrimaryButton
                          label={challengeActionId === `${challenge.id}:complete` ? 'Saving...' : 'Complete'}
                          onPress={() => handleChallengeAction(challenge, 'complete')}
                          disabled={Boolean(challengeActionId)}
                          variant="ghost"
                        />
                        <PrimaryButton
                          label={challengeActionId === `${challenge.id}:archive` ? 'Saving...' : 'Archive'}
                          onPress={() => handleChallengeAction(challenge, 'archive')}
                          disabled={Boolean(challengeActionId)}
                          variant="ghost"
                        />
                      </View>
                    ) : null}
                  </SurfaceCard>
                );
              })
            ) : (
              <SurfaceCard>
                <Text style={commonStyles.cardTitle}>No legacy challenge tracking right now</Text>
                <Text style={commonStyles.cardCopy}>That is okay. Rivl is shifting toward courses, rounds, and scoreboards first.</Text>
                {isOwner ? (
                  <View style={commonStyles.actionRowTight}>
                    <PrimaryButton label="Add legacy tracker" onPress={() => router.push(`/(app)/habits/new?groupId=${details.group.id}`)} />
                  </View>
                ) : null}
              </SurfaceCard>
            )}
          </View>

          {pastChallenges.length ? (
            <>
              <SectionHeader title="Past challenges" />
              <View style={commonStyles.compactSection}>
                {pastChallenges.map((challenge) => {
                  const canManage = Boolean(session && (session.uid === details.group.ownerId || session.uid === challenge.createdBy));
                  const winnerLabel = getChallengeLeaderLabel(challenge, details, 'winner');
                  return (
                    <SurfaceCard key={challenge.id}>
                      <View style={commonStyles.cardCopyBlock}>
                        <Text style={commonStyles.cardTitle}>
                          {challenge.emoji} {challenge.title}
                        </Text>
                        <Text style={commonStyles.cardCopy}>
                          {challenge.status === 'completed' ? 'Completed challenge' : 'Archived challenge'}
                        </Text>
                        {winnerLabel ? <Text style={commonStyles.smallMuted}>{winnerLabel}</Text> : null}
                      </View>
                      {canManage ? (
                        <View style={commonStyles.actionRowTight}>
                          <PrimaryButton
                            label={challengeActionId === `${challenge.id}:reactivate` ? 'Saving...' : 'Reactivate'}
                            onPress={() => handleChallengeAction(challenge, 'reactivate')}
                            disabled={Boolean(challengeActionId)}
                            variant="ghost"
                          />
                        </View>
                      ) : null}
                    </SurfaceCard>
                  );
                })}
              </View>
            </>
          ) : null}

          {isOwner && pastChallenges.length ? (
            <SurfaceCard>
              <Text style={commonStyles.cardTitle}>Keep the league moving</Text>
              <Text style={commonStyles.cardCopy}>Wrap one competition, then add the next course or legacy tracker before the group loses momentum.</Text>
              <View style={commonStyles.actionRowTight}>
                <PrimaryButton label="Add legacy tracker" onPress={() => router.push(`/(app)/habits/new?groupId=${details.group.id}`)} />
              </View>
            </SurfaceCard>
          ) : null}

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
                <Text style={commonStyles.cardCopy}>{entry.weeklyCheckIns} tracked updates this week</Text>
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

function getChallengeEndingLabel(challenge: LeagueChallenge) {
  if (challenge.status !== 'active' || !challenge.endDateKey) {
    return null;
  }

  const daysUntil = getDaysUntilDateKey(challenge.endDateKey);
  if (daysUntil === 0) {
    return 'Final push / Ends today';
  }
  if (daysUntil === 1) {
    return 'Ending soon / Ends tomorrow';
  }

  return null;
}

function getChallengeLeaderLabel(challenge: LeagueChallenge, details: GroupDetails, mode: 'current' | 'winner') {
  if (mode === 'winner' && challenge.winnerDisplayName) {
    return `Winner: ${challenge.winnerDisplayName}`;
  }

  const keys = new Set(mode === 'winner' ? getPreviousWeekKeys() : getCurrentWeekKeys());
  const scores = details.challengeParticipations
    .filter((entry) => entry.challengeId === challenge.id)
    .map((entry) => ({
      userId: entry.userId,
      total: entry.checkIns.filter((dateKey) => keys.has(dateKey)).length,
      name: details.members.find((member) => member.uid === entry.userId)?.name ?? 'Teammate',
    }))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

  if (!scores.length) {
    return mode === 'winner' ? null : 'Current leader will appear after the first check-ins.';
  }

  return mode === 'winner'
    ? `Last winner: ${scores[0].name}`
    : `Current leader: ${scores[0].name}`;
}

function getChallengeActivitySummary(action: 'archive' | 'complete' | 'reactivate', challengeTitle: string, groupName: string) {
  if (action === 'archive') {
    return `Archived ${challengeTitle} in ${groupName}`;
  }
  if (action === 'reactivate') {
    return `Reactivated ${challengeTitle} in ${groupName}`;
  }
  return `Completed ${challengeTitle} in ${groupName}`;
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
