import { Volume2, Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioIndicatorProps {
  isBroadcasting: boolean;
  inPrivateCall: boolean;
  callerName?: string;
  onEndCall?: () => void;
}

export function AudioIndicator({
  isBroadcasting,
  inPrivateCall,
  callerName,
  onEndCall,
}: AudioIndicatorProps) {
  return (
    <AnimatePresence>
      {isBroadcasting && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-2 rounded-xl bg-primary-500/10 border border-primary-500/20 px-4 py-2.5"
        >
          <Volume2 className="h-4 w-4 text-primary-400 animate-pulse" />
          <span className="text-sm font-medium text-primary-300">Teacher is speaking</span>
        </motion.div>
      )}

      {inPrivateCall && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5"
        >
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">
              Private call with {callerName || 'Teacher'}
            </span>
          </div>
          {onEndCall && (
            <button
              onClick={onEndCall}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
            >
              <PhoneOff className="h-3 w-3" />
              End
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
