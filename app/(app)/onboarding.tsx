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
import { getDefaultHabitTemplate, HABIT_TEMPLATES } from '@/lib/habitTemplates';
import { createCommonStyles } from '@/styles/commonStyles';
import { Group } from '@/types/models';

export default function OnboardingScreen() {
  const { busy, createHabit, joinPublicGroup, listPublicGroups, profile, saveProfile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [goal, setGoal] = useState(String(profile?.weeklyGoal ?? 5));
  const [selectedTemplateId, setSelectedTemplateId] = useState(getDefaultHabitTemplate().id);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublicGroups().then((nextGroups) => {
      setPublicGroups(nextGroups);
      setSelectedGroupId(nextGroups[0]?.id ?? null);
    });
  }, [listPublicGroups]);

  if (!profile) {
    return <Redirect href="/" />;
  }

  async function handleSave() {
    setError('');
    const selectedTemplate = HABIT_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? getDefaultHabitTemplate();
    const result = await saveProfile({
      name,
      bio,
      weeklyGoal: Number(goal) || 5,
      onboardingCompleted: true,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const habitResult = await createHabit({
      title: selectedTemplate.title,
      emoji: selectedTemplate.emoji,
      category: selectedTemplate.category,
    });

    if (!habitResult.ok) {
      setError(habitResult.message);
      return;
    }

    if (selectedGroupId) {
      const joinResult = await joinPublicGroup(selectedGroupId);
      if (joinResult.ok && joinResult.groupId) {
        router.replace(`/(app)/groups/${joinResult.groupId}`);
        return;
      }
      if (!joinResult.ok) {
        setError(joinResult.message);
        return;
      }
    }

    if (result.ok) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Onboarding</Text>
      <Text style={commonStyles.pageTitle}>Get into your first league</Text>
      <Text style={commonStyles.pageCopy}>Pick one habit and join a starter league now. You can refine everything later.</Text>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>How others will see you</Text>
        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />
        <TextField label="Weekly check-in goal" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Choose your first habit</Text>
        <Text style={commonStyles.cardCopy}>Templates reduce the blank-page problem and get you to a check-in faster.</Text>
        <View style={styles.templateGrid}>
          {HABIT_TEMPLATES.slice(0, 4).map((template) => {
            const selected = template.id === selectedTemplateId;

            return (
              <Pressable
                key={template.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedTemplateId(template.id)}
                style={[
                  styles.choiceCard,
                  {
                    backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.choiceEmoji, { color: theme.colors.primary }]}>{template.emoji}</Text>
                <Text style={commonStyles.settingTitle}>{template.title}</Text>
                <Text style={commonStyles.smallMuted}>{template.category}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Join a public starter league</Text>
        <Text style={commonStyles.cardCopy}>No friend code needed. Start with strangers now, invite friends later.</Text>
        {publicGroups.length ? (
          publicGroups.slice(0, 3).map((group) => {
            const selected = group.id === selectedGroupId;

            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedGroupId(group.id)}
                style={[
                  styles.leagueChoice,
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
          <Text style={commonStyles.cardCopy}>No public leagues are open yet. You can create or join one from Groups after setup.</Text>
        )}
        {error ? <Text style={commonStyles.errorText}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Saving...' : 'Finish onboarding'} onPress={handleSave} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceCard: {
    width: '48%',
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  choiceEmoji: {
    fontSize: 18,
    fontWeight: '900',
  },
  leagueChoice: {
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
