import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import connectionManager, { getDbConnection, executeDbOperation } from './database/connection-manager';
import { logger } from './middleware/logger';

// Initialize the connection but don't wait for it
getDbConnection().catch(err => {
  logger.error(`Initial database connection failed: ${err.message}`);
});

// These are kept for backward compatibility, but new code should use executeDbOperation
let pool: Pool;
let db: ReturnType<typeof drizzle>;

// Initialize the connection asynchronously
(async function initializeConnection() {
  try {
    const connection = await getDbConnection();
    pool = connection.pool;
    db = connection.db;
    logger.info('Database connection initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize database connection: ${error instanceof Error ? error.message : String(error)}`);
  }
})();

// Export functions for resilient database operations
export { getDbConnection, executeDbOperation, pool, db };