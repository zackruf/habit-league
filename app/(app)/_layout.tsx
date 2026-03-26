import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="habits/new" />
      <Stack.Screen name="groups/new" />
      <Stack.Screen name="groups/join" />
      <Stack.Screen name="groups/[groupId]/index" />
      <Stack.Screen name="groups/[groupId]/leaderboard" />
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
