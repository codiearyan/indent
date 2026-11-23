# All or nothing

## What you will be able to do

Each change your store makes is safe on its own: a stop leaves it whole or leaves it out. But some changes only make sense together. This last issue makes several changes one, and then moves the shop's stock onto your store. By the end of it you can:

- write a batch of changes that a store opened later sees all of, or none of
- refuse a batch that is not right before anything of it is written
- keep the shop's stock counts in your own store, an order at a time

## The request from Hesper

> **Hesper:** An order for 200 cards and 200 envelopes is one order. If the power goes halfway, I want both counts as they were, or both taken off. Not the cards gone and the envelopes still on the shelf. Then move the stock onto the new store, and we can stop worrying about `stock.json`.

With what your store does today, an order is two `set` calls, two records. A stop between them leaves the first and not the second, and nothing in the log says anything was missing. Run `node src/try.js` once the batch is written and you will see the order cut short come back untouched.

## A batch has an end

A record cut short is safe because the reader can tell it is short: it knows where the record should end. A batch needs the same thing, one level up. Its changes must be written so the reader knows where the whole batch ends, and takes its changes only when all of it is there.

Think of a crate of glass delivered with a packing list on the lid: "6 panes". The person unpacking counts. Five panes in the crate means something went wrong in transit, and the whole delivery goes back, not five sixths of it.

There are two common ways to put that list on the lid:

- a header record that says how many records follow, then those records; the batch counts only when all of them are whole
- one record that holds every change of the batch inside it, so the batch is whole exactly when that record is

Either way, write the whole batch with one `appendFile`, so the bytes go out together and the batch is one piece in the log. A batch cut short is then left out like a record cut short, and cut off the file the same way, so the next change starts clean. The store's memory takes the batch's changes only once the batch is written.

## Check, then write

A batch can also go wrong before it reaches the disk: one of its changes may be a number where text belongs, or an `op` that is neither `set` nor `delete`. If the store makes the first two changes before it notices the third, that is half a batch again, made by its own code this time.

So `batch` goes through every change first and only checks. At the first one that is not right, it throws a `TypeError`, and nothing has happened yet. Only when all of them pass does it write the batch and make the changes. An empty batch is not a mistake: it changes nothing and writes nothing.

## The stock on your store

The shop's stock now goes in `src/stock.js`. Each function is given the store, and a count is kept as text in digits, `'1200'`, because keys and values are text: `Number()` and `String()` turn it into a number and back.

`takeOrder` is where a batch earns its place. Work out every new count first, in a `Map` of item to count, because an item may be on two lines and the second line must start from what the first one left. If any count would go below zero, throw an `Error` that names the item and change nothing. Otherwise, make every new count in one batch: the whole order, or none of it.

What Ashgrove has now is a small database you can explain line by line. Honest about its limits too: it has one writer, it keeps every key in memory, and it does not ask the system to flush to the disk. Within those, it keeps its promise: a stop at any moment leaves what was there before, or what came after, and never half of a change.

## Your work in this issue

Tasks 1 and 2 are `batch` in `src/db.js`; task 3 is `src/stock.js`. Try your work with:

```sh
node src/try.js
```

It puts Idris's counts into the store as one batch, takes a delivery and an order, refuses an order there are not enough posters for, then cuts the log halfway through one more order and opens the store again. The check judges a batch by cutting `store.log` at every byte inside it. It runs `stock.js` on a right store of its own, so the stock task never waits on the first two.
