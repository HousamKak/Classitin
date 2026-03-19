import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { StudentThumbnail } from './StudentThumbnail';
import type { ParticipantInfo, PresenceStatus } from '@classitin/shared';
import { useMediaStore } from '@/stores/mediaStore';
import { Users, Monitor, AlertCircle, Wifi } from 'lucide-react';

interface StudentGridProps {
  participants: Map<string, ParticipantInfo>;
  onFocusStudent: (userId: string) => void;
}

const STATUS_PRIORITY: Record<PresenceStatus, number> = {
  NEEDS_HELP: 0,
  ONLINE: 2,
  IDLE: 3,
  OFFLINE: 4,
};

export function StudentGrid({ participants, onFocusStudent }: StudentGridProps) {
  const consumers = useMediaStore((s) => s.consumers);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);
  const [isHovering, setIsHovering] = useState(false);

  const students = useMemo(() => {
    const list = Array.from(participants.values()).filter((p) => p.role === 'STUDENT');

    list.sort((a, b) => {
      const aPriority = a.isSharing ? STATUS_PRIORITY[a.status] - 1 : STATUS_PRIORITY[a.status];
      const bPriority = b.isSharing ? STATUS_PRIORITY[b.status] - 1 : STATUS_PRIORITY[b.status];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.displayName.localeCompare(b.displayName);
    });

    return list;
  }, [participants]);

  const getTrackForUser = (userId: string): MediaStreamTrack | null => {
    for (const info of consumers.values()) {
      if (info.userId === userId && info.kind === 'video') {
        return info.track;
      }
    }
    return null;
  };

  // Aggregate stats
  const stats = useMemo(() => {
    let sharing = 0, needsHelp = 0, online = 0, offline = 0;
    for (const s of students) {
      if (s.isSharing) sharing++;
      if (s.status === 'NEEDS_HELP') needsHelp++;
      else if (s.status === 'ONLINE') online++;
      else if (s.status === 'OFFLINE' || s.status === 'IDLE') offline++;
    }
    return { sharing, needsHelp, online, offline };
  }, [students]);

  // macOS dock magnification effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const maxDist = 250; // px radius of influence
      const maxScale = 1.08;

      itemRefs.current.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
        const proximity = Math.max(0, 1 - dist / maxDist);
        const scale = 1 + proximity * (maxScale - 1);
        el.style.transform = `scale(${scale})`;
        el.style.zIndex = proximity > 0 ? '10' : '1';
      });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    cancelAnimationFrame(rafRef.current);
    itemRefs.current.forEach((el) => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
    });
  }, []);

  const setItemRef = useCallback((userId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(userId, el);
    } else {
      itemRefs.current.delete(userId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

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
    <div>
      {/* Aggregate status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs">
        {stats.sharing > 0 && (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Monitor className="h-3 w-3" />
            {stats.sharing} sharing
          </span>
        )}
        {stats.needsHelp > 0 && (
          <span className="flex items-center gap-1.5 text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {stats.needsHelp} needs help
          </span>
        )}
        <span className="flex items-center gap-1.5 text-gray-400">
          <Wifi className="h-3 w-3" />
          {stats.online + stats.sharing + stats.needsHelp} online
        </span>
        {stats.offline > 0 && (
          <span className="text-gray-600">
            {stats.offline} offline
          </span>
        )}
      </div>

      {/* Auto-fill grid with dock magnification */}
      <div
        ref={gridRef}
        className="grid items-start gap-2 sm:gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
      >
        {students.map((student) => (
          <div
            key={student.userId}
            ref={setItemRef(student.userId)}
            className="transition-transform duration-150 ease-out origin-center"
          >
            <StudentThumbnail
              userId={student.userId}
              displayName={student.displayName}
              status={student.status}
              isSharing={student.isSharing}
              track={getTrackForUser(student.userId)}
              onClick={() => onFocusStudent(student.userId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
