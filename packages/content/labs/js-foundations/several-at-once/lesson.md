# Several at once

## What you will be able to do

Every wait so far was one at a time. Often that is right: a step needs the answer of the one before. But when the questions do not depend on each other, asking them one after another only adds the waits up. This last issue is about asking several things at once, and getting the answers back in good order. By the end of it you will be able to:

- ask one after another on purpose, with `await` in a loop
- ask all together and wait for every answer with `Promise.all`
- say what happens when one of them fails, and keep the rest when you need them
- keep the answers in the order you asked, whatever order they arrive in

## The request from Theo

> **Theo:** Every morning I check the shelves the market needs and every parcel still on its way. The laptop asks the stock room about one candle, waits, asks about the next, waits. Then it starts on the parcels. It takes ages, and the stock room could count all the shelves at the same time. Oh, and when the tracker loses one parcel, the whole list disappears.

All four tasks are in `src/together.js`. The machines in `src/shop.js` print a line when they start, so the demo shows what was asked when.

## One after another

`await` inside a `for...of` loop waits for each answer before the loop goes round again:

```js
async function weighAll(ids) {
  const weights = []
  for (const id of ids) {
    weights.push(await weigh(id))
  }
  return weights
}
```

The second parcel goes on the scale only once the first is weighed. That is what you want when each step needs the last, or when the machine can only do one thing at a time. When it can do more, the waits simply add up: three parcels of a second each take three seconds.

One loop does not wait at all. `forEach` calls the function you hand it for every item, but it does not wait for an `async` function: it starts them all and finishes at once. `weighAll` written with `forEach` gives back an empty list, filled in later when nobody is looking.

## All together with Promise.all

Starting a question does not mean waiting for it. `map` can start one per item, and gives a list of promises:

```js
const asks = ids.map((id) => weigh(id))
```

A list of promises is not a promise, so it cannot be awaited as one. `Promise.all` takes such a list and gives back one promise, fulfilled with the list of all the answers once every one has arrived:

```js
async function weighAll(ids) {
  return await Promise.all(ids.map((id) => weigh(id)))
}
```

Now every parcel goes on a scale at once, and three of a second each take about one second. With an empty list, `Promise.all` is fulfilled at once with `[]`.

## Keeping the order

Answers rarely arrive in the order you asked: a light parcel is weighed before a heavy one. `Promise.all` puts each answer where its promise was in the list, so the weights come back in the order of `ids`, whichever arrived first.

Pushing answers into a list as they arrive does not do that. The list ends up in arrival order, and that order changes from one run to the next.

## When one fails

If one promise in the list fails, the promise from `Promise.all` is rejected with that error, at once. The other questions still finish, but their answers are lost:

```js
await Promise.all([weigh('P-1'), weigh('P-2')])
// rejected with Error: Scale stuck on P-2, and the weight of P-1 is gone
```

Often that is right: when one part fails, the whole job failed, and the caller should hear about it. When the other answers still matter, catch each failure on its own, before `Promise.all` sees it. The function you hand `map` can be `async`, written with the word in front of its round brackets, with a `try` and `catch` inside. Its promise never fails, and gives back something that says what went wrong for that one item:

```js
ids.map(async (id) => {
  try {
    return await weigh(id)
  } catch {
    return 'scale stuck'
  }
})
```

## Two different things at once

`Promise.all` does not care what the promises are. It can wait for two different jobs, and you can take its list apart the way you took lists apart in the catalogue:

```js
const [weights, labels] = await Promise.all([weighAll(ids), printLabels(ids)])
```

Both start before either is waited for. Writing two `await`s on two lines would start the second only once the first was done.

## Your work in this issue

Open `src/together.js`. Task 1 counts one after another. Task 2 counts all together. Task 3 tracks every parcel at once and keeps the board when one fails. Task 4 does the whole morning report in one go, with your functions from Tasks 2 and 3. Run `node src/demo.js` after each task and look at when each machine starts. Check answers the last question first, so the answers arrive in another order than they were asked.
