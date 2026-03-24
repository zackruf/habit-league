import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
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
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
