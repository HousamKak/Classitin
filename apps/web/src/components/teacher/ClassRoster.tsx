import type { ParticipantInfo } from '@classitin/shared';
import { Avatar } from '@/components/common/Avatar';
import { Monitor, AlertCircle, Crown } from 'lucide-react';

interface ClassRosterProps {
  participants: Map<string, ParticipantInfo>;
  onFocusStudent: (userId: string) => void;
}

export function ClassRoster({ participants, onFocusStudent }: ClassRosterProps) {
  const students = Array.from(participants.values()).filter((p) => p.role === 'STUDENT');
  const teacher = Array.from(participants.values()).find((p) => p.role === 'TEACHER');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Roster
        </h3>
        <span className="text-xs font-medium text-gray-600">{students.length}</span>
      </div>

      {teacher && (
        <div className="rounded-xl bg-primary-500/10 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={teacher.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{teacher.displayName}</p>
              <div className="flex items-center gap-1 text-[11px] text-primary-400">
                <Crown className="h-3 w-3" />
                Teacher
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {students.map((student) => {
          const isOnline = student.status === 'ONLINE' || student.status === 'NEEDS_HELP';
          const needsHelp = student.status === 'NEEDS_HELP';

          return (
            <button
              key={student.userId}
              onClick={() => onFocusStudent(student.userId)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                needsHelp
                  ? 'bg-amber-500/10 hover:bg-amber-500/15'
                  : 'hover:bg-gray-800'
              }`}
            >
              <div className="relative">
                <Avatar name={student.displayName} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-900 ${
                  isOnline ? 'bg-emerald-500' : 'bg-gray-600'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">{student.displayName}</p>
                <div className="flex items-center gap-2">
                  {needsHelp && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-400">
                      <AlertCircle className="h-3 w-3" /> Needs help
                    </span>
                  )}
                  {student.isSharing && (
                    <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                      <Monitor className="h-3 w-3" /> Sharing
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {students.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-600">No students yet</p>
        )}
      </div>
    </div>
  );
}
