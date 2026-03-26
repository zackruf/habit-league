import { ActivityIndicator, Text, View } from 'react-native';

import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { AppScreen } from './AppScreen';

export function LoadingScreen({ message }: { message: string }) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <AppScreen>
      <View style={commonStyles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={commonStyles.pageCopy}>{message}</Text>
      </View>
    </AppScreen>
  );
}
