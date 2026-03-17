import { useState, useRef, useEffect } from 'react';
import { Send, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';

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
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleAnnounce = () => {
    if (!text.trim()) return;
    onSend(text, true);
    setText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-200">Chat</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-600 py-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === user?.id;

          if (msg.isAnnouncement) {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-primary-500/10 border border-primary-500/20 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Megaphone className="h-3 w-3 text-primary-400" />
                  <span className="text-[10px] font-bold uppercase text-primary-400">Announcement</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-sm text-primary-200">{msg.text}</p>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span className="text-[10px] font-medium text-gray-500">
                  {isMe ? 'You' : msg.displayName}
                </span>
                {msg.role === 'TEACHER' && !isMe && (
                  <span className="text-[9px] font-bold uppercase text-primary-400">Teacher</span>
                )}
                <span className="text-[10px] text-gray-700">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                isMe
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-gray-800 text-gray-200 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-800 p-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-600"
        />
        {isTeacher && text.trim() && (
          <button
            type="button"
            onClick={handleAnnounce}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors"
            title="Send as announcement"
          >
            <Megaphone className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-30 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
