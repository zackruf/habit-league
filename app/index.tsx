import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useApp } from '@/context/AppProvider';

export default function IndexScreen() {
  const { authReady, profile, session } = useApp();

  if (!authReady) {
    return <LoadingScreen message="Loading HabitLeague..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboardingCompleted) {
    return <Redirect href="/(app)/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)/dashboard" />;
}
