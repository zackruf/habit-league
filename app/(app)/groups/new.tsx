import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { commonStyles } from '@/styles/commonStyles';

export default function CreateGroupScreen() {
  const { busy, createGroup } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    const result = await createGroup(name, description);
    if (result.ok && result.groupId) {
      router.replace(`/(app)/groups/${result.groupId}`);
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Create group</Text>
      <Text style={commonStyles.pageTitle}>Start a league for your crew</Text>

      <SurfaceCard>
        <TextField label="Group name" value={name} onChangeText={setName} placeholder="Office Wellness" />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="A friendly weekly leaderboard for our team."
        />
        <PrimaryButton label={busy ? 'Creating...' : 'Create group'} onPress={handleCreate} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}
