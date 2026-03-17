import { StudentThumbnail } from './StudentThumbnail';
import type { ParticipantInfo } from '@classitin/shared';
import { useMediaStore } from '@/stores/mediaStore';

interface StudentGridProps {
  participants: Map<string, ParticipantInfo>;
  onFocusStudent: (userId: string) => void;
}

export function StudentGrid({ participants, onFocusStudent }: StudentGridProps) {
  const consumers = useMediaStore((s) => s.consumers);

  const students = Array.from(participants.values()).filter((p) => p.role === 'STUDENT');

  const getTrackForUser = (userId: string): MediaStreamTrack | null => {
    for (const info of consumers.values()) {
      if (info.userId === userId && info.kind === 'video') {
        console.log('[StudentGrid] Found track for user:', userId, {
          consumerId: info.consumerId,
          trackId: info.track?.id,
          readyState: info.track?.readyState,
          muted: info.track?.muted,
          enabled: info.track?.enabled,
        });
        return info.track;
      }
    }
    return null;
  };

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12">
        <p className="text-sm text-gray-400">No students have joined yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {students.map((student) => (
        <StudentThumbnail
          key={student.userId}
          userId={student.userId}
          displayName={student.displayName}
          status={student.status}
          isSharing={student.isSharing}
          track={getTrackForUser(student.userId)}
          onClick={() => onFocusStudent(student.userId)}
        />
      ))}
    </div>
  );
}
