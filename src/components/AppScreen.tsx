import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, scrollable = false, contentContainerStyle }: AppScreenProps) {
  const { theme } = useThemePreferences();

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
