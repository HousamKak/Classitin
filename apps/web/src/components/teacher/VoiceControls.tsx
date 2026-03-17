import { Megaphone, MicOff, Mic, Phone, PhoneOff } from 'lucide-react';
import type { VoiceMode } from '@/hooks/useAudio';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceControlsProps {
  voiceMode: VoiceMode;
  isMuted: boolean;
  privateCallUserId: string | null;
  privateCallName?: string;
  onStartBroadcast: () => void;
  onStartPrivateCall: (userId: string) => void;
  onStop: () => void;
  onToggleMute: () => void;
}

export function VoiceControls({
  voiceMode,
  isMuted,
  privateCallName,
  onStartBroadcast,
  onStop,
  onToggleMute,
}: VoiceControlsProps) {
  if (voiceMode === 'broadcast') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-primary-500/15 px-3 py-1.5">
          <Megaphone className="h-3.5 w-3.5 text-primary-400" />
          <span className="text-xs font-semibold text-primary-300">Broadcasting</span>
        </div>
        <button
          onClick={onToggleMute}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
            isMuted
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={onStop}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
          title="Stop broadcasting"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  if (voiceMode === 'private') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5">
          <Phone className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            {privateCallName ? `Call with ${privateCallName}` : 'Private call'}
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
            isMuted
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={onStop}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
          title="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  // Off state — show broadcast button
  return (
    <button
      onClick={onStartBroadcast}
      className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      title="Broadcast voice to all students"
    >
      <Megaphone className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Announce</span>
    </button>
  );
}
