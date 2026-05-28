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
import {
  getRequiredPlayerCount,
  getRoundFormatLabel,
  isScrambleFormat,
  SCRAMBLE_FIRST_FORMATS,
} from '@/lib/golf';
import { suggestNearestCourse } from '@/lib/location';
import { createCommonStyles } from '@/styles/commonStyles';
import { Profile, RoundFormat, RoundHoleScore, RoundVisibility } from '@/types/models';

const ROUND_VISIBILITY: RoundVisibility[] = ['public', 'friends'];
const HOLE_OPTIONS: Array<9 | 18> = [18, 9];

type PlayerSlot = {
  id: string | null;
  name: string;
};

export default function LogRoundScreen() {
  const { busy, courses, getGroupDetails, groups, logRound, profile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const { courseId: routeCourseId, groupId: routeGroupId } = useLocalSearchParams<{ courseId?: string; groupId?: string }>();
  const initialCourseId = routeCourseId && courses.some((course) => course.id === routeCourseId) ? routeCourseId : '';
  const [courseId, setCourseId] = useState(initialCourseId);
  const [format, setFormat] = useState<RoundFormat>('scramble2');
  const [playedOn, setPlayedOn] = useState(formatFriendlyDate(new Date(), 'key'));
  const [visibility, setVisibility] = useState<RoundVisibility>('public');
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [teeBoxId, setTeeBoxId] = useState<string | null>(null);
  const [scoreMode, setScoreMode] = useState<'total' | 'holes'>('total');
  const [totalScore, setTotalScore] = useState('');
  const [notes, setNotes] = useState('');
  const [teamName, setTeamName] = useState('');
  const [relatedGroupIds, setRelatedGroupIds] = useState<string[]>(routeGroupId ? [routeGroupId] : []);
  const [knownPlayers, setKnownPlayers] = useState<Profile[]>([]);
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [holeScoreInputs, setHoleScoreInputs] = useState<string[]>(Array.from({ length: 18 }, () => ''));
  const [locationState, setLocationState] = useState<'checking' | 'suggested' | 'manual'>('checking');
  const [distanceFromCourseMeters, setDistanceFromCourseMeters] = useState<number | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? null, [courseId, courses]);
  const requiredPlayers = getRequiredPlayerCount(format);

  useEffect(() => {
    setPlayers((current) => buildPlayerSlots(current, requiredPlayers, profile?.uid ?? null, profile?.name ?? 'You'));
  }, [profile?.name, profile?.uid, requiredPlayers]);

  useEffect(() => {
    if (selectedCourse) {
      setTeeBoxId((current) => current ?? selectedCourse.tees[0]?.id ?? null);
    }
  }, [selectedCourse]);

  useEffect(() => {
    let active = true;
    async function loadKnownPlayers() {
      const details = await Promise.all(groups.map((group) => getGroupDetails(group.id)));
      if (!active) {
        return;
      }
      const byId = new Map<string, Profile>();
      details.forEach((detail) => {
        detail?.members.forEach((member) => byId.set(member.uid, member));
      });
      setKnownPlayers(Array.from(byId.values()).filter((member) => member.uid !== profile?.uid));
    }

    loadKnownPlayers();
    return () => {
      active = false;
    };
  }, [getGroupDetails, groups, profile?.uid]);

  useEffect(() => {
    let active = true;
    suggestNearestCourse(courses)
      .then((suggestion) => {
        if (!active) {
          return;
        }
        if (suggestion) {
          setCourseId((current) => current || suggestion.course.id);
          setDistanceFromCourseMeters(suggestion.distanceFromCourseMeters);
          setLocationState('suggested');
        } else {
          setLocationState('manual');
        }
      })
      .catch(() => {
        if (active) {
          setLocationState('manual');
        }
      });
    return () => {
      active = false;
    };
  }, [courses]);

  const allHoleScoresFilled =
    scoreMode === 'holes' &&
    holeScoreInputs.slice(0, holesPlayed).every((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0;
    });
  const computedHoleTotal = holeScoreInputs.slice(0, holesPlayed).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const finalScore = scoreMode === 'holes' ? computedHoleTotal : Number(totalScore);
  const playerNames = players.map((player) => player.name.trim()).filter(Boolean);
  const playerIds = players.map((player) => player.id).filter(Boolean) as string[];
  const canSubmit = Boolean(courseId && selectedCourse && playerNames.length === requiredPlayers && Number.isFinite(finalScore) && finalScore > 0);

  async function handleLogRound() {
    const result = await logRound({
      groupId: relatedGroupIds[0] ?? null,
      relatedGroupIds,
      courseId,
      format,
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
      playerIds,
      playerNames,
      teamName: isScrambleFormat(format) ? teamName.trim() || playerNames.join(' and ') : '',
      visibility,
      notes,
      locationVerified: locationState === 'suggested' && selectedCourse?.id === courseId,
      distanceFromCourseMeters: locationState === 'suggested' && selectedCourse?.id === courseId ? distanceFromCourseMeters : null,
    });

    if (result.ok) {
      router.replace(courseId ? `/(app)/courses/${courseId}` : '/(app)/(tabs)/courses');
    }
  }

  function selectKnownPlayer(slotIndex: number, member: Profile) {
    setPlayers((current) => current.map((slot, index) => (index === slotIndex ? { id: member.uid, name: member.name } : slot)));
  }

  function updateManualName(slotIndex: number, name: string) {
    setPlayers((current) => current.map((slot, index) => (index === slotIndex ? { id: index === 0 ? slot.id : null, name } : slot)));
  }

  function toggleGroup(groupId: string) {
    setRelatedGroupIds((current) => (current.includes(groupId) ? current.filter((entry) => entry !== groupId) : [...current, groupId]));
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Scramble score"
        title="Log a scramble round"
        subtitle="Pick a course, choose your format, add the players, and compete at this course."
      />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Course</Text>
        {locationState === 'suggested' ? <Text style={commonStyles.smallMuted}>Nearest course suggested</Text> : null}
        <View style={commonStyles.compactSection}>
          {courses.map((course) => {
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
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Pick your format</Text>
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
                  {mode === 'public' ? 'Public leaderboard' : 'Friends leaderboard'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Players</Text>
        {isScrambleFormat(format) ? <TextField label="Team name" value={teamName} onChangeText={setTeamName} placeholder="Cart Path Only" /> : null}
        <View style={commonStyles.compactSection}>
          {players.map((slot, index) => (
            <View key={index} style={styles.playerSlot}>
              <TextField
                label={index === 0 ? 'Player 1' : `Player ${index + 1}`}
                value={slot.name}
                onChangeText={(value) => updateManualName(index, value)}
                placeholder={index === 0 ? profile?.name ?? 'You' : 'Teammate name'}
              />
              {index > 0 && knownPlayers.length ? (
                <View style={commonStyles.chipRow}>
                  {knownPlayers.map((member) => {
                    const active = slot.id === member.uid;
                    return (
                      <Pressable
                        key={member.uid}
                        onPress={() => selectKnownPlayer(index, member)}
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
              ) : null}
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Scorecard</Text>
        <TextField label="Date" value={playedOn} onChangeText={setPlayedOn} placeholder="YYYY-MM-DD" />

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
                    <Text style={[commonStyles.subtleChipText, active ? { color: theme.colors.primary } : null]}>{tee.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {format === 'individual' ? (
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
        ) : null}

        {scoreMode === 'total' || format !== 'individual' ? (
          <TextField label="Total score" value={totalScore} onChangeText={setTotalScore} keyboardType="number-pad" placeholder={isScrambleFormat(format) ? '68' : '84'} />
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

        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Windy front nine, birdied 17." multiline />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Group filters</Text>
        <Text style={commonStyles.cardCopy}>Optional: show this round when a group filters leaderboards or activity.</Text>
        <View style={commonStyles.chipRow}>
          {groups.map((group) => {
            const active = relatedGroupIds.includes(group.id);
            return (
              <Pressable
                key={group.id}
                onPress={() => toggleGroup(group.id)}
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
        <Text style={commonStyles.smallMuted}>
          {selectedCourse ? `This score will compete at ${selectedCourse.name}.` : 'Pick a course to continue.'}
        </Text>
        <PrimaryButton
          label={busy ? 'Logging round...' : 'Post score'}
          onPress={handleLogRound}
          disabled={busy || !canSubmit || (scoreMode === 'holes' && format === 'individual' && !allHoleScoresFilled)}
        />
      </SurfaceCard>
    </AppScreen>
  );
}

function buildPlayerSlots(current: PlayerSlot[], count: number, currentUserId: string | null, currentUserName: string) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return { id: currentUserId, name: current[0]?.name || currentUserName };
    }
    return current[index] ?? { id: null, name: '' };
  });
}

const styles = StyleSheet.create({
  optionCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  playerSlot: {
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
});
