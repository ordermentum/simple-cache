const Bluebird = require('bluebird');

const builder = (redis) => {
  bluebird.promisifyAll(redis.RedisClient.prototype);
  bluebird.promisifyAll(redis.Multi.prototype);

  return {
    redis,

    parse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return false;
    }
  },

  async set(name, value, ttl = null) {
    await redis.setAsync(name, JSON.stringify(value));

    if (ttl) {
      await redis.expireAsync(name, ttl);
    }
  },

  async get(setName, defaultValue = null) {
    const result = await redis.getAsync(setName);
    return this.parse(result) || defaultValue;
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

  getAndDel(id) {
    return redis
      .multi()
      .get(id)
      .del(id)
      .execAsync()
      .then(res => parse(res[0]));
  },
};
};

module.exports = builder;
