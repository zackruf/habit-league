import { router } from 'expo-router';
import { useState } from 'react';

import { AppScreen } from '@/components/AppScreen';
import { GroupSettingsForm } from '@/components/GroupSettingsForm';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupSettingsInput } from '@/types/models';

export default function CreateGroupScreen() {
  const { busy, createGroup } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [values, setValues] = useState<GroupSettingsInput>({
    name: '',
    description: '',
    visibility: 'private',
    stakesEnabled: false,
    stakesText: '',
    memberLimit: null,
  });

  async function handleCreate() {
    const result = await createGroup(values);
    if (result.ok && result.groupId) {
      router.replace(`/(app)/groups/${result.groupId}`);
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Create group"
        title="Start a league for your crew"
        subtitle="Set the basics, choose visibility, and optionally add a challenge consequence without adding anything risky."
      />
      <GroupSettingsForm
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        onSubmit={handleCreate}
        submitLabel="Create group"
        busy={busy}
      />
    </AppScreen>
  );
}
