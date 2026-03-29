import { Pressable, Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { Group } from '@/types/models';
import { JoinCodeChip } from './JoinCodeChip';
import { SurfaceCard } from './SurfaceCard';

type GroupSummaryCardProps = {
  group: Group;
  memberCount: number;
  onEdit?: () => void;
};

export function GroupSummaryCard({ group, memberCount, onEdit }: GroupSummaryCardProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const memberLabel = group.memberLimit ? `${memberCount}/${group.memberLimit} members` : `${memberCount} members`;
  const gearLabel = '\u2699';
  const visibilityLabel = group.visibility === 'public' ? 'Public group' : 'Private group';
  const stakesLine = group.stakesEnabled && group.stakesText ? `Consequence: ${group.stakesText}` : null;

  return (
    <SurfaceCard style={commonStyles.sectionCard}>
      <View style={commonStyles.rowBetween}>
        <View style={commonStyles.summaryMetaBlock}>
          <Text style={commonStyles.cardTitle}>{visibilityLabel}</Text>
          <Text style={commonStyles.smallMuted}>{memberLabel}</Text>
        </View>

        <View style={commonStyles.summaryActionRow}>
          <JoinCodeChip code={group.joinCode} />
          {onEdit ? (
            <Pressable accessibilityHint="Edit this group" accessibilityLabel="Edit group" onPress={onEdit} style={commonStyles.iconButton}>
              <Text style={commonStyles.iconButtonLabel}>{gearLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {stakesLine ? <Text style={commonStyles.cardCopy}>{stakesLine}</Text> : null}
    </SurfaceCard>
  );
}
