import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../shared/database';
import { User } from '../shared/models/user';
import { Todo } from '../shared/models/todo';
import WebSocket from 'ws';

interface PeerMessage {
  type: 'sync' | 'connect' | 'disconnect';
  peerId: string;
  data?: any;
}

export async function peerRoutes(fastify: FastifyInstance) {
  const userRepository = AppDataSource.getRepository(User);
  const todoRepository = AppDataSource.getRepository(Todo);

  // WebSocket handling
  fastify.get('/peer/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', async (message: string) => {
      try {
        const data: PeerMessage = JSON.parse(message);
        
        switch (data.type) {
          case 'connect':
            await handlePeerConnect(data.peerId);
            break;
          case 'disconnect':
            await handlePeerDisconnect(data.peerId);
            break;
          case 'sync':
            await handlePeerSync(data.peerId, data.data);
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
  });

  async function handlePeerConnect(peerId: string) {
    try {
      let user = await userRepository.findOne({ where: { peerId } });
      
      if (!user) {
        user = userRepository.create({
          peerId,
          connectedPeers: [],
          lastSync: new Date()
        });
      }
      
      user.lastSync = new Date();
      await userRepository.save(user);
    } catch (error) {
      console.error('Error handling peer connection:', error);
    }
  }

  async function handlePeerDisconnect(peerId: string) {
    try {
      const user = await userRepository.findOne({ where: { peerId } });
      if (user) {
        user.lastSync = new Date();
        await userRepository.save(user);
      }
    } catch (error) {
      console.error('Error handling peer disconnection:', error);
    }
  }

  async function handlePeerSync(peerId: string, data: any) {
    try {
      const user = await userRepository.findOne({ where: { peerId } });
      if (!user) return;

      if (data.todos) {
        for (const todo of data.todos) {
          const existingTodo = await todoRepository.findOne({
            where: { id: todo.id, user: { id: user.id } }
          });

          if (existingTodo) {
            Object.assign(existingTodo, todo);
            await todoRepository.save(existingTodo);
          } else {
            const newTodo = todoRepository.create({
              ...todo,
              user
            });
            await todoRepository.save(newTodo);
          }
        }
      }

      user.lastSync = new Date();
      await userRepository.save(user);
    } catch (error) {
      console.error('Error handling peer sync:', error);
    }
  }

  // REST endpoints for peer management
  fastify.post('/peer/register', async (request, reply) => {
    const { peerId, deviceName, deviceType } = request.body as {
      peerId: string;
      deviceName?: string;
      deviceType?: string;
    };

    let user = await userRepository.findOne({ where: { peerId } });
    
    if (!user) {
      user = userRepository.create({
        peerId,
        deviceName,
        deviceType,
        connectedPeers: [],
        lastSync: new Date()
      });
    }

    await userRepository.save(user);
    return { success: true, user };
  });

  fastify.post('/peer/connect', async (request, reply) => {
    const { sourcePeerId, targetPeerId } = request.body as {
      sourcePeerId: string;
      targetPeerId: string;
    };

    const sourceUser = await userRepository.findOne({ where: { peerId: sourcePeerId } });
    const targetUser = await userRepository.findOne({ where: { peerId: targetPeerId } });

    if (!sourceUser || !targetUser) {
      return reply.code(404).send({ error: 'One or both peers not found' });
    }

    if (!sourceUser.connectedPeers.includes(targetPeerId)) {
      sourceUser.connectedPeers.push(targetPeerId);
      await userRepository.save(sourceUser);
    }

    return { success: true };
  });
}

