import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, multiline, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.muted}
        style={[styles.input, multiline ? styles.multiline : null, style]}
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
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
