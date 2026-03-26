import { Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { SurfaceCard } from './SurfaceCard';

export function MetricCard({ value, label, detail }: { value: string; label: string; detail?: string }) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <SurfaceCard style={commonStyles.metricCard}>
      <View style={commonStyles.metricHeader}>
        <Text style={commonStyles.metricValue}>{value}</Text>
        <Text style={commonStyles.metricLabel}>{label}</Text>
      </View>
      {detail ? <Text style={commonStyles.metricDetail}>{detail}</Text> : null}
    </SurfaceCard>
  );
}
