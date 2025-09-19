import { logger } from "@/app/lib/logger/logger";

// Redis client configuration for both regular Redis and Upstash
class RedisClient {
  private static instance: RedisClient;
  private redis: any = null;
  private connected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private initialized = false;

  private constructor() {
    // Don't initialize connection in constructor
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      // Dynamically import ioredis only when needed
      const { Redis } = await import("ioredis");

      // Support both standard Redis and Upstash Redis
      if (process.env.REDIS_URL) {
        // Standard Redis connection
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          lazyConnect: true,
        });
      } else if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        // Upstash Redis REST API connection
        this.redis = new Redis({
          host: process.env.UPSTASH_REDIS_REST_URL.replace(
            "https://",
            "",
          ).replace("http://", ""),
          port: 6379,
          password: process.env.UPSTASH_REDIS_REST_TOKEN,
          tls: {},
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          lazyConnect: true,
        });
      } else {
        logger.warn("No Redis configuration found. Running without cache.");
        return;
      }

      this.setupEventListeners();
    } catch (error) {
      logger.error("Failed to initialize Redis connection:", error);
      this.redis = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.redis) return;

    this.redis.on("connect", () => {
      this.connected = true;
      this.connectionAttempts = 0;
      logger.info("Redis connected successfully");
    });

    this.redis.on("ready", () => {
      this.connected = true;
      logger.info("Redis ready for commands");
    });

    this.redis.on("error", (error: any) => {
      this.connected = false;
      logger.error("Redis connection error:", error);

      // Attempt to reconnect with exponential backoff
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        this.connectionAttempts++;
        const delay = Math.pow(2, this.connectionAttempts) * 1000;
        setTimeout(() => this.initializeConnection(), delay);
      }
    });

    this.redis.on("close", () => {
      this.connected = false;
      logger.warn("Redis connection closed");
    });

    this.redis.on("reconnecting", () => {
      logger.info("Redis reconnecting...");
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeConnection();
      this.initialized = true;
    }
  }

  public async isConnected(): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.redis) return false;

    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  public async getClient(): Promise<any> {
    await this.ensureInitialized();
    return this.redis;
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }

  // Health check method for monitoring
  public async healthCheck(): Promise<{
    connected: boolean;
    latency: number | null;
    memory?: any;
  }> {
    await this.ensureInitialized();
    if (!this.redis) {
      return { connected: false, latency: null };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const latency = Date.now() - startTime;

      // Get memory info if available
      let memory;
      try {
        const info = await this.redis.info("memory");
        memory = this.parseRedisInfo(info);
      } catch {
        // Ignore memory info errors (might not be available in some Redis setups)
      }

      return {
        connected: true,
        latency,
        memory,
      };
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return { connected: false, latency: null };
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split("\r\n");
    const memory: any = {};

    lines.forEach((line) => {
      if (line.includes(":")) {
        const [key, value] = line.split(":");
        if (key.startsWith("used_memory")) {
          memory[key] = parseInt(value) || value;
        }
      }
    });

    return memory;
  }
}

// Export singleton getter to avoid immediate initialization
const getRedisClientInstance = () => RedisClient.getInstance();

// Export Redis instance for backward compatibility
export const getRedisClient = async (): Promise<any> => {
  const client = await getRedisClientInstance().getClient();
  return client;
};

// Connection health check function
export const checkRedisHealth = async () => {
  return await getRedisClientInstance().healthCheck();
};

// For compatibility with existing code that uses redisClient
export const redisClient = {
  getClient: async () => await getRedisClientInstance().getClient(),
  isConnected: async () => await getRedisClientInstance().isConnected(),
  disconnect: async () => await getRedisClientInstance().disconnect(),
  healthCheck: async () => await getRedisClientInstance().healthCheck(),
};
