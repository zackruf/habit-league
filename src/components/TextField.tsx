import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, multiline, style, ...props }: TextFieldProps) {
  const { theme } = useThemePreferences();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceAlt,
            color: theme.colors.text,
          },
          multiline ? styles.multiline : null,
          style,
        ]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
