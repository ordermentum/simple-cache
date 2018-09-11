const DEFAULT_EXPIRY = 86400; // 24 hours

const builder = (redis) => {
  return {
    redis,

    parse(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return false;
      }
    },

    async set(name, value, ttl = DEFAULT_EXPIRY) {
      if (ttl) {
        return redis.setAsync(name, JSON.stringify(value), 'ex', ttl);
      }

      return redis.setAsync(name, JSON.stringify(value));
    },

    async get(setName, defaultValue = null) {
      const result = await redis.getAsync(setName);
      return this.parse(result) || defaultValue;
    },

    async getOrSet(name, fallback = async () => {}, ttl = DEFAULT_EXPIRY) {
      let value = await this.get(name);
      if (!value) {
        value = await fallback();
        await this.set(name, value, ttl);
      }
      return value;
    },

    async rateLimit(key, limit = 1, window = 30) {
      const t = `temp:rate:${key}`;
      const k = `rate:${key}`;
      const response = await redis
        .multi()
        .setex(t, window, 0)
        .renamenx(t, k)
        .incr(k)
        .ttl(k)
        .execAsync();
      if (response[3] === -1) await redis.expireAsync(k, window);
      const current = response[2];
      return current > limit;
    },

    async getAndDel(id) {
      return redis
        .multi()
        .get(id)
        .del(id)
        .execAsync()
        .then(res => this.parse(res[0]));
    },
  };
};

module.exports = builder;