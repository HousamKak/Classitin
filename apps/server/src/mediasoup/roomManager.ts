import type mediasoup from 'mediasoup';
import { routerOptions, webRtcTransportOptions, getIceServers } from '../config/mediasoup.js';
import { workerManager } from './workerManager.js';
import { logger } from '../utils/logger.js';

interface PeerState {
  userId: string;
  sendTransport?: mediasoup.types.WebRtcTransport;
  recvTransport?: mediasoup.types.WebRtcTransport;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

interface RoomState {
  router: mediasoup.types.Router;
  peers: Map<string, PeerState>;
}

class RoomManager {
  private rooms = new Map<string, RoomState>();

  async getOrCreateRoom(sessionId: string): Promise<mediasoup.types.Router> {
    const existing = this.rooms.get(sessionId);
    if (existing) return existing.router;

    const worker = workerManager.getNextWorker();
    const router = await worker.createRouter(routerOptions as mediasoup.types.RouterOptions);

    this.rooms.set(sessionId, { router, peers: new Map() });
    logger.info({ sessionId }, 'Created mediasoup router for session');
    return router;
  }

  getRouter(sessionId: string): mediasoup.types.Router | undefined {
    return this.rooms.get(sessionId)?.router;
  }

  addPeer(sessionId: string, userId: string): PeerState {
    const room = this.rooms.get(sessionId);
    if (!room) throw new Error(`Room ${sessionId} not found`);

    let peer = room.peers.get(userId);
    if (!peer) {
      peer = {
        userId,
        producers: new Map(),
        consumers: new Map(),
      };
      room.peers.set(userId, peer);
    }
    return peer;
  }

  getPeer(sessionId: string, userId: string): PeerState | undefined {
    return this.rooms.get(sessionId)?.peers.get(userId);
  }

  async createWebRtcTransport(sessionId: string, userId: string, direction: 'send' | 'recv') {
    const router = this.rooms.get(sessionId)?.router;
    if (!router) throw new Error(`Room ${sessionId} not found`);

    const transport = await router.createWebRtcTransport(webRtcTransportOptions as mediasoup.types.WebRtcTransportOptions);

    // Monitor transport state for debugging
    transport.on('icestatechange', (iceState) => {
      logger.info({ transportId: transport.id, userId, direction, iceState }, 'Transport ICE state change');
    });
    transport.on('dtlsstatechange', (dtlsState) => {
      logger.info({ transportId: transport.id, userId, direction, dtlsState }, 'Transport DTLS state change');
    });

    const peer = this.addPeer(sessionId, userId);
    if (direction === 'send') {
      peer.sendTransport = transport;
    } else {
      peer.recvTransport = transport;
    }

    const iceServers = getIceServers();

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
      ...(iceServers.length > 0 ? { iceServers } : {}),
    };
  }

  getActiveProducers(sessionId: string): Array<{
    producerId: string;
    userId: string;
    kind: string;
    appData: Record<string, unknown>;
  }> {
    const room = this.rooms.get(sessionId);
    if (!room) return [];

    const producers: Array<{
      producerId: string;
      userId: string;
      kind: string;
      appData: Record<string, unknown>;
    }> = [];

    for (const [userId, peer] of room.peers) {
      for (const [producerId, producer] of peer.producers) {
        if (!producer.closed) {
          producers.push({
            producerId,
            userId,
            kind: producer.kind,
            appData: producer.appData as Record<string, unknown>,
          });
        }
      }
    }

    return producers;
  }

  removePeer(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (!peer) return;

    // Close all consumers
    for (const consumer of peer.consumers.values()) {
      consumer.close();
    }
    // Close all producers
    for (const producer of peer.producers.values()) {
      producer.close();
    }
    // Close transports
    peer.sendTransport?.close();
    peer.recvTransport?.close();

    room.peers.delete(userId);
    logger.info({ sessionId, userId }, 'Removed peer from room');
  }

  closeRoom(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    room.router.close();
    this.rooms.delete(sessionId);
    logger.info({ sessionId }, 'Closed mediasoup room');
  }

  findTransport(sessionId: string, transportId: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return undefined;

    for (const peer of room.peers.values()) {
      if (peer.sendTransport?.id === transportId) return peer.sendTransport;
      if (peer.recvTransport?.id === transportId) return peer.recvTransport;
    }
    return undefined;
  }

  findConsumer(sessionId: string, consumerId: string): { consumer: mediasoup.types.Consumer; userId: string } | undefined {
    const room = this.rooms.get(sessionId);
    if (!room) return undefined;

    for (const [userId, peer] of room.peers) {
      const consumer = peer.consumers.get(consumerId);
      if (consumer) return { consumer, userId };
    }
    return undefined;
  }

  findProducer(sessionId: string, producerId: string): { producer: mediasoup.types.Producer; userId: string } | undefined {
    const room = this.rooms.get(sessionId);
    if (!room) return undefined;

    for (const [userId, peer] of room.peers) {
      const producer = peer.producers.get(producerId);
      if (producer) return { producer, userId };
    }
    return undefined;
  }

  getStats(): {
    rooms: number;
    peers: number;
    producers: number;
    consumers: number;
    details: Array<{
      sessionId: string;
      peers: number;
      producers: number;
      consumers: number;
    }>;
  } {
    let totalPeers = 0;
    let totalProducers = 0;
    let totalConsumers = 0;
    const details: Array<{
      sessionId: string;
      peers: number;
      producers: number;
      consumers: number;
    }> = [];

    for (const [sessionId, room] of this.rooms) {
      let roomProducers = 0;
      let roomConsumers = 0;
      for (const peer of room.peers.values()) {
        roomProducers += peer.producers.size;
        roomConsumers += peer.consumers.size;
      }
      totalPeers += room.peers.size;
      totalProducers += roomProducers;
      totalConsumers += roomConsumers;
      details.push({
        sessionId,
        peers: room.peers.size,
        producers: roomProducers,
        consumers: roomConsumers,
      });
    }

    return {
      rooms: this.rooms.size,
      peers: totalPeers,
      producers: totalProducers,
      consumers: totalConsumers,
      details,
    };
  }

  findPeerByTransportId(sessionId: string, transportId: string): PeerState | undefined {
    const room = this.rooms.get(sessionId);
    if (!room) return undefined;

    for (const peer of room.peers.values()) {
      if (peer.sendTransport?.id === transportId || peer.recvTransport?.id === transportId) {
        return peer;
      }
    }
    return undefined;
  }
}

export const roomManager = new RoomManager();
