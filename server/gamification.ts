import { executeDbOperation } from "./db";
import { storage } from "./storage";
import { 
  achievementBadges, 
  userAchievements, 
  userStats, 
  type AchievementBadge, 
  type UserAchievement, 
  type UserStats
} from "@shared/schema";
import { eq, and, gt, gte } from "drizzle-orm";

export interface BadgeResult {
  earned: boolean;
  badge?: AchievementBadge;
}

// Initialize default badges if they don't exist
export async function initializeAchievementBadges() {
  const existingBadges = await executeDbOperation(async (db) => {
    return await db.select().from(achievementBadges);
  });
  
  if (existingBadges.length === 0) {
    // Task completion badges
    await executeDbOperation(async (db) => {
      return await db.insert(achievementBadges).values([
      {
        name: "Task Starter",
        description: "Complete your first task",
        icon: "CheckCircle",
        type: "task",
        threshold: 1,
        level: 1
      },
      {
        name: "Task Master",
        description: "Complete 10 tasks",
        icon: "CheckSquare",
        type: "task",
        threshold: 10,
        level: 2
      },
      {
        name: "Task Champion",
        description: "Complete 50 tasks",
        icon: "Award",
        type: "task",
        threshold: 50,
        level: 3
      },
      
      // Priority badges
      {
        name: "Priority Handler",
        description: "Complete 5 high-priority tasks",
        icon: "AlertCircle",
        type: "priority",
        threshold: 5,
        level: 1
      },
      {
        name: "Priority Expert",
        description: "Complete 20 high-priority tasks",
        icon: "AlertTriangle",
        type: "priority",
        threshold: 20,
        level: 2
      },
      
      // Streak badges
      {
        name: "Consistent",
        description: "Active for 3 days in a row",
        icon: "Calendar",
        type: "streak",
        threshold: 3,
        level: 1
      },
      {
        name: "Dedicated",
        description: "Active for 7 days in a row",
        icon: "CalendarDays",
        type: "streak",
        threshold: 7,
        level: 2
      },
      {
        name: "Unstoppable",
        description: "Active for 14 days in a row",
        icon: "Flame",
        type: "streak",
        threshold: 14,
        level: 3
      },
      
      // AI utilization badges
      {
        name: "AI Novice",
        description: "Generate your first tasks with AI",
        icon: "Bot",
        type: "ai",
        threshold: 1,
        level: 1
      },
      {
        name: "AI Expert",
        description: "Generate 10 tasks with AI",
        icon: "Cpu",
        type: "ai",
        threshold: 10,
        level: 2
      },
      
      // Level badges
      {
        name: "Rising Star",
        description: "Reach level 5",
        icon: "Star",
        type: "level",
        threshold: 5,
        level: 1
      },
      {
        name: "Productivity Pro",
        description: "Reach level 10",
        icon: "Trophy",
        type: "level",
        threshold: 10,
        level: 2
      }
    ]);
    });
    
    console.log("Achievement badges initialized");
  }
}

// Initialize or get user stats
export async function initializeUserStats(userId: number): Promise<UserStats> {
  const [existingStats] = await executeDbOperation(async (db) => {
    return await db.select().from(userStats).where(eq(userStats.userId, userId));
  });
  
  if (existingStats) {
    return existingStats;
  }
  
  // Create new stats for user
  const [newStats] = await executeDbOperation(async (db) => {
    return await db.insert(userStats)
      .values({ userId })
      .returning();
  });
    
  return newStats;
}

// Update user stats when a task is completed
export async function handleTaskCompleted(userId: number, taskId: string) {
  // Get user stats
  let userStat = await initializeUserStats(userId);
  
  // Get task details
  const task = await storage.getTask(taskId);
  
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Only process if this is a completion (status changed to completed)
  if (task.status !== 'completed') {
    return;
  }
  
  // Always update completedAt timestamp and status when completing task
  await storage.updateTask(taskId, { 
    completedAt: new Date(),
    status: 'completed'
  });
  
  // Update stats
  const updatedTaskCount = userStat.tasksCompleted + 1;
  const updatedHighPriorityCount = task.priority === 'high' 
    ? userStat.highPriorityCompleted + 1 
    : userStat.highPriorityCompleted;
  
  // Calculate points
  let pointsEarned = 10; // Base points for completing a task
  
  // Bonus points for high priority tasks
  if (task.priority === 'high') {
    pointsEarned += 10;
  }
  
  // Bonus points for medium priority tasks
  if (task.priority === 'medium') {
    pointsEarned += 5;
  }
  
  // Bonus points for completing before due date
  if (task.dueDate && task.dueDate > new Date()) {
    pointsEarned += 15;
  }
  
  const updatedPoints = userStat.points + pointsEarned;
  
  // Calculate new level (every 100 points = 1 level)
  const updatedLevel = Math.floor(updatedPoints / 100) + 1;
  
  // Update streak (if last active within 24 hours, keep streak, otherwise reset to 1)
  const now = new Date();
  const lastActive = userStat.lastActive;
  const hoursSinceLastActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
  
  let updatedStreak = userStat.daysStreak;
  if (hoursSinceLastActive <= 24) {
    // Within same day, streak continues
    // Check if the day has changed since last active
    const lastActiveDay = lastActive.toDateString();
    const todayString = now.toDateString();
    
    if (lastActiveDay !== todayString) {
      updatedStreak += 1;
    }
  } else if (hoursSinceLastActive <= 48) {
    // Within 48 hours, streak continues but doesn't increment
  } else {
    // More than 48 hours, reset streak
    updatedStreak = 1;
  }
  
  // Update weekly stats (JSON field)
  const weeklyStats = typeof userStat.weeklyStats === 'string' 
    ? JSON.parse(userStat.weeklyStats) 
    : userStat.weeklyStats;
    
  // Get current week number
  const currentWeek = getWeekNumber(now);
  const weekKey = `week_${currentWeek}`;
  
  if (!weeklyStats[weekKey]) {
    weeklyStats[weekKey] = { tasks: 0, highPriority: 0, points: 0 };
  }
  
  weeklyStats[weekKey].tasks += 1;
  if (task.priority === 'high') {
    weeklyStats[weekKey].highPriority += 1;
  }
  weeklyStats[weekKey].points += pointsEarned;
  
  // Save updates
  const updatedStats = await executeDbOperation(async (db) => {
    const [updated] = await db.update(userStats)
      .set({
        tasksCompleted: updatedTaskCount,
        highPriorityCompleted: updatedHighPriorityCount,
        points: updatedPoints,
        level: updatedLevel,
        daysStreak: updatedStreak,
        lastActive: now,
        weeklyStats: weeklyStats
      })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  });
    
  // Check for achievements
  await checkAndAwardAchievements(userId, updatedStats);
  
  return updatedStats;
}

