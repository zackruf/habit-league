import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { spacing } from '@/constants/theme';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails, GroupMessage } from '@/types/models';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroupDetails, getGroupMessages, sendGroupMessage, profile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    getGroupDetails(groupId).then(setDetails);
    getGroupMessages(groupId).then(setMessages);
  }, [getGroupDetails, getGroupMessages, groupId]);

  const myUserId = profile?.uid;
  const sortedMessages = useMemo(
    () => [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages]
  );

  if (!details) {
    return <LoadingScreen message="Loading group chat..." />;
  }

  async function handleSend() {
    if (!groupId || !draft.trim()) {
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <PageHeader
            eyebrow="Group chat"
            title={details.group.name}
            subtitle="Keep the momentum going with quick check-ins, nudges, and challenge talk."
          />

          <ScrollView contentContainerStyle={commonStyles.compactSection} showsVerticalScrollIndicator={false}>
            {sortedMessages.length ? (
              sortedMessages.map((message) => {
                const isMine = message.senderId === myUserId;

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
          </ScrollView>
        </View>

        <View style={[styles.composer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
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
          <Pressable
            onPress={handleSend}
            disabled={sending}
            style={[
              styles.sendButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text style={[styles.sendLabel, { color: theme.colors.primaryText }]}>{sending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  messageCard: {
    maxWidth: '86%',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
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
    minWidth: 72,
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
