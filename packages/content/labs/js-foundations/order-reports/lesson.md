# Turning orders into answers

## The request from Theo

The shop sells online too, and Theo answers every email. Until now, he copied the orders into a spreadsheet by hand every Sunday. That stopped working when the shop got its first mention in a newsletter.

> **Theo:** We have a file of last week's orders. I just want three answers: what each order came to, which candles sold best, and how much we made each day. Can you write that?

Open `src/reports.js`. All three tasks live in this one file, in order, and the top of it shows one order as an example. Every order is a plain object with an `id`, a `placedAt` timestamp, a `status` and an array of `items`. The whole week is in `src/orders.js` if you want to look. Prices are stored in cents, so `1250` means 12.50. Working in whole cents avoids rounding surprises when you add money.

## Lists answer questions

Most questions about data are one of three shapes. You know the first two:

- **Keep some**: which orders were paid? That is `filter`.
- **Change each**: what is each item worth? That is `map`.
- **Boil down**: what is the total? That is `reduce`, and it is new.

`reduce` walks the list with a running total. You give it a function and a starting value. The function gets the total so far and the next item, and what it returns is the total for the next step. After the last item, `reduce` hands back the final total.

```js
const paid = orders.filter((o) => o.status === 'paid')
const values = paid[0].items.map((i) => i.qty * i.priceCents)
const sum = values.reduce((total, v) => total + v, 0)
```

None of these change the original list. They return something new, which keeps your data safe to reuse. Always give `reduce` a starting value. Without one, an empty list throws an error. A `for...of` loop with a total, like the one you wrote for the till, gives the same answer. Use the one that reads clearer to you.

## Missing fields and defaults

Real data is uneven. Only some orders have `discountCents`. Reading a field that is not there gives `undefined`, and `100 - undefined` is `NaN`, which quietly spreads through every sum it touches.

The `??` operator gives a fallback when a value is `null` or `undefined`:

```js
const discount = order.discountCents ?? 0
```

`Math.max(0, x)` is a short way to say "never below zero".

## Counting and ranking

To find the best sellers you count units per sku, the way you counted with a `Map` before: read, add and write back.

```js
counts.set(sku, (counts.get(sku) ?? 0) + qty)
```

Sorting needs a compare function. It returns a negative number when `a` should come first and a positive number when `b` should. For "most first", subtract the other way round: `b.units - a.units`. When that is `0` you need a second rule, and `||` lets you chain one. Text compares with `<` in dictionary order, so `a.sku < b.sku` asks whether `a` comes first:

```js
list.sort((a, b) => b.units - a.units || (a.sku < b.sku ? -1 : 1))
```

Then `slice(0, n)` keeps the first `n` without failing when there are fewer.

## Grouping into an object

Revenue per day is grouping: many orders, one bucket per date. A plain object makes a good set of buckets, with the date as the key. ISO timestamps start with the date, and `slice` cuts text the way it cuts a list, so `placedAt.slice(0, 10)` gives `'2026-11-02'`. Add each order's total to its bucket, starting from `0` the first time a day appears.

## Try it

Run `node src/demo.js` in the terminal. Each line calls one of your functions on last week's orders and prints the result, or the error it threw. Write one function at a time, run the demo, and press Check when the output looks right. The check also tries inputs you have not seen, such as empty lists and ties.
