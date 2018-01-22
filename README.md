# cache-machine

simple cache built on redis


## usage

```javascript
const cache = require('cache-machine')(redis);
await cache.set('my-key', { test: true });
await cache.get('my-key');
await cache.getAndDel('my-key');
const limited = await cache.rateLimit('my-key', 1, 60);
if (limited) console.log('oh no');
```