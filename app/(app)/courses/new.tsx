import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { CourseSearchResult } from '@/lib/courseProviders';

export default function CreateCourseScreen() {
  const { busy, createCourse, groups, searchCourses } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseSearchResult | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('USA');
  const [par, setPar] = useState('72');
  const [holesCount, setHolesCount] = useState('18');
  const selectedGroup = useMemo(() => groups.find((group) => group.id === groupId) ?? null, [groupId, groups]);

  useEffect(() => {
    searchCourses('').then(setSearchResults);
  }, [searchCourses]);

  function applySelectedCourse(course: CourseSearchResult) {
    setSelectedCourse(course);
    setName(course.name);
    setLocation(course.location);
    setCity(course.city);
    setStateName(course.state);
    setCountry(course.country);
    setPar(`${course.par}`);
    setHolesCount(`${course.holesCount}`);
  }

  async function handleSearch() {
    const results = await searchCourses(searchTerm);
    setSearchResults(results);
    if (results.length === 1) {
      applySelectedCourse(results[0]);
    }
  }

  async function handleCreate() {
    const result = await createCourse({
      groupId,
      sourceId: selectedCourse?.sourceId,
      sourceProvider: selectedCourse?.sourceProvider,
      name,
      location,
      city,
      state: stateName,
      country,
      holesCount: Number(holesCount) || 18,
      par: Number(par) || 72,
      latitude: selectedCourse?.latitude ?? null,
      longitude: selectedCourse?.longitude ?? null,
      tees: selectedCourse?.tees ?? [],
      holes: selectedCourse?.holes ?? [],
    });

    if (result.ok) {
      router.replace('/(app)/(tabs)/courses');
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Course setup"
        title="Add a real golf course"
        subtitle="Search the catalog first, confirm the scorecard, then save that course to a golf group so rounds and leaderboards stay anchored to the same place."
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
        <Text style={commonStyles.cardTitle}>Search courses</Text>
        <TextField label="Course or city" value={searchTerm} onChangeText={setSearchTerm} placeholder="Riverview, Hartford, Willow Creek..." />
        <View style={commonStyles.actionRowTight}>
          <PrimaryButton label="Search catalog" onPress={handleSearch} />
          <PrimaryButton
            label="Manual entry"
            onPress={() => {
              setSelectedCourse(null);
              setSearchResults([]);
            }}
            variant="secondary"
          />
        </View>

        <View style={commonStyles.compactSection}>
          {searchResults.length ? (
            searchResults.map((course) => {
              const selected = selectedCourse?.sourceId === course.sourceId;
              return (
                <Pressable
                  key={course.sourceId}
                  onPress={() => applySelectedCourse(course)}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surfaceAlt,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={commonStyles.settingTitle}>{course.name}</Text>
                  <Text style={commonStyles.smallMuted}>
                    {course.location} / {course.holesCount} holes / Par {course.par}
                  </Text>
                  <Text style={commonStyles.smallMuted}>
                    {course.tees.length} tee options / {course.sourceProvider === 'mock' ? 'Catalog preview' : course.sourceProvider}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={commonStyles.cardCopy}>Search the mock catalog now. A live provider can plug into the same search layer later.</Text>
          )}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>Course details</Text>
        {selectedCourse ? (
          <View style={commonStyles.compactSection}>
            <Text style={commonStyles.cardCopy}>
              {selectedCourse.par} par / {selectedCourse.holesCount} holes / {selectedCourse.tees.map((tee) => tee.name).join(', ')}
            </Text>
            <Text style={commonStyles.smallMuted}>
              Save this course as-is, or adjust any field below if you need to complete or correct the scorecard.
            </Text>
          </View>
        ) : null}
        <TextField label="Course name" value={name} onChangeText={setName} placeholder="Riverview Municipal" />
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Hartford, CT" />
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <TextField label="City" value={city} onChangeText={setCity} placeholder="Hartford" />
          </View>
          <View style={styles.metaCell}>
            <TextField label="State" value={stateName} onChangeText={setStateName} placeholder="CT" />
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <TextField label="Country" value={country} onChangeText={setCountry} placeholder="USA" />
          </View>
          <View style={styles.metaCell}>
            <TextField label="Holes" value={holesCount} onChangeText={setHolesCount} keyboardType="number-pad" placeholder="18" />
          </View>
        </View>
        <TextField label="Par" value={par} onChangeText={setPar} keyboardType="number-pad" placeholder="72" />
        <Text style={commonStyles.smallMuted}>
          {selectedGroup ? `This course will be saved into ${selectedGroup.name}.` : 'Choose a group above to continue.'}
        </Text>
        <PrimaryButton label={busy ? 'Saving course...' : 'Save course to group'} onPress={handleCreate} disabled={busy || !groupId || !name.trim()} />
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
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaCell: {
    flex: 1,
  },
});
