import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AppTheme, getAppTheme, ResolvedThemeMode, ThemeMode } from '@/constants/theme';

type ThemePreferencesContextValue = {
  themeMode: ThemeMode;
  resolvedThemeMode: ResolvedThemeMode;
  theme: AppTheme;
  notificationsEnabled: boolean;
  reminderTime: string;
  setThemeMode: (mode: ThemeMode) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (value: string) => void;
};

const STORAGE_KEY = 'habitleague:preferences';

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('8:00 PM');

  useEffect(() => {
    async function loadPreferences() {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const preferences = JSON.parse(raw) as {
        themeMode?: ThemeMode;
        notificationsEnabled?: boolean;
        reminderTime?: string;
      };

      if (preferences.themeMode) {
        setThemeMode(preferences.themeMode);
      }

      if (typeof preferences.notificationsEnabled === 'boolean') {
        setNotificationsEnabled(preferences.notificationsEnabled);
      }

      if (preferences.reminderTime) {
        setReminderTime(preferences.reminderTime);
      }
    }

    loadPreferences();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        themeMode,
        notificationsEnabled,
        reminderTime,
      })
    );
  }, [themeMode, notificationsEnabled, reminderTime]);

  const resolvedThemeMode: ResolvedThemeMode =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  const value = useMemo<ThemePreferencesContextValue>(
    () => ({
      themeMode,
      resolvedThemeMode,
      theme: getAppTheme(resolvedThemeMode),
      notificationsEnabled,
      reminderTime,
      setThemeMode,
      setNotificationsEnabled,
      setReminderTime,
    }),
    [themeMode, resolvedThemeMode, notificationsEnabled, reminderTime]
  );

  return <ThemePreferencesContext.Provider value={value}>{children}</ThemePreferencesContext.Provider>;
}

export function useThemePreferences() {
  const context = useContext(ThemePreferencesContext);

  if (!context) {
    throw new Error('useThemePreferences must be used inside ThemeProvider');
  }

  return context;
}
