import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { GameMode, GroupDetails, RoundHoleScore, RoundVisibility } from '@/types/models';

const GAME_MODES: GameMode[] = ['stroke', 'scramble'];
const ROUND_VISIBILITY: RoundVisibility[] = ['friends', 'public'];
const HOLE_OPTIONS: Array<9 | 18> = [9, 18];

export default function LogRoundScreen() {
  const { busy, courses, getGroupDetails, groups, logRound, profile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const { courseId: routeCourseId, groupId: routeGroupId } = useLocalSearchParams<{ courseId?: string; groupId?: string }>();
  const initialGroupId = routeGroupId && groups.some((group) => group.id === routeGroupId) ? routeGroupId : groups[0]?.id ?? '';
  const initialCourseId = routeCourseId && courses.some((course) => course.id === routeCourseId) ? routeCourseId : courses.find((course) => course.groupId === initialGroupId)?.id ?? '';
  const [groupId, setGroupId] = useState(initialGroupId);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [gameMode, setGameMode] = useState<GameMode>('stroke');
  const [playedOn, setPlayedOn] = useState(formatFriendlyDate(new Date(), 'key'));
  const [visibility, setVisibility] = useState<RoundVisibility>('friends');
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [teeBoxId, setTeeBoxId] = useState<string | null>(null);
  const [scoreMode, setScoreMode] = useState<'total' | 'holes'>('total');
  const [totalScore, setTotalScore] = useState('');
  const [notes, setNotes] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [holeScoreInputs, setHoleScoreInputs] = useState<string[]>(Array.from({ length: 18 }, () => ''));
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);

  const availableCourses = useMemo(() => courses.filter((course) => course.groupId === groupId), [courses, groupId]);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? null, [courseId, courses]);
  const roundMembers = groupDetails?.members ?? [];

  useEffect(() => {
    let active = true;
    if (!groupId) {
      setGroupDetails(null);
      return undefined;
    }

    getGroupDetails(groupId).then((details) => {
      if (active) {
        setGroupDetails(details);
      }
    });

    return () => {
      active = false;
    };
  }, [getGroupDetails, groupId]);

  useEffect(() => {
    if (selectedCourse) {
      setTeeBoxId((current) => current ?? selectedCourse.tees[0]?.id ?? null);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (gameMode === 'stroke') {
      setTeamName('');
      setTeamMemberIds([]);
    }
  }, [gameMode]);

  const allHoleScoresFilled =
    scoreMode === 'holes' &&
    holeScoreInputs.slice(0, holesPlayed).every((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0;
    });
  const computedHoleTotal = holeScoreInputs.slice(0, holesPlayed).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const finalScore = scoreMode === 'holes' ? computedHoleTotal : Number(totalScore);

  async function handleLogRound() {
    const result = await logRound({
      groupId,
      courseId,
      gameMode,
      playedOn,
      teeBoxId,
      holesPlayed,
      totalScore: finalScore,
      holeScores:
        scoreMode === 'holes'
          ? holeScoreInputs.slice(0, holesPlayed).map(
              (value, index) =>
                ({
                  holeNumber: index + 1,
                  score: Number(value),
                }) satisfies RoundHoleScore
            )
          : [],
      teamName,
      teamMemberIds,
      visibility,
      notes,
    });

    if (result.ok) {
      router.replace(courseId ? `/(app)/courses/${courseId}` : '/(app)/(tabs)/courses');
    }
  }

  function toggleTeamMember(uid: string) {
    setTeamMemberIds((current) => (current.includes(uid) ? current.filter((entry) => entry !== uid) : [...current, uid]));
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Round log"
        title="Log a golf round"
        subtitle="Track a real score by course, choose stroke or scramble, and decide whether the round should stay inside your group or count toward public course rankings."
      />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Group and course</Text>
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
                <Text style={commonStyles.smallMuted}>{group.visibility === 'public' ? 'Public golf group' : 'Friends-only golf group'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={commonStyles.compactSection}>
          {availableCourses.length ? (
            availableCourses.map((course) => {
              const selected = course.id === courseId;
              return (
                <Pressable
                  key={course.id}
                  onPress={() => {
                    setCourseId(course.id);
                    setTeeBoxId(course.tees[0]?.id ?? null);
                  }}
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
                    {course.location} / Par {course.par} / {course.holesCount} holes
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={commonStyles.cardCopy}>Add a course for this group first so rounds have a place to land.</Text>
          )}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Format</Text>
        <View style={commonStyles.segmentedRow}>
          {GAME_MODES.map((mode) => {
            const active = gameMode === mode;
            return (
              <Pressable key={mode} onPress={() => setGameMode(mode)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {mode === 'stroke' ? 'Stroke' : 'Scramble'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={commonStyles.segmentedRow}>
          {HOLE_OPTIONS.map((option) => {
            const active = holesPlayed === option;
            return (
              <Pressable key={option} onPress={() => setHolesPlayed(option)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option} holes</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={commonStyles.segmentedRow}>
          {ROUND_VISIBILITY.map((mode) => {
            const active = visibility === mode;
            return (
              <Pressable key={mode} onPress={() => setVisibility(mode)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {mode === 'friends' ? 'Group / Friends' : 'Public'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Scorecard</Text>
        <TextField label="Played on" value={playedOn} onChangeText={setPlayedOn} placeholder="YYYY-MM-DD" />

        {selectedCourse?.tees.length ? (
          <View style={commonStyles.compactSection}>
            <Text style={commonStyles.settingTitle}>Tee box</Text>
            <View style={commonStyles.chipRow}>
              {selectedCourse.tees.map((tee) => {
                const active = tee.id === teeBoxId;
                return (
                  <Pressable
                    key={tee.id}
                    onPress={() => setTeeBoxId(tee.id)}
                    style={[
                      commonStyles.subtleChip,
                      active ? { backgroundColor: theme.colors.badgeBackground, borderColor: theme.colors.primary } : null,
                    ]}
                  >
                    <Text style={[commonStyles.subtleChipText, active ? { color: theme.colors.primary } : null]}>
                      {tee.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {gameMode === 'stroke' ? (
          <>
            <View style={commonStyles.segmentedRow}>
              {[
                { key: 'total' as const, label: 'Total score' },
                { key: 'holes' as const, label: 'Hole by hole' },
              ].map((option) => {
                const active = scoreMode === option.key;
                return (
                  <Pressable key={option.key} onPress={() => setScoreMode(option.key)} style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}>
                    <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {scoreMode === 'total' ? (
              <TextField label="Total score" value={totalScore} onChangeText={setTotalScore} keyboardType="number-pad" placeholder="84" />
            ) : (
              <View style={commonStyles.compactSection}>
                <Text style={commonStyles.settingTitle}>Hole-by-hole scores</Text>
                <View style={styles.holeGrid}>
                  {Array.from({ length: holesPlayed }, (_, index) => (
                    <View key={index} style={styles.holeCell}>
                      <Text style={commonStyles.smallMuted}>Hole {index + 1}</Text>
                      <TextInput
                        keyboardType="number-pad"
                        placeholderTextColor={theme.colors.muted}
                        style={[
                          styles.holeInput,
                          {
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surfaceAlt,
                            color: theme.colors.text,
                          },
                        ]}
                        value={holeScoreInputs[index]}
                        onChangeText={(value) =>
                          setHoleScoreInputs((current) => {
                            const next = [...current];
                            next[index] = value;
                            return next;
                          })
                        }
                      />
                    </View>
                  ))}
                </View>
                <Text style={commonStyles.smallMuted}>{allHoleScoresFilled ? `Computed total: ${computedHoleTotal}` : 'Fill every hole to compute the total score.'}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <TextField label="Team name" value={teamName} onChangeText={setTeamName} placeholder="Match Play Mischief" />
            <TextField label="Team total score" value={totalScore} onChangeText={setTotalScore} keyboardType="number-pad" placeholder="68" />
            {roundMembers.length ? (
              <View style={commonStyles.compactSection}>
                <Text style={commonStyles.settingTitle}>Team members</Text>
                <View style={commonStyles.chipRow}>
                  {roundMembers.map((member) => {
                    const active = teamMemberIds.includes(member.uid);
                    return (
                      <Pressable
                        key={member.uid}
                        onPress={() => toggleTeamMember(member.uid)}
                        style={[
                          commonStyles.subtleChip,
                          active ? { backgroundColor: theme.colors.badgeBackground, borderColor: theme.colors.primary } : null,
                        ]}
                      >
                        <Text style={[commonStyles.subtleChipText, active ? { color: theme.colors.primary } : null]}>{member.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        )}

        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Windy front nine, birdied 17." multiline />
        <Text style={commonStyles.smallMuted}>
          {selectedCourse ? `This score will be tracked against ${selectedCourse.name}.` : 'Pick a course to continue.'}
        </Text>
        <PrimaryButton
          label={busy ? 'Logging round...' : 'Log round'}
          onPress={handleLogRound}
          disabled={busy || !courseId || !groupId || !selectedCourse || (scoreMode === 'holes' && !allHoleScoresFilled)}
        />
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
  holeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  holeCell: {
    width: '30%',
    gap: spacing.xs,
  },
  holeInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
});
