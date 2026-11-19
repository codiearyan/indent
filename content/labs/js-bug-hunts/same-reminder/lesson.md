# Every text went to the same customer

## What you will be able to do

Cinderbay started sending a text to each customer shortly before their boat is ready. The code was copied from an old script on the till. By the end of this chapter you will be able to:

- explain what a closure captures: a variable, not the value it had
- explain why `var` in a loop gives every callback the last value
- fix the loop so each callback gets its own binding
- test timer code quickly with a fake timer, and catch a fix that sends too early

## The ticket

Rosa forwards a message from a customer, then adds her own.

> **Rosa:** Priya got three texts on Saturday morning about her single kayak. Amara and Joon got nothing and turned up late, Amara was not happy. The text log says all three went to Priya's number. Can you look at CPC-19?

The text log:

```
08:30:00 to +44 7700 900303  Hi Priya, your single kayak is ready at 10:00.
09:00:00 to +44 7700 900303  Hi Priya, your single kayak is ready at 10:00.
09:30:00 to +44 7700 900303  Hi Priya, your single kayak is ready at 10:00.
```

The timings were right. The person was wrong every time except the last.

## The idea: a closure keeps the variable, not a snapshot

A function created inside another scope can still use that scope's variables later. That is a closure. The important word is variables: the function does not copy the value when it is created, it keeps a link to the variable and reads it when it runs.

`var` has function scope. A `var` declared inside a loop body is one single variable for the whole function, and every pass of the loop overwrites it. The callbacks given to the timer run after the loop has finished, so they all read that one variable, which now holds the last booking.

`let` and `const` have block scope, and a loop creates a new block on every pass. Each pass gets a fresh binding, so each callback closes over its own.

```js
const fns = []
for (var n = 1; n <= 3; n++) fns.push(() => n)
console.log(fns.map((f) => f())) // [4, 4, 4]

const fresh = []
for (let k = 1; k <= 3; k++) fresh.push(() => k)
console.log(fresh.map((f) => f())) // [1, 2, 3]
```

The same trap appears without loops: read a shared variable, `await` something, then use it, and another call may have changed it meanwhile.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It schedules Saturday's reminders with real timers and prints each text. To capture the bug in data without waiting, use a fake timer: a function with the same arguments as `setTimeout` that only saves the callback. In `src/reproduce.js`, schedule with a fake timer and a `send` that records each text, then call every saved callback yourself. That is exactly what the real timers do, only instant and under your control.

## How to fix it

Give every booking its own binding. Declare it with `const` inside the loop, or loop with `for...of`, which also makes a fresh binding each pass. Changing only the counter to `let` is a common half fix: the counter is per pass, but `booking` is still one shared `var`.

There is a tempting wrong fix too. Someone sees that the text is built too late, so they build it in the loop and write `setTimer(send(phone, text), delay)`. The texts are right now, but `send(...)` runs immediately and the timer receives its return value instead of a function. Every reminder goes out at once, hours early. Timer functions take a function to call later.

Also keep the callback holding its own booking object. A callback that looks up `bookings[i]` when it fires depends on the caller never changing the array afterwards.

## How to test it

Inject a fake `setTimer` that saves `{ callback, ms }`. Then a test can check two moments: right after scheduling, nothing has been sent and the delays are right; after running the callbacks, each customer got their own text. The first moment catches the send too early fix, the second catches the original bug.

Run `npx vitest run src/reminders.test.js`. The check runs your tests beside the original, a correct fix and the send too early fix, and expects fail, pass, fail.
