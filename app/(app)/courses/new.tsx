import { router } from 'expo-router';
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
import { createCommonStyles } from '@/styles/commonStyles';

export default function CreateCourseScreen() {
  const { busy, createCourse, groups } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [teeName, setTeeName] = useState('Blue tees');
  const [par, setPar] = useState('72');
  const selectedGroup = useMemo(() => groups.find((group) => group.id === groupId) ?? null, [groupId, groups]);

  async function handleCreate() {
    const result = await createCourse({
      groupId,
      name,
      location,
      teeName,
      par: Number(par) || 72,
    });

    if (result.ok) {
      router.replace('/(app)/(tabs)/courses');
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Course setup"
        title="Add a golf course"
        subtitle="Start a shared course record for the group so rounds, personal bests, and leaderboards have one place to live."
      />

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Pick the golf group</Text>
        <View style={styles.optionStack}>
          {groups.map((group) => {
            const selected = group.id === groupId;
            return (
              <Pressable
                key={group.id}
                onPress={() => setGroupId(group.id)}
                style={[
                  styles.optionCard,
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
        <Text style={commonStyles.cardTitle}>Course details</Text>
        <TextField label="Course name" value={name} onChangeText={setName} placeholder="Riverview Municipal" />
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Hartford, CT" />
        <TextField label="Tee set" value={teeName} onChangeText={setTeeName} placeholder="Blue tees" />
        <TextField label="Par" value={par} onChangeText={setPar} keyboardType="number-pad" placeholder="72" />
        <Text style={commonStyles.smallMuted}>
          {selectedGroup ? `This course will first belong to ${selectedGroup.name}.` : 'Choose a group above to continue.'}
        </Text>
        <PrimaryButton label={busy ? 'Adding course...' : 'Add course'} onPress={handleCreate} disabled={busy || !groupId} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  optionStack: {
    gap: spacing.sm,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