// Handle creating a new task
export async function handleTaskCreated(userId: number) {
  // Get user stats
  let userStat = await initializeUserStats(userId);
  
  // Update task count
  const updatedStats = await executeDbOperation(async (db) => {
    const [updated] = await db.update(userStats)
      .set({
        tasksCreated: userStat.tasksCreated + 1,
        lastActive: new Date(),
        points: userStat.points + 2 // Small points for creating tasks
      })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  });
    
  return updatedStats;
}

// Handle AI tasks being generated
export async function handleAITasksGenerated(userId: number, count: number) {
  // Get user stats
  let userStat = await initializeUserStats(userId);
  
  // Update AI task count
  const updatedStats = await executeDbOperation(async (db) => {
    const [updated] = await db.update(userStats)
      .set({
        aiTasksGenerated: userStat.aiTasksGenerated + count,
        lastActive: new Date(),
        points: userStat.points + (5 * count) // Points for using AI features
      })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  });
    
  // Check AI badges
  await checkAndAwardAchievements(userId, updatedStats);
    
  return updatedStats;
}

// Check for achievements and award badges
async function checkAndAwardAchievements(userId: number, stats: UserStats): Promise<BadgeResult[]> {
  const results: BadgeResult[] = [];
  
  // Get all badges and earned badges within a single operation
  const [allBadges, userBadges] = await Promise.all([
    executeDbOperation(async (db) => {
      return await db.select().from(achievementBadges);
    }),
    executeDbOperation(async (db) => {
      return await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
    })
  ]);
  
  const earnedBadgeIds = userBadges.map(badge => badge.badgeId);
  
  // Check each badge to see if user qualifies
  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.includes(badge.id)) {
      continue;
    }
    
    let qualifies = false;
    
    // Check qualification based on badge type
    switch (badge.type) {
      case 'task':
        qualifies = stats.tasksCompleted >= badge.threshold;
        break;
      case 'priority':
        qualifies = stats.highPriorityCompleted >= badge.threshold;
        break;
      case 'streak':
        qualifies = stats.daysStreak >= badge.threshold;
        break;
      case 'ai':
        qualifies = stats.aiTasksGenerated >= badge.threshold;
        break;
      case 'level':
        qualifies = stats.level >= badge.threshold;
        break;
      default:
        break;
    }
    
    if (qualifies) {
      // Award the badge and update points in a transaction
      await executeDbOperation(async (db) => {
        // Award the badge
        await db.insert(userAchievements)
          .values({
            userId,
            badgeId: badge.id
          });
          
        // Add points for earning badge (more points for higher level badges)
        await db.update(userStats)
          .set({
            points: stats.points + (badge.level * 25)
          })
          .where(eq(userStats.userId, userId));
      });
      
      results.push({
        earned: true,
        badge
      });
    }
  }
  
  return results;
}

// Get newly earned and unviewed badges
export async function getNewAchievements(userId: number): Promise<UserAchievement[]> {
  return await executeDbOperation(async (db) => {
    const achievements = await db.select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.displayed, false)
        )
      );
    return achievements;
  });
}

// Mark achievements as displayed
export async function markAchievementsAsDisplayed(userId: number, achievementIds: number[]) {
  await executeDbOperation(async (db) => {
    await db.update(userAchievements)
      .set({ displayed: true })
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.displayed, false)
        )
      );
  });
}

// Get all earned badges for a user with badge details
export async function getUserBadgesWithDetails(userId: number) {
  return await executeDbOperation(async (db) => {
    const userBadges = await db.select({
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
    .where(eq(userAchievements.userId, userId))
    .orderBy(userAchievements.earnedAt);
    
    return userBadges;
  });
}

// Utility function to get the week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const daysSinceFirstDay = Math.floor(
    (date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7);
}