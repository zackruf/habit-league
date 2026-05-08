import { Text } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { SurfaceCard } from './SurfaceCard';

export function LeaderboardNoticeCard({ title, message }: { title: string; message: string }) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <SurfaceCard style={commonStyles.noticeCard}>
      <Text style={commonStyles.noticeEyebrow}>{title}</Text>
      <Text style={commonStyles.noticeMessage}>{message}</Text>
    </SurfaceCard>
  );
}
