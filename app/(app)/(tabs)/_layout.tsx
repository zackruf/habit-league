import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';

export default function TabsLayout() {
  const { theme } = useThemePreferences();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          elevation: 0,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: focused ? 18 : 10,
              height: 4,
              borderRadius: 999,
              backgroundColor: focused ? color : theme.colors.border,
            }}
          />
        ),
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
