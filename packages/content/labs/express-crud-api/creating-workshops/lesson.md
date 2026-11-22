# Create from a request body

## What you will be able to do

Ivo's sign-up page can now read workshops one at a time and filter the list. So far, though, every workshop comes from a file in the code. In this issue the API learns to take new ones from the people who run the studio. By the end you will be able to:

- turn on body parsing with `express.json()` and read `req.body`
- create a resource with POST and answer 201 with a `location` header
- check a body before you trust it, and answer 400 with what to fix
- save only the fields you meant to accept

## The request from Sunniva

Sunniva Holt runs the front desk and plans the studio's week. She writes from the desk computer.

> **Sunniva:** Every time we add a workshop, someone has to change the code. I want to add them myself from a small form at the desk. And last month someone typed 40 seats for the raku evening. The studio holds twenty at most. Please don't let that happen again.

That is `POST /workshops`, and a rule for each field so a form cannot send nonsense.

## Bodies need a middleware

A GET request carries everything in its URL. A POST carries its data in the body, after the headers, and Express does not read that by itself. A middleware does: a function that runs before your route, does some work on the request, and passes it on.

```js
app.use(express.json())
```

`express.json()` reads the body of every request whose `content-type` is `application/json`, parses it and puts the result in `req.body`. It has to run before the routes that need it, so it goes near the top of `createApp`. When a request has no JSON body, `req.body` stays `undefined`. Your code has to be ready for that.

## Created is its own status

A successful POST does not answer 200. It answers **201 Created**, and it says where the new thing now lives in a `location` header:

```js
app.post('/recipes', (req, res) => {
  const recipe = recipes.add(req.body)
  res.status(201).location(`/recipes/${recipe.id}`).json(recipe)
})
```

The body of the answer is the thing as it was saved, with the id the server gave it. A client that only knew what it sent now knows the id too, and the `location` is a URL it can GET straight away.

Notice who picks the id: the server. A client that could choose ids could overwrite someone else's record, or pick one that clashes.

## Never trust a body

Anything can arrive in a body. A form with a bug, an old version of the page, or someone with `curl` who wants to see what happens. The API is the last place a bad value can be stopped, so it checks every field it will save:

- Is it there, and of the right type? `"6"` in quotes is text, not a number.
- Is it within the limits that make sense for the business?
- Is the body an object at all? `null`, `[]` and `"hello"` are all valid JSON.

`typeof` helps with the last one but has two traps: `typeof null` and `typeof []` are both `"object"`.

When something is wrong, answer **400 Bad Request** and say which fields, so the form can mark each one. Return straight after, so nothing is saved:

```js
{ "error": { "code": "validation_failed", "message": "Check these fields: seats", "fields": ["seats"] } }
```

## Keep only what you expect

A body that passes every rule can still carry extra fields: `"id": 1`, or `"featured": true` from someone curious. If you hand the whole body to the store, those get saved too. This is a real class of bug, and the fix is simple: build a new object with only the fields you accept, and save that. In this repo `FIELDS` in `src/validate.js` lists them.

## Your work in this issue

Start in `src/app.js`: turn on `express.json()` and write the POST route that saves and answers 201. Then write `validateWorkshop` in `src/validate.js`, a plain function with no Express in it. Last, call it from the route and refuse a bad body with a 400.

Run `node try.js` after each task. It posts one good workshop, reads it back, then posts a bad one and one with no body at all. When you are done the first gets a 201 with a `location`, and the last two get a 400 that lists the fields.
