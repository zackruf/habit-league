import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { Group } from '@/types/models';

export default function JoinGroupScreen() {
  const { busy, joinGroup, joinPublicGroup, listPublicGroups } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);

  useEffect(() => {
    listPublicGroups().then(setPublicGroups);
  }, [listPublicGroups]);

  async function handleJoin() {
    setError('');
    const result = await joinGroup(joinCode);
    if (!result.ok || !result.groupId) {
      setError(result.message);
      return;
    }

    router.replace(`/(app)/groups/${result.groupId}`);
  }

  async function handleJoinPublic(groupId: string) {
    setError('');
    const result = await joinPublicGroup(groupId);
    if (!result.ok || !result.groupId) {
      setError(result.message);
      return;
    }

    router.replace(`/(app)/groups/${result.groupId}`);
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Join group</Text>
      <Text style={commonStyles.pageTitle}>Get into competition</Text>
      <Text style={commonStyles.pageCopy}>Use a friend code, or join an open starter league right now.</Text>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Friend invite</Text>
        <TextField label="Join code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="ABC123" />
        {error ? <Text style={commonStyles.errorText}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Joining...' : 'Join group'} onPress={handleJoin} disabled={busy} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Open starter leagues</Text>
        <Text style={commonStyles.cardCopy}>Designed for users who do not have friends ready to invite yet.</Text>
        {publicGroups.length ? (
          publicGroups.map((group) => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={`Join ${group.name}`}
              onPress={() => handleJoinPublic(group.id)}
              style={({ pressed }) => [
                styles.publicLeagueRow,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View style={commonStyles.listRowMeta}>
                <Text style={commonStyles.settingTitle}>{group.name}</Text>
                <Text style={commonStyles.settingSubtitle}>
                  {group.memberIds.length}
                  {group.memberLimit ? `/${group.memberLimit}` : ''} members / Public / Join instantly
                </Text>
                {group.description ? <Text style={commonStyles.smallMuted}>{group.description}</Text> : null}
              </View>
              <Text style={commonStyles.usernameText}>Join</Text>
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.cardCopy}>No public leagues are open right now. Create one and mark it public to help future users.</Text>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  publicLeagueRow: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
