import { RedisClient } from 'redis';

declare function OrdermentumCacheMachine(
  redis: RedisClient
): {
  redis: RedisClient;

  set: (key: string, value: any, ttl?: number) => string;

  get: (key: string) => any;

  getAndDel: (id: string) => any;
};

export = OrdermentumCacheMachine;
