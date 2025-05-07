import { z } from 'zod';
import { DatabaseError, ValidationError } from './error-handler';

// Handle common database operations with validation and error handling
export class DbValidator {
  // Create a new record with validation
  static async createRecord<T>(
    schema: z.ZodType<any>,
    data: any,
    createFn: (validData: any) => Promise<T>
  ): Promise<T> {
    try {
      // Validate data against schema
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        throw new ValidationError('Validation error', validationResult.error.errors);
      }
      
      // Create record
      return await createFn(validationResult.data);
    } catch (error) {
      // Handle database-specific errors
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Transform database error messages into more user-friendly ones
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Handle unique constraint violations
        if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
          throw new ValidationError('Record already exists', [
            { message: 'A record with these details already exists' }
          ]);
        }
        
        // Handle foreign key constraint violations
        if (errorMessage.includes('foreign key constraint')) {
          throw new ValidationError('Invalid reference', [
            { message: 'Referenced record does not exist' }
          ]);
        }
        
        // Handle other database errors
        throw new DatabaseError(errorMessage);
      }
      
      throw error;
    }
  }
  
  // Update a record with validation
  static async updateRecord<T>(
    schema: z.ZodType<any>,
    data: any,
    updateFn: (validData: any) => Promise<T>
  ): Promise<T> {
    try {
      // Validate data against schema
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        throw new ValidationError('Validation error', validationResult.error.errors);
      }
      
      // Update record
      return await updateFn(validationResult.data);
    } catch (error) {
      // Handle similar errors as createRecord
      if (error instanceof ValidationError) {
        throw error;
      }
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
          throw new ValidationError('Record already exists', [
            { message: 'A record with these details already exists' }
          ]);
        }
        
        if (errorMessage.includes('foreign key constraint')) {
          throw new ValidationError('Invalid reference', [
            { message: 'Referenced record does not exist' }
          ]);
        }
        
        throw new DatabaseError(errorMessage);
      }
      
      throw error;
    }
  }
  
  // Get a record by ID with validation
  static async getRecord<T>(
    id: any,
    getFn: (id: any) => Promise<T | undefined>,
    resourceName: string
  ): Promise<T> {
    try {
      const record = await getFn(id);
      
      if (!record) {
        throw new Error(`${resourceName} not found`);
      }
      
      return record;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new ValidationError(`${resourceName} not found`, [
            { message: `The requested ${resourceName.toLowerCase()} was not found` }
          ]);
        }
        
        throw new DatabaseError(error.message);
      }
      
      throw error;
    }
  }
  
  // Delete a record with validation
  static async deleteRecord(
    id: any,
    deleteFn: (id: any) => Promise<void>,
    resourceName: string
  ): Promise<void> {
    try {
      await deleteFn(id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new ValidationError(`${resourceName} not found`, [
            { message: `The requested ${resourceName.toLowerCase()} was not found` }
          ]);
        }
        
        // Handle foreign key constraint violations when deleting
        if (error.message.includes('foreign key constraint')) {
          throw new ValidationError('Cannot delete record', [
            { message: `This ${resourceName.toLowerCase()} is referenced by other records and cannot be deleted` }
          ]);
        }
        
        throw new DatabaseError(error.message);
      }
      
      throw error;
    }
  }
}