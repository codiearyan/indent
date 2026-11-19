# LRU cache

## The problem

A cache keeps answers you already paid for, so the next request is fast. Memory is limited, so a cache must decide what to forget. The most common rule is **least recently used** (LRU): when the cache is full, drop the entry nobody has touched for the longest time.

You build three caches. The first is the classic interview question. The other two add the details real caches need: entries that go stale, and entries that are not all the same size.

## Constraints

- `get` and `set` on the LRU cache run in O(1) average time. The check runs 600,000 operations on a cache of 100,000 entries and expects it to finish in well under three seconds.
- Keys can be any value, including numbers. Values can be anything, including `0` and `''`, so `undefined` is the only sign of a miss.
- The TTL cache takes a `now` option that returns milliseconds. The check passes a fake clock, so read the time only through it and do not use timers.
- Use TypeScript that Node can run directly: explicit `.ts` import extensions, no enums, no parameter properties. Declare fields in the class body and assign them in the constructor.

## Task 1: LRU in constant time

```ts
const cache = new LRUCache<string, number>(2)
cache.set('a', 1)
cache.set('b', 2)
cache.get('a')        // 1, and 'a' is now the most recent
cache.set('c', 3)     // full: 'b' is evicted
cache.keys()          // ['a', 'c']
```

Both `get` and `set` count as a use. `has` does not. The textbook answer is a hash map plus a doubly linked list. JavaScript has a built-in that can do both jobs, if you know one fact about how it iterates.

## Task 2: entries that expire

A cached exchange rate or session token is useless after a while. `TTLCache` adds a time to live:

```ts
const cache = new TTLCache<string, number>({ capacity: 2, ttlMs: 100, now })
// t=0   set('a', 1)
// t=99  get('a') -> 1
// t=100 get('a') -> undefined   (expired at exactly 100)
```

Reading an entry makes it recent but does not keep it alive longer. Only `set` restarts the time. When a new key arrives and the cache is full, spend expired entries first: evicting a live entry while a dead one takes up room would be a waste.

## Task 3: entries with a weight

An image cache cannot count entries, because one large image may weigh as much as a hundred thumbnails. `WeightedCache` limits the sum of weights and tells you what it removed:

```ts
const cache = new WeightedCache<string, string>({ maxWeight: 10, onEvict })
cache.set('a', 'A', 4)   // true
cache.set('b', 'B', 4)   // true
cache.set('c', 'C', 5)   // true, total would be 13, so 'a' is evicted
cache.set('x', 'X', 11)  // false, it can never fit
```

`onEvict` lets the owner clean up, for example by closing a file handle. It fires only for entries pushed out to make room, never for a replaced key or an explicit `delete`.

## How it is checked

Run `node src/demo.ts` to try each class. The check replays hidden scenarios that look at eviction order, falsy values, exact expiry boundaries, replacement and refused entries, and runs the large timing test for task 1. Each file is also type-checked.
