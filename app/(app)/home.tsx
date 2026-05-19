import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PressableCard } from '@/components/PressableCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate, getCurrentWeekLabel } from '@/lib/date';
import { buildCourseLeaderboard, formatScoreToPar, getPersonalBest } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function HomeScreen() {
  const { courses, getGroupDetails, groups, profile, rounds } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);

  const loadGroupDetailsSnapshot = useCallback(async () => {
    return (await Promise.all(groups.map((group) => getGroupDetails(group.id)))).filter(Boolean) as GroupDetails[];
  }, [getGroupDetails, groups]);

  useEffect(() => {
    let active = true;

    loadGroupDetailsSnapshot().then((details) => {
      if (active) {
        setGroupDetails(details);
      }
    });

    return () => {
      active = false;
    };
  }, [loadGroupDetailsSnapshot]);

  if (!profile) {
    return <LoadingScreen message="Preparing your dashboard..." />;
  }

  const recentRounds = rounds
    .filter((round) => profile.groupIds.includes(round.groupId))
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);

  const featuredCourses = courses
    .map((course) => {
      const leaderboard = buildCourseLeaderboard(course, rounds, [], { gameMode: 'stroke', scope: 'group' });
      return {
        course,
        leaderboard,
        personalBest: getPersonalBest(course, profile.uid, rounds),
      };
    })
    .sort((left, right) => right.leaderboard.length - left.leaderboard.length || left.course.name.localeCompare(right.course.name))
    .slice(0, 4);

  const totalPublicRounds = rounds.filter((round) => round.visibility === 'public').length;
  const starterLine = useMemo(() => {
    if (!groupDetails.length) {
      return 'Join a golf group, add a course, and post the first number that everyone can chase.';
    }

    const topGroup = groupDetails[0];
    const topCourse = topGroup.courses[0];
    if (!topCourse) {
      return `${topGroup.group.name} is ready for its first real course. Add one and start the scoreboard.`;
    }

    return `${topGroup.group.name} has ${topGroup.rounds.length} logged rounds across ${topGroup.courses.length} saved courses.`;
  }, [groupDetails]);

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${profile.name.split(' ')[0]}.`}
        subtitle={`${rounds.length} rounds logged, ${courses.length} saved courses, and ${totalPublicRounds} public scores live. ${getCurrentWeekLabel()}.`}
      />

      <SurfaceCard style={commonStyles.currentUserCard}>
        <Text style={commonStyles.noticeEyebrow}>This week</Text>
        <Text style={commonStyles.noticeMessage}>Show up. Post a number. Move up the course leaderboard.</Text>
        <Text style={commonStyles.smallMuted}>{starterLine}</Text>
      </SurfaceCard>

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Log round" onPress={() => router.push('/(app)/rounds/new')} />
        <PrimaryButton label="Search courses" onPress={() => router.push('/(app)/courses/new')} variant="secondary" />
      </View>
      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Join golf group" onPress={() => router.push('/(app)/groups/join')} variant="secondary" />
        <PrimaryButton label="Create golf group" onPress={() => router.push('/(app)/groups/new')} variant="secondary" />
      </View>

      <SectionHeader title="Recent rounds" />
      <View style={commonStyles.compactSection}>
        {recentRounds.length ? (
          recentRounds.map((round) => (
            <SurfaceCard key={round.id}>
              <View style={commonStyles.rowBetween}>
                <View style={commonStyles.cardCopyBlock}>
                  <Text style={commonStyles.cardTitle}>{round.courseName}</Text>
                  <Text style={commonStyles.cardCopy}>
                    {round.playerName} / {round.gameMode === 'stroke' ? 'Stroke play' : 'Scramble'} / {round.teeBoxName}
                  </Text>
                </View>
                <Text style={commonStyles.statValue}>{round.totalScore}</Text>
              </View>
              <Text style={commonStyles.smallMuted}>
                {formatFriendlyDate(new Date(round.playedOn))} / {formatScoreToPar(round.scoreToPar)} / {round.visibility === 'public' ? 'Public' : 'Group'}
              </Text>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No golf rounds yet</Text>
            <Text style={commonStyles.cardCopy}>Log the first round and Rivl will start turning group activity into real course rankings.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Courses heating up" />
      <View style={commonStyles.compactSection}>
        {featuredCourses.length ? (
          featuredCourses.map(({ course, leaderboard, personalBest }) => {
            const leader = leaderboard[0];
            return (
              <PressableCard
                key={course.id}
                accessibilityHint="Open the course leaderboard"
                accessibilityLabel={`Open ${course.name}`}
                onPress={() => router.push(`/(app)/courses/${course.id}`)}
                style={commonStyles.weeklyPreviewCard}
              >
                <View style={commonStyles.listRow}>
                  <View style={commonStyles.listRowMeta}>
                    <Text style={commonStyles.listRowTitle}>{course.name}</Text>
                    <Text style={commonStyles.listRowSubtitle}>{course.location} / Par {course.par} / {course.tees.length} tees</Text>
                  </View>
                  <View style={commonStyles.rankPreviewBadge}>
                    <Text style={commonStyles.rankPreviewValue}>{personalBest?.totalScore ?? '--'}</Text>
                  </View>
                </View>
                <Text style={commonStyles.cardCopy}>
                  {leader ? `Current group leader: ${leader.name} / ${leader.totalScore} (${leader.indicatorLabel})` : 'Be the first to post a score here.'}
                </Text>
              </PressableCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No active course scoreboards yet</Text>
            <Text style={commonStyles.cardCopy}>Save a course to a group first, then the scoreboard cards will show up here.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Group standings" />
      <View style={commonStyles.compactSection}>
        {groupDetails.length ? (
          groupDetails.map((details) => {
            const featuredCourse = details.courses[0];
            const courseLeader = featuredCourse ? buildCourseLeaderboard(featuredCourse, details.rounds, details.members, { gameMode: 'stroke', scope: 'group' })[0] : null;
            return (
              <PressableCard
                key={details.group.id}
                accessibilityHint="Open the selected golf group"
                accessibilityLabel={`Open ${details.group.name}`}
                onPress={() => router.push(`/(app)/groups/${details.group.id}`)}
                style={commonStyles.listCard}
              >
                <View style={commonStyles.listRow}>
                  <View style={commonStyles.listRowMeta}>
                    <Text style={commonStyles.listRowTitle}>{details.group.name}</Text>
                    <Text style={commonStyles.listRowSubtitle}>
                      {details.members.length} golfers / {details.courses.length} courses / {details.rounds.length} rounds
                    </Text>
                  </View>
                  <Text style={commonStyles.listValue}>{featuredCourse ? featuredCourse.par : '--'}</Text>
                </View>
                <Text style={commonStyles.cardCopy}>
                  {courseLeader && featuredCourse
                    ? `${featuredCourse.name}: ${courseLeader.name} leads with ${courseLeader.totalScore} (${courseLeader.indicatorLabel})`
                    : 'Add a course and log rounds to get the standings moving.'}
                </Text>
              </PressableCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No group standings yet</Text>
            <Text style={commonStyles.cardCopy}>Your golf groups will show here once they start saving courses and posting scores.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}
