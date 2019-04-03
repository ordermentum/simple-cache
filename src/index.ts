import { Redis } from 'ioredis';

const DEFAULT_EXPIRY = 86400; // 24 hours

const builder = (redis: Redis) => {
  return {
    redis,

    parse(str: string) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return false;
      }
    },

    async set(name: string, value: any, ttl = DEFAULT_EXPIRY) {
      if (ttl) {
        return redis.set(name, JSON.stringify(value), 'ex', ttl);
      }

      return redis.set(name, JSON.stringify(value));
    },

    async get(setName: string, defaultValue: any = null) {
      const result = await redis.get(setName);
      return this.parse(result) || defaultValue;
    },

    async getOrSet(name: string, fallback = async () => {}, ttl = DEFAULT_EXPIRY) {
      let value = await this.get(name);
      if (!value) {
        value = await fallback();
        await this.set(name, value, ttl);
      }
      return value;
    },

    async rateLimit(key: string, limit = 1, window = 30) {
      const t = `temp:rate:${key}`;
      const k = `rate:${key}`;
      const response = await redis
        .multi()
        .setex(t, window, 0)
        .renamenx(t, k)
        .incr(k)
        .ttl(k)
        .exec();
      if (response[3][1] === -1) await redis.expire(k, window);
      const current = response[2][1];
      return current > limit;
    },

    async getAndDel(id: string) {
      return redis
        .multi()
        .get(id)
        .del(id)
        .exec()
        .then(res => this.parse(res[0][1]));
    },
  };
};

module.exports = builder;