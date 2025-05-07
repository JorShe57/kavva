import type { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { initializeUserStats } from "./gamification";
import * as bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

export function setupAuthRoutes(app: Express) {
  // Enable Express to trust the X-Forwarded-For header
  app.set('trust proxy', 1);
  // Create rate limiters for auth endpoints
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per IP per 15 minutes
    message: { message: "Too many login attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per IP per hour
    message: { message: "Too many registration attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // General auth rate limiter for other auth endpoints
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP per 15 minutes
    message: { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Set up Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        
        // Check if password is correct using bcrypt compare
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  
  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, (user as any).id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id as number);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  // Create enhanced registration schema with additional validation
  const enhancedRegisterSchema = insertUserSchema.extend({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 
      "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
  });

  // Login validation schema
  const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
  });

  // Register route
  app.post("/api/auth/register", registerRateLimiter, async (req, res, next) => {
    try {
      // Validate input using Zod schema
      const validationResult = enhancedRegisterSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors
        });
      }
      
      const { username, email, password } = validationResult.data;
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already registered" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Hash the password with bcrypt (10 rounds of salting)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({ 
        username, 
        email, 
        password: hashedPassword 
      });
      
      // Initialize user stats
      await initializeUserStats(user.id);
      
      // Create a default board for the user
      await storage.createBoard({
        title: "My Tasks",
        userId: user.id
      });
      
      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Don't return the password in the response
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Login route
  app.post("/api/auth/login", loginRateLimiter, (req, res, next) => {
    // Validate login input
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationResult.error.errors
      });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Don't return the password in the response
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });
  
  // Logout route
  app.post("/api/auth/logout", authRateLimiter, (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", authRateLimiter, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json(req.user);
  });
}
