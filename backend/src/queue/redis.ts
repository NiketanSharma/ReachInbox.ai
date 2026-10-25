import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';

export function getRedisOptions(): RedisOptions {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
    lazyConnect: true,
  };
}

let redisClientInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClientInstance) {
    redisClientInstance = new Redis(getRedisOptions());
    redisClientInstance.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });
    redisClientInstance.on('error', (err) => {
      console.warn('⚠️ Redis connection error:', err.message);
    });
  }
  return redisClientInstance;
}
