import { 
  users, tasks, taskBoards, 
  type User, type InsertUser, 
  type Task, type InsertTask, 
  type TaskBoard, type InsertTaskBoard,
  insertTaskSchema, insertTaskBoardSchema, insertUserSchema
} from "@shared/schema";
import { executeDbOperation } from "./db";
import { eq, and } from "drizzle-orm";
import { DbValidator } from "./middleware/db-validator";
import { NotFoundError, DatabaseError } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { 
  userCache, boardCache, taskCache, 
  getOrSetCache, clearCache 
} from "./services/cacheService";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task board methods
  getBoard(id: string): Promise<TaskBoard | undefined>;
  getBoardsByUserId(userId: number): Promise<TaskBoard[]>;
  createBoard(board: InsertTaskBoard): Promise<TaskBoard>;
  
  // Task methods
  getTask(id: string): Promise<Task | undefined>;
  getTasksByBoardId(boardId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const storageLogger = logger.child('storage');
    
    try {
      if (!id || typeof id !== 'number') {
        storageLogger.warn(`Invalid user ID: ${id}`);
        return undefined;
      }
      
      storageLogger.info(`Fetching user with ID: ${id}`);
      
      // Use cache with database fallback
      return await getOrSetCache<User | undefined>(
        userCache,
        `user:${id}`,
        async () => {
          return await executeDbOperation(async (db) => {
            const result = await db.select().from(users).where(eq(users.id, id));
            
            if (result.length === 0) {
              storageLogger.info(`User not found with ID: ${id}`);
              return undefined;
            }
            
            return result[0];
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching user: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const storageLogger = logger.child('storage');
    
    try {
      if (!username || typeof username !== 'string') {
        storageLogger.warn(`Invalid username: ${username}`);
        return undefined;
      }
      
      storageLogger.info(`Fetching user with username: ${username}`);
      
      // Use cache with database fallback
      return await getOrSetCache<User | undefined>(
        userCache,
        `user:username:${username}`,
        async () => {
          return await executeDbOperation(async (db) => {
            const result = await db.select().from(users).where(eq(users.username, username));
            
            if (result.length === 0) {
              storageLogger.info(`User not found with username: ${username}`);
              return undefined;
            }
            
            return result[0];
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching user by username: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const storageLogger = logger.child('storage');
    
    try {
      if (!email || typeof email !== 'string') {
        storageLogger.warn(`Invalid email: ${email}`);
        return undefined;
      }
      
      storageLogger.info(`Fetching user with email: ${email}`);
      
      // Use cache with database fallback
      return await getOrSetCache<User | undefined>(
        userCache,
        `user:email:${email}`,
        async () => {
          return await executeDbOperation(async (db) => {
            const result = await db.select().from(users).where(eq(users.email, email));
            
            if (result.length === 0) {
              storageLogger.info(`User not found with email: ${email}`);
              return undefined;
            }
            
            return result[0];
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching user by email: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const storageLogger = logger.child('storage');
    
    return DbValidator.createRecord(
      insertUserSchema,
      insertUser,
      async (validData: InsertUser) => {
        storageLogger.info(`Creating user: ${validData.username}`);
        
        const result = await executeDbOperation(async (db) => {
          const inserted = await db.insert(users).values(validData).returning();
          
          if (!inserted.length) {
            throw new Error('Failed to create user');
          }
          
          // Clear any cached versions of this user
          if (inserted[0].id) {
            clearCache(userCache, `user:${inserted[0].id}`);
          }
          if (inserted[0].username) {
            clearCache(userCache, `user:username:${inserted[0].username}`);
          }
          if (inserted[0].email) {
            clearCache(userCache, `user:email:${inserted[0].email}`);
          }
          
          return inserted;
        });
        
        storageLogger.info(`User created with ID: ${result[0].id}`);
        return result[0];
      }
    );
  }
  
  // Task board methods
  async getBoard(id: string): Promise<TaskBoard | undefined> {
    const storageLogger = logger.child('storage');
    
    try {
      // Safely convert id to number, otherwise return undefined
      const boardId = Number(id);
      if (isNaN(boardId)) {
        storageLogger.warn(`Invalid board ID format: ${id}`);
        return undefined;
      }
      
      storageLogger.info(`Fetching board with ID: ${boardId}`);
      
      // Use cache with database fallback
      return await getOrSetCache<TaskBoard | undefined>(
        boardCache,
        `board:${boardId}`,
        async () => {
          return await executeDbOperation(async (db) => {
            const result = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId));
            
            if (result.length === 0) {
              storageLogger.info(`Board not found with ID: ${boardId}`);
              return undefined;
            }
            
            return result[0];
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching board: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching board: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getBoardsByUserId(userId: number): Promise<TaskBoard[]> {
    const storageLogger = logger.child('storage');
    
    try {
      // Check if user exists
      const user = await this.getUser(userId);
      if (!user) {
        storageLogger.warn(`User not found with ID: ${userId}`);
        return [];
      }
      
      storageLogger.info(`Fetching boards for user: ${userId}`);
      
      // Use cache with database fallback
      return await getOrSetCache<TaskBoard[]>(
        boardCache,
        `boards:user:${userId}`,
        async () => {
          return await executeDbOperation(async (db) => {
            return await db.select().from(taskBoards).where(eq(taskBoards.userId, userId));
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching boards: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching boards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createBoard(board: InsertTaskBoard): Promise<TaskBoard> {
    const storageLogger = logger.child('storage');
    
    return DbValidator.createRecord(
      insertTaskBoardSchema,
      board,
      async (validData: InsertTaskBoard) => {
        storageLogger.info(`Creating board: ${validData.title} for user: ${validData.userId}`);
        
        // Validate that user exists
        const userExists = await this.getUser(validData.userId);
        if (!userExists) {
          throw new NotFoundError("User");
        }
        
        const result = await executeDbOperation(async (db) => {
          const inserted = await db.insert(taskBoards).values(validData).returning();
          
          if (!inserted.length) {
            throw new Error('Failed to create board');
          }
          
          return inserted;
        });
        
        // Invalidate cache for boards list
        clearCache(boardCache, `boards:user:${validData.userId}`);
        
        storageLogger.info(`Board created with ID: ${result[0].id}`);
        return result[0];
      }
    );
  }
  
  // Task methods
  async getTask(id: string): Promise<Task | undefined> {
    const storageLogger = logger.child('storage');
    
    try {
      // Safely convert id to number, otherwise return undefined
      const taskId = Number(id);
      if (isNaN(taskId)) {
        storageLogger.warn(`Invalid task ID format: ${id}`);
        return undefined;
      }
      
      storageLogger.info(`Fetching task with ID: ${taskId}`);
      
      // Use cache with database fallback
      return await getOrSetCache<Task | undefined>(
        taskCache,
        `task:${taskId}`,
        async () => {
          return await executeDbOperation(async (db) => {
            const result = await db.select().from(tasks).where(eq(tasks.id, taskId));
            
            if (result.length === 0) {
              storageLogger.info(`Task not found with ID: ${taskId}`);
              return undefined;
            }
            
            return result[0];
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching task: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getTasksByBoardId(boardId: string): Promise<Task[]> {
    const storageLogger = logger.child('storage');
    
    try {
      // Safely convert id to number, otherwise return empty array
      const parsedBoardId = Number(boardId);
      if (isNaN(parsedBoardId)) {
        storageLogger.warn(`Invalid board ID format: ${boardId}`);
        return [];
      }
      
      // Check if board exists
      const board = await this.getBoard(boardId);
      if (!board) {
        storageLogger.warn(`Board not found with ID: ${boardId}`);
        return [];
      }
      
      storageLogger.info(`Fetching tasks for board: ${parsedBoardId}`);
      
      // Use cache with database fallback
      return await getOrSetCache<Task[]>(
        taskCache,
        `tasks:board:${parsedBoardId}`,
        async () => {
          return await executeDbOperation(async (db) => {
            return await db.select().from(tasks).where(eq(tasks.boardId, parsedBoardId));
          });
        }
      );
    } catch (error) {
      storageLogger.error(`Error fetching tasks for board: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError(`Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const storageLogger = logger.child('storage');
    
    return DbValidator.createRecord(
      insertTaskSchema,
      task,
      async (validData: InsertTask) => {
        storageLogger.info(`Creating task: ${validData.title}`);
        const result = await db.insert(tasks).values(validData).returning();
        
        if (!result.length) {
          throw new Error('Failed to create task');
        }
        
        storageLogger.info(`Task created with ID: ${result[0].id}`);
        return result[0];
      }
    );
  }
  
  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    const storageLogger = logger.child('storage');
    
    // Safely convert id to number
    const taskId = Number(id);
    if (isNaN(taskId)) {
      throw new NotFoundError("Task");
    }
    
    // Check if task exists
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      throw new NotFoundError("Task");
    }
    
    // Ensure completedAt is a valid Date object
    if (taskUpdate.completedAt) {
      taskUpdate.completedAt = new Date(taskUpdate.completedAt);
    }
    
    // Create a partial schema that only requires the fields that are being updated
    const partialTaskSchema = insertTaskSchema.partial();
    
    return DbValidator.updateRecord(
      partialTaskSchema,
      taskUpdate,
      async (validData: Partial<Task>) => {
        storageLogger.info(`Updating task ${taskId}`);
        
        const result = await db
          .update(tasks)
          .set(validData)
          .where(eq(tasks.id, taskId))
          .returning();
        
        if (!result.length) {
          throw new NotFoundError("Task");
        }
        
        storageLogger.info(`Task ${taskId} updated successfully`);
        return result[0];
      }
    );
  }
  
  async deleteTask(id: string): Promise<void> {
    const storageLogger = logger.child('storage');
    
    return DbValidator.deleteRecord(
      id,
      async (taskId: string) => {
        // Safely convert id to number
        const parsedTaskId = Number(taskId);
        if (isNaN(parsedTaskId)) {
          throw new NotFoundError("Task");
        }
        
        // Check if task exists
        const existingTask = await this.getTask(taskId);
        if (!existingTask) {
          throw new NotFoundError("Task");
        }
        
        storageLogger.info(`Deleting task ${parsedTaskId}`);
        
        await db.delete(tasks).where(eq(tasks.id, parsedTaskId));
        
        storageLogger.info(`Task ${parsedTaskId} deleted successfully`);
      },
      "Task"
    );
  }
}

export const storage = new DatabaseStorage();
