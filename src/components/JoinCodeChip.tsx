import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';

type JoinCodeChipProps = {
  code: string;
};

export function JoinCodeChip({ code }: JoinCodeChipProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handlePress(event: GestureResponderEvent) {
    event.stopPropagation();
    await Clipboard.setStringAsync(code);
    setCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <Pressable
      accessibilityHint="Copies the group join code"
      accessibilityLabel={`Copy join code ${code}`}
      onPress={handlePress}
      style={[
        commonStyles.badgePill,
        styles.chip,
        copied
          ? {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
            }
          : {
              backgroundColor: theme.colors.badgeBackground,
              borderColor: theme.colors.border,
            },
      ]}
    >
      <Text style={[commonStyles.badgeText, copied ? { color: theme.colors.primaryText } : null]}>{copied ? 'Copied' : code}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
