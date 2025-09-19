// Redis stub for build time
export class RedisStub {
  constructor(...args: any[]) {
    // Do nothing
  }

  on(...args: any[]) {
    return this;
  }

  async ping() {
    throw new Error("Redis not available during build");
  }

  async quit() {
    return "OK";
  }

  async info() {
    return "";
  }

  async get() {
    return null;
  }

  async set() {
    return "OK";
  }

  async del() {
    return 0;
  }

  async exists() {
    return 0;
  }

  async expire() {
    return 1;
  }

  async ttl() {
    return -1;
  }
}

export const createRedisClient = () => {
  const isBuildTime =
    process.env.NODE_ENV === "production" && !process.env.REDIS_URL;

  if (isBuildTime) {
    return new RedisStub();
  }

  try {
    const { Redis } = require("ioredis");
    return new Redis(
      process.env.REDIS_URL || {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true,
      },
    );
  } catch (error) {
    console.warn("Redis not available, using stub");
    return new RedisStub();
  }
};
