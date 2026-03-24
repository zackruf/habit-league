import { Text } from 'react-native';

import { commonStyles } from '@/styles/commonStyles';
import { SurfaceCard } from './SurfaceCard';

export function LeaderboardNoticeCard({ title, message }: { title: string; message: string }) {
  return (
    <SurfaceCard style={commonStyles.noticeCard}>
      <Text style={commonStyles.noticeEyebrow}>{title}</Text>
      <Text style={commonStyles.noticeMessage}>{message}</Text>
    </SurfaceCard>
  );
}
