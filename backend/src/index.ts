// src/index.ts

import { startApiServer } from './api/app';
import { startTelegramBot } from './bot/bot';
import { AppDataSource } from './shared/database';

async function main() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("Database connection established");

    // Start the API server
    await startApiServer();
    console.log("API server started");

    // Start the Telegram bot
    await startTelegramBot();
    console.log("Telegram bot started");
  } catch (error) {
    console.error("Error starting the application:", error);
    process.exit(1);
  }
}

main();
