import { ActivityIndicator, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { commonStyles } from '@/styles/commonStyles';
import { AppScreen } from './AppScreen';

export function LoadingScreen({ message }: { message: string }) {
  return (
    <AppScreen>
      <View style={commonStyles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={commonStyles.pageCopy}>{message}</Text>
      </View>
    </AppScreen>
  );
}
