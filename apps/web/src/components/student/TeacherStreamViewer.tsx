import { useRef, useState, useCallback, useEffect } from 'react';
import { VideoRenderer } from '@/components/media/VideoRenderer';
import { useMediaStore } from '@/stores/mediaStore';
import { Monitor, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TeacherStreamViewerProps {
  teacherUserId: string | null;
}

export function TeacherStreamViewer({ teacherUserId }: TeacherStreamViewerProps) {
  const consumers = useMediaStore((s) => s.consumers);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

  let track: MediaStreamTrack | null = null;
  if (teacherUserId) {
    for (const info of consumers.values()) {
      if (info.userId === teacherUserId && info.kind === 'video') {
        track = info.track;
        break;
      }
    }
  }

  const isZoomed = scale > 1;

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(s / 1.5, 1);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => {
      const next = Math.min(Math.max(s * delta, 1), 5);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDist.current > 0) {
        const pinchScale = dist / lastPinchDist.current;
        setScale((s) => {
          const next = Math.min(Math.max(s * pinchScale, 1), 5);
          if (next === 1) setTranslate({ x: 0, y: 0 });
          return next;
        });
      }
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch pan when zoomed
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      });
    }
  }, [scale]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    }
  }, [translate]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = 0;
  }, []);

  // Mouse pan when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }, [scale, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  }, [scale, resetZoom]);

  // Reset zoom on track change
  useEffect(() => {
    resetZoom();
  }, [track, resetZoom]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-lg group/viewer">
      {track ? (
        <div
          ref={containerRef}
          className={`relative aspect-video bg-black ${isZoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ touchAction: 'none' }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          <div
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              width: '100%',
              height: '100%',
            }}
          >
            <VideoRenderer track={track} className="w-full h-full object-contain" />
          </div>
        </div>
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

      {/* Zoom controls — visible on hover or when zoomed */}
      {track && (
        <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/60 backdrop-blur-sm p-1.5 transition-opacity ${
          isZoomed ? 'opacity-100' : 'opacity-0 group-hover/viewer:opacity-100'
        }`}>
          <button
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Zoom hint for touch */}
      {track && !isZoomed && (
        <div className="absolute bottom-3 left-3 opacity-0 group-hover/viewer:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/40">Scroll or pinch to zoom · Double-click to enlarge</span>
        </div>
      )}
    </div>
  );
}
