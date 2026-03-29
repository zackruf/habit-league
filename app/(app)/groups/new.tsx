import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';

export default function CreateGroupScreen() {
  const { busy, createGroup } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [stakesEnabled, setStakesEnabled] = useState(false);
  const [stakesText, setStakesText] = useState('');
  const [memberLimit, setMemberLimit] = useState('');

  async function handleCreate() {
    const parsedLimit = Number(memberLimit);
    const nextMemberLimit = memberLimit.trim() && Number.isFinite(parsedLimit) ? parsedLimit : null;
    const result = await createGroup({
      name,
      description,
      visibility,
      stakesEnabled,
      stakesText,
      memberLimit: nextMemberLimit,
    });
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

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Basics" />
        <TextField label="Group name" value={name} onChangeText={setName} placeholder="Office Wellness" />
        <TextField
          label="Short description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="A friendly weekly leaderboard for our team."
        />
      </SurfaceCard>

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Visibility" />
        <Text style={commonStyles.settingSubtitle}>
          Private groups stay invite-only through a join code. Public groups are marked discoverable for future browse features.
        </Text>
        <View style={commonStyles.segmentedRow}>
          {(['private', 'public'] as const).map((option) => {
            const active = visibility === option;
            return (
              <Pressable
                key={option}
                onPress={() => setVisibility(option)}
                style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
              >
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {option[0].toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Challenge settings" />
        <View style={commonStyles.segmentedRow}>
          {[
            { value: false, label: 'Stakes off' },
            { value: true, label: 'Stakes on' },
          ].map((option) => {
            const active = stakesEnabled === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => setStakesEnabled(option.value)}
                style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
              >
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={commonStyles.settingSubtitle}>
          Keep this in the accountability lane only. Example: "Last place buys coffee."
        </Text>
        {stakesEnabled ? (
          <TextField
            label="Consequence message"
            value={stakesText}
            onChangeText={setStakesText}
            placeholder="Loser buys coffee"
          />
        ) : null}
        <TextField
          label="Member limit (optional)"
          value={memberLimit}
          onChangeText={setMemberLimit}
          keyboardType="number-pad"
          placeholder="12"
        />
        <PrimaryButton label={busy ? 'Creating...' : 'Create group'} onPress={handleCreate} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}
