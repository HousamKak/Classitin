import type { Server, Socket } from 'socket.io';
import { roomManager } from '../../mediasoup/roomManager.js';
import { presenceService } from '../../services/presence.service.js';
import { logger } from '../../utils/logger.js';

export function registerSignalingHandlers(socket: Socket, io: Server) {
  // Create send transport
  socket.on('transport:create-send', async (payload, ack) => {
    try {
      const { sessionId } = payload;
      const userId = socket.data.userId;
      const params = await roomManager.createWebRtcTransport(sessionId, userId, 'send');
      ack(params);
    } catch (err) {
      logger.error(err, 'Error creating send transport');
      ack({ error: 'Failed to create send transport' });
    }
  });

  // Create recv transport
  socket.on('transport:create-recv', async (payload, ack) => {
    try {
      const { sessionId } = payload;
      const userId = socket.data.userId;
      const params = await roomManager.createWebRtcTransport(sessionId, userId, 'recv');
      ack(params);
    } catch (err) {
      logger.error(err, 'Error creating recv transport');
      ack({ error: 'Failed to create recv transport' });
    }
  });

  // Connect transport
  socket.on('transport:connect', async (payload, ack) => {
    try {
      const { transportId, dtlsParameters } = payload;
      const sessionId = socket.data.sessionId;
      const transport = roomManager.findTransport(sessionId, transportId);
      if (!transport) {
        return ack({ error: 'Transport not found' });
      }
      await transport.connect({ dtlsParameters });
      ack({});
    } catch (err) {
      logger.error(err, 'Error connecting transport');
      ack({ error: 'Failed to connect transport' });
    }
  });

  // Produce (start sending media)
  socket.on('transport:produce', async (payload, ack) => {
    try {
      const { transportId, kind, rtpParameters, appData } = payload;
      const sessionId = socket.data.sessionId;
      const userId = socket.data.userId;

      const peer = roomManager.findPeerByTransportId(sessionId, transportId);
      if (!peer || !peer.sendTransport || peer.sendTransport.id !== transportId) {
        return ack({ error: 'Send transport not found' });
      }

      const producer = await peer.sendTransport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, userId },
      });

      peer.producers.set(producer.id, producer);

      // Update presence
      presenceService.setSharing(sessionId, userId, true);

      // Broadcast to room
      const roomName = `session:${sessionId}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      const socketsInRoom = room ? Array.from(room) : [];
      logger.info({ sessionId, userId, roomName, socketsInRoom, producerId: producer.id }, 'Broadcasting stream:started to room');
      socket.to(roomName).emit('stream:started', {
        userId,
        producerId: producer.id,
        kind: producer.kind,
        appData: producer.appData,
      });

      producer.on('transportclose', () => {
        peer.producers.delete(producer.id);
        presenceService.setSharing(sessionId, userId, false);
      });

      ack({ producerId: producer.id });
      logger.info({ sessionId, userId, producerId: producer.id, kind }, 'Producer created');

      // Log producer stats after a short delay to check if media is flowing
      setTimeout(async () => {
        try {
          const stats = await producer.getStats();
          const statsArr = Array.from(stats.values()) as Array<Record<string, unknown>>;
          const inbound = statsArr.find((s) => s.type === 'inbound-rtp');
          if (inbound) {
            logger.info({
              producerId: producer.id,
              bytesReceived: inbound.byteCount,
              packetCount: inbound.packetCount,
            }, 'Producer stats after 3s');
          } else {
            logger.info({ producerId: producer.id, stats: statsArr }, 'Producer stats after 3s (raw)');
          }
        } catch {
          // producer might be closed
        }
      }, 3000);
    } catch (err) {
      logger.error(err, 'Error producing');
      ack({ error: 'Failed to produce' });
    }
  });

  // Start consuming (subscribe to a producer)
  socket.on('consume:start', async (payload, ack) => {
    try {
      const { sessionId, producerId, rtpCapabilities } = payload;
      const userId = socket.data.userId;
      logger.info({ sessionId, userId, producerId }, 'consume:start received');

      const router = roomManager.getRouter(sessionId);
      if (!router) return ack({ error: 'Router not found' });

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return ack({ error: 'Cannot consume' });
      }

      const peer = roomManager.getPeer(sessionId, userId);
      if (!peer?.recvTransport) {
        return ack({ error: 'Recv transport not found' });
      }

      const consumer = await peer.recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        peer.consumers.delete(consumer.id);
      });
      consumer.on('producerclose', () => {
        peer.consumers.delete(consumer.id);
        socket.emit('consume:closed', { consumerId: consumer.id });
      });

      ack({
        consumerId: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        producerPaused: consumer.producerPaused,
      });

      logger.info({ sessionId, userId, consumerId: consumer.id, producerId }, 'Consumer created');
    } catch (err) {
      logger.error(err, 'Error consuming');
      ack({ error: 'Failed to consume' });
    }
  });

  // Resume consumer
  socket.on('consume:resume', async (payload, ack) => {
    try {
      const { consumerId } = payload;
      const sessionId = socket.data.sessionId;
      logger.info({ sessionId, consumerId }, 'consume:resume received');
      const result = roomManager.findConsumer(sessionId, consumerId);
      if (!result) return ack({ error: 'Consumer not found' });
      await result.consumer.resume();

      // Request a key frame to ensure the consumer gets the first frame
      await result.consumer.requestKeyFrame();

      logger.info({ sessionId, consumerId }, 'Consumer resumed successfully');

      // Log consumer stats after delay to check if media is arriving
      setTimeout(async () => {
        try {
          const stats = await result.consumer.getStats();
          const statsArr = Array.from(stats.values()) as Array<Record<string, unknown>>;
          const outbound = statsArr.find((s) => s.type === 'outbound-rtp');
          if (outbound) {
            logger.info({
              consumerId,
              byteCount: outbound.byteCount,
              packetCount: outbound.packetCount,
            }, 'Consumer stats after 3s');
          } else {
            logger.info({ consumerId, stats: statsArr }, 'Consumer stats after 3s (raw)');
          }
        } catch {
          // consumer might be closed
        }
      }, 3000);

      ack({});
    } catch (err) {
      logger.error(err, 'Error resuming consumer');
      ack({ error: 'Failed to resume consumer' });
    }
  });

  // Pause consumer
  socket.on('consume:pause', async (payload, ack) => {
    try {
      const { consumerId } = payload;
      const sessionId = socket.data.sessionId;
      const result = roomManager.findConsumer(sessionId, consumerId);
      if (!result) return ack({ error: 'Consumer not found' });
      await result.consumer.pause();
      ack({});
    } catch (err) {
      logger.error(err, 'Error pausing consumer');
      ack({ error: 'Failed to pause consumer' });
    }
  });

  // Set preferred layers (simulcast switching)
  socket.on('consume:set-preferred-layers', async (payload, ack) => {
    try {
      const { consumerId, spatialLayer, temporalLayer } = payload;
      const sessionId = socket.data.sessionId;
      const result = roomManager.findConsumer(sessionId, consumerId);
      if (!result) return ack({ error: 'Consumer not found' });
      await result.consumer.setPreferredLayers({
        spatialLayer,
        temporalLayer,
      });
      ack({});
    } catch (err) {
      logger.error(err, 'Error setting preferred layers');
      ack({ error: 'Failed to set preferred layers' });
    }
  });

  // Close consumer
  socket.on('consume:close', async (payload, ack) => {
    try {
      const { consumerId } = payload;
      const sessionId = socket.data.sessionId;
      const userId = socket.data.userId;
      const peer = roomManager.getPeer(sessionId, userId);
      const consumer = peer?.consumers.get(consumerId);
      if (consumer) {
        consumer.close();
        peer!.consumers.delete(consumerId);
      }
      ack({});
    } catch (err) {
      logger.error(err, 'Error closing consumer');
      ack({ error: 'Failed to close consumer' });
    }
  });

  // Pause producer
  socket.on('producer:pause', async (payload, ack) => {
    try {
      const { producerId } = payload;
      const sessionId = socket.data.sessionId;
      const result = roomManager.findProducer(sessionId, producerId);
      if (!result) return ack({ error: 'Producer not found' });
      await result.producer.pause();
      socket.to(`session:${sessionId}`).emit('stream:paused', {
        userId: result.userId,
        producerId,
      });
      ack({});
    } catch (err) {
      logger.error(err, 'Error pausing producer');
      ack({ error: 'Failed to pause producer' });
    }
  });

  // Resume producer
  socket.on('producer:resume', async (payload, ack) => {
    try {
      const { producerId } = payload;
      const sessionId = socket.data.sessionId;
      const result = roomManager.findProducer(sessionId, producerId);
      if (!result) return ack({ error: 'Producer not found' });
      await result.producer.resume();
      socket.to(`session:${sessionId}`).emit('stream:resumed', {
        userId: result.userId,
        producerId,
      });
      ack({});
    } catch (err) {
      logger.error(err, 'Error resuming producer');
      ack({ error: 'Failed to resume producer' });
    }
  });

  // Close producer
  socket.on('producer:close', async (payload, ack) => {
    try {
      const { producerId } = payload;
      const sessionId = socket.data.sessionId;
      const userId = socket.data.userId;
      const peer = roomManager.getPeer(sessionId, userId);
      const producer = peer?.producers.get(producerId);
      if (producer) {
        producer.close();
        peer!.producers.delete(producerId);
        presenceService.setSharing(sessionId, userId, false);
        socket.to(`session:${sessionId}`).emit('stream:stopped', {
          userId,
          producerId,
        });
      }
      ack({});
    } catch (err) {
      logger.error(err, 'Error closing producer');
      ack({ error: 'Failed to close producer' });
    }
  });
}
