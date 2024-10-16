import { FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

export const setupJWT = (fastify: any) => {
  fastify.register(jwt, {
    secret: "your_jwt_secret_here",
  });

  fastify.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      throw new Error("Unauthorized");
    }
  });
};
