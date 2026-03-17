import { Play, Square } from 'lucide-react';
import type { Session } from '@classitin/shared';

interface SessionControlsProps {
  session: Session | null;
  onStart: () => void;
  onEnd: () => void;
}

export function SessionControls({ session, onStart, onEnd }: SessionControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {session?.status === 'ACTIVE' ? (
        <>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400">Live</span>
          </div>
          <button
            onClick={onEnd}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Square className="h-3 w-3 fill-current" />
            End
          </button>
        </>
      ) : (
        <button
          onClick={onStart}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all active:scale-[0.98]"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Start Session
        </button>
      )}
    </div>
  );
}
