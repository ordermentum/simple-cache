import { Redis } from 'ioredis';
import 'core-js/modules/es7.symbol.async-iterator';

const DEFAULT_EXPIRY = 86400; // 24 hours

async function * keysMatching(redis, pattern) {
  async function* iterate(curs, pattern) {
    const [[cursor, keys]] = await redis
      .multi()
      .scan(curs, 'MATCH', pattern)
      .execAsync();
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
      return redis
        .multi()
        .get(id)
        .del(id)
        .exec()
        .then(res => this.parse(res[0][1]));
    },

    /*
    ** We use a sorted set with a score of unix timestamp. There will be 2 advantages for this:
    ** 1. We can query according to timestamp in the sorted set
    ** 2. We can delay execution in the consumer for an item whose time has not arrived, can be used for exponential backoff
    ** For eg. when we enqueue a sync operation with the current timestamp. The worker can look for any queued items in the sorted set using
    ** min_score 0 and max_score current_timestamp which will give the worker the above sync operation.
    ** and we enqueue an item with (current_timestamp + 10000 (10s)), the worker will not be able to see this item till 10 seconds pass
    ** essentially giving us a delayed execution.
    */
    async addWithScore(
      key: string,
      data: any,
      score?: number,
      transaction?: Boolean
    ) {
      score = score ?? Math.round(Date.now());
      if (transaction) {
        const multi = redis.multi().zadd(key, score, JSON.stringify(data));
        return multi.execAsync();
      }
      return redis.zaddAsync(key, score, JSON.stringify(data));
    },

    async createTransaction() {
      return redis.multi();
    },

    async popAtCurrentTimestamp(key: string, transaction?: Boolean) {
      const minScore = 0;
      const maxScore = Math.round(Date.now());
      if (transaction) {
        const res: string | null = await new Promise(async resolve => {
          try {
            const multi = redis.multi();
            multi.zrangebyscore(
              key,
              minScore,
              maxScore,
              'WITHSCORES',
              'LIMIT',
              0,
              1
            );
            multi.exec(async (err, results) => {
              if (err) {
                resolve(null);
              }
              const result = results[0];
              if (!result) {
                resolve(null);
              }
              resolve(result);
            });
          } catch (err) {
            resolve(null);
          }
        });
        if (!res || !res.length) {
          return false;
        }
        const entity = JSON.parse(res[0]);
        return entity;
      }
      const result = await redis.zrangebyscoreAsync(
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
      const res = result[0];
      const entity = JSON.parse(res);
      return entity;
    },

    async remove(key: string, data: string, transaction?: Boolean) {
      if (transaction) {
        const multi = redis.multi().zrem(key, data);
        return multi.execAsync();
      }
      return redis.zremAsync(key, data);
    },

    async delete(key: string, transaction?: boolean) {
      if (transaction) {
        const multi = redis.multi().del(key);
        return multi.execAsync();
      }
      return redis.delAsync(key);
    },

    async currentQueueCount(key: string, transaction?: boolean) {
      const minScore = 0;
      const maxScore = Math.round(Date.now());
      if (transaction) {
        const multi = redis.multi().zcount(key, minScore, maxScore);
        return multi.execAsync();
      }
      return redis.zcountAsync(key, minScore, maxScore);
    },
    async allKeys(pattern: string) {
      const results: string[] = [];
      for await (const key of keysMatching(redis, pattern)) {
        results.push(key.split('myob')[1]);
      }
      return results;
    },

    async sortedSetCountsTillRuntime(keys: string[]) {
      const time = Math.round(Date.now());
      const result = {};
      for (const key of keys) {
        const [count] = await redis
          .multi()
          .zcount(key, 0, time)
          .execAsync();
        result[key] = count;
      }
      return result;
    }
  };
};
