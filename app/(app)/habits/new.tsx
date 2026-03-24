import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { commonStyles } from '@/styles/commonStyles';

export default function CreateHabitScreen() {
  const { busy, createHabit } = useApp();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [category, setCategory] = useState('Health');

  async function handleCreate() {
    const result = await createHabit({ title, emoji, category });
    if (result.ok) {
      router.replace('/(app)/home');
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Create habit</Text>
      <Text style={commonStyles.pageTitle}>Add one habit to track daily</Text>

      <SurfaceCard>
        <TextField label="Habit name" value={title} onChangeText={setTitle} placeholder="Morning walk" />
        <TextField label="Emoji" value={emoji} onChangeText={setEmoji} placeholder="🔥" />
        <TextField label="Category" value={category} onChangeText={setCategory} placeholder="Health" />
        <PrimaryButton label={busy ? 'Creating...' : 'Create habit'} onPress={handleCreate} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}
