export type StreamStatus = 'PUBLISHING' | 'PAUSED' | 'STOPPED';
export type StreamKind = 'video' | 'audio';
export type StreamSource = 'screen' | 'camera' | 'microphone';
export type AudioTarget = 'broadcast' | 'private';

export interface LiveStream {
  id: string;
  sessionId: string;
  userId: string;
  status: StreamStatus;
  mediasoupProducerId?: string | null;
  kind: StreamKind;
  startedAt: string;
  stoppedAt?: string | null;
}

export interface ProducerInfo {
  producerId: string;
  userId: string;
  kind: StreamKind;
  appData: { source: StreamSource; target?: AudioTarget; targetUserId?: string };
}
