import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

export default function LeaderboardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then(setDetails);
  }, [getGroupDetails, groupId]);

  if (!details) {
    return <LoadingScreen message="Calculating leaderboard..." />;
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Weekly leaderboard</Text>
      <Text style={commonStyles.pageTitle}>{details.group.name}</Text>
      <Text style={commonStyles.pageCopy}>Rankings are based on total daily check-ins during the current week.</Text>

      {details.leaderboard.map((entry, index) => (
        <SurfaceCard key={entry.userId}>
          <View style={commonStyles.rowBetween}>
            <Text style={commonStyles.cardTitle}>
              {index + 1}. {entry.name}
            </Text>
            <Text style={commonStyles.statValue}>{entry.weeklyCheckIns}</Text>
          </View>
          <Text style={commonStyles.cardCopy}>{entry.completedHabits} active habits contributing this week</Text>
        </SurfaceCard>
      ))}
    </AppScreen>
  );
}
