import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./auth";
import { setupTaskRoutes } from "./tasks";
import session from "express-session";
import passport from "passport";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "autotrack-ai-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
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

  const httpServer = createServer(app);

  return httpServer;
}
