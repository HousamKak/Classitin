import { VideoRenderer } from '@/components/media/VideoRenderer';
import { Avatar } from '@/components/common/Avatar';
import type { PresenceStatus } from '@classitin/shared';
import { Expand, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentThumbnailProps {
  userId: string;
  displayName: string;
  status: PresenceStatus;
  isSharing: boolean;
  track: MediaStreamTrack | null;
  onClick: () => void;
}

export function StudentThumbnail({
  displayName,
  status,
  isSharing,
  track,
  onClick,
}: StudentThumbnailProps) {
  const needsHelp = status === 'NEEDS_HELP';
  const isOffline = status === 'OFFLINE' || status === 'IDLE';
  const statusColor = needsHelp ? 'bg-amber-500' : status === 'ONLINE' ? 'bg-emerald-500' : 'bg-gray-600';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${displayName}, ${status.toLowerCase().replace('_', ' ')}${isSharing ? ', sharing screen' : ''}. Click to enlarge.`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${
        needsHelp
          ? 'border-amber-500/40 bg-amber-500/5 shadow-md shadow-amber-500/10 animate-help-pulse'
          : 'border-gray-800 bg-gray-900 shadow-sm hover:shadow-lg hover:shadow-black/30 hover:border-gray-700'
      } ${isOffline ? 'opacity-50 grayscale-[30%]' : ''}`}
    >
      {/* Video / Avatar area */}
      <div className="relative aspect-[4/3] w-full bg-gray-900">
        {track ? (
          <>
            <VideoRenderer track={track} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-white">
                <Expand className="h-4 w-4" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full h-full items-center justify-center">
            <Avatar name={displayName} size="lg" />
          </div>
        )}

        {/* Live indicator — only when not needing help */}
        {isSharing && !needsHelp && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" />
              Live
            </span>
          </div>
        )}

        {/* Needs help indicator — takes priority */}
        {needsHelp && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
              <AlertCircle className="h-3 w-3" />
              Help
            </span>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-1.5 w-1.5 rounded-full ${statusColor} shrink-0`} />
        <span className="text-xs font-medium text-gray-300 truncate">{displayName}</span>
      </div>
    </motion.div>
  );
}
