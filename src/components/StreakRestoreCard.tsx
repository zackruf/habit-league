import { Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceCard } from './SurfaceCard';

type StreakRestoreCardProps = {
  title: string;
  message: string;
  helper: string;
  actionLabel: string;
  onRestore: () => void;
  busy?: boolean;
};

export function StreakRestoreCard({ title, message, helper, actionLabel, onRestore, busy }: StreakRestoreCardProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <SurfaceCard style={commonStyles.noticeCard}>
      <Text style={commonStyles.noticeEyebrow}>{title}</Text>
      <Text style={commonStyles.noticeMessage}>{message}</Text>
      <Text style={commonStyles.smallMuted}>{helper}</Text>
      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label={busy ? 'Restoring...' : actionLabel} onPress={onRestore} disabled={busy} />
      </View>
    </SurfaceCard>
  );
}
