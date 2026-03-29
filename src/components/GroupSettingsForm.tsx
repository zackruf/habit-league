import { Pressable, Switch, Text, View } from 'react-native';

import { GroupSettingsInput } from '@/types/models';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { PrimaryButton } from './PrimaryButton';
import { SectionHeader } from './SectionHeader';
import { SurfaceCard } from './SurfaceCard';
import { TextField } from './TextField';

type GroupSettingsFormProps = {
  values: GroupSettingsInput;
  onChange: (patch: Partial<GroupSettingsInput>) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
};

export function GroupSettingsForm({ values, onChange, onSubmit, submitLabel, busy }: GroupSettingsFormProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <SurfaceCard style={commonStyles.sectionCard}>
      <SectionHeader title="Group settings" />
      <TextField label="Group name" value={values.name} onChangeText={(value) => onChange({ name: value })} placeholder="Office Wellness" />
      <TextField
        label="Short description"
        value={values.description}
        onChangeText={(value) => onChange({ description: value })}
        multiline
        placeholder="A friendly weekly leaderboard for our team."
      />

      <View style={commonStyles.divider} />
      <View style={commonStyles.settingLabelWrap}>
        <Text style={commonStyles.settingTitle}>Visibility</Text>
      <Text style={commonStyles.settingSubtitle}>
          Private groups stay code-based. Public groups are marked discoverable for future browse features.
        </Text>
      </View>
      <View style={commonStyles.segmentedRow}>
        {(['private', 'public'] as const).map((option) => {
          const active = values.visibility === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange({ visibility: option })}
              style={[commonStyles.segmentedButton, active ? commonStyles.segmentedButtonActive : null]}
            >
              <Text style={[commonStyles.segmentedLabel, active ? commonStyles.segmentedLabelActive : null]}>
                {option[0].toUpperCase() + option.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={commonStyles.divider} />
      <View style={commonStyles.settingRow}>
        <View style={commonStyles.settingLabelWrap}>
          <Text style={commonStyles.settingTitle}>Stakes Mode</Text>
          <Text style={commonStyles.settingSubtitle}>Keep it in the accountability lane only. Example: "Last place buys coffee."</Text>
        </View>
        <Switch
          value={values.stakesEnabled}
          onValueChange={(value) => onChange({ stakesEnabled: value, stakesText: value ? values.stakesText : '' })}
          thumbColor={theme.colors.primaryText}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>

      {values.stakesEnabled ? (
        <TextField
          label="Consequence message"
          value={values.stakesText}
          onChangeText={(value) => onChange({ stakesText: value })}
          placeholder="Loser buys coffee"
        />
      ) : null}

      <View style={commonStyles.divider} />
      <TextField
        label="Member limit (optional)"
        value={values.memberLimit ? String(values.memberLimit) : ''}
        onChangeText={(value) => {
          const parsed = Number(value);
          onChange({
            memberLimit: value.trim() && Number.isFinite(parsed) ? parsed : null,
          });
        }}
        keyboardType="number-pad"
        placeholder="12"
      />

      <PrimaryButton label={busy ? 'Saving...' : submitLabel} onPress={onSubmit} disabled={busy} />
    </SurfaceCard>
  );
}
