import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/LoadingScreen';
import { palette } from '@/constants/theme';
import { AppProvider } from '@/context/AppProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider fallback={<LoadingScreen message="Loading HabitLeague..." />}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
