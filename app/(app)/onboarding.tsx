import { Redirect, router } from 'expo-router';
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

export default function OnboardingScreen() {
  const { busy, joinPublicGroup, listPublicGroups, profile, saveProfile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [goal, setGoal] = useState(String(profile?.weeklyGoal ?? 5));
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublicGroups().then((nextGroups) => {
      setPublicGroups(nextGroups);
    });
  }, [listPublicGroups]);

  if (!profile) {
    return <Redirect href="/" />;
  }

  async function saveBasics() {
    const result = await saveProfile({
      name,
      bio,
      weeklyGoal: Number(goal) || 5,
      onboardingCompleted: true,
    });

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    return true;
  }

  async function handleSave() {
    setError('');
    const basicsSaved = await saveBasics();
    if (!basicsSaved) {
      return;
    }

    if (selectedGroupId) {
      const joinResult = await joinPublicGroup(selectedGroupId);
      if (!joinResult.ok) {
        setError(joinResult.message);
        return;
      }

      if (joinResult.groupId) {
        router.replace(`/(app)/groups/${joinResult.groupId}`);
        return;
      }
    }

    router.replace('/(app)/(tabs)/courses');
  }

  async function handleCreateGroup() {
    setError('');
    const basicsSaved = await saveBasics();
    if (basicsSaved) {
      router.push('/(app)/groups/new');
    }
  }

  async function handleUseInviteCode() {
    setError('');
    const basicsSaved = await saveBasics();
    if (basicsSaved) {
      router.push('/(app)/groups/join');
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Onboarding</Text>
      <Text style={commonStyles.pageTitle}>Set up Rivl</Text>
      <Text style={commonStyles.pageCopy}>Add your profile, then head to courses or join a starter group.</Text>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>How others will see you</Text>
        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />
        <TextField label="Weekly rounds target" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Starter group</Text>
        {publicGroups.length ? (
          publicGroups.slice(0, 3).map((group) => {
            const selected = group.id === selectedGroupId;

            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedGroupId((current) => (current === group.id ? null : group.id))}
                style={[
                  styles.groupChoice,
                  {
                    backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.settingTitle}>{group.name}</Text>
                  <Text style={commonStyles.settingSubtitle}>
                    {group.memberIds.length}
                    {group.memberLimit ? `/${group.memberLimit}` : ''} members / Public
                  </Text>
                </View>
                <Text style={commonStyles.usernameText}>{selected ? 'Selected' : 'Join'}</Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={commonStyles.cardCopy}>No public groups are open yet. You can create or join one later.</Text>
        )}
        {error ? <Text style={commonStyles.errorText}>{error}</Text> : null}
        <View style={commonStyles.actionRowTight}>
          <PrimaryButton label={busy ? 'Saving...' : 'Continue'} onPress={handleSave} disabled={busy} />
        </View>
        <View style={commonStyles.actionRowTight}>
          <PrimaryButton label="Use invite code" onPress={handleUseInviteCode} variant="secondary" disabled={busy} />
          <PrimaryButton label="Create a group" onPress={handleCreateGroup} variant="secondary" disabled={busy} />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  groupChoice: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
