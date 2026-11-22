# Change and remove

## What you will be able to do

The API can list workshops, read one and create new ones. What it cannot do yet is change its mind. Plans at a studio change every week, and so must the data. By the end of this issue you will be able to:

- replace a resource with PUT and change part of it with PATCH
- say clearly how the two differ, and why both exist
- remove a resource with DELETE and answer 204 with no body
- reuse one validator for a whole body and for part of one

## The request from Nadia

Nadia writes on a Monday morning, with three changes for the week.

> **Nadia:** The mugs class is now mugs and jugs, and the price goes up, so Sunniva will send the whole workshop again from her form. The family morning is popular: can we take fourteen instead of twelve without retyping everything else? And glazing basics is cancelled until the new glazes arrive. Take it off the page.

That is a replace, a partial change and a removal: `PUT`, `PATCH` and `DELETE` on `/workshops/:id`.

## PUT replaces

A PUT says: here is the whole thing, store exactly this at this address. The body is a complete workshop, so it is checked exactly like a POST, and a field that is missing is a problem, not a field to keep.

```js
// PUT /plants/7  { "name": "Fern", "light": "shade", "waterDays": 5 }
```

Two details matter. The id comes from the path, never from the body, so a PUT cannot move a record to another id. And in this API a PUT to an id that does not exist answers 404 rather than creating it, because the server picks the ids.

PUT is **idempotent**: sending the same request twice leaves the data the same as sending it once. That is why a page can safely try a PUT again after a timeout.

## PATCH changes part

A PATCH says: change only these fields, leave the rest. `{ "waterDays": 4 }` changes one field of the plant and keeps its name and light.

The fields that are sent still follow their rules. A PATCH that sets `waterDays` to `-3` is as wrong as a POST that does. What changes is the question about missing fields: in a PATCH they are not missing, they are simply not changing. So the validator from the last issue gets an option instead of a twin:

```js
function check(body, { partial = false } = {}) {
  // in partial mode, only test the fields the body has
}
```

The default `= {}` keeps every old call, like `check(body)`, working as before. Whatever was sent, a PATCH answers with the **whole** record after the change, so the client never has to guess what the others are.

## DELETE answers with nothing

A DELETE removes the thing at the address. When it works there is nothing left to describe, so the answer is **204 No Content**: a status and no body at all. Express quietly drops anything you hand `res.json()` with a 204, so a body there would only mislead whoever reads the code. Say what you mean and end the response without one:

```js
res.status(204).end()
```

A second DELETE of the same id finds nothing to remove and answers 404. Some APIs answer 204 again instead; both are reasonable, as long as the API picks one and keeps to it. This one says 404, so the page can tell a workshop it removed from one that was never there.

## Check in the right order

Every one of these routes asks the same questions, in the same order:

1. Is the id one the store has? If not, 404.
2. For PUT and PATCH, is the body good? If not, 400 with the fields.
3. Only then change the store, and answer.

Ask about the id first. There is no point in listing what is wrong with a body for a workshop that does not exist. And when two routes start to share the same lines, a small helper such as `notFound(res, id)` keeps them short.

## Your work in this issue

All three routes go in `src/app.js`. Start with PUT, which reuses what POST already does. For PATCH, first teach `validateWorkshop` in `src/validate.js` its `partial` option, then add the route. Finish with DELETE.

Run `node try.js` after each task. It sends a PUT, two PATCHes (one good, one with zero seats), a DELETE, and a GET of the workshop that was removed. When you are done, those answer 200, 200, 400, 204 and 404.
