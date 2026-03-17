import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '@/theme';

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  role: string;
  text: string;
  isAnnouncement: boolean;
  timestamp: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string, isAnnouncement?: boolean) => void;
  onClose: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleAnnounce = () => {
    if (!text.trim()) return;
    onSend(text, true);
    setText('');
  };

  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const isMe = msg.userId === user?.id;

    if (msg.isAnnouncement) {
      return (
        <View style={styles.announcementBubble}>
          <View style={styles.announcementHeader}>
            <Text style={styles.announcementLabel}>ANNOUNCEMENT</Text>
            <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
          </View>
          <Text style={styles.announcementText}>{msg.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowRight]}>
        <View style={styles.messageMeta}>
          <Text style={styles.messageSender}>
            {isMe ? 'You' : msg.displayName}
          </Text>
          {msg.role === 'TEACHER' && !isMe && (
            <Text style={styles.teacherBadge}>Teacher</Text>
          )}
          <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
        </View>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMine : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, isMe && styles.messageTextMine]}>{msg.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.gray[500]}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        {isTeacher && text.trim() ? (
          <TouchableOpacity style={styles.announceBtn} onPress={handleAnnounce} activeOpacity={0.7}>
            <Text style={styles.announceBtnText}>!</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.gray[200],
  },
  closeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[400],
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.gray[600],
    fontSize: fontSize.sm,
  },
  messageRow: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  messageRowRight: {
    alignItems: 'flex-end',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
    paddingHorizontal: spacing.xs,
  },
  messageSender: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray[500],
  },
  teacherBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary[400],
    textTransform: 'uppercase',
  },
  messageTime: {
    fontSize: 10,
    color: colors.gray[600],
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.gray[800],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.gray[200],
  },
  messageTextMine: {
    color: colors.white,
  },
  announcementBubble: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  announcementLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary[400],
    letterSpacing: 1,
  },
  announcementText: {
    fontSize: fontSize.sm,
    color: colors.primary[300],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.gray[700],
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray[200],
  },
  announceBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary[400],
  },
  sendButton: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
});
