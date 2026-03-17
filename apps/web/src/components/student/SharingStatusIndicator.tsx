import { Monitor } from 'lucide-react';
import { VideoRenderer } from '@/components/media/VideoRenderer';
import { useMediaStore } from '@/stores/mediaStore';
import { motion } from 'framer-motion';

export function SharingStatusIndicator() {
  const localScreenTrack = useMediaStore((s) => s.localScreenTrack);

  if (!localScreenTrack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 rounded-xl bg-primary-500/10 border border-primary-500/20 px-4 py-2.5">
        <div className="relative">
          <Monitor className="h-4 w-4 text-primary-400" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
        </div>
        <span className="text-sm font-medium text-primary-300">You are sharing your screen</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-800 shadow-sm">
        <VideoRenderer track={localScreenTrack} className="h-28 w-full object-contain" />
      </div>
    </motion.div>
  );
}
