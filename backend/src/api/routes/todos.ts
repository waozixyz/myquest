import { FastifyInstance } from "fastify";
import { Todo } from "../../shared/models/todo";
import { AppDataSource } from "../config/database";

export async function todoRoutes(fastify: FastifyInstance) {
  const todoRepository = AppDataSource.getRepository(Todo);

  fastify.get("/todos/:day", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { day } = request.params as { day: string };
      const userId = (request.user as { userId: string }).userId;
      const todos = await todoRepository.find({ where: { day, userId } });
      return todos;
    },
  });

  fastify.post("/todos", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const todoData = request.body as Omit<Todo, 'id'>;
      const userId = (request.user as { userId: string }).userId;
      const todo = todoRepository.create({ ...todoData, userId });
      await todoRepository.save(todo);
      return reply.code(201).send(todo);
    },
  });

  fastify.delete("/todos/:id", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request.user as { userId: string }).userId;
      await todoRepository.delete({ id: parseInt(id), userId });
      return reply.code(204).send();
    },
  });

  fastify.post("/sync", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const todos = request.body as Omit<Todo, 'id'>[];
      const userId = (request.user as { userId: string }).userId;
      await AppDataSource.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.delete(Todo, { userId });
        for (const todo of todos) {
          await transactionalEntityManager.save(Todo, { ...todo, userId });
        }
      });
      const updatedTodos = await todoRepository.find({ where: { userId } });
      return reply.code(200).send(updatedTodos);
    },
  });
}