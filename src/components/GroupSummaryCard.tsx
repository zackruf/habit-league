import { Pressable, Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { Group } from '@/types/models';
import { SectionHeader } from './SectionHeader';
import { SurfaceCard } from './SurfaceCard';

type GroupSummaryCardProps = {
  group: Group;
  memberCount: number;
  onEdit?: () => void;
  latestChatPreview?: string | null;
};

export function GroupSummaryCard({ group, memberCount, onEdit, latestChatPreview }: GroupSummaryCardProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const memberLabel = group.memberLimit ? `${memberCount}/${group.memberLimit} members` : `${memberCount} members`;
  const gearLabel = '\u2699';

  return (
    <SurfaceCard style={commonStyles.sectionCard}>
      <SectionHeader
        title="Summary"
        action={
          onEdit ? (
            <Pressable accessibilityHint="Edit this group" accessibilityLabel="Edit group" onPress={onEdit} style={commonStyles.iconButton}>
              <Text style={commonStyles.iconButtonLabel}>{gearLabel}</Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={commonStyles.chipRow}>
        <View style={commonStyles.subtleChip}>
          <Text style={commonStyles.subtleChipText}>{group.visibility === 'public' ? 'Public' : 'Private'}</Text>
        </View>
        <View style={commonStyles.subtleChip}>
          <Text style={commonStyles.subtleChipText}>{group.joinCode}</Text>
        </View>
        <View style={commonStyles.subtleChip}>
          <Text style={commonStyles.subtleChipText}>{memberLabel}</Text>
        </View>
        <View style={commonStyles.subtleChip}>
          <Text style={commonStyles.subtleChipText}>{group.stakesEnabled ? 'Stakes on' : 'Stakes off'}</Text>
        </View>
      </View>

      {group.stakesEnabled && group.stakesText ? <Text style={commonStyles.cardCopy}>{group.stakesText}</Text> : null}
      {latestChatPreview ? <Text style={commonStyles.smallMuted}>Latest chat: {latestChatPreview}</Text> : null}
    </SurfaceCard>
  );
}
