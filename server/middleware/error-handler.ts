import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { log } from '../vite';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates this is a known operational error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  errors: any[];
  
  constructor(message: string, errors: any[]) {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`The requested ${resource} was not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(`Database error: ${message}`, 500);
  }
}

// Catch Zod validation errors and convert them to ValidationError
export function handleZodError(error: z.ZodError): ValidationError {
  return new ValidationError('Validation error', error.errors);
}

// Global error handler middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || undefined;

  // Log the error
  const timestamp = new Date().toISOString();
  const logLevel = statusCode >= 500 ? 'ERROR' : 'WARN';
  const logMessage = `[${logLevel}] [${timestamp}] ${statusCode} - ${message}`;
  
  if (statusCode >= 500) {
    // For server errors, log the stack trace
    log(`${logMessage}\n${err.stack}`, 'error');
  } else {
    // For client errors (4xx), just log the message
    log(logMessage, 'warn');
  }

  // If in production, don't expose error details for 500 errors
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
    errors = undefined;
  }

  // Send the error response
  const errorResponse: Record<string, any> = { message };
  if (errors) errorResponse.errors = errors;
  
  res.status(statusCode).json(errorResponse);
}

// Middleware to handle non-existent routes
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  // Skip API routes that don't exist - they'll be handled by the client router
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  next(new NotFoundError('endpoint'));
}

// Async handler to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};