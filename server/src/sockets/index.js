import { Server } from 'socket.io';
import { getSocketCorsOrigin } from '../helpers/cors.helper.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../helpers/crypto.helper.js';
import * as userService from '../services/user.service.js';
import * as chatService from '../services/chat.service.js';
import { USER_STATUS } from '../models/constants.js';

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getSocketCorsOrigin(),
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = verifyAccessToken(token);
      const user = await userService.findUserByUuid(decoded.sub);
      if (!user || user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
        return next(new Error('Unauthorized'));
      }
      socket.user = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        roleCode: user.roleCode,
      };
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    logger.debug(`Socket connected user=${socket.user.uuid}`);

    socket.on('chat:join', async ({ conversationId }, ack) => {
      try {
        await chatService.assertParticipant(conversationId, socket.user.id);
        socket.join(`conversation:${conversationId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, message: err.message });
      }
    });

    socket.on('chat:leave', ({ conversationId }) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    socket.on('chat:message', async ({ conversationId, body }, ack) => {
      try {
        const message = await chatService.sendMessage(
          conversationId,
          socket.user,
          { body },
          { viaSocket: true }
        );
        io.to(`conversation:${conversationId}`).emit('chat:message', message);

        const participantIds = await chatService.getParticipantUserIds(conversationId);
        for (const uid of participantIds) {
          if (uid !== socket.user.id) {
            io.to(`user:${uid}`).emit('chat:notify', {
              conversationId,
              preview: message.body.slice(0, 120),
              from: message.sender,
            });
          }
        }

        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, message: err.message });
      }
    });

    socket.on('chat:typing', async ({ conversationId, isTyping }) => {
      try {
        await chatService.assertParticipant(conversationId, socket.user.id);
        socket.to(`conversation:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId: socket.user.uuid,
          name: socket.user.firstName,
          isTyping: Boolean(isTyping),
        });
      } catch {
        /* ignore */
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected user=${socket.user.uuid}`);
    });
  });

  ioInstance = io;
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}
