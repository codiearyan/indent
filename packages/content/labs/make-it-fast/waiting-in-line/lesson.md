# Waiting one after another

## What you will be able to do

The three steps of work now take moments. What is left of the night is the part you measured by counting in the first issue: thousands of questions to the payments service, about four seconds each, asked one after another. This computer spends that time doing nothing. By the end of this issue you can:

- tell questions that need each other's answers from questions that do not
- ask many questions at once and keep every answer in its place
- ask at most as many at once as the other side allows
- skip the questions whose answers you already have

## The answer Hesper was waiting for

> **Hesper:** The payments company wrote back. We may have four questions open at once, and they refuse any more than that. And Idris asked me something I could not answer: why does the report ask about invoices that the order server has already marked as paid? Most of last year's are.

Look at `checkPayments` in `src/report.js`. It goes through the trade orders and, for each one, waits for the service's answer before it asks about the next. `src/try.js` counts the questions and how many were open at once: one, every time.

## Nobody needs the answer before

Some waiting has to happen in order. To book a table you first need to know which restaurant has room; the booking needs that answer. But asking three towns for tomorrow's weather is three questions that do not depend on each other. Asking them one after another adds the waits up:

```js
for (const town of towns) forecasts.push(await weatherFor(town))
```

Each `await` stops the loop until that answer is in. Calling `weatherFor(town)` without waiting starts the question and gives back a promise straight away, so you can start all of them first and then wait for all of them together. `Promise.all` takes a list of promises and gives one promise of the list of answers. Three questions of a second each then take about one second, not three.

Each payment question is about one invoice and needs nothing from any other. So they can be open together.

## No more than the service takes

All at once is not always allowed. A service that is sent five thousand questions in one go may refuse them, slow down for everyone, or decide it is under attack. The payments company said four. So the report must keep four questions open while there are invoices left, and never five.

There are two honest ways. The simple one asks in groups: four questions, wait for all four, then the next four. The time of each group is the time of its slowest answer, so a little room is wasted. The other keeps four helpers busy. Each helper takes the next id nobody has taken yet, asks, waits for its answer, and takes the next, until no ids are left. A new question starts the moment an answer comes in, so there are always four open:

```js
async function helper() {
  while (next < towns.length) {
    const i = next++
    forecasts[i] = await weatherFor(towns[i])
  }
}
```

JavaScript runs one piece of your code at a time, so two helpers can never take the same `next`: the read and the `++` happen together, before either helper waits.

## Answers in their place

Answers come back in whatever order the other side finishes them. Code that pushes each answer onto a list as it arrives gets a list in arrival order, which changes from run to run. Put each answer at the index of the question it belongs to, and the list comes out in the order you asked. `Promise.all` already does that for you.

## The question you do not ask

Idris's question is the bigger win. An invoice the order server has already marked paid will be paid tomorrow too. Asking about it costs four seconds and tells you nothing. Skip those questions and only a small share is left. Waiting together makes each question cheaper; not asking makes it free. And the list the report prints must not change: a paid order still appears, with the status `'paid'`.

## Your work in this issue

The first two tasks are in `src/together.js`: `askAll`, then `askLimited`. The third puts `askLimited` to work in `checkPayments` in `src/report.js`. Try your work with:

```sh
node src/try.js
```

It asks a stand-in service that answers in about a millisecond and counts the questions, the most open at once and the time. The check uses a service of its own that keeps every question open until it chooses to answer, so it can see exactly how many were waiting at each moment.
