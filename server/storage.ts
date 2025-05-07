import { users, tasks, taskBoards, type User, type InsertUser, type Task, type InsertTask, type TaskBoard, type InsertTaskBoard } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Task board methods
  async getBoard(id: string): Promise<TaskBoard | undefined> {
    // Safely convert id to number, otherwise return undefined
    const boardId = Number(id);
    if (isNaN(boardId)) {
      return undefined;
    }
    
    const result = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId));
    return result[0];
  }
  
  async getBoardsByUserId(userId: number): Promise<TaskBoard[]> {
    return db.select().from(taskBoards).where(eq(taskBoards.userId, userId));
  }
  
  async createBoard(board: InsertTaskBoard): Promise<TaskBoard> {
    const result = await db.insert(taskBoards).values(board).returning();
    return result[0];
  }
  
  // Task methods
  async getTask(id: string): Promise<Task | undefined> {
    // Safely convert id to number, otherwise return undefined
    const taskId = Number(id);
    if (isNaN(taskId)) {
      return undefined;
    }
    
    const result = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return result[0];
  }
  
  async getTasksByBoardId(boardId: string): Promise<Task[]> {
    // Safely convert id to number, otherwise return empty array
    const parsedBoardId = Number(boardId);
    if (isNaN(parsedBoardId)) {
      return [];
    }
    
    return db.select().from(tasks).where(eq(tasks.boardId, parsedBoardId));
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }
  
  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    // Safely convert id to number
    const taskId = Number(id);
    if (isNaN(taskId)) {
      throw new Error("Invalid task ID");
    }
    
    // Ensure completedAt is a valid Date object
    if (taskUpdate.completedAt) {
      taskUpdate.completedAt = new Date(taskUpdate.completedAt);
    }
    
    const result = await db
      .update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, taskId))
      .returning();
    return result[0];
  }
  
  async deleteTask(id: string): Promise<void> {
    // Safely convert id to number
    const taskId = Number(id);
    if (isNaN(taskId)) {
      throw new Error("Invalid task ID");
    }
    
    await db.delete(tasks).where(eq(tasks.id, taskId));
  }
}

export const storage = new DatabaseStorage();
