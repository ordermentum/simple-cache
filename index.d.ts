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
  addWithScore(key: string, data: object, score?: number, transaction?: Boolean): Promise<any>;
  createTransaction(): Promise<any>;
  popAtCurrentTimestamp(key: string, transaction?: Boolean): Promise<any>;
  remove(key: string, data: string, transaction?: Boolean): Promise<any>;
  delete(key: string, transaction?: boolean): Promise<any>;
  currentQueueCount(key: string, transaction?: boolean): Promise<any>;
  allKeys(pattern: string): Promise<string[]>;
  sortedSetCountsTillRuntime(keys: string[]): Promise<{}>;
};

export = OrdermentumCacheMachine;
