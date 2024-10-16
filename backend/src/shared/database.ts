// src/shared/database.ts

import { DataSource } from "typeorm";
import { User } from "./models/user";
import { Todo } from "./models/todo";

export const AppDataSource = new DataSource({
  type: "postgres", // or your preferred database
  host: "localhost",
  port: 5432,
  username: "your_username",
  password: "your_password",
  database: "your_database",
  entities: [User, Todo],
  synchronize: true, // Be careful with this in production
  logging: false,
});
