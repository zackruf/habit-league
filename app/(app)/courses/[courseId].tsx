import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { buildCourseLeaderboard, formatScoreToPar, getLatestRoundForCourse, getPersonalBest } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';
import { GameMode, GroupDetails } from '@/types/models';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { courses, getGroupDetails, profile, rounds } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [scope, setScope] = useState<'group' | 'public'>('group');
  const [mode, setMode] = useState<GameMode>('stroke');

  const course = useMemo(() => courses.find((entry) => entry.id === courseId) ?? null, [courseId, courses]);

  useEffect(() => {
    let active = true;
    if (!course?.groupId) {
      return undefined;
    }

    getGroupDetails(course.groupId).then((nextDetails) => {
      if (active) {
        setDetails(nextDetails);
      }
    });

    return () => {
      active = false;
    };
  }, [course?.groupId, getGroupDetails]);

  if (!profile || !course || !details) {
    return <LoadingScreen message="Loading course leaderboard..." />;
  }

  const leaderboard = buildCourseLeaderboard(course, rounds, details.members, { gameMode: mode, scope });
  const personalBest = getPersonalBest(course, profile.uid, rounds);
  const latestRound = getLatestRoundForCourse(course, profile.uid, rounds);

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Course leaderboard"
        title={course.name}
        subtitle={`${course.location} / Par ${course.par} / ${course.holesCount} holes / ${course.tees.length} tee options`}
      />

      <SurfaceCard>
        <View style={commonStyles.rowBetween}>
          <View style={commonStyles.cardCopyBlock}>
            <Text style={commonStyles.cardTitle}>Your best here</Text>
            <Text style={commonStyles.cardCopy}>
              {personalBest ? `${personalBest.totalScore} (${formatScoreToPar(personalBest.scoreToPar)}) on ${personalBest.playedOn}` : 'No score posted at this course yet.'}
            </Text>
            {personalBest?.improvement ? <Text style={commonStyles.smallMuted}>{personalBest.improvement} shots better than your last best.</Text> : null}
            {latestRound ? <Text style={commonStyles.smallMuted}>Latest round: {latestRound.totalScore} on {latestRound.playedOn}</Text> : null}
          </View>
          <PrimaryButton label="Log round" onPress={() => router.push(`/(app)/rounds/new?groupId=${course.groupId}&courseId=${course.id}`)} variant="secondary" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Leaderboard</Text>
        <View style={commonStyles.segmentedRow}>
          {[
            { key: 'group' as const, label: 'Group / Friends' },
            { key: 'public' as const, label: 'Public' },
          ].map((option) => {
            const active = scope === option.key;
            return (
              <Pressable key={option.key} onPress={() => setScope(option.key)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={commonStyles.segmentedRow}>
          {[
            { key: 'stroke' as const, label: 'Stroke' },
            { key: 'scramble' as const, label: 'Scramble' },
          ].map((option) => {
            const active = mode === option.key;
            return (
              <Pressable key={option.key} onPress={() => setMode(option.key)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <View style={commonStyles.compactSection}>
        {leaderboard.length ? (
          leaderboard.map((entry, index) => (
            <SurfaceCard key={entry.entryId}>
              <View style={commonStyles.listRow}>
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.listRowTitle}>#{index + 1} {entry.name}</Text>
                  <Text style={commonStyles.listRowSubtitle}>
                    {entry.indicatorLabel} / {entry.roundsPlayed} rounds / {entry.playedOn}
                  </Text>
                </View>
                <Text style={commonStyles.listValue}>{entry.totalScore}</Text>
              </View>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No scores yet</Text>
            <Text style={commonStyles.cardCopy}>
              {scope === 'public' ? 'No public rounds have been posted for this course yet.' : 'Be the first to post a score here.'}
            </Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Course setup" />
      <SurfaceCard>
        <Text style={commonStyles.cardCopy}>
          Tee options: {course.tees.map((tee) => tee.name).join(', ')}
        </Text>
        <Text style={commonStyles.smallMuted}>
          Front-nine par: {course.holes.slice(0, 9).reduce((sum, hole) => sum + hole.par, 0)} / Full course par: {course.par}
        </Text>
      </SurfaceCard>
    </AppScreen>
  );
}
