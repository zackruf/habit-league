import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { commonStyles } from '@/styles/commonStyles';

export default function ProfileScreen() {
  const { busy, profile, saveProfile, signOut } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [goal, setGoal] = useState(String(profile?.weeklyGoal ?? 5));

  if (!profile) {
    return null;
  }

  async function handleSave() {
    await saveProfile({
      name,
      bio,
      weeklyGoal: Number(goal) || 5,
      onboardingCompleted: true,
    });
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <AppScreen scrollable>
      <View style={commonStyles.heroPanelAlt}>
        <Text style={commonStyles.eyebrow}>Profile</Text>
        <Text style={commonStyles.pageTitle}>Keep your presence sharp</Text>
        <Text style={commonStyles.pageCopy}>Refresh your public profile, tweak your weekly goal, and keep your streak identity current.</Text>
      </View>

      <SurfaceCard>
        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />
        <TextField label="Weekly goal" value={goal} onChangeText={setGoal} keyboardType="number-pad" />

        <View style={commonStyles.actionGrid}>
          <PrimaryButton label={busy ? 'Saving...' : 'Save profile'} onPress={handleSave} disabled={busy} />
          <PrimaryButton label="Sign out" onPress={handleSignOut} variant="ghost" />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}
