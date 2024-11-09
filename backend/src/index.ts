
import { startApiServer } from './api/app';
import { startPeerServer } from './peer/peerServer';
import { AppDataSource } from './shared/database';

async function main() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("Database connection established");
    
    // Start the API server
    await startApiServer();
    console.log("API server started");
    
    // Start the P2P sync server
    await startPeerServer();
    console.log("P2P sync server started");
  } catch (error) {
    console.error("Error starting the application:", error);
    process.exit(1);
  }
}

main();

