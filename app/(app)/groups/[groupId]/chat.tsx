import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { GroupChatPanel } from '@/components/GroupChatPanel';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { GroupDetails } from '@/types/models';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails } = useApp();
  const { theme } = useThemePreferences();
  const [details, setDetails] = useState<GroupDetails | null>(null);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then(setDetails);
  }, [getGroupDetails, groupId]);

  if (!details) {
    return <LoadingScreen message="Loading group chat..." />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <PageHeader
          eyebrow="Group chat"
          title={details.group.name}
          subtitle="Keep the momentum going with quick check-ins, nudges, and challenge talk."
        />
        <GroupChatPanel groupId={details.group.id} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
