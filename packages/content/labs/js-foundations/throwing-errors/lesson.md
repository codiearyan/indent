# Errors of your own

## What you will be able to do

Every error so far came from Node: a `ReferenceError` for a name it did not know, a `TypeError` for reading from `undefined`, a `SyntaxError` from `JSON.parse`, which you caught. Your own code can stop with an error too, on purpose, when it is handed something that makes no sense. That is often far better than carrying on with a wrong answer. By the end of this issue you will be able to:

- throw an error of your own, with a message that says what was wrong
- pick the kind of error that fits
- catch an error where something can be done about it, and let it pass everywhere else
- tell one kind of error from another

## The request from Theo

> **Theo:** Last week someone ordered zero fig candles, and the site took the order. Ines packed an empty box. Someone else typed an sku we do not sell, and the order page broke with a message about undefined. When an order is wrong, I want the site to say no and tell the customer why. But when the site itself is broken, I want to know about it, not see a polite message that hides it.

All four tasks are in `src/orders.js`.

## Throwing an error

`throw` stops a function on the spot and sends an error up to whoever called it. The error is made with `new`, the way you made a `Map`, and its message goes in the brackets:

```js
function bookSeats(free, wanted) {
  if (wanted > free) {
    throw new RangeError(`Only ${free} seats left, ${wanted} wanted`)
  }
  return free - wanted
}
```

Nothing after `throw` runs, and the function gives nothing back. When no code catches the error, the program stops and Node prints it:

```
Booking
file:///Users/you/workspace/src/cinema.js:3
    throw new RangeError(`Only ${free} seats left, ${wanted} wanted`)
          ^

RangeError: Only 3 seats left, 5 wanted
    at bookSeats (file:///Users/you/workspace/src/cinema.js:3:11)
    at bookForGroup (file:///Users/you/workspace/src/cinema.js:9:10)
    at file:///Users/you/workspace/src/cinema.js:13:1
```

It is the same kind of report as Node's own errors, because Node's errors are made the same way. The `at` lines read from the inside out: the error was thrown in `bookSeats`, at line 3, which `bookForGroup` called at line 9, which line 13 called.

`throw` accepts any value, text included, but throw an error made with `new`. `throw 'No seats left'` stops the program with only the text: no kind, no file, no `at` lines to say where it came from.

## A message that says what was wrong

The message is read by whoever has to fix the problem: you in the terminal, or a customer on the site. "Something went wrong" helps neither. Say which value was wrong and what was expected: `Only 3 seats left, 5 wanted`. A template literal puts the values in.

## Picking the kind

JavaScript has a few kinds of error, and you have met some of them:

- `Error`, the plain kind, for anything
- `TypeError`, a value of the wrong kind, such as reading a property of `undefined`
- `RangeError`, a value outside what is allowed: a number too small or too large, or a name that is not on the list

Each is made with `new` and a message. Pick the one that says what happened. The kind lets the code that catches the error tell it apart from the others.

## Where to catch

An error that is not caught inside a function leaves it and goes to the function that called it, then to the one that called that, until a `try` catches it or the program stops.

Catch it where something can be done about it. The page that books seats can tell the customer "Only 3 seats left". A function in the middle, which only adds up the seats of a group, can do nothing about it. It has no `try`, and the error passes through it.

Catching an error and carrying on as if nothing happened is called swallowing it:

```js
try {
  return bookSeats(free, wanted)
} catch {
  return 0
}
```

Whoever called this gets `0` seats left and never learns that the booking failed. Printing the error in the `catch` does not help them either.

## Telling one kind from another

A `catch` catches every error, of every kind: the customer's mistake, and also a `TypeError` from a bug. To treat them differently, ask what kind it is. `instanceof` asks whether a value was made as a given kind:

```js
try {
  return bookSeats(free, wanted)
} catch (error) {
  if (error instanceof RangeError) {
    return `Sorry: ${error.message}`
  }
  throw error
}
```

The customer's mistake gets an answer. Any other error is thrown again with `throw error`: the same error, with its kind, message and `at` lines, as if this `catch` had not been there. A bug should stop the program and be fixed, not turn into a polite reply. An error also has `error.name`, the kind as text, such as `'RangeError'`.

## Your work in this issue

Open `src/orders.js`. Tasks 1 and 2 throw: a quantity that makes no sense, and a candle the shop does not have. Task 3 adds up a cart and lets a wrong line pass. Task 4 catches where it can answer the customer, and only then. Run `node src/orders.js` after each task. Check calls your functions with orders of its own, and for Tasks 3 and 4 it stands in for the functions they call, so each task is judged by itself.
