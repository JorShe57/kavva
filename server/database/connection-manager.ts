import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from '../middleware/logger';

const dbLogger = logger.child('database');

// Configure Neon to use ws
neonConfig.webSocketConstructor = ws;

// Maximum number of connection attempts
const MAX_RETRIES = 5;
// Initial delay between reconnection attempts (in ms)
const INITIAL_RETRY_DELAY = 1000;
// Maximum delay between reconnection attempts (in ms)
const MAX_RETRY_DELAY = 15000;
// Pool configuration
const POOL_CONFIG = {
  connectionTimeoutMillis: 10000,  // Connection timeout in ms
  idleTimeoutMillis: 60000,        // How long to keep idle clients
  max: 20,                         // Maximum number of clients in the pool
};

// Database connection manager
class DatabaseConnectionManager {
  private pool: Pool | null = null;
  private db: any = null;
  private connectionString: string;
  private isConnecting: boolean = false;
  private retryCount: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    
    this.connectionString = process.env.DATABASE_URL;
    
    // Set up error handling for uncaught exceptions related to Neon
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
  }

  private calculateRetryDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      MAX_RETRY_DELAY,
      INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount)
    );
    // Add some randomness to prevent all clients from retrying at the same time
    return baseDelay * (0.8 + Math.random() * 0.4);
  }

  private handleUncaughtException(error: Error): void {
    // Only handle Neon-related errors
    if (error.message.includes('terminating connection') || 
        error.message.includes('Connection terminated') || 
        error.message.includes('Connection failed')) {
      
      dbLogger.error(`Database connection error: ${error.message}`);
      
      // If we're not already in the process of reconnecting, try to reconnect
      if (!this.isConnecting) {
        this.reconnect();
      }
    }
  }

  public async connect(): Promise<{ pool: Pool, db: any }> {
    if (this.pool && this.db) {
      return { pool: this.pool, db: this.db };
    }

    if (this.isConnecting) {
      dbLogger.info('Connection already in progress, waiting...');
      // Wait for the existing connection attempt to complete
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.pool && this.db && !this.isConnecting) {
            clearInterval(checkConnection);
            resolve({ pool: this.pool, db: this.db });
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    
    try {
      dbLogger.info('Establishing database connection...');
      
      // Create a new pool with the configuration
      this.pool = new Pool({ 
        connectionString: this.connectionString,
        ...POOL_CONFIG
      });
      
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      
      // Create Drizzle instance
      this.db = drizzle({ client: this.pool, schema });
      
      // Reset retry count on successful connection
      this.retryCount = 0;
      this.isConnecting = false;
      
      dbLogger.info('Database connection established successfully');
      
      return { pool: this.pool, db: this.db };
    } catch (error) {
      this.isConnecting = false;
      
      if (this.pool) {
        // Close the pool if it was created but connection failed
        await this.pool.end().catch(err => {
          dbLogger.error(`Error closing pool: ${err instanceof Error ? err.message : String(err)}`);
        });
        this.pool = null;
      }
      
      this.db = null;
      
      // Try to reconnect if we haven't exceeded the maximum retry count
      if (this.retryCount < MAX_RETRIES) {
        return this.reconnect();
      }
      
      dbLogger.error(`Failed to connect to database after ${MAX_RETRIES} attempts`);
      throw error;
    }
  }

  private async reconnect(): Promise<{ pool: Pool, db: any }> {
    this.retryCount++;
    const delay = this.calculateRetryDelay();
    
    dbLogger.info(`Attempting to reconnect to database in ${delay}ms (attempt ${this.retryCount}/${MAX_RETRIES})...`);
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Create a promise that resolves after the reconnection attempt
    return new Promise((resolve, reject) => {
      this.reconnectTimeout = setTimeout(async () => {
        try {
          const connection = await this.connect();
          resolve(connection);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  public async end(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pool) {
      dbLogger.info('Closing database connection pool');
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }

  // Method to execute a database operation with automatic retries
  public async executeWithRetry<T>(operation: (db: any) => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        // Ensure we have a connection
        const { db } = await this.connect();
        
        // Execute the operation
        return await operation(db);
      } catch (error) {
        attempts++;
        
        if (error instanceof Error && 
            (error.message.includes('terminating connection') || 
             error.message.includes('Connection terminated') ||
             error.message.includes('Connection failed'))) {
          
          // If it's a connection error and we haven't exceeded max retries
          if (attempts <= maxRetries) {
            const retryDelay = Math.min(500 * Math.pow(2, attempts), 5000);
            dbLogger.warn(`Database operation failed, retrying in ${retryDelay}ms (attempt ${attempts}/${maxRetries}): ${error.message}`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // Force reconnection on next attempt
            await this.end();
            continue;
          }
        }
        
        // Either it's not a connection error or we've exceeded max retries
        dbLogger.error(`Database operation failed after ${attempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    throw new Error(`Failed to execute database operation after ${maxRetries} attempts`);
  }
}

// Create a singleton instance
const connectionManager = new DatabaseConnectionManager();

// Function to get a database connection with retry logic
export async function getDbConnection() {
  return await connectionManager.connect();
}

// Function to execute a database operation with retry logic
export async function executeDbOperation<T>(operation: (db: any) => Promise<T>): Promise<T> {
  return await connectionManager.executeWithRetry(operation);
}

// Export the connection manager
export default connectionManager;