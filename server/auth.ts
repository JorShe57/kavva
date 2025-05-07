import type { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { initializeUserStats } from "./gamification";
import * as bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

export function setupAuthRoutes(app: Express) {
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
  
  // Register route
  app.post("/api/auth/register", registerRateLimiter, async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email and password are required" });
      }
      
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
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Login route
  app.post("/api/auth/login", loginRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
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
        return res.json(user);
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
