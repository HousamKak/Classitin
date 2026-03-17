import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/services/socket';

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  role: string;
  text: string;
  isAnnouncement: boolean;
  timestamp: number;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const handleMessage = (payload: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, payload.message]);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [sessionId, isOpen]);

  const sendMessage = useCallback((text: string, isAnnouncement = false) => {
    if (!sessionId || !text.trim()) return;
    try {
      const socket = getSocket();
      socket.emit('chat:send', { sessionId, text, isAnnouncement });
    } catch {
      // Socket not connected
    }
  }, [sessionId]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
  }, []);

  return { messages, unreadCount, isOpen, sendMessage, toggleOpen, clearMessages };
}
