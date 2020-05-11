import { Redis } from 'ioredis';
import 'core-js/modules/es7.symbol.async-iterator';

const DEFAULT_EXPIRY = 86400; // 24 hours

async function* keysMatching(redis, pattern) {
  async function* iterate(curs, pattern) {
    const [[,[cursor,keys]]] = await redis
      .multi()
      .scan(curs, 'MATCH', pattern)
      .exec();
    for (const key of keys) yield key;
    if (cursor !== '0') yield* iterate(cursor, pattern);
  }
  yield* iterate(0, pattern);
}

export default (redis: Redis) => {
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

    async getOrSet(name: string, fallback = async () => { }, ttl = DEFAULT_EXPIRY) {
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
      const res = await redis
        .multi()
        .get(id)
        .del(id)
        .exec();
      return this.parse(res[0][1]);
    },
    
    async addWithScore(
      key: string,
      data: any,
      score?: number,
      transaction?: Boolean
    ) {
      score = score ?? Math.round(Date.now());
      if (transaction) {
        return redis.multi().zadd(key, score, JSON.stringify(data)).exec();
      }
      return redis.zadd(key, score, JSON.stringify(data));
    },

    async createTransaction() {
      return redis.multi();
    },

    async popAtCurrentTimestamp(key: string, transaction?: Boolean) {
      const minScore = 0;
      const maxScore = Math.round(Date.now());
      if (transaction) {
        try {
          const result = await redis.multi().zrangebyscore(
            key,
            minScore,
            maxScore,
            'WITHSCORES',
            'LIMIT',
            0,
            1
          ).exec();
          if (!result || !result.length) {
            return null;
          }
          const entity = JSON.parse(result[0][1][0]);
          return entity;
        } catch (err) {
          return null;
        }
      }
      const result = await redis.zrangebyscore(
        key,
        minScore,
        maxScore,
        'WITHSCORES',
        'LIMIT',
        0,
        1
      );
      if (!result || !result.length) {
        return false;
      }
      const res = result[0][1][0];
      const entity = JSON.parse(res);
      return entity;
    },

    async removeFromSet(key: string, data: string, transaction?: Boolean) {
      if (transaction) {
        return redis.multi().zrem(key, data).exec();
      }
      return redis.zrem(key, data);
    },

    async delete(key: string, transaction?: boolean) {
      if (transaction) {
        return redis.multi().del(key).exec();
      }
      return redis.del(key);
    },

    async currentSetCount(key: string, transaction?: boolean) {
      const minScore = 0;
      const maxScore = Math.round(Date.now());
      if (transaction) {
        return redis.multi().zcount(key, minScore, maxScore).exec();
      }
      return redis.zcount(key, minScore, maxScore);
    },
    async getKeysMatchingUsingScan(pattern: string, splitBy?: string) {
      const results: string[] = [];
      for await (const key of keysMatching(redis, pattern)) {
        results.push(splitBy ? key.split(splitBy)[1] : key);
      }
      return results;
    },

    async sortedSetCounts(keys: string[], time: number = Math.round(Date.now())) {
      const result = {};
      for (const key of keys) {
        const [[,count]] = await redis
          .multi()
          .zcount(key, 0, time)
          .exec();
        result[key] = count;
      }
      return result;
    },
    async getKeysMatching(pattern: string, splitBy?: string) {
      const results: string[] = [];
      const keys = await redis.keys(pattern);
      for await (const key of keys) {
        results.push(splitBy ? key.split(splitBy)[1] : key);
      }
      return results;
    }
  };
};
