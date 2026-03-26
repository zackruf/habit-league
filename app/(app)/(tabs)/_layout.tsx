import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';

export default function TabsLayout() {
  const { theme } = useThemePreferences();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          height: 76,
          paddingTop: 10,
          paddingBottom: 12,
          elevation: 0,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            dashboard: 'D',
            friends: 'F',
            groups: 'G',
            profile: 'P',
          };

          return (
            <Text style={{ color, fontSize: focused ? size + 2 : size, fontWeight: '900', lineHeight: size + 2 }}>
              {icons[route.name] ?? '.'}
            </Text>
          );
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
