import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { ThemeMode } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';

const reminderOptions = ['7:00 AM', '8:00 AM', '6:00 PM', '8:00 PM'];

export default function ProfileScreen() {
  const { busy, profile, saveProfile, signOut } = useApp();
  const {
    theme,
    themeMode,
    notificationsEnabled,
    reminderTime,
    setNotificationsEnabled,
    setReminderTime,
    setThemeMode,
  } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [goal, setGoal] = useState(String(profile?.weeklyGoal ?? 5));
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name);
    setUsername(profile.username);
    setBio(profile.bio);
    setGoal(String(profile.weeklyGoal));
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile?.name) {
      return 'HL';
    }

    return profile.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  if (!profile) {
    return null;
  }

  const currentProfile = profile;

  async function handleSave() {
    await saveProfile({
      name: name.trim() || currentProfile.name,
      username: normalizeUsername(username || name || currentProfile.username),
      bio,
      weeklyGoal: Number(goal) || 5,
      onboardingCompleted: true,
    });
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  function handleReminderCycle() {
    const currentIndex = reminderOptions.indexOf(reminderTime);
    const nextIndex = currentIndex === -1 || currentIndex === reminderOptions.length - 1 ? 0 : currentIndex + 1;
    setReminderTime(reminderOptions[nextIndex]);
  }

  return (
    <AppScreen scrollable>
      <View style={commonStyles.heroPanelAlt}>
        <Text style={commonStyles.eyebrow}>Profile & settings</Text>
        <Text style={commonStyles.pageTitle}>Manage your account</Text>
        <Text style={commonStyles.pageCopy}>
          Keep your public profile clean, control your theme, and adjust the little preferences that shape the app.
        </Text>
      </View>

      <SurfaceCard style={commonStyles.sectionCard}>
        <Text style={commonStyles.settingsSectionTitle}>Profile header</Text>
        <View style={commonStyles.avatarRow}>
          <View style={commonStyles.avatarCircle}>
            <Text style={commonStyles.avatarText}>{initials}</Text>
          </View>
          <View style={commonStyles.profileMeta}>
            <Text style={commonStyles.cardTitle}>{currentProfile.name}</Text>
            <Text style={commonStyles.usernameText}>@{currentProfile.username}</Text>
            <Text style={commonStyles.cardCopy}>{currentProfile.bio || 'Add a short bio so your league knows who you are.'}</Text>
          </View>
        </View>

        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />
        <TextField label="Weekly goal" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      </SurfaceCard>

      <SurfaceCard style={commonStyles.sectionCard}>
        <Text style={commonStyles.settingsSectionTitle}>Account</Text>
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Email</Text>
            <Text style={commonStyles.settingSubtitle}>{currentProfile.email}</Text>
          </View>
        </View>
        <PrimaryButton label={busy ? 'Saving...' : 'Save profile'} onPress={handleSave} disabled={busy} />
        <PrimaryButton label="Log out" onPress={handleSignOut} variant="ghost" />
      </SurfaceCard>

      <SurfaceCard style={commonStyles.sectionCard}>
        <Text style={commonStyles.settingsSectionTitle}>Preferences</Text>
        <View style={commonStyles.settingLabelWrap}>
          <Text style={commonStyles.settingTitle}>Theme</Text>
          <Text style={commonStyles.settingSubtitle}>Choose how Habit League should look on this device.</Text>
        </View>
        <View style={commonStyles.segmentedRow}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
            const active = themeMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
              >
                <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Notifications</Text>
            <Text style={commonStyles.settingSubtitle}>Local preference only for now. Real reminder delivery can come later.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={theme.colors.primaryText}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>

        <Pressable onPress={handleReminderCycle} style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Daily reminder time</Text>
            <Text style={commonStyles.settingSubtitle}>UI placeholder stored locally until full reminder support is added.</Text>
          </View>
          <Text style={commonStyles.usernameText}>{reminderTime}</Text>
        </Pressable>
      </SurfaceCard>

      <SurfaceCard style={commonStyles.sectionCard}>
        <Text style={commonStyles.settingsSectionTitle}>About & support</Text>
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>App version</Text>
            <Text style={commonStyles.settingSubtitle}>{version}</Text>
          </View>
        </View>
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Report a bug</Text>
            <Text style={commonStyles.settingSubtitle}>Placeholder row for support flow.</Text>
          </View>
        </View>
        <View style={commonStyles.settingRow}>
          <View style={commonStyles.settingLabelWrap}>
            <Text style={commonStyles.settingTitle}>Privacy</Text>
            <Text style={commonStyles.settingSubtitle}>Placeholder row for privacy details.</Text>
          </View>
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18);
}
