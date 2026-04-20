import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';
import { formatFriendlyDate } from '@/lib/date';
import { commonStyles } from '@/styles/commonStyles';
import { Habit } from '@/types/models';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceCard } from './SurfaceCard';

type HabitCardProps = {
  habit: Habit;
  onToggle: () => void;
  onAddProof?: (proofUri: string) => Promise<void> | void;
};

export function HabitCard({ habit, onToggle, onAddProof }: HabitCardProps) {
  const todayKey = formatFriendlyDate(new Date(), 'key');
  const checkedToday = habit.checkIns.includes(todayKey);
  const proofUri = habit.proofs?.[todayKey];
  const hasProofToday = Boolean(proofUri);
  const [picking, setPicking] = useState(false);

  async function handleAddProof() {
    if (!onAddProof || picking) {
      return;
    }

    try {
      setPicking(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to add a proof photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await onAddProof(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Could not attach proof', 'Please try again in a moment.');
    } finally {
      setPicking(false);
    }
  }

  return (
    <SurfaceCard>
      <View style={commonStyles.rowBetween}>
        <View style={commonStyles.cardCopyBlock}>
          <Text style={commonStyles.cardTitle}>
            {habit.emoji} {habit.title}
          </Text>
          <Text style={commonStyles.cardCopy}>{habit.category}</Text>
        </View>
        <PrimaryButton
          label={checkedToday ? 'Checked in' : 'Check in'}
          onPress={onToggle}
          variant={checkedToday ? 'secondary' : 'primary'}
        />
      </View>

      {checkedToday && onAddProof ? (
        <View style={styles.proofBlock}>
          {hasProofToday && proofUri ? (
            <View style={styles.proofRow}>
              <Image source={{ uri: proofUri }} style={styles.proofThumb} />
              <View style={styles.proofMeta}>
                <Text style={styles.proofBadge}>Verified</Text>
                <Text style={commonStyles.smallMuted}>Proof attached for today.</Text>
              </View>
            </View>
          ) : (
            <PrimaryButton
              label={picking ? 'Opening...' : 'Add proof photo'}
              onPress={handleAddProof}
              variant="ghost"
              disabled={picking}
            />
          )}
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  proofBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  proofThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
  },
  proofMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  proofBadge: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
