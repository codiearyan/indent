# The timetable that reordered itself

## What you will be able to do

With the receipts fixed, Cinderbay's next problem is on the screen above the dock. By the end of this issue you will be able to:

- explain how `sort()` compares values when you give it no compare function
- explain why `sort()` changes the array you call it on, and why that hurts the caller
- fix a function so it sorts by value and never touches its input
- write a test that catches the fix which sorts correctly but still in place

## The ticket

Dario Fenn runs the dock and the harbour tours. He sends a photo of the board at ten in the morning.

> **Dario:** The board says the next tours are at 17:00, 18:30 and 10:00. People are queuing for the wrong boat. And the full day underneath is scrambled too, it starts at 17:00, but the timetable file is in order, I checked. CPC-12, please.

The board does two things in order: it asks `nextDepartures(harbourTour, now)` for the next three tours, then prints every tour in `harbourTour`.

## The idea: two surprises in one method

`sort()` holds two surprises, and interviewers love that this one function has both.

The first is the default order. Without a compare function, `sort()` converts every value to a string and compares the strings character by character. As text, `'1020'` comes before `'540'` because `'1'` comes before `'5'`.

The second is that `sort()` works in place. It rearranges the array you call it on and returns that same array, not a new one. Any other code holding a reference to that array now sees the new order. `reverse()`, `splice()`, `push()` and `fill()` behave the same way.

```js
const scores = [9, 40, 100]
const ranked = scores.sort()
console.log(ranked) // [100, 40, 9]
console.log(scores) // [100, 40, 9], the caller's array changed too
console.log(ranked === scores) // true
```

Put the two together and you get Dario's board: the next tours come back in text order, and because the board's own `harbourTour` array was sorted in place, the full day prints in text order too.

A function that changes an argument it was not asked to change is said to have a side effect on its caller. The caller had no reason to expect it, which is why bugs like this survive code review.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It plays the board: next tours, then the whole day. Both are wrong. Now prove each half in data. In `src/reproduce.js`, copy the timetable, keep a second copy as `before`, call the original `nextDepartures` with the first copy and return the result and the copy as `after`. Seeing `before` and `after` side by side is the proof that the function changes what it was handed.

## How to fix it

Two changes, and you need both:

1. Give `sort` a compare function. It receives two values and returns a negative number when the first should come first, a positive number when the second should, and zero when they tie. For numbers, their difference does exactly that.
2. Sort a new array, never the one you were given. `filter` already returns a new array, so filtering first and then sorting is enough. Spreading into a copy works too, and recent Node versions also have `toSorted()`, which returns a sorted copy.

The obvious fix is to add the compare function and stop there. The board's next tours become right, the ticket looks closed, and the function still reorders the caller's array. It just reorders it into numeric order, which happens to look tidy for this timetable. Any caller that relied on its own order, such as a list in the order staff typed it in, is still broken.

## How to test it

You need two kinds of assertion. One checks the result: pass times that sort differently as text and as numbers, and expect them earliest first. The other checks the input: keep a reference to the array you pass in, call the function, and expect that array to still be in the order you wrote. Start it unsorted, or the in place fix will slip through.

Run `npx vitest run src/departures.test.js`. The check runs your tests beside the original, a correct fix and the in place fix, and expects fail, pass, fail.
