import { pgTable, text, serial, integer, boolean, timestamp, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(), // Added email field
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true, // Added email to insert schema
});

// Task Board schema
export const taskBoards = pgTable("task_boards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskBoardSchema = createInsertSchema(taskBoards).pick({
  title: true,
  userId: true,
});

// Task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  assignee: text("assignee"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  boardId: integer("board_id").notNull().references(() => taskBoards.id),
  emailSource: text("email_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  // Store array of dependent task IDs (tasks that depend on this task)
  dependentTaskIds: text("dependent_task_ids").array(),
  // Store array of prerequisite task IDs (tasks that this task depends on)
  prerequisiteTaskIds: text("prerequisite_task_ids").array(),
  // Flag to indicate if a workflow should be generated for this task
  generateWorkflow: boolean("generate_workflow").default(false),
});

// Workflow schema
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull().default('[]'),
  insights: jsonb("insights").notNull().default('[]'),
  similarTasks: jsonb("similar_tasks").default('[]'),
  estimatedTotalTime: text("estimated_total_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkflowSchema = createInsertSchema(workflows).pick({
  taskId: true,
  title: true,
  description: true,
  steps: true,
  insights: true,
  similarTasks: true,
  estimatedTotalTime: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  dueDate: true,
  assignee: true,
  priority: true,
  status: true,
  boardId: true,
  emailSource: true,
  dependentTaskIds: true,
  prerequisiteTaskIds: true,
  generateWorkflow: true,
});

// Achievement badges schema
export const achievementBadges = pgTable("achievement_badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),  // Icon name or SVG path
  type: text("type").notNull(),  // Category: "task", "board", "productivity", "streak"
  threshold: integer("threshold").notNull(),  // Value needed to earn this badge
  level: integer("level").notNull().default(1), // Badge level (bronze, silver, gold)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAchievementBadgeSchema = createInsertSchema(achievementBadges).pick({
  name: true,
  description: true,
  icon: true,
  type: true,
  threshold: true,
  level: true,
});

// User achievements schema (tracks earned badges)
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => achievementBadges.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  displayed: boolean("displayed").notNull().default(false), // Whether it's been shown to user
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  userId: true,
  badgeId: true,
});

// User productivity stats schema
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  highPriorityCompleted: integer("high_priority_completed").notNull().default(0),
  tasksCreated: integer("tasks_created").notNull().default(0),
  aiTasksGenerated: integer("ai_tasks_generated").notNull().default(0),
  daysStreak: integer("days_streak").notNull().default(0),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  weeklyStats: jsonb("weekly_stats").notNull().default('{}'),  // Stores weekly completion stats
  points: integer("points").notNull().default(0),  // Gamification points
  level: integer("level").notNull().default(1),
});

export const insertUserStatsSchema = createInsertSchema(userStats).pick({
  userId: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type TaskBoard = typeof taskBoards.$inferSelect;
export type InsertTaskBoard = z.infer<typeof insertTaskBoardSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type AchievementBadge = typeof achievementBadges.$inferSelect;
export type InsertAchievementBadge = z.infer<typeof insertAchievementBadgeSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
