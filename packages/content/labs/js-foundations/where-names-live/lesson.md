# Where a name lives

## What you will be able to do

Theo has been watching you write functions, and over the weekend he wrote four of his own. They almost work. One stops with an error, one ignores the sale, one always answers about the same zone, and one gives back nothing at all. Every one of them has the same kind of problem: a name used in a place where it does not live, or where it should not be used. Where a name can be used is called its scope. By the end of this issue you will be able to:

- say where a name made with `let` or `const` can be used
- read a `ReferenceError` and find the name it is about
- spot a name inside braces that hides one outside
- explain why a function should use only what it is given

## The request from Theo

> **Theo:** I wrote these myself, I am quite proud. But the label one crashes, the sale price never changes, every parcel gets "Hand delivered" and the packing note comes out as undefined. I read them ten times and they look right to me. What am I missing?

All four tasks are in `src/scope.js`.

## A name lives inside its braces

Curly braces make a block: the body of a function, the parts of an `if`, the body of a loop. A name made with `let` or `const` inside a block lives from that line to the closing brace, and nowhere else.

```js
function seatGuests(guests) {
  if (guests > 6) {
    const room = 'garden room'
    console.log(room) // fine, inside the braces
  }
  console.log(room) // ReferenceError: room is not defined
}
```

Outside the braces, `room` does not exist, so Node stops with `ReferenceError: room is not defined`. The error names the line and the name. When you see it, find where that name is made and ask whether this line is inside the same braces.

The fix is to make the name in the block where you need it, and only give it values in the inner blocks:

```js
let room
if (guests > 6) {
  room = 'garden room'
} else {
  room = 'front room'
}
```

## Inside sees out, outside cannot see in

Blocks sit inside each other, and a block can see every name made in the blocks around it. The body of an `if` inside a function can use the function's parameters and anything made at the top of the file. The other way round does not work: the top of the file cannot see the names made inside a function.

That is why each function's parameters are private to it. Two functions can both have a parameter called `guests` without ever mixing them up.

## A name inside can hide one outside

Make a new name inside a block with the same name as one outside, and the inside one hides the outside one until the closing brace. This is called shadowing.

```js
function priceForGroup(guests) {
  let price = guests * 400
  if (guests > 8) {
    let price = guests * 350 // a new price, only inside these braces
  }
  return price // the first price: the discount is lost
}
```

There is no error. The code runs and gives a wrong answer, which is harder to spot. The word `let` is what made the second name. To change the outer `price`, write `price = guests * 350` with no `let`.

## A function should use only what it is given

A function can see names at the top of the file, so it can read them, and even change a `let`. It runs without an error, but it causes two quiet problems.

**Reading** a name from outside makes the function answer about that name instead of what it was asked:

```js
const todaysGuests = 4

function teaPots(guests) {
  return Math.ceil(todaysGuests / 3) // always about today's 4 guests
}
```

`teaPots(12)` gives the same answer as `teaPots(2)`. Use the parameter.

**Changing** a name from outside, instead of giving back an answer, means every call shares that one name. A second call overwrites what the first one left there, and the caller gets `undefined`. A function that takes what it needs as parameters and hands its answer back with `return` gives the same answer for the same values every time. It is easy to check, and easy to use anywhere.

## Your work in this issue

Open `src/scope.js`. Each task is one of Theo's functions, with a comment saying what it should do. Keep the function names and their parameters. Run `node src/scope.js` first: it stops with an error at Task 1, because that is Theo's crashing function. Fix it and run again to see the rest. Check calls each function on its own, so a function that is still broken does not stop the others from passing. Keep the last line of the file as it is.
