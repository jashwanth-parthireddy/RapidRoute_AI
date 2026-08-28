import { createClient, RedisClientType } from 'redis';
import { config } from './config';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient && isConnected) return redisClient;

  // Skip Redis entirely if no URL configured or already failed
  if (!config.redis.url || config.redis.url === '') return null;

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries >= 3) {
            console.warn('[Redis] Max retries reached — disabling Redis cache');
            isConnected = false;
            return false; // stop retrying
          }
          return Math.min(retries * 200, 1000);
        },
        connectTimeout: 2000,
      },
    }) as RedisClientType;

    redisClient.on('error', (err) => {
      if (!err.message?.includes('ECONNREFUSED') || isConnected) {
        console.warn('[Redis] Connection error (non-fatal):', err.message);
      }
      isConnected = false;
    });

    redisClient.on('ready', () => {
      isConnected = true;
      console.log('[Redis] Connected');
    });

    await redisClient.connect();
    isConnected = true;
    return redisClient;
  } catch (err) {
    console.warn('[Redis] Unavailable — running without cache');
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  } catch { /* silent */ }
}

export async function redisGet(key: string): Promise<string | null> {
  const client = await getRedis();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch { return null; }
}

export async function redisDel(key: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try { await client.del(key); } catch { /* silent */ }
}

export async function redisPublish(channel: string, message: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try { await client.publish(channel, message); } catch { /* silent */ }
}
