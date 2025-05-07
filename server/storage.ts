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

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Task board methods
  async getBoard(id: string): Promise<TaskBoard | undefined> {
    const result = await db.select().from(taskBoards).where(eq(taskBoards.id, parseInt(id)));
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
    const result = await db.select().from(tasks).where(eq(tasks.id, parseInt(id)));
    return result[0];
  }
  
  async getTasksByBoardId(boardId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.boardId, parseInt(boardId)));
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }
  
  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    const result = await db
      .update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, parseInt(id)))
      .returning();
    return result[0];
  }
  
  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, parseInt(id)));
  }
}

export const storage = new DatabaseStorage();
