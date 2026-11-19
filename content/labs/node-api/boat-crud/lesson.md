# The fleet as a resource

## What you will be able to do

Quotes work, and Luka's booking page shows real prices. The fleet itself is still a list typed into `fleet.js`. By the end of this issue you will be able to:

- keep data in memory behind a small store with a clear interface
- map create, read, update and delete onto HTTP methods and paths
- answer with the status codes clients expect: 201, 204, 404 and 409
- avoid a classic bug where callers change your data by accident

## The next message

Bram Okafor runs the dock and fixes whatever floats.

> **Bram:** Pike has a crack in the hull, so she is out until spring. We also bought a new single called Kestrel, TW-09. Right now I have to ask you to edit a file every time. Can I just do it from the booking page's back office?

So the fleet becomes a **resource**: a collection at `/boats` and one item per boat at `/boats/:code`.

## One resource, five operations

Each operation is a method on a path:

| Request | Meaning | Success |
| --- | --- | --- |
| `GET /boats` | list the fleet | 200 |
| `GET /boats/TW-02` | read one boat | 200 |
| `POST /boats` | add a boat | 201 |
| `PATCH /boats/TW-02` | change some fields | 200 |
| `DELETE /boats/TW-02` | retire a boat | 204 |

The router in `src/app.js` now understands patterns like `/boats/:code` and hands each handler `{ store, params }`, so `params.code` is `'TW-02'` for the request above.

## Status codes that carry meaning

- **201 Created** says a new thing exists. Add a `location` header with its address, so the client can fetch it without building the URL itself.
- **204 No Content** says it worked and there is nothing to send back. The body must be empty, so write the status and end the response.
- **404 Not Found** on `/boats/TW-99` says the route exists but that boat does not.
- **409 Conflict** says the request is fine on its own but clashes with what is already stored, like a second boat with code TW-01.

`createApp` turns any thrown `HttpError` into a JSON error, so a handler can throw a 404 the moment it knows, and the store can throw its own 409.

## A store with a small interface

Handlers should not reach into a `Map` directly. Put the data behind a store with `list`, `get`, `create`, `update` and `remove`. Today it is memory; one day it may be a database, and only the store changes.

Each `createApp()` call makes its own store from a seed. That is what lets the checks start a fresh app with three boats and know exactly what is in it.

## Copies at the boundary

Objects in JavaScript are shared by reference. Look at this cache of opening hours:

```js
const hours = new Map([['mon', { open: '09:00' }]])
const getHours = (day) => hours.get(day)

getHours('mon').open = '11:00'
console.log(hours.get('mon').open) // '11:00'
```

The caller only meant to change its own copy, and changed the cache for everyone. The same happens with an object passed in: if the store keeps the exact object a caller gave it, the caller can change it later without asking. The fix is to copy on the way in and on the way out. A spread, `{ ...boat }`, is enough here because a boat has no nested objects.

This also matters for the seed. Two apps made from the same `fleet` array must not share boats, or a delete in one test would show up in another.

## Try it

Run `node try.js`. Until the store exists, it stops early and shows you where `createApp` failed. When you are done it reads TW-02, adds Kestrel (201 with a `location`), tries to add Kestrel again (409), takes her off the water with a PATCH, deletes her (204) and shows that she is gone (404).
