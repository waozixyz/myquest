// src/api/app.ts

import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { todoRoutes } from "./routes/todos";
import { authRoutes } from "./routes/auth";
import { setupJWT } from "./auth/jwt";

const fastify: FastifyInstance = Fastify({
  logger: true,
});

async function startApiServer() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
    });

    // Setup JWT
    setupJWT(fastify);

    await fastify.register(cors, {
      origin: ["http://localhost", "http://localhost:80"],
      credentials: true
    });
    
    // Register routes
    fastify.register(authRoutes);
    fastify.register(todoRoutes);

    // Start the server
    await fastify.listen({ port: 8080 });
    console.log(`Server is running on http://localhost:8080`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export { startApiServer };
