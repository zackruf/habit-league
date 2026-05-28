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
import { getRequiredPlayerCount, getRoundFormatLabel, isScrambleFormat, SCRAMBLE_FIRST_FORMATS } from '@/lib/golf';
import { suggestNearestCourse } from '@/lib/location';
import { createCommonStyles } from '@/styles/commonStyles';
import { Profile, RoundFormat, RoundHoleScore, UserSearchResult } from '@/types/models';

const HOLE_OPTIONS: Array<9 | 18> = [18, 9];

type PlayerSlot = {
  id: string | null;
  name: string;
};

type PlayerOption = {
  uid: string;
  name: string;
  username: string;
};

export default function LogRoundScreen() {
  const { busy, courses, getGroupDetails, groups, logRound, profile, searchUsers } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const { courseId: routeCourseId, groupId: routeGroupId } = useLocalSearchParams<{ courseId?: string; groupId?: string }>();
  const initialCourseId = routeCourseId && courses.some((course) => course.id === routeCourseId) ? routeCourseId : '';
  const [courseId, setCourseId] = useState(initialCourseId);
  const [format, setFormat] = useState<RoundFormat>('scramble2');
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [teeBoxId, setTeeBoxId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [relatedGroupIds] = useState<string[]>(routeGroupId ? [routeGroupId] : []);
  const [knownPlayers, setKnownPlayers] = useState<PlayerOption[]>([]);
  const [playerQuery, setPlayerQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerOption[]>([]);
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [holeScoreInputs, setHoleScoreInputs] = useState<string[]>(Array.from({ length: 18 }, () => ''));
  const [activeHoleIndex, setActiveHoleIndex] = useState(0);
  const [locationState, setLocationState] = useState<'checking' | 'suggested' | 'manual'>('checking');
  const [distanceFromCourseMeters, setDistanceFromCourseMeters] = useState<number | null>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId) ?? null, [courseId, courses]);
  const selectedTee = useMemo(() => selectedCourse?.tees.find((tee) => tee.id === teeBoxId) ?? selectedCourse?.tees[0] ?? null, [selectedCourse, teeBoxId]);
  const requiredPlayers = getRequiredPlayerCount(format);
  const activeHole = selectedCourse?.holes[activeHoleIndex] ?? null;
  const activeHoleScore = holeScoreInputs[activeHoleIndex] ?? '';
  const activeHoleYards = activeHole && selectedTee ? activeHole.yardagesByTee[selectedTee.id] : null;
  const completedScores = holeScoreInputs.slice(0, holesPlayed).filter((value) => Number(value) > 0).length;
  const allHoleScoresFilled = completedScores === holesPlayed;
  const totalScore = holeScoreInputs.slice(0, holesPlayed).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const playerIds = players.map((player) => player.id).filter(Boolean) as string[];
  const playerNames = players.map((player) => player.name.trim()).filter(Boolean);
  const canPost = Boolean(selectedCourse && allHoleScoresFilled && playerIds.length === requiredPlayers && playerNames.length === requiredPlayers);

  useEffect(() => {
    setPlayers((current) => buildPlayerSlots(current, requiredPlayers, profile?.uid ?? null, profile?.name ?? 'You'));
  }, [profile?.name, profile?.uid, requiredPlayers]);

  useEffect(() => {
    if (selectedCourse) {
      setTeeBoxId((current) => current ?? selectedCourse.tees[0]?.id ?? null);
    }
  }, [selectedCourse]);

  useEffect(() => {
    setActiveHoleIndex((current) => Math.min(current, holesPlayed - 1));
  }, [holesPlayed]);

  useEffect(() => {
    let active = true;
    async function loadKnownPlayers() {
      const details = await Promise.all(groups.map((group) => getGroupDetails(group.id)));
      if (!active) {
        return;
      }
      const byId = new Map<string, PlayerOption>();
      details.forEach((detail) => {
        detail?.members.forEach((member) => {
          if (member.uid !== profile?.uid) {
            byId.set(member.uid, toPlayerOption(member));
          }
        });
      });
      setKnownPlayers(Array.from(byId.values()));
    }

    loadKnownPlayers();
    return () => {
      active = false;
    };
  }, [getGroupDetails, groups, profile?.uid]);

  useEffect(() => {
    let active = true;
    if (playerQuery.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }

    searchUsers(playerQuery).then((results) => {
      if (active) {
        setSearchResults(results.map(toPlayerSearchOption));
      }
    });

    return () => {
      active = false;
    };
  }, [playerQuery, searchUsers]);

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

  async function handlePostRound() {
    if (!selectedCourse) {
      return;
    }

    const result = await logRound({
      groupId: relatedGroupIds[0] ?? null,
      relatedGroupIds,
      courseId,
      format,
      playedOn: formatFriendlyDate(new Date(), 'key'),
      teeBoxId,
      holesPlayed,
      totalScore,
      holeScores: holeScoreInputs.slice(0, holesPlayed).map(
        (value, index) =>
          ({
            holeNumber: index + 1,
            score: Number(value),
          }) satisfies RoundHoleScore
      ),
      playerIds,
      playerNames,
      teamName: isScrambleFormat(format) ? teamName.trim() || playerNames.join(' and ') : '',
      visibility: 'public',
      locationVerified: locationState === 'suggested' && selectedCourse.id === courseId,
      distanceFromCourseMeters: locationState === 'suggested' && selectedCourse.id === courseId ? distanceFromCourseMeters : null,
    });

    if (result.ok) {
      router.replace(`/(app)/courses/${courseId}`);
    }
  }

  function selectPlayer(slotIndex: number, player: PlayerOption) {
    setPlayers((current) => current.map((slot, index) => (index === slotIndex ? { id: player.uid, name: player.name } : slot)));
  }

  function updateScore(value: string) {
    setHoleScoreInputs((current) => {
      const next = [...current];
      next[activeHoleIndex] = value.replace(/[^0-9]/g, '');
      return next;
    });
  }

  const playerOptions = mergePlayerOptions(knownPlayers, searchResults).filter((option) => !playerIds.includes(option.uid));

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader eyebrow="Round" title="Log scramble" />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Course</Text>
        {locationState === 'suggested' ? <Text style={commonStyles.smallMuted}>Nearest</Text> : null}
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
                  {course.location} / Par {course.par}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Format</Text>
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
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Players</Text>
        {isScrambleFormat(format) ? <TextField label="Team" value={teamName} onChangeText={setTeamName} placeholder="Cart Path Only" /> : null}
        <TextField label="Find players" value={playerQuery} onChangeText={setPlayerQuery} placeholder="Name or username" />
        <View style={commonStyles.compactSection}>
          {players.map((slot, index) => (
            <View key={index} style={styles.playerSlot}>
              <Text style={commonStyles.settingTitle}>{index + 1}. {slot.name || 'Select player'}</Text>
              {index > 0 ? (
                <View style={commonStyles.chipRow}>
                  {playerOptions.map((option) => (
                    <Pressable key={option.uid} onPress={() => selectPlayer(index, option)} style={commonStyles.subtleChip}>
                      <Text style={commonStyles.subtleChipText}>{option.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={commonStyles.rowBetween}>
          <View>
            <Text style={commonStyles.cardTitle}>Hole {activeHoleIndex + 1}</Text>
            <Text style={commonStyles.cardCopy}>
              Par {activeHole?.par ?? '-'} / {activeHoleYards ? `${activeHoleYards} yds` : selectedTee?.name ?? 'Tee'}
            </Text>
          </View>
          <Text style={commonStyles.statValue}>{completedScores}/{holesPlayed}</Text>
        </View>

        <View style={[styles.holeMap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <View style={[styles.green, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.fairway, { backgroundColor: theme.colors.badgeBackground }]} />
          <View style={[styles.teeMarker, { backgroundColor: theme.colors.accent }]} />
        </View>

        <TextInput
          keyboardType="number-pad"
          onChangeText={updateScore}
          placeholder="Score"
          placeholderTextColor={theme.colors.muted}
          style={[styles.scoreInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
          value={activeHoleScore}
        />

        <View style={commonStyles.actionRowTight}>
          <PrimaryButton
            label="Back"
            onPress={() => setActiveHoleIndex((current) => Math.max(0, current - 1))}
            disabled={activeHoleIndex === 0}
            variant="secondary"
          />
          {activeHoleIndex < holesPlayed - 1 ? (
            <PrimaryButton
              label="Next"
              onPress={() => setActiveHoleIndex((current) => Math.min(holesPlayed - 1, current + 1))}
              disabled={!Number(activeHoleScore)}
            />
          ) : (
            <PrimaryButton label={busy ? 'Posting...' : 'Post'} onPress={handlePostRound} disabled={busy || !canPost} />
          )}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

function buildPlayerSlots(current: PlayerSlot[], count: number, currentUserId: string | null, currentUserName: string) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return { id: currentUserId, name: current[0]?.name || currentUserName };
    }
    return current[index]?.id ? current[index] : { id: null, name: '' };
  });
}

function toPlayerOption(profile: Profile): PlayerOption {
  return {
    uid: profile.uid,
    name: profile.name,
    username: profile.username,
  };
}

function toPlayerSearchOption(result: UserSearchResult): PlayerOption {
  return {
    uid: result.uid,
    name: result.name,
    username: result.username,
  };
}

function mergePlayerOptions(first: PlayerOption[], second: PlayerOption[]) {
  return Array.from(new Map([...first, ...second].map((player) => [player.uid, player])).values());
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
  holeMap: {
    borderRadius: 8,
    borderWidth: 1,
    height: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  green: {
    borderRadius: 999,
    height: 44,
    position: 'absolute',
    right: 28,
    top: 24,
    width: 70,
  },
  fairway: {
    borderRadius: 80,
    height: 180,
    left: 72,
    position: 'absolute',
    top: 20,
    transform: [{ rotate: '18deg' }],
    width: 76,
  },
  teeMarker: {
    borderRadius: 12,
    bottom: 22,
    height: 24,
    left: 34,
    position: 'absolute',
    width: 42,
  },
  scoreInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
});
