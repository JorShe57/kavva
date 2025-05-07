import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import compression from "compression";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";

const app = express();

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://autotracker.app', /\.replit\.app$/] // Allow our domains in production
    : ['http://localhost:5000', 'http://localhost:3000'], // Allow local development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true, // Allow cookies to be sent with requests
  maxAge: 86400 // Cache preflight requests for 24 hours
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  level: 6, // Balanced between speed and compression ratio
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses for browsers that don't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression by default
    return compression.filter(req, res);
  }
}));

// Body parsing middleware
app.use(express.json({
  limit: '10mb', // Increase payload size limit
  verify: (req: Request, res: Response, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).send({ message: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Handle 404 errors for API routes
    app.use(notFoundHandler);

    // Global error handling middleware
    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Set up graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message}`);
      logger.error(error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:');
      logger.error(reason);
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server running on port ${port}`);
    });

  } catch (error) {
    logger.error('Fatal error during server startup:');
    logger.error(error);
    process.exit(1);
  }
})();
