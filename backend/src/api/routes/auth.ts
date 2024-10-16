import { FastifyInstance } from "fastify";
import { User } from "../../shared/models/user";
import { AppDataSource } from "../config/database";
import { TelegramUser } from "../types/telegram"; // You'll need to create this type

export async function authRoutes(fastify: FastifyInstance) {
  const userRepository = AppDataSource.getRepository(User);

  fastify.post("/telegram-login", async (request, reply) => {
    const telegramUser = request.body as TelegramUser;

    // Verify the Telegram user data (you should implement this)
    if (!verifyTelegramAuthData(telegramUser)) {
      return reply.code(401).send({ error: "Invalid Telegram authentication data" });
    }

    // Find or create user
    let user = await userRepository.findOne({ where: { telegramId: telegramUser.id.toString() } });
    if (!user) {
      user = userRepository.create({
        telegramId: telegramUser.id.toString(),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username
      });
      await userRepository.save(user);
    }

    // Generate JWT token
    const token = fastify.jwt.sign({ userId: user.id });

    return reply.code(200).send({ token });
  });
}

// Helper function to verify Telegram auth data (you need to implement this)
function verifyTelegramAuthData(telegramUser: TelegramUser): boolean {
  // Implement verification logic here
  // You should verify the hash provided by Telegram
  // Return true if valid, false otherwise
  return true; // Placeholder
}