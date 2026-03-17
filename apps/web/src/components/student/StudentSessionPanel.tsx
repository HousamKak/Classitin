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
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <Check className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Online</span>
      </button>
      <button
        onClick={() => onStatusChange('NEEDS_HELP')}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
          currentStatus === 'NEEDS_HELP'
            ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Need Help</span>
      </button>
    </div>
  );
}
