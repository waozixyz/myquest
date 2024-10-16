import { DataSource } from "typeorm";
import { Todo } from "../../shared/models/todo";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "todos.db",
  entities: [Todo],
  synchronize: true,
  logging: false,
});
