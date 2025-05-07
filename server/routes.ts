import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./auth";
import { setupTaskRoutes } from "./tasks";
import { setupGamificationRoutes } from "./gamification-routes";
import { setupEmailRoutes } from "./email-receiver";
import { processEmailWithAI } from "./openai";
import { initializeAchievementBadges } from "./gamification";
import migrate from "./db-migrate";
import session from "express-session";
import passport from "passport";
import path from "path";
import { logger } from "./middleware/logger";
import { getDbConnection } from "./database/connection-manager";
import { getCacheStats, clearAllCaches, userCache } from "./services/cacheService";
import compression from "compression";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up compression middleware
  app.use(compression());
  
  // Set up health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      const dbStatus = { operational: false, message: "" };
      try {
        const connection = await getDbConnection();
        const client = await connection.pool.connect();
        // Test a simple query
        await client.query('SELECT 1');
        client.release();
        dbStatus.operational = true;
        dbStatus.message = "Database connection successful";
      } catch (error) {
        dbStatus.message = `Database connection error: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(dbStatus.message);
      }
      
      // Get cache statistics
      const cacheStats = getCacheStats();
      
      // Return health status
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "unknown",
        database: dbStatus,
        cache: cacheStats,
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Set up request timeout handler
  app.use((req, res, next) => {
    // Set a timeout for all requests (30 seconds)
    req.setTimeout(30000, () => {
      logger.warn(`Request timeout for ${req.method} ${req.url}`);
      res.status(503).json({ message: "Request timed out. Please try again later." });
    });
    next();
  });
  
  // Set up session middleware with PostgreSQL session store
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "autotrack-ai-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        sameSite: 'lax'
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up authentication routes
  setupAuthRoutes(app);

  // Set up task-related routes
  setupTaskRoutes(app);
  
  // Set up gamification routes
  setupGamificationRoutes(app);
  
  // Set up email receiver routes
  setupEmailRoutes(app);
  
  // Run database migrations and initialize achievement badges
  try {
    // Wait a short time to ensure database connection is established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Attempt to run migrations
    await migrate();
    
    // Initialize achievement badges 
    await initializeAchievementBadges();
    
    console.log("Database migration and achievement initialization completed successfully");
  } catch (error) {
    console.error("Error during database setup:", error);
    logger.error(`Database setup error: ${error instanceof Error ? error.message : String(error)}`);
    // We'll continue even if migration fails - the app can still partially function
  }

  // Board routes
  app.get("/api/boards", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const boards = await storage.getBoardsByUserId((req.user as any).id);
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const board = await storage.createBoard({
        title: req.body.title,
        userId: (req.user as any).id,
      });
      res.status(201).json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const board = await storage.getBoard(req.params.id);
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  // Email processing route with OpenAI
  app.post("/api/process-email", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { emailContent, boardId, assignmentOption } = req.body;
      
      if (!emailContent) {
        return res.status(400).json({ message: "Email content is required" });
      }
      
      // Verify board exists and belongs to the user
      const board = await storage.getBoard(boardId);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "You don't have permission to use this board" });
      }
      
      // Process email with OpenAI
      const extractedTasks = await processEmailWithAI(emailContent, {
        assignmentOption,
        username: (req.user as any).username
      });
      
      // Add the email source to each task
      const tasksWithSource = extractedTasks.map((task: any) => ({
        ...task,
        emailSource: emailContent,
        boardId
      }));
      
      res.json({ tasks: tasksWithSource });
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).json({ message: "Failed to process email" });
    }
  });

  // Batch create tasks
  app.post("/api/tasks/batch", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { tasks, boardId } = req.body;
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ message: "Tasks are required" });
      }
      
      // Verify board exists and belongs to the user
      const board = await storage.getBoard(boardId);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "You don't have permission to use this board" });
      }
      
      // Create all tasks
      const createdTasks = [];
      for (const task of tasks) {
        // Remove the temp ID if present
        const { id, ...taskData } = task;
        
        const newTask = await storage.createTask({
          ...taskData,
          boardId,
          userId: (req.user as any).id
        });
        
        createdTasks.push(newTask);
      }
      
      res.status(201).json({ tasks: createdTasks });
    } catch (error) {
      console.error("Error creating tasks:", error);
      res.status(500).json({ message: "Failed to create tasks" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
