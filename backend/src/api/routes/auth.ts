// auth.ts
import { FastifyInstance } from "fastify";
import { User } from "../../shared/models/user";
import { AppDataSource } from "../config/database";
import crypto from 'crypto';

interface PeerSyncData {
  peerId: string;
  timestamp: number;
  todos: any[]; // Define proper todo type
}

interface PeerUser {
  id: string;
  peerId: string;
  connectedPeers: string[];
  lastSync: Date;
}

export async function authRoutes(fastify: FastifyInstance) {
  const userRepository = AppDataSource.getRepository(User);
  
  // Endpoint to register a new peer
  fastify.post("/peer/register", async (request, reply) => {
    const { peerId } = request.body as { peerId: string };
    
    if (!peerId) {
      return reply.code(400).send({ error: "PeerID is required" });
    }

    let user = await userRepository.findOne({ where: { peerId } });
    
    if (!user) {
      user = userRepository.create({
        peerId,
        connectedPeers: [],
        lastSync: new Date()
      });
      await userRepository.save(user);
    }

    const token = generatePeerToken(peerId);
    return reply.code(200).send({ token });
  });

  // Endpoint to connect peers
  fastify.post("/peer/connect", async (request, reply) => {
    const { sourcePeerId, targetPeerId } = request.body as { 
      sourcePeerId: string; 
      targetPeerId: string;
    };

    if (!sourcePeerId || !targetPeerId) {
      return reply.code(400).send({ error: "Both source and target peer IDs are required" });
    }

    const sourceUser = await userRepository.findOne({ where: { peerId: sourcePeerId } });
    const targetUser = await userRepository.findOne({ where: { peerId: targetPeerId } });

    if (!sourceUser || !targetUser) {
      return reply.code(404).send({ error: "One or both peers not found" });
    }

    // Add peers to each other's connected peers list if not already present
    if (!sourceUser.connectedPeers.includes(targetPeerId)) {
      sourceUser.connectedPeers.push(targetPeerId);
      await userRepository.save(sourceUser);
    }

    if (!targetUser.connectedPeers.includes(sourcePeerId)) {
      targetUser.connectedPeers.push(sourcePeerId);
      await userRepository.save(targetUser);
    }

    return reply.code(200).send({ success: true });
  });

  // Endpoint to sync peer data
  fastify.post("/peer/sync", async (request, reply) => {
    const { peerId, timestamp, todos } = request.body as PeerSyncData;

    const user = await userRepository.findOne({ where: { peerId } });
    
    if (!user) {
      return reply.code(404).send({ error: "Peer not found" });
    }

    user.lastSync = new Date();
    await userRepository.save(user);

    // Here you could implement additional sync logic like:
    // - Merging todos from different peers
    // - Resolving conflicts
    // - Maintaining sync history

    return reply.code(200).send({ success: true });
  });

  // Endpoint to disconnect peer
  fastify.post("/peer/disconnect", async (request, reply) => {
    const { peerId, disconnectFromPeerId } = request.body as {
      peerId: string;
      disconnectFromPeerId: string;
    };

    const user = await userRepository.findOne({ where: { peerId } });
    const otherUser = await userRepository.findOne({ where: { peerId: disconnectFromPeerId } });

    if (!user || !otherUser) {
      return reply.code(404).send({ error: "One or both peers not found" });
    }

    // Remove peers from each other's connected peers lists
    user.connectedPeers = user.connectedPeers.filter(id => id !== disconnectFromPeerId);
    otherUser.connectedPeers = otherUser.connectedPeers.filter(id => id !== peerId);

    await userRepository.save(user);
    await userRepository.save(otherUser);

    return reply.code(200).send({ success: true });
  });
}

function generatePeerToken(peerId: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const timestamp = Date.now();
  const data = `${peerId}:${timestamp}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}
