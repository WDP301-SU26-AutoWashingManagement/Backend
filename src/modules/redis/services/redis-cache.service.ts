import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../../../common/utils/logger';
import { redisClient } from '../../../configs/redis.config';

export interface RefreshTask {
  key: string;
  fetchFn: () => Promise<any>;
  ttlSeconds: number;
}

export class RedisCacheService {
  private readonly refreshTasks = new Map<string, RefreshTask>();
  private cronJob: ScheduledTask | null = null;

  /**
   * Helper to check if Redis connection is active and ready.
   */
  private isConnected(): boolean {
    return redisClient.isOpen && redisClient.isReady;
  }

  /**
   * Fetch a parsed JSON value from Redis.
   * Returns null if key is not found, or if Redis is down/fails.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected()) {
        logger.warn(`[RedisCache] Cannot GET "${key}": Redis connection is closed/not ready.`);
        return null;
      }
      const cachedValue = await redisClient.get(key);
      if (!cachedValue) return null;
      return JSON.parse(cachedValue) as T;
    } catch (error) {
      logger.error(`[RedisCache] Fail-safe active: Error getting key "${key}" from Redis. Falling back.`, error);
      return null;
    }
  }

  /**
   * Save a JSON-stringified value to Redis with an optional TTL (Time-To-Live in seconds).
   * Fails gracefully if Redis is down.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected()) {
        logger.warn(`[RedisCache] Cannot SET "${key}": Redis connection is closed/not ready.`);
        return;
      }
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.set(key, serialized, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error(`[RedisCache] Fail-safe active: Error setting key "${key}" in Redis.`, error);
    }
  }

  /**
   * Delete a key from Redis.
   * Fails gracefully if Redis is down.
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected()) {
        return;
      }
      await redisClient.del(key);
    } catch (error) {
      logger.error(`[RedisCache] Error deleting key "${key}" from Redis.`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected()) return;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`[RedisCache] Evicted ${keys.length} keys matching pattern: "${pattern}"`);
      }
    } catch (error) {
      logger.error(`[RedisCache] Error deleting pattern "${pattern}"`, error);
    }
  }
  /**
   * Cache-Aside core method:
   * 1. Try to read from cache first.
   * 2. If hit, return immediately.
   * 3. If miss (or Redis error), run fetchFn (db read preference: replica).
   * 4. Save results to Redis asynchronously in the background.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      logger.info(`[RedisCache] Cache HIT for key: "${key}"`);
      return cached;
    }

    logger.info(`[RedisCache] Cache MISS for key: "${key}". Fetching from database...`);
    const freshData = await fetchFn();

    if (freshData !== null && freshData !== undefined) {
      // Fire-and-forget caching to avoid blocking the client response
      this.set(key, freshData, ttlSeconds).catch((err) => {
        logger.error(`[RedisCache] Background set failed for key "${key}":`, err);
      });
    }

    return freshData;
  }

  /**
   * Registers a data-fetching task to be auto-refreshed in the background.
   * If cache is empty at registration time, it seeds the cache immediately.
   */
  registerRefreshTask(key: string, fetchFn: () => Promise<any>, ttlSeconds: number) {
    this.refreshTasks.set(key, { key, fetchFn, ttlSeconds });
    logger.info(`[RedisCache] Registered auto-refresh task for key "${key}" (TTL: ${ttlSeconds}s)`);

    // Seed immediately in background if cache is empty, ensuring no initial miss penalty
    this.get(key)
      .then((cached) => {
        if (cached === null) {
          logger.info(`[RedisCache] Cache empty for "${key}" on startup. Seeding cache...`);
          return fetchFn().then((data) => {
            if (data !== null && data !== undefined) {
              return this.set(key, data, ttlSeconds);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(`[RedisCache] Initial seeding failed for key "${key}":`, err);
      });
  }

  /**
   * Starts the background cron job to refresh all registered keys before their TTL expires.
   */
  startAutoRefreshJob(cronExpression = '*/30 * * * *') {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      logger.info(`[RedisCache] Auto-refresh background job started for ${this.refreshTasks.size} tasks.`);

      for (const [key, task] of this.refreshTasks.entries()) {
        try {
          logger.info(`[RedisCache] Refreshing cache key: "${key}"`);
          const freshData = await task.fetchFn();
          if (freshData !== null && freshData !== undefined) {
            await this.set(key, freshData, task.ttlSeconds);
            logger.info(`[RedisCache] Successfully refreshed key "${key}"`);
          }
        } catch (error) {
          logger.error(`[RedisCache] Failed to refresh key "${key}" in cron job:`, error);
        }
      }
      logger.info(`[RedisCache] Auto-refresh background job finished.`);
    });

    logger.info(`[RedisCache] Cron auto-refresh schedule configured with: "${cronExpression}"`);
  }

  /**
   * Manually triggers a refresh for a specific key.
   */
  async triggerRefresh(key: string) {
    const task = this.refreshTasks.get(key);
    if (!task) {
      logger.warn(`[RedisCache] No task registered for key "${key}"`);
      return false;
    }

    try {
      logger.info(`[RedisCache] Manually refreshing key: "${key}"`);
      const freshData = await task.fetchFn();
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, task.ttlSeconds);
        logger.info(`[RedisCache] Successfully refreshed key "${key}"`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[RedisCache] Failed to refresh key "${key}":`, error);
      return false;
    }
  }
}

export const redisCacheService = new RedisCacheService();
