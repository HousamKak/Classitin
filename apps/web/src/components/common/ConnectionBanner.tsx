import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionBanner() {
  const { connectionState, reconnectAttempt } = useSocket();

  return (
    <AnimatePresence>
      {connectionState !== 'connected' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`overflow-hidden ${
            connectionState === 'reconnecting'
              ? 'bg-amber-500/15 border-b border-amber-500/20'
              : 'bg-red-500/15 border-b border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2">
            {connectionState === 'reconnecting' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span className="text-xs font-medium text-amber-300">
                  Reconnecting{reconnectAttempt > 1 ? ` (attempt ${reconnectAttempt})` : ''}...
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-300">
                  Connection lost. Please check your network.
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
