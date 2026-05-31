import { router } from 'expo-router';
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
import { formatFriendlyDate } from '@/lib/date';
import { buildCourseLeaderboard, formatScoreToPar, getLatestRoundForCourse, getPersonalBest, getRoundDisplayName, getRoundFormatLabel } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';

export default function CoursesTabScreen() {
  const { busy, courses, groups, profile, rounds, updateRoundVisibility } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  if (!profile) {
    return <LoadingScreen message="Loading your courses..." />;
  }

  const groupedCourses = groups
    .map((group) => ({
      group,
      courses: courses.filter((course) => course.groupId === group.id),
    }))
    .filter((entry) => entry.courses.length > 0);
  const publicCourses = courses.filter((course) => !course.groupId);

  const recentRounds = rounds
    .filter((round) => round.playerIds.includes(profile.uid))
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey) || right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Courses"
        title="Courses and leaderboards"
      />

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Search courses" onPress={() => router.push('/(app)/courses/new')} />
        <PrimaryButton label="Log scramble" onPress={() => router.push('/(app)/rounds/new')} variant="secondary" />
      </View>

      <SectionHeader title="Recent rounds" />
      <View style={commonStyles.compactSection}>
        {recentRounds.length ? (
          recentRounds.map((round) => {
            const group = groups.find((entry) => round.relatedGroupIds.includes(entry.id));
            return (
              <SurfaceCard key={round.id}>
                <View style={commonStyles.rowBetween}>
                  <View style={commonStyles.cardCopyBlock}>
                    <Text style={commonStyles.cardTitle}>{round.courseName}</Text>
                    <Text style={commonStyles.cardCopy}>
                      {group?.name ?? 'Public leaderboard'} / {getRoundFormatLabel(round.format)} / {round.teeBoxName}
                    </Text>
                  </View>
                  <Text style={commonStyles.statValue}>{round.totalScore}</Text>
                </View>
                <Text style={commonStyles.smallMuted}>
                  {formatFriendlyDate(new Date(round.dateKey))} / {formatScoreToPar(round.scoreToPar)} / {round.visibility === 'public' ? 'Public' : 'Friends'}
                </Text>
                {round.notes ? <Text style={commonStyles.smallMuted}>{round.notes}</Text> : null}
                <View style={commonStyles.actionRowTight}>
                  <PrimaryButton
                    label={round.visibility === 'public' ? 'Make private' : 'Make public'}
                    onPress={() => updateRoundVisibility(round.id, round.visibility === 'public' ? 'friends' : 'public')}
                    disabled={busy}
                    variant="secondary"
                  />
                </View>
              </SurfaceCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No rounds logged yet</Text>
            <Text style={commonStyles.cardCopy}>Pick a course, choose a format, and post your first score.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Courses" />
      <View style={commonStyles.compactSection}>
        {publicCourses.length ? (
          <SurfaceCard style={commonStyles.sectionCard}>
            <Text style={commonStyles.cardTitle}>Public courses</Text>
            <View style={commonStyles.compactSection}>
              {publicCourses.map((course) => {
                const leaderboard = buildCourseLeaderboard(course, rounds, [], { format: 'scramble2', scope: 'public', currentUserId: profile.uid, friendIds: profile.friendIds });
                const bestScore = getPersonalBest(course, profile.uid, rounds);
                const latestRound = getLatestRoundForCourse(course, profile.uid, rounds);
                const leader = leaderboard[0];

                return (
                  <PressableCard
                    key={course.id}
                    accessibilityHint="Opens the course leaderboard"
                    accessibilityLabel={`Open ${course.name}`}
                    onPress={() => router.push(`/(app)/courses/${course.id}`)}
                    style={commonStyles.listCard}
                  >
                    <View style={commonStyles.listRow}>
                      <View style={commonStyles.listRowMeta}>
                        <Text style={commonStyles.listRowTitle}>{course.name}</Text>
                        <Text style={commonStyles.listRowSubtitle}>
                          {course.location} / Par {course.par} / {course.tees.length} tee options
                        </Text>
                      </View>
                      <Text style={commonStyles.listValue}>{bestScore?.totalScore ?? '--'}</Text>
                    </View>
                    <Text style={commonStyles.cardCopy}>
                      {leader ? `2-Man leader: ${leader.name} / ${leader.totalScore} (${leader.indicatorLabel})` : 'Be the first to post a 2-Man Scramble score here.'}
                    </Text>
                    <Text style={commonStyles.smallMuted}>
                      {latestRound ? `Your latest: ${getRoundDisplayName(latestRound)} / ${latestRound.totalScore} on ${formatFriendlyDate(new Date(latestRound.dateKey))}` : 'No round logged yet.'}
                    </Text>
                  </PressableCard>
                );
              })}
            </View>
          </SurfaceCard>
        ) : null}
        {groupedCourses.length ? (
          groupedCourses.map(({ group, courses: groupCourses }) => (
            <SurfaceCard key={group.id} style={commonStyles.sectionCard}>
              <Text style={commonStyles.cardTitle}>{group.name}</Text>
              <View style={commonStyles.compactSection}>
                {groupCourses.map((course) => {
                  const leaderboard = buildCourseLeaderboard(course, rounds, [], { format: 'scramble2', scope: 'public', currentUserId: profile.uid, friendIds: profile.friendIds });
                  const bestScore = getPersonalBest(course, profile.uid, rounds);
                  const latestRound = getLatestRoundForCourse(course, profile.uid, rounds);
                  const leader = leaderboard[0];

                  return (
                    <PressableCard
                      key={course.id}
                      accessibilityHint="Opens the course leaderboard"
                      accessibilityLabel={`Open ${course.name}`}
                      onPress={() => router.push(`/(app)/courses/${course.id}`)}
                      style={commonStyles.listCard}
                    >
                      <View style={commonStyles.listRow}>
                        <View style={commonStyles.listRowMeta}>
                          <Text style={commonStyles.listRowTitle}>{course.name}</Text>
                          <Text style={commonStyles.listRowSubtitle}>
                            {course.location} / Par {course.par} / {course.tees.length} tee options
                          </Text>
                        </View>
                        <Text style={commonStyles.listValue}>{bestScore?.totalScore ?? '--'}</Text>
                      </View>
                      <Text style={commonStyles.cardCopy}>
                        {leader ? `2-Man leader: ${leader.name} / ${leader.totalScore} (${leader.indicatorLabel})` : 'Be the first to post a 2-Man Scramble score here.'}
                      </Text>
                      <Text style={commonStyles.smallMuted}>
                        {latestRound ? `Your latest: ${getRoundDisplayName(latestRound)} / ${latestRound.totalScore} on ${formatFriendlyDate(new Date(latestRound.dateKey))}` : 'No round logged yet.'}
                      </Text>
                    </PressableCard>
                  );
                })}
              </View>
            </SurfaceCard>
          ))
        ) : !publicCourses.length ? (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No courses yet</Text>
            <Text style={commonStyles.cardCopy}>Courses will appear here once you save the first course and start posting scores.</Text>
          </SurfaceCard>
        ) : null}
      </View>
    </AppScreen>
  );
}
