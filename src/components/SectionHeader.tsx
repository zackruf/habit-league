import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { theme } = useThemePreferences();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
