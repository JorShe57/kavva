import NodeCache from 'node-cache';
import { logger } from '../middleware/logger';

const cacheLogger = logger.child('cache');

// Cache TTL in seconds
const DEFAULT_TTL = 60 * 5; // 5 minutes
const LONG_TTL = 60 * 60; // 1 hour

// Create cache instances for different types of data
export const userCache = new NodeCache({ 
  stdTTL: DEFAULT_TTL,
  checkperiod: 120, // Check every 2 minutes for expired items
  useClones: false, // Don't clone objects when getting/setting (better performance)
});

export const boardCache = new NodeCache({ 
  stdTTL: DEFAULT_TTL, 
  checkperiod: 120,
  useClones: false,
});

export const taskCache = new NodeCache({ 
  stdTTL: DEFAULT_TTL, 
  checkperiod: 120,
  useClones: false,
});

export const statsCache = new NodeCache({ 
  stdTTL: LONG_TTL, 
  checkperiod: 300, // Check every 5 minutes
  useClones: false,
});

// Generic function to get data from cache or fallback to database
export async function getOrSetCache<T>(
  cache: NodeCache,
  key: string,
  dbFallback: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Try to get from cache first
  const cachedData = cache.get<T>(key);
  
  if (cachedData !== undefined) {
    cacheLogger.debug(`Cache hit for key: ${key}`);
    return cachedData;
  }
  
  // Cache miss, fetch from database
  cacheLogger.debug(`Cache miss for key: ${key}, fetching from database`);
  try {
    const data = await dbFallback();
    
    // Store in cache for future requests
    cache.set(key, data, ttl);
    
    return data;
  } catch (error) {
    cacheLogger.error(`Error fetching data for cache key: ${key}`);
    cacheLogger.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Clear specific keys from cache
export function clearCache(cache: NodeCache, keys: string | string[]): void {
  if (typeof keys === 'string') {
    cache.del(keys);
    cacheLogger.debug(`Cleared cache key: ${keys}`);
  } else {
    cache.del(keys);
    cacheLogger.debug(`Cleared ${keys.length} cache keys`);
  }
}

// Clear all caches
export function clearAllCaches(): void {
  userCache.flushAll();
  boardCache.flushAll();
  taskCache.flushAll();
  statsCache.flushAll();
  cacheLogger.info('All caches have been cleared');
}

// Set up automatic cache cleanup for when memory gets too high
const MEMORY_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const memoryUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
  
  if (memoryUsageRatio > 0.85) { // If using more than 85% of allocated heap
    cacheLogger.warn(`High memory usage detected (${heapUsedMB}MB / ${heapTotalMB}MB), clearing all caches`);
    clearAllCaches();
  }
}, MEMORY_CHECK_INTERVAL);

// Export cache stats function
export function getCacheStats() {
  return {
    users: {
      keys: userCache.keys().length,
      hits: userCache.getStats().hits,
      misses: userCache.getStats().misses,
    },
    boards: {
      keys: boardCache.keys().length,
      hits: boardCache.getStats().hits,
      misses: boardCache.getStats().misses,
    },
    tasks: {
      keys: taskCache.keys().length,
      hits: taskCache.getStats().hits,
      misses: taskCache.getStats().misses,
    },
    stats: {
      keys: statsCache.keys().length,
      hits: statsCache.getStats().hits,
      misses: statsCache.getStats().misses,
    }
  };
}