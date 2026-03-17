import { X, Maximize2, Camera } from 'lucide-react';
import { VideoRenderer } from '@/components/media/VideoRenderer';
import { useMediaStore } from '@/stores/mediaStore';
import { Avatar } from '@/components/common/Avatar';
import { captureScreenshot } from '@/utils/screenshot';
import { motion } from 'framer-motion';

interface StudentFocusViewProps {
  userId: string;
  displayName: string;
  onClose: () => void;
}

export function StudentFocusView({ userId, displayName, onClose }: StudentFocusViewProps) {
  const consumers = useMediaStore((s) => s.consumers);

  let track: MediaStreamTrack | null = null;
  for (const info of consumers.values()) {
    if (info.userId === userId && info.kind === 'video') {
      track = info.track;
      break;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl shadow-black/50"
    >
      {/* Header overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-3.5 w-3.5 text-white/70" />
          <span className="text-sm font-semibold text-white">{displayName}</span>
          <span className="rounded bg-primary-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            HD View
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {track && (
            <button
              onClick={() => captureScreenshot(track, displayName)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              title="Capture screenshot"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Video */}
      {track ? (
        <VideoRenderer track={track} className="w-full object-contain" />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3">
          <Avatar name={displayName} size="lg" />
          <p className="text-sm text-gray-500">Not sharing screen</p>
        </div>
      )}
    </motion.div>
  );
}
