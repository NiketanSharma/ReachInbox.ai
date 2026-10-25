import { getRedisClient } from '../queue/redis';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowTimestamp: number;
}

export class RateLimiterService {
  private fallbackMemoryCounters: Map<string, { count: number; expiresAt: number }> = new Map();

  /**
   * Calculates the current 1-hour window bucket timestamp (in ms).
   * E.g. 14:23:45 -> 14:00:00.000
   */
  public getCurrentHourWindow(): number {
    return Math.floor(Date.now() / 3600000) * 3600000;
  }

  /**
   * Generates the Redis key for a given sender and hour window.
   */
  private getRedisKey(senderEmail: string, windowTimestamp: number): string {
    return `ratelimit:${senderEmail.toLowerCase().trim()}:${windowTimestamp}`;
  }

  /**
   * Atomically checks and increments the email count for a sender in the current hour window.
   * Safe across multiple distributed workers via Redis INCR + EXPIRE.
   */
  public async checkAndIncrement(senderEmail: string, maxPerHour: number): Promise<RateLimitCheckResult> {
    const windowTimestamp = this.getCurrentHourWindow();
    const nextWindowTimestamp = windowTimestamp + 3600000;
    const redisKey = this.getRedisKey(senderEmail, windowTimestamp);

    try {
      const redis = getRedisClient();

      // Atomic check and increment pipeline
      const count = await redis.incr(redisKey);
      if (count === 1) {
        // First request in this window, set TTL of 2 hours (7200 seconds)
        await redis.expire(redisKey, 7200);
      }

      if (count <= maxPerHour) {
        return {
          allowed: true,
          currentCount: count,
          limit: maxPerHour,
          nextWindowTimestamp,
        };
      }

      return {
        allowed: false,
        currentCount: count,
        limit: maxPerHour,
        nextWindowTimestamp,
      };
    } catch (redisError) {
      console.warn('⚠️ [RateLimiter] Redis unavailable, using local memory counter fallback:', (redisError as Error).message);

      // Local fallback for standalone testing
      const now = Date.now();
      const memKey = `${senderEmail.toLowerCase()}:${windowTimestamp}`;
      const entry = this.fallbackMemoryCounters.get(memKey);

      let currentCount = 1;
      if (entry && entry.expiresAt > now) {
        currentCount = entry.count + 1;
        entry.count = currentCount;
      } else {
        this.fallbackMemoryCounters.set(memKey, {
          count: 1,
          expiresAt: nextWindowTimestamp,
        });
      }

      return {
        allowed: currentCount <= maxPerHour,
        currentCount,
        limit: maxPerHour,
        nextWindowTimestamp,
      };
    }
  }

  /**
   * Retrieves the current email count sent in the active hour window for a sender.
   */
  public async getSenderCurrentCount(senderEmail: string): Promise<number> {
    const windowTimestamp = this.getCurrentHourWindow();
    const redisKey = this.getRedisKey(senderEmail, windowTimestamp);

    try {
      const redis = getRedisClient();
      const val = await redis.get(redisKey);
      return val ? parseInt(val, 10) : 0;
    } catch {
      const entry = this.fallbackMemoryCounters.get(`${senderEmail.toLowerCase()}:${windowTimestamp}`);
      return entry ? entry.count : 0;
    }
  }

  /**
   * Resets the rate limit counter for a sender (helpful for demos and testing).
   */
  public async resetRateLimit(senderEmail: string): Promise<void> {
    const windowTimestamp = this.getCurrentHourWindow();
    const redisKey = this.getRedisKey(senderEmail, windowTimestamp);

    try {
      const redis = getRedisClient();
      await redis.del(redisKey);
    } catch {
      this.fallbackMemoryCounters.delete(`${senderEmail.toLowerCase()}:${windowTimestamp}`);
    }
  }
}

export const rateLimiterService = new RateLimiterService();
