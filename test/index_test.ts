import { expect } from 'chai';
import uuid from 'uuid';
import Redis from 'ioredis';
import cacheMachine from '../src/';

const redis = new Redis();
const cache = cacheMachine(redis);

describe('cache machine', () => {
  it('get and sets', async () => {
    await cache.set('test', 1);
    const value = await cache.get('test');
    expect(value).to.equal(1);
  });

  it('rateLimit', async () => {
    const key = `ratelimit:${uuid.v4()}`;
    let limited = await cache.rateLimit(key, 1, 1);
    expect(limited).to.equal(false);
    limited = await cache.rateLimit(key, 1, 1);
    expect(limited).to.equal(true);
  });

  it('get and del', async () => {
    await cache.set('test2', 'test');
    const value = await cache.getAndDel('test2', null);
    expect(value).to.equal('test');
    const value2 = await cache.get('test2');
    expect(value2).to.equal(null);
  });

  it('get or set', async () => {
    let called = false;
    const key = `test3:${uuid.v4()}`;
    let value = await cache.getOrSet(key, () => {
      called = true;
      return 1;
    });
    expect(called).to.equal(true);
    expect(value).to.equal(1);

    // reset
    called = false;
    value = await cache.getOrSet(key, () => {
      called = true;
      return 'test';
    });

    expect(called).to.equal(false);
    expect(value).to.equal(1);
  });
});