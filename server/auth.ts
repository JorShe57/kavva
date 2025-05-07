import type { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { compare, hash } from "bcrypt";

export function setupAuthRoutes(app: Express) {
  // Set up Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        
        // Check if password is correct
        // For a real app, you would compare hashed passwords here
        if (password !== user.password) {
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
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Create user
      // In a real app, you would hash the password before storing it
      const user = await storage.createUser({ username, password });
      
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
  app.post("/api/auth/login", (req, res, next) => {
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
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json(req.user);
  });
}
