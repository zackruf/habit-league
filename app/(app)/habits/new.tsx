import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { getDefaultHabitTemplate, HABIT_TEMPLATES, HabitTemplate } from '@/lib/habitTemplates';
import { createCommonStyles } from '@/styles/commonStyles';

export default function CreateHabitScreen() {
  const { busy, createHabit } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const defaultTemplate = getDefaultHabitTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [title, setTitle] = useState(defaultTemplate.title);
  const [emoji, setEmoji] = useState(defaultTemplate.emoji);
  const [category, setCategory] = useState(defaultTemplate.category);

  function applyTemplate(template: HabitTemplate) {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setEmoji(template.emoji);
    setCategory(template.category);
  }

  async function handleCreate() {
    const result = await createHabit({ title, emoji, category });
    if (result.ok) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  return (
    <AppScreen scrollable>
      <Text style={commonStyles.eyebrow}>Create habit</Text>
      <Text style={commonStyles.pageTitle}>Add one habit to track daily</Text>
      <Text style={commonStyles.pageCopy}>Start from a proven template or customize it before saving.</Text>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Popular templates</Text>
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
        <Text style={commonStyles.cardTitle}>Customize habit</Text>
        <TextField label="Habit name" value={title} onChangeText={setTitle} placeholder="Morning walk" />
        <TextField label="Short label" value={emoji} onChangeText={setEmoji} placeholder="Fit" />
        <TextField label="Category" value={category} onChangeText={setCategory} placeholder="Health" />
        <PrimaryButton label={busy ? 'Creating...' : 'Create habit'} onPress={handleCreate} disabled={busy} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
