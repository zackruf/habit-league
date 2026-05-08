import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppScreen } from '@/components/AppScreen';
import { GroupSettingsForm } from '@/components/GroupSettingsForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails, GroupSettingsInput } from '@/types/models';
import { Text } from 'react-native';

export default function EditGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails, session, updateGroup } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [values, setValues] = useState<GroupSettingsInput | null>(null);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then((nextDetails) => {
      setDetails(nextDetails);
      if (nextDetails) {
        setValues({
          name: nextDetails.group.name,
          description: nextDetails.group.description,
          visibility: nextDetails.group.visibility,
          stakesEnabled: nextDetails.group.stakesEnabled,
          stakesText: nextDetails.group.stakesText,
          memberLimit: nextDetails.group.memberLimit,
        });
      }
    });
  }, [getGroupDetails, groupId]);

  if (!details || !values) {
    return <LoadingScreen message="Loading group settings..." />;
  }

  const group = details.group;
  const formValues = values;

  if (session?.uid !== group.ownerId) {
    return (
      <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
        <PageHeader
          eyebrow="Edit group"
          title="Owner access only"
          subtitle="Only the person who created this group can change its settings right now."
        />
        <SurfaceCard>
          <Text style={commonStyles.cardCopy}>You can still use chat, join with the code, and follow the leaderboard from the main group page.</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  async function handleSave() {
    const result = await updateGroup(group.id, formValues);
    if (result.ok) {
      router.replace(`/(app)/groups/${group.id}`);
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Edit group"
        title="Update group settings"
        subtitle="Make quick changes without rebuilding the group from scratch."
      />
      <GroupSettingsForm
        values={formValues}
        onChange={(patch) => setValues((current) => (current ? { ...current, ...patch } : current))}
        onSubmit={handleSave}
        submitLabel="Save changes"
      />
    </AppScreen>
  );
}
