import { VideoRenderer } from '@/components/media/VideoRenderer';
import { useMediaStore } from '@/stores/mediaStore';
import { Monitor } from 'lucide-react';

interface TeacherStreamViewerProps {
  teacherUserId: string | null;
}

export function TeacherStreamViewer({ teacherUserId }: TeacherStreamViewerProps) {
  const consumers = useMediaStore((s) => s.consumers);

  let track: MediaStreamTrack | null = null;
  if (teacherUserId) {
    for (const info of consumers.values()) {
      if (info.userId === teacherUserId && info.kind === 'video') {
        track = info.track;
        break;
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-lg">
      {track ? (
        <VideoRenderer track={track} className="w-full object-contain" />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gray-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800">
            <Monitor className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">
            {teacherUserId ? 'Teacher is not sharing their screen' : 'Waiting for teacher to join...'}
          </p>
        </div>
      )}
    </div>
  );
}
