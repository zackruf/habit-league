import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';

export default function JoinGroupScreen() {
  const { busy, joinGroup } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  async function handleJoin() {
    setError('');
    const result = await joinGroup(joinCode);
    if (!result.ok || !result.groupId) {
      setError(result.message);
      return;
    }

    router.replace(`/(app)/groups/${result.groupId}`);
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Join group</Text>
      <Text style={commonStyles.pageTitle}>Use a friend&apos;s invite code</Text>

      <SurfaceCard>
        <TextField label="Join code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="ABC123" />
        {error ? <Text style={commonStyles.errorText}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Joining...' : 'Join group'} onPress={handleJoin} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}
