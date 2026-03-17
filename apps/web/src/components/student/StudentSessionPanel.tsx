import type { PresenceStatus } from '@classitin/shared';
import { Check, AlertCircle } from 'lucide-react';

interface StudentSessionPanelProps {
  currentStatus: PresenceStatus;
  onStatusChange: (status: PresenceStatus) => void;
}

export function StudentSessionPanel({ currentStatus, onStatusChange }: StudentSessionPanelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onStatusChange('ONLINE')}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
          currentStatus === 'ONLINE'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
            : 'text-gray-500 hover:bg-gray-800'
        }`}
      >
        <Check className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Online</span>
      </button>
      <button
        onClick={() => onStatusChange('NEEDS_HELP')}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
          currentStatus === 'NEEDS_HELP'
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
            : 'text-gray-500 hover:bg-gray-800'
        }`}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Need Help</span>
      </button>
    </div>
  );
}
