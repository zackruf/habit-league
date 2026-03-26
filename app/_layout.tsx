import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/LoadingScreen';
import { AppProvider } from '@/context/AppProvider';
import { ThemeProvider, useThemePreferences } from '@/context/ThemeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppProvider fallback={<LoadingScreen message="Loading HabitLeague..." />}>
          <RootNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { theme } = useThemePreferences();

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
