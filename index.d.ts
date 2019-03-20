import { RedisClient } from 'redis';

declare function OrdermentumCacheMachine(
  redis: RedisClient
): {
  redis: RedisClient;

  parse: (val: string) => object | false;

  set: (key: string, value: any, ttl?: number) => Promise<any>;

  get: (key: string, defaultValue?: any | null) => Promise<any>;

  getOrSet: (key: string, fallback?: () => any, ttl?: number) => Promise<any>;

  getAndDel: (key: string) => Promise<any>;

  rateLimit: (key: string, limit?: number, window?: number) => Promise<boolean>;
};

export = OrdermentumCacheMachine;
