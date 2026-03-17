import { StudentThumbnail } from './StudentThumbnail';
import type { ParticipantInfo } from '@classitin/shared';
import { useMediaStore } from '@/stores/mediaStore';
import { Users } from 'lucide-react';

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
        return info.track;
      }
    }
    return null;
  };

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/50 py-16 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800">
          <Users className="h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-500">No students have joined yet</p>
        <p className="text-xs text-gray-600">Students will appear here when they connect</p>
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
