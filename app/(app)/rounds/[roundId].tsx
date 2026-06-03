import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { formatFriendlyDate } from '@/lib/date';
import { formatScoreToPar, getRoundDisplayName, getRoundFormatLabel, getRoundTrustLabel } from '@/lib/golf';
import { createCommonStyles } from '@/styles/commonStyles';

export default function RoundSummaryScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const { profile, rounds } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const round = rounds.find((entry) => entry.id === roundId) ?? null;

  if (!profile) {
    return <LoadingScreen message="Loading round..." />;
  }

  if (!round) {
    return (
      <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
        <PageHeader eyebrow="Round" title="Score posted" />
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>Round saved</Text>
          <Text style={commonStyles.cardCopy}>Open the course leaderboard to see where it landed.</Text>
          <PrimaryButton label="Courses" onPress={() => router.replace('/(app)/(tabs)/courses')} />
        </SurfaceCard>
      </AppScreen>
    );
  }

  const leaderboardScope = round.visibility === 'public' ? 'public' : 'friends';

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader eyebrow="Round posted" title={round.courseName} subtitle={getRoundFormatLabel(round.format)} />

      <SurfaceCard style={commonStyles.currentUserCard}>
        <Text style={commonStyles.noticeEyebrow}>{getRoundDisplayName(round)}</Text>
        <View style={commonStyles.rowBetween}>
          <View>
            <Text style={commonStyles.statValue}>{round.totalScore}</Text>
            <Text style={commonStyles.smallMuted}>{formatScoreToPar(round.scoreToPar)}</Text>
          </View>
          <View style={commonStyles.cardCopyBlock}>
            <Text style={commonStyles.cardTitle}>{round.holesPlayed} holes</Text>
            <Text style={commonStyles.cardCopy}>{round.teeBoxName}</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Summary</Text>
        <Text style={commonStyles.cardCopy}>{formatFriendlyDate(new Date(round.dateKey))} / {round.visibility === 'public' ? 'Public' : 'Private'}</Text>
        <Text style={commonStyles.smallMuted}>{getRoundTrustLabel(round)}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Hole scores</Text>
        <View style={commonStyles.chipRow}>
          {round.holeScores.map((hole) => (
            <View key={hole.holeNumber} style={commonStyles.subtleChip}>
              <Text style={commonStyles.subtleChipText}>
                {hole.holeNumber}: {hole.score}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <View style={commonStyles.actionRowTight}>
        <PrimaryButton
          label="View leaderboard"
          onPress={() => router.replace(`/(app)/courses/${round.courseId}?format=${round.format}&scope=${leaderboardScope}`)}
        />
        <PrimaryButton label="Log another" onPress={() => router.replace(`/(app)/rounds/new?courseId=${round.courseId}`)} variant="secondary" />
      </View>
    </AppScreen>
  );
}
