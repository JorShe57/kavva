import type { Express } from "express";
import {
  initializeAchievementBadges,
  initializeUserStats,
  handleTaskCompleted,
  handleTaskCreated,
  handleAITasksGenerated,
  getNewAchievements,
  markAchievementsAsDisplayed,
  getUserBadgesWithDetails
} from "./gamification";
import { storage } from "./storage";
import { db } from "./db";
import { userAchievements, achievementBadges, userStats, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function setupGamificationRoutes(app: Express) {
  // Initialize badges and ensure system is ready
  app.get("/api/gamification/init", async (req, res) => {
    try {
      await initializeAchievementBadges();
      res.json({ success: true, message: "Gamification system initialized" });
    } catch (error) {
      console.error("Failed to initialize gamification:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to initialize gamification",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get user stats
  app.get("/api/gamification/stats", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const stats = await initializeUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get user stats:", error);
      res.status(500).json({ 
        message: "Failed to get user stats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get user badges
  app.get("/api/gamification/badges", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const badges = await getUserBadgesWithDetails(userId);
      res.json(badges);
    } catch (error) {
      console.error("Failed to get user badges:", error);
      res.status(500).json({ 
        message: "Failed to get user badges",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get all available badges (for displaying in a badge gallery)
  app.get("/api/gamification/all-badges", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      
      // Get all badges
      const allBadges = await db.select().from(achievementBadges);
      
      // Get user's earned badges
      const earnedBadges = await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      
      const earnedBadgeIds = earnedBadges.map(badge => badge.badgeId);
      
      // Add an "earned" property to each badge
      const badgesWithEarnedStatus = allBadges.map(badge => ({
        ...badge,
        earned: earnedBadgeIds.includes(badge.id)
      }));
      
      res.json(badgesWithEarnedStatus);
    } catch (error) {
      console.error("Failed to get all badges:", error);
      res.status(500).json({ 
        message: "Failed to get all badges",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check for new achievements (for displaying achievement notifications)
  app.get("/api/gamification/new-achievements", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      
      // Get new (unviewed) achievements with badge details
      const newAchievements = await db.select({
        id: userAchievements.id,
        badgeId: userAchievements.badgeId,
        earnedAt: userAchievements.earnedAt,
        name: achievementBadges.name,
        description: achievementBadges.description,
        icon: achievementBadges.icon,
        type: achievementBadges.type,
        level: achievementBadges.level
      })
      .from(userAchievements)
      .innerJoin(
        achievementBadges, 
        eq(userAchievements.badgeId, achievementBadges.id)
      )
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.displayed, false)
        )
      );
      
      res.json(newAchievements);
    } catch (error) {
      console.error("Failed to check new achievements:", error);
      res.status(500).json({ 
        message: "Failed to check new achievements",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Mark achievements as viewed
  app.post("/api/gamification/mark-viewed", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const { achievementIds } = req.body;
      
      if (!achievementIds || !Array.isArray(achievementIds)) {
        return res.status(400).json({ message: "Achievement IDs are required" });
      }
      
      await markAchievementsAsDisplayed(userId, achievementIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark achievements as viewed:", error);
      res.status(500).json({ 
        message: "Failed to mark achievements as viewed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get leaderboard (top users by points)
  app.get("/api/gamification/leaderboard", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Join with users table to get usernames
      // Simple approach: just get the stats without the username
      const leaderboard = await db.select({
        userId: userStats.userId,
        points: userStats.points,
        level: userStats.level,
        tasksCompleted: userStats.tasksCompleted,
        daysStreak: userStats.daysStreak
      })
      .from(userStats)
      .orderBy(userStats.points)
      .limit(10);
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      res.status(500).json({ 
        message: "Failed to get leaderboard",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Manually trigger a task completion (for testing)
  app.post("/api/gamification/trigger-task-completed", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const { taskId } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ message: "Task ID is required" });
      }
      
      // Check if task belongs to user
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const board = await storage.getBoard(String(task.boardId));
      if (!board || board.userId !== userId) {
        return res.status(403).json({ message: "Forbidden - task doesn't belong to user" });
      }
      
      const updatedStats = await handleTaskCompleted(userId, taskId);
      
      res.json({
        success: true,
        stats: updatedStats
      });
    } catch (error) {
      console.error("Failed to trigger task completion:", error);
      res.status(500).json({ 
        message: "Failed to trigger task completion",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}