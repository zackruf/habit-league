import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate } from '@/lib/date';
import { createCommonStyles } from '@/styles/commonStyles';
import { GameMode } from '@/types/models';

const GAME_MODES: GameMode[] = ['stroke', 'scramble'];

export default function LogRoundScreen() {
  const { busy, courses, groups, logRound } = useApp();
  const { theme } = useThemePreferences();
  const { courseId: routeCourseId, groupId: routeGroupId } = useLocalSearchParams<{ courseId?: string; groupId?: string }>();
  const commonStyles = createCommonStyles(theme.colors);
  const initialGroupId = routeGroupId && groups.some((group) => group.id === routeGroupId) ? routeGroupId : groups[0]?.id ?? '';
  const initialCourseId = routeCourseId && courses.some((course) => course.id === routeCourseId) ? routeCourseId : courses.find((course) => course.groupId === initialGroupId)?.id ?? '';
  const [groupId, setGroupId] = useState(initialGroupId);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [score, setScore] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('stroke');
  const [playedOn, setPlayedOn] = useState(formatFriendlyDate(new Date(), 'key'));
  const [notes, setNotes] = useState('');

  const availableCourses = useMemo(() => courses.filter((course) => course.groupId === groupId), [courses, groupId]);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? null, [courseId, courses]);

  async function handleLogRound() {
    const result = await logRound({
      groupId,
      courseId,
      score: Number(score),
      gameMode,
      playedOn,
      notes,
    });

    if (result.ok) {
      router.replace('/(app)/(tabs)/courses');
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Round log"
        title="Log a round"
        subtitle="Post a real score for a real course so your group can track personal bests and course leaderboards."
      />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Group</Text>
        <View style={styles.optionStack}>
          {groups.map((group) => {
            const selected = group.id === groupId;
            return (
              <Pressable
                key={group.id}
                onPress={() => {
                  setGroupId(group.id);
                  setCourseId(courses.find((course) => course.groupId === group.id)?.id ?? '');
                }}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={commonStyles.settingTitle}>{group.name}</Text>
                <Text style={commonStyles.smallMuted}>{group.visibility === 'public' ? 'Public group' : 'Private group'}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Course and score</Text>
        <View style={styles.optionStack}>
          {availableCourses.length ? (
            availableCourses.map((course) => {
              const selected = course.id === courseId;
              return (
                <Pressable
                  key={course.id}
                  onPress={() => setCourseId(course.id)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={commonStyles.settingTitle}>{course.name}</Text>
                  <Text style={commonStyles.smallMuted}>
                    {course.location} / Par {course.par} / {course.teeName}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={commonStyles.cardCopy}>Add a course for this group first so rounds have a place to land.</Text>
          )}
        </View>
        <TextField label="Score" value={score} onChangeText={setScore} keyboardType="number-pad" placeholder="84" />
        <TextField label="Played on" value={playedOn} onChangeText={setPlayedOn} placeholder="YYYY-MM-DD" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Windy back nine, strong finish." multiline />
        <View style={commonStyles.segmentedRow}>
          {GAME_MODES.map((mode) => {
            const active = gameMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setGameMode(mode)}
                style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
              >
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {mode === 'stroke' ? 'Stroke' : 'Scramble'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={commonStyles.smallMuted}>
          {selectedCourse ? `This score will be tracked against ${selectedCourse.name}.` : 'Pick a course to continue.'}
        </Text>
        <PrimaryButton label={busy ? 'Logging round...' : 'Log round'} onPress={handleLogRound} disabled={busy || !courseId} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  optionStack: {
    gap: spacing.sm,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
