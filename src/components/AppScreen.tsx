import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  disableBottomPadding?: boolean;
}>;

export function AppScreen({ children, scrollable = false, contentContainerStyle, disableBottomPadding = false }: AppScreenProps) {
  const { theme } = useThemePreferences();
  const insets = useSafeAreaInsets();
  const bottomPadding = disableBottomPadding ? 0 : spacing.xl + insets.bottom + 28;

  if (scrollable) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }, contentContainerStyle]}
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.content, { paddingBottom: bottomPadding }, contentContainerStyle]}>{children}</View>
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
    gap: spacing.md,
  },
});
