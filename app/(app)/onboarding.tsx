import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';

export default function OnboardingScreen() {
  const { busy, profile, saveProfile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [goal, setGoal] = useState(String(profile?.weeklyGoal ?? 5));

  if (!profile) {
    return <Redirect href="/" />;
  }

  async function handleSave() {
    const result = await saveProfile({
      name,
      bio,
      weeklyGoal: Number(goal) || 5,
      onboardingCompleted: true,
    });

    if (result.ok) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Onboarding</Text>
      <Text style={commonStyles.pageTitle}>Set up your profile</Text>
      <Text style={commonStyles.pageCopy}>Keep this simple. You can change everything later once your group is live.</Text>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>How others will see you</Text>
        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />
        <TextField label="Weekly check-in goal" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
        <PrimaryButton label={busy ? 'Saving...' : 'Finish onboarding'} onPress={handleSave} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}
