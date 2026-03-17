import type { PresenceStatus } from '@classitin/shared';

interface StudentStatusBadgeProps {
  status: PresenceStatus;
  isSharing: boolean;
}

export function StudentStatusBadge({ status, isSharing }: StudentStatusBadgeProps) {
  const config: Record<PresenceStatus, { color: string; label: string }> = {
    ONLINE: { color: 'text-emerald-600', label: 'Online' },
    IDLE: { color: 'text-gray-400', label: 'Idle' },
    NEEDS_HELP: { color: 'text-amber-600', label: 'Needs Help' },
    OFFLINE: { color: 'text-gray-400', label: 'Offline' },
  };

  const c = config[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-medium ${c.color}`}>{c.label}</span>
      {isSharing && (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
          LIVE
        </span>
      )}
    </div>
  );
}
