import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { getDefaultHabitTemplate, HABIT_TEMPLATES, HabitTemplate } from '@/lib/habitTemplates';
import { createCommonStyles } from '@/styles/commonStyles';

export default function CreateHabitScreen() {
  const { busy, createHabit, groups } = useApp();
  const { groupId: routeGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const defaultTemplate = getDefaultHabitTemplate();
  const availableGroups = groups;
  const fallbackGroupId = routeGroupId && groups.some((group) => group.id === routeGroupId) ? routeGroupId : groups[0]?.id ?? '';
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [selectedGroupId, setSelectedGroupId] = useState(fallbackGroupId);
  const [title, setTitle] = useState(defaultTemplate.title);
  const [emoji, setEmoji] = useState(defaultTemplate.emoji);
  const [category, setCategory] = useState(defaultTemplate.category);
  const [description, setDescription] = useState(defaultTemplate.description);
  const [frequency, setFrequency] = useState('Daily');
  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) ?? null, [groups, selectedGroupId]);

  function applyTemplate(template: HabitTemplate) {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setEmoji(template.emoji);
    setCategory(template.category);
    setDescription(template.description);
  }

  async function handleCreate() {
    const result = await createHabit({ groupId: selectedGroupId, title, emoji, category, description, frequency });
    if (result.ok) {
      router.replace(selectedGroupId ? `/(app)/groups/${selectedGroupId}` : '/(app)/(tabs)/groups');
    }
  }

  if (!availableGroups.length) {
    return (
      <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
        <PageHeader
          eyebrow="Legacy tracker"
          title="Join a golf group before using legacy trackers"
          subtitle="Rivl is shifting toward golf groups, courses, and rounds first. This older flow still needs a group."
        />
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No golf groups yet</Text>
          <Text style={commonStyles.cardCopy}>Create or join a golf group first, then use this older tracker flow only if you still need it.</Text>
          <View style={commonStyles.actionRowTight}>
            <PrimaryButton label="Create group" onPress={() => router.push('/(app)/groups/new')} />
            <PrimaryButton label="Join group" onPress={() => router.push('/(app)/groups/join')} variant="secondary" />
          </View>
        </SurfaceCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
        <PageHeader
        eyebrow="Legacy tracker"
        title="Add a legacy competition tracker"
        subtitle="This older challenge flow is still available while Rivl pivots into course-based golf competition."
      />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Choose the golf group</Text>
        <View style={styles.groupGrid}>
          {availableGroups.map((group) => {
            const selected = group.id === selectedGroupId;
            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedGroupId(group.id)}
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={commonStyles.settingTitle}>{group.name}</Text>
                <Text style={commonStyles.smallMuted}>{group.visibility === 'public' ? 'Public golf group' : 'Private golf group'}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Competition templates</Text>
        <Text style={commonStyles.cardCopy}>Start with a golf-oriented format, then adapt it for your group.</Text>
        <View style={styles.templateGrid}>
          {HABIT_TEMPLATES.map((template) => {
            const selected = template.id === selectedTemplateId;

            return (
              <Pressable
                key={template.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => applyTemplate(template)}
                style={[
                  styles.templateCard,
                  {
                    backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.templateEmoji, { color: theme.colors.primary }]}>{template.emoji}</Text>
                <Text style={commonStyles.settingTitle}>{template.title}</Text>
                <Text style={commonStyles.smallMuted}>{template.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Customize legacy tracker</Text>
        <TextField label="Tracker name" value={title} onChangeText={setTitle} placeholder="Weekend 18" />
        <TextField label="Short label" value={emoji} onChangeText={setEmoji} placeholder="Fit" />
        <TextField label="Category" value={category} onChangeText={setCategory} placeholder="Health" />
        <TextField
          label="Challenge details"
          value={description}
          onChangeText={setDescription}
          placeholder="What should count for this older group competition tracker?"
          multiline
        />
        <TextField label="Frequency" value={frequency} onChangeText={setFrequency} placeholder="Daily" />
        <Text style={commonStyles.smallMuted}>
          {selectedGroup ? `This tracker will count toward ${selectedGroup.name}.` : 'Pick a golf group above to continue.'}
        </Text>
        <PrimaryButton label={busy ? 'Adding...' : 'Add legacy tracker'} onPress={handleCreate} disabled={busy || !selectedGroupId} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  groupGrid: {
    gap: spacing.sm,
  },
  groupCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateGrid: {
    gap: spacing.sm,
  },
  templateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateEmoji: {
    fontSize: 18,
    fontWeight: '900',
  },
});
