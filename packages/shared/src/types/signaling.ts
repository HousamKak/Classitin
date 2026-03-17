import type { UserRole, PresenceStatus, ParticipantInfo } from './user.js';
import type { Session } from './room.js';
import type { StreamKind, StreamSource, AudioTarget } from './stream.js';
// Standalone media types — compatible with both mediasoup and mediasoup-client
// without importing from either package (keeps shared package environment-neutral).
export type RtpCapabilities = Record<string, unknown>;
export type RtpParameters = Record<string, unknown>;
export type DtlsParameters = Record<string, unknown>;

// --- Room Events ---

export interface RoomJoinPayload {
  roomId: string;
  sessionId: string;
}

export interface RoomJoinedAck {
  roster: ParticipantInfo[];
  rtpCapabilities: RtpCapabilities;
  existingProducers: Array<{
    producerId: string;
    userId: string;
    kind: StreamKind;
    appData: { source: StreamSource };
  }>;
}

export interface RoomLeavePayload {
  roomId: string;
  sessionId: string;
}

export interface PeerJoinedPayload {
  userId: string;
  displayName: string;
  role: UserRole;
}

export interface PeerLeftPayload {
  userId: string;
}

// --- Presence Events ---

export interface PresenceUpdatePayload {
  sessionId: string;
  status: PresenceStatus;
}

export interface PresenceChangedPayload {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
}

export interface PresenceRosterPayload {
  participants: ParticipantInfo[];
}

// --- Transport Events ---

export interface TransportCreatePayload {
  sessionId: string;
}

export interface TransportCreatedAck {
  id: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
  sctpParameters?: Record<string, unknown>;
}

export interface TransportConnectPayload {
  transportId: string;
  dtlsParameters: DtlsParameters;
}

export interface TransportProducePayload {
  transportId: string;
  kind: StreamKind;
  rtpParameters: RtpParameters;
  appData: { source: StreamSource; target?: AudioTarget; targetUserId?: string };
}

export interface TransportProduceAck {
  producerId: string;
}

// --- Consumer Events ---

export interface ConsumeStartPayload {
  sessionId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

export interface ConsumeCreatedAck {
  consumerId: string;
  producerId: string;
  kind: StreamKind;
  rtpParameters: RtpParameters;
  producerPaused: boolean;
}

export interface ConsumeResumePayload {
  consumerId: string;
}

export interface ConsumePausePayload {
  consumerId: string;
}

export interface ConsumeSetLayersPayload {
  consumerId: string;
  spatialLayer: number;
  temporalLayer?: number;
}

export interface ConsumeClosePayload {
  consumerId: string;
}

// --- Producer Events ---

export interface ProducerPausePayload {
  producerId: string;
}

export interface ProducerResumePayload {
  producerId: string;
}

export interface ProducerClosePayload {
  producerId: string;
}

// --- Stream Lifecycle Events (Server Broadcasts) ---

export interface StreamStartedPayload {
  userId: string;
  producerId: string;
  kind: StreamKind;
  appData: { source: StreamSource; target?: AudioTarget; targetUserId?: string };
}

export interface StreamPausedPayload {
  userId: string;
  producerId: string;
}

export interface StreamResumedPayload {
  userId: string;
  producerId: string;
}

export interface StreamStoppedPayload {
  userId: string;
  producerId: string;
}

// --- Session Events ---

export interface SessionStartedPayload {
  session: Session;
}

export interface SessionEndedPayload {
  sessionId: string;
}

// --- Chat Events ---

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  role: UserRole;
  text: string;
  isAnnouncement: boolean;
  timestamp: number;
}

export interface ChatSendPayload {
  sessionId: string;
  text: string;
  isAnnouncement?: boolean;
}

export interface ChatMessagePayload {
  message: ChatMessage;
}

// --- Voice Events ---

export interface VoiceCallPayload {
  sessionId: string;
  targetUserId: string;
}

export interface VoiceCallEndPayload {
  sessionId: string;
  targetUserId?: string;
}

export interface VoiceCallStartedPayload {
  fromUserId: string;
  fromDisplayName: string;
}

export interface VoiceCallEndedPayload {
  fromUserId: string;
}

export interface VoiceBroadcastStartedPayload {
  userId: string;
  producerId: string;
}

export interface VoiceBroadcastEndedPayload {
  userId: string;
}

// --- Event Maps ---

export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload, ack: (response: RoomJoinedAck) => void) => void;
  'room:leave': (payload: RoomLeavePayload) => void;
  'presence:update': (payload: PresenceUpdatePayload) => void;
  'transport:create-send': (payload: TransportCreatePayload, ack: (response: TransportCreatedAck) => void) => void;
  'transport:create-recv': (payload: TransportCreatePayload, ack: (response: TransportCreatedAck) => void) => void;
  'transport:connect': (payload: TransportConnectPayload, ack: (response: object) => void) => void;
  'transport:produce': (payload: TransportProducePayload, ack: (response: TransportProduceAck) => void) => void;
  'consume:start': (payload: ConsumeStartPayload, ack: (response: ConsumeCreatedAck) => void) => void;
  'consume:resume': (payload: ConsumeResumePayload, ack: (response: object) => void) => void;
  'consume:pause': (payload: ConsumePausePayload, ack: (response: object) => void) => void;
  'consume:set-preferred-layers': (payload: ConsumeSetLayersPayload, ack: (response: object) => void) => void;
  'consume:close': (payload: ConsumeClosePayload, ack: (response: object) => void) => void;
  'producer:pause': (payload: ProducerPausePayload, ack: (response: object) => void) => void;
  'producer:resume': (payload: ProducerResumePayload, ack: (response: object) => void) => void;
  'producer:close': (payload: ProducerClosePayload, ack: (response: object) => void) => void;
  'voice:call-start': (payload: VoiceCallPayload, ack: (response: object) => void) => void;
  'voice:call-end': (payload: VoiceCallEndPayload) => void;
  'chat:send': (payload: ChatSendPayload) => void;
}

export interface ServerToClientEvents {
  'room:peer-joined': (payload: PeerJoinedPayload) => void;
  'room:peer-left': (payload: PeerLeftPayload) => void;
  'presence:changed': (payload: PresenceChangedPayload) => void;
  'presence:roster': (payload: PresenceRosterPayload) => void;
  'stream:started': (payload: StreamStartedPayload) => void;
  'stream:paused': (payload: StreamPausedPayload) => void;
  'stream:resumed': (payload: StreamResumedPayload) => void;
  'stream:stopped': (payload: StreamStoppedPayload) => void;
  'session:started': (payload: SessionStartedPayload) => void;
  'session:ended': (payload: SessionEndedPayload) => void;
  'voice:call-incoming': (payload: VoiceCallStartedPayload) => void;
  'voice:call-ended': (payload: VoiceCallEndedPayload) => void;
  'voice:broadcast-started': (payload: VoiceBroadcastStartedPayload) => void;
  'voice:broadcast-ended': (payload: VoiceBroadcastEndedPayload) => void;
  'consume:closed': (payload: { consumerId: string }) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
}
