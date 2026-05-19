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
import { buildCourseLeaderboard, getLatestRoundForCourse, getPersonalBest } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';

export default function CoursesTabScreen() {
  const { courses, groups, profile, rounds } = useApp();
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

  const recentRounds = rounds
    .filter((round) => round.userId === profile.uid)
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3);

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Courses"
        title="Track the courses that matter"
        subtitle="Add golf courses to your friend groups, log rounds, and start building course-specific leaderboards and personal bests."
      />

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label="Add course" onPress={() => router.push('/(app)/courses/new')} />
        <PrimaryButton label="Log round" onPress={() => router.push('/(app)/rounds/new')} variant="secondary" />
      </View>

      <SectionHeader title="Recent rounds" />
      <View style={commonStyles.compactSection}>
        {recentRounds.length ? (
          recentRounds.map((round) => {
            const course = courses.find((entry) => entry.id === round.courseId);
            const group = groups.find((entry) => entry.id === round.groupId);
            return (
              <SurfaceCard key={round.id}>
                <View style={commonStyles.rowBetween}>
                  <View style={commonStyles.cardCopyBlock}>
                    <Text style={commonStyles.cardTitle}>{course?.name ?? 'Course pending'}</Text>
                    <Text style={commonStyles.cardCopy}>{group?.name ?? 'Golf group'} / {round.gameMode === 'stroke' ? 'Stroke play' : 'Scramble'}</Text>
                  </View>
                  <Text style={commonStyles.statValue}>{round.score}</Text>
                </View>
                <Text style={commonStyles.smallMuted}>{formatFriendlyDate(new Date(round.playedOn))}</Text>
                {round.notes ? <Text style={commonStyles.smallMuted}>{round.notes}</Text> : null}
              </SurfaceCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No rounds logged yet</Text>
            <Text style={commonStyles.cardCopy}>Start by adding a course, then log your first score for the group.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Courses by group" />
      <View style={commonStyles.compactSection}>
        {groupedCourses.length ? (
          groupedCourses.map(({ group, courses: groupCourses }) => (
            <SurfaceCard key={group.id} style={commonStyles.sectionCard}>
              <Text style={commonStyles.cardTitle}>{group.name}</Text>
              <Text style={commonStyles.cardCopy}>Courses and score history for this golf group.</Text>
              <View style={commonStyles.compactSection}>
                {groupCourses.map((course) => {
                  const leaderboard = buildCourseLeaderboard(course.id, rounds, []);
                  const bestScore = getPersonalBest(course.id, profile.uid, rounds);
                  const latestRound = getLatestRoundForCourse(course.id, profile.uid, rounds);
                  const leader = leaderboard[0];

                  return (
                    <PressableCard
                      key={course.id}
                      accessibilityHint="Opens log round for this course"
                      accessibilityLabel={`Log a round for ${course.name}`}
                      onPress={() => router.push(`/(app)/rounds/new?groupId=${group.id}&courseId=${course.id}`)}
                      style={commonStyles.listCard}
                    >
                      <View style={commonStyles.listRow}>
                        <View style={commonStyles.listRowMeta}>
                          <Text style={commonStyles.listRowTitle}>{course.name}</Text>
                          <Text style={commonStyles.listRowSubtitle}>
                            {course.location} / Par {course.par} / {course.teeName}
                          </Text>
                        </View>
                        <Text style={commonStyles.listValue}>{bestScore ?? '--'}</Text>
                      </View>
                      <Text style={commonStyles.cardCopy}>
                        {leader ? `Course leader: ${leader.name} / Best ${leader.bestScore}` : 'First score sets the course leaderboard.'}
                      </Text>
                      <Text style={commonStyles.smallMuted}>
                        {latestRound ? `Your latest round: ${latestRound.score} on ${formatFriendlyDate(new Date(latestRound.playedOn))}` : 'No round logged yet.'}
                      </Text>
                    </PressableCard>
                  );
                })}
              </View>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No courses yet</Text>
            <Text style={commonStyles.cardCopy}>Courses will appear here once your group starts adding tracks and logging rounds.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}
