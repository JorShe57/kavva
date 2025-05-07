
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';

// Rate limiter configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { message: 'Too many login attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Error handler middleware
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

// Health check endpoint
const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
};

export function setupMiddleware(app: Express) {
  // Security
  app.use(helmet());
  app.use(compression());
  
  // Rate limiting
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/', apiLimiter);
  
  // Health check
  app.get('/health', healthCheck);
  
  // Error handling - should be last
  app.use(errorHandler);
}
