import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { ActivityItem, ActivityShoutoutType } from '@/types/models';
import { SurfaceCard } from '@/components/SurfaceCard';

const shoutoutOptions: { type: ActivityShoutoutType; label: string }[] = [
  { type: 'keep_going', label: 'Keep going' },
  { type: 'on_fire', label: 'On fire' },
  { type: 'nice_work', label: 'Nice work' },
];

type ActivityFeedProps = {
  activities: ActivityItem[];
  currentUserId?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onShoutout?: (activityId: string, shoutoutType: ActivityShoutoutType) => void;
};

export function ActivityFeed({
  activities,
  currentUserId,
  emptyTitle = 'No activity yet',
  emptyMessage = 'Check-ins, rank moves, and new connections will appear here.',
  onShoutout,
}: ActivityFeedProps) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  if (!activities.length) {
    return (
      <SurfaceCard>
        <Text style={commonStyles.cardTitle}>{emptyTitle}</Text>
        <Text style={commonStyles.cardCopy}>{emptyMessage}</Text>
      </SurfaceCard>
    );
  }

  return (
    <View style={commonStyles.compactSection}>
      {activities.map((activity) => (
        <SurfaceCard key={activity.id} style={styles.activityCard}>
          <View style={commonStyles.listRow}>
            <View style={commonStyles.listRowMeta}>
              <Text style={commonStyles.listRowTitle}>{activity.summary}</Text>
              <Text style={commonStyles.listRowSubtitle}>{buildContextLine(activity)}</Text>
            </View>
            <Text style={commonStyles.smallMuted}>{formatRelativeTime(activity.createdAt)}</Text>
          </View>

          {onShoutout ? (
            <View style={commonStyles.chipRow}>
              {shoutoutOptions.map((option) => {
                const users = activity.shoutouts[option.type] ?? [];
                const count = users.length;
                const alreadySent = Boolean(currentUserId && users.includes(currentUserId));

                return (
                  <Pressable
                    accessibilityLabel={`${option.label} shoutout`}
                    disabled={alreadySent}
                    key={option.type}
                    onPress={() => onShoutout(activity.id, option.type)}
                    style={({ pressed }) => [
                      commonStyles.subtleChip,
                      alreadySent ? { backgroundColor: theme.colors.badgeBackground, borderColor: theme.colors.currentUserBorder } : null,
                      pressed && !alreadySent ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[commonStyles.subtleChipText, alreadySent ? { color: theme.colors.primary } : null]}>
                      {option.label}
                      {count ? ` ${count}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </SurfaceCard>
      ))}
    </View>
  );
}

function buildContextLine(activity: ActivityItem) {
  const parts = [activity.groupName, activity.habitTitle].filter(Boolean);
  if (activity.type === 'connection' && activity.targetUserName) {
    parts.push(`with ${activity.targetUserName}`);
  }

  return parts.length ? parts.join(' / ') : 'Social activity';
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));

  if (diffMinutes < 1) {
    return 'now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

const styles = StyleSheet.create({
  activityCard: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
