import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#8190A5',
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 0,
          height: 76,
          paddingTop: 10,
          paddingBottom: 12,
          elevation: 0,
          shadowColor: '#102033',
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
            dashboard: '▦',
            friends: '♡',
            groups: '◌',
            profile: '◐',
          };

          return (
            <Text style={{ color, fontSize: focused ? size + 2 : size, fontWeight: '900', lineHeight: size + 2 }}>
              {icons[route.name] ?? '●'}
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
