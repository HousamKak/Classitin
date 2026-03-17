import { Monitor, MonitorOff, Smartphone } from 'lucide-react';

interface ScreenCaptureButtonProps {
  isCapturing: boolean;
  isSupported?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

export function ScreenCaptureButton({ isCapturing, isSupported = true, onStart, onStop }: ScreenCaptureButtonProps) {
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-400 cursor-default" title={isMobile ? 'Screen sharing is not available on mobile browsers' : 'Screen sharing requires a desktop browser with HTTPS'}>
        {isMobile ? <Smartphone className="h-3.5 w-3.5" /> : <MonitorOff className="h-3.5 w-3.5" />}
        {isMobile ? 'Desktop Only' : 'Not Available'}
      </div>
    );
  }

  if (isCapturing) {
    return (
      <button
        onClick={onStop}
        className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
      >
        <Monitor className="h-3.5 w-3.5" />
        Stop Sharing
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      className="flex items-center gap-2 rounded-xl bg-primary-50 border border-primary-100 px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-100 transition-colors"
    >
      <Monitor className="h-3.5 w-3.5" />
      Share Screen
    </button>
  );
}
