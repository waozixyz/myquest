import { FastifyInstance } from "fastify";
import { User } from "../../shared/models/user";
import { AppDataSource } from "../config/database";
import { TelegramUser } from "../types/telegram"; // You'll need to create this type
import crypto from 'crypto';

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


function verifyTelegramAuthData(telegramUser: TelegramUser): boolean {
  const secret = crypto.createHash('sha256')
    .update(process.env.BOT_TOKEN || '')
    .digest();

  const checkString = Object.keys(telegramUser)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${telegramUser[key as keyof TelegramUser]}`)
    .join('\n');

  const hash = crypto.createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');

  return hash === telegramUser.hash;
}