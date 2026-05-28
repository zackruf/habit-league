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
import {
  buildCourseLeaderboard,
  formatScoreToPar,
  getLatestRoundForCourse,
  getPersonalBest,
  getRoundFormatLabel,
  getRoundTrustLabel,
  SCRAMBLE_FIRST_FORMATS,
} from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails, RoundFormat } from '@/types/models';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { courses, getGroupDetails, groups, profile, rounds } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [scope, setScope] = useState<'public' | 'friends' | 'group'>('public');
  const [format, setFormat] = useState<RoundFormat>('scramble2');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');

  const course = useMemo(() => courses.find((entry) => entry.id === courseId) ?? null, [courseId, courses]);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;

  useEffect(() => {
    let active = true;
    const groupToLoad = selectedGroup?.id ?? course?.groupId;
    if (!groupToLoad) {
      setDetails(null);
      return undefined;
    }

    getGroupDetails(groupToLoad).then((nextDetails) => {
      if (active) {
        setDetails(nextDetails);
      }
    });

    return () => {
      active = false;
    };
  }, [course?.groupId, getGroupDetails, selectedGroup?.id]);

  if (!profile || !course) {
    return <LoadingScreen message="Loading course leaderboard..." />;
  }

  const leaderboard = buildCourseLeaderboard(course, rounds, details?.members ?? [], {
    format,
    scope,
    currentUserId: profile.uid,
    friendIds: profile.friendIds,
    groupId: selectedGroup?.id ?? course.groupId,
  });
  const personalBest = getPersonalBest(course, profile.uid, rounds);
  const latestRound = getLatestRoundForCourse(course, profile.uid, rounds);

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Compete at this course"
        title={course.name}
        subtitle={`${course.location} / Par ${course.par}`}
      />

      <SurfaceCard>
        <View style={commonStyles.rowBetween}>
          <View style={commonStyles.cardCopyBlock}>
            <Text style={commonStyles.cardTitle}>Your best</Text>
            <Text style={commonStyles.cardCopy}>
              {personalBest ? `${personalBest.totalScore} (${formatScoreToPar(personalBest.scoreToPar)})` : 'No score yet.'}
            </Text>
            {personalBest?.improvement ? <Text style={commonStyles.smallMuted}>{personalBest.improvement} shots better than your last best.</Text> : null}
            {latestRound ? <Text style={commonStyles.smallMuted}>Latest score: {latestRound.totalScore} on {latestRound.dateKey}</Text> : null}
          </View>
          <PrimaryButton label="Log scramble" onPress={() => router.push(`/(app)/rounds/new?courseId=${course.id}`)} variant="secondary" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>{getRoundFormatLabel(format)} leaderboard</Text>
        <View style={commonStyles.segmentedRow}>
          {SCRAMBLE_FIRST_FORMATS.map((option) => {
            const active = format === option;
            return (
              <Pressable key={option} onPress={() => setFormat(option)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{getRoundFormatLabel(option)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={commonStyles.segmentedRow}>
          {[
            { key: 'public' as const, label: 'Public leaderboard' },
            { key: 'friends' as const, label: 'Friends leaderboard' },
            { key: 'group' as const, label: 'Group leaderboard' },
          ].map((option) => {
            const active = scope === option.key;
            return (
              <Pressable key={option.key} onPress={() => setScope(option.key)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {scope === 'group' && groups.length ? (
          <View style={commonStyles.chipRow}>
            {groups.map((group) => {
              const active = selectedGroup?.id === group.id;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => setSelectedGroupId(group.id)}
                  style={[
                    commonStyles.subtleChip,
                    active ? { backgroundColor: theme.colors.badgeBackground, borderColor: theme.colors.primary } : null,
                  ]}
                >
                  <Text style={[commonStyles.subtleChipText, active ? { color: theme.colors.primary } : null]}>{group.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </SurfaceCard>

      <View style={commonStyles.compactSection}>
        {leaderboard.length ? (
          leaderboard.map((entry, index) => (
            <SurfaceCard key={entry.entryId}>
              <View style={commonStyles.listRow}>
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.listRowTitle}>#{index + 1} {entry.name}</Text>
                  <Text style={commonStyles.listRowSubtitle}>
                    {entry.totalScore} / {entry.indicatorLabel} / {entry.playedOn}
                  </Text>
                  <Text style={commonStyles.smallMuted}>{getRoundTrustLabel(entry)}</Text>
                </View>
                <Text style={commonStyles.listValue}>{entry.totalScore}</Text>
              </View>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No scores yet</Text>
            <Text style={commonStyles.cardCopy}>Be the first to post a score in this format.</Text>
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
