import { db } from "./db";
import { 
  achievementBadges, 
  userAchievements, 
  userStats, 
  tasks
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting database migration...");

  try {
    // Create achievement_badges table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievement_badges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        type TEXT NOT NULL,
        threshold INTEGER NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Created achievement_badges table");

    // Create user_achievements table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        badge_id INTEGER NOT NULL REFERENCES achievement_badges(id),
        earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        displayed BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    console.log("Created user_achievements table");

    // Create user_stats table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
        tasks_completed INTEGER NOT NULL DEFAULT 0,
        high_priority_completed INTEGER NOT NULL DEFAULT 0,
        tasks_created INTEGER NOT NULL DEFAULT 0,
        ai_tasks_generated INTEGER NOT NULL DEFAULT 0,
        days_streak INTEGER NOT NULL DEFAULT 0,
        last_active TIMESTAMP NOT NULL DEFAULT NOW(),
        weekly_stats JSONB NOT NULL DEFAULT '{}',
        points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1
      );
    `);
    console.log("Created user_stats table");

    // Add completedAt column to tasks table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    `);
    console.log("Added completed_at column to tasks table");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Just export the migrate function
export { migrate };

// We can't check if this is the main module in ES modules easily,
// so we'll just make sure to call migrate() where needed
// in the routes.ts file

/*
// For direct execution from command line
// This would be useful in a CommonJS environment
if (require.main === module) {
  migrate()
    .then(() => {
      console.log("Migration successful, exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
*/

export default migrate;