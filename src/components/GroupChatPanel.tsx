import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupMessage } from '@/types/models';
import { SurfaceCard } from './SurfaceCard';

export function GroupChatPanel({ groupId }: { groupId: string }) {
  const { getGroupMessages, profile, sendGroupMessage } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getGroupMessages(groupId).then(setMessages);
  }, [getGroupMessages, groupId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages]
  );

  async function handleSend() {
    if (!draft.trim()) {
      return;
    }

    setSending(true);
    const result = await sendGroupMessage(groupId, draft);
    if (result.ok) {
      setDraft('');
      const nextMessages = await getGroupMessages(groupId);
      setMessages(nextMessages);
    }
    setSending(false);
  }

  return (
    <View style={commonStyles.compactSection}>
      {sortedMessages.length ? (
        sortedMessages.map((message) => {
          const isMine = message.senderId === profile?.uid;

          return (
            <SurfaceCard
              key={message.id}
              style={[
                styles.messageCard,
                {
                  alignSelf: isMine ? 'flex-end' : 'stretch',
                  backgroundColor: isMine ? theme.colors.surfaceRaised : theme.colors.surface,
                  borderColor: isMine ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View style={styles.messageMeta}>
                <Text style={[commonStyles.settingTitle, { color: theme.colors.text }]}>{message.senderName}</Text>
                <Text style={commonStyles.smallMuted}>{formatChatTime(message.createdAt)}</Text>
              </View>
              <Text style={commonStyles.cardCopy}>{message.text}</Text>
            </SurfaceCard>
          );
        })
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No messages yet</Text>
          <Text style={commonStyles.cardCopy}>Be the first to set the tone for this week's challenge.</Text>
        </SurfaceCard>
      )}

      <SurfaceCard style={styles.composerCard}>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Send a quick challenge update"
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
          />
          <Pressable onPress={handleSend} disabled={sending} style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.sendLabel, { color: theme.colors.primaryText }]}>{sending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </SurfaceCard>
    </View>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  messageCard: {
    maxWidth: '88%',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  composerCard: {
    marginTop: spacing.xs,
  },
  composerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  sendButton: {
    minWidth: 84,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sendLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
