import Redis from 'ioredis';

declare function OrdermentumCacheMachine(
  redis: Redis.Redis
): {
  redis: Redis.Redis;
  parse(str: string): object | false;
  set(name: string, value: any, ttl?: number): Promise<any>;
  get(setName: string, defaultValue?: any): Promise<any>;
  getOrSet(name: string, fallback?: () => Promise<void>, ttl?: number): Promise<any>;
  rateLimit(key: string, limit?: number, window?: number): Promise<boolean>;
  getAndDel(id: string): Promise<any>;
  addWithScore(key: string, data: any, score?: number, transaction?: Boolean): Promise<any>;
  createTransaction(): Promise<any>;
  popAtCurrentTimestamp(key: string, transaction?: Boolean): Promise<any>;
  removeFromSet(key: string, data: string, transaction?: Boolean): Promise<any>;
  delete(key: string, transaction?: boolean): Promise<any>;
  currentSetCount(key: string, transaction?: boolean): Promise<any>;
  getKeysMatchingUsingScan(pattern: string, splitBy?: string): Promise<string[]>;
  getKeysMatching(pattern: string, splitBy?: string): Promise<string[]>;
  sortedSetCounts(keys: string[], time?: number): Promise<{}>;
};

export = OrdermentumCacheMachine;
