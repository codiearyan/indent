# Types for values

## What you will be able to do

The order sheet compiles now, and Imogen has a second file for you: the order form. Every field a customer fills in reaches the code as text, even the number of tins, and Rafe's code used that text as it came. Some of the time JavaScript turned it into a number by luck; some of the time it glued numbers together. In this issue you write your own types for the first time. By the end of it you will be able to:

- name the three simplest types and write them on a value
- say what type the compiler works out by itself, and see it in the editor
- turn text into a number or a boolean, so its type is honest
- write a type to make the compiler check what it would let through

## The request from Bryn

> **Bryn:** I pack the orders, and the form tells me what to pack. Yesterday it said the shelf had 4012 tins of Hearth Assam after a delivery. We have forty. Imogen says the form sends everything as text and nobody told the code. Can you sort the form out so the numbers are numbers?

All four tasks are in `src/order-form.ts`.

## Three types for simple values

Most values in a program are text, numbers, or true and false. TypeScript names them:

- `string` for text: `'Hearth Assam'`, `''`, `'125'`
- `number` for every number, whole or not: `125`, `2.5`, `-3`
- `boolean` for `true` and `false`

The names are lowercase. `String`, `Number` and `Boolean` with a capital are something else, and almost never what you want in a type.

You write a type on a value the way you saw last time, with a colon after the name:

```ts
let loafName: string = 'Rye'
const loavesBaked: number = 12
let soldOut: boolean = false
```

## The compiler works types out

You do not have to write every type. When a name gets a value, the compiler works out the type from it. That is called **inference**. Point at a name in the editor and a small box shows the type the compiler chose. Write `let loaves = 12` and the box says `number`.

That type sticks. A `let` can get a new value later, but only of the same type:

```
src/scones.ts:2:1 - error TS2322: Type 'string' is not assignable to type 'number'.

2 loaves = 'twelve'
  ~~~~~~
```

For a `const` holding text, the box may show the text itself as the type, such as `'Rye'`. That is a narrower type than `string`, and it comes later in the course. A `let` shows `string`.

## Text that looks like a number

Whatever a person types into a form arrives as a `string`, even `'8'`. The compiler knows that, and it refuses arithmetic on text:

```
src/scones.ts:6:14 - error TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

6 const half = typedLoaves / 2
               ~~~~~~~~~~~
```

Read the message as "the value before the `/` must be a number". The fix is not to change a type but to make the value a number: JavaScript's `Number('8')` gives `8`. The same goes for true and false: a form says `'yes'` or `'no'`, and a comparison such as `answer === 'yes'` gives you a real `boolean`. Do not use `Boolean(answer)` for that: every text that is not empty turns into `true`, `'no'` included.

## When inference lets a mistake through

One operator works on text too: `+`. `'8' + 4` is `'84'`, which is perfectly good JavaScript, so the compiler works out `string` for the result and says nothing. Your mistake is now a correct program that does the wrong thing.

The way to catch it is to write the type you expect. Then the compiler compares the glued text with your promise:

```
src/scones.ts:5:7 - error TS2322: Type 'string' is not assignable to type 'number'.

5 const total: number = typedLoaves + extra
        ~~~~~
```

The error points at the name, but the cause is one of the values being added. Find the one that is still text and make it a number before the `+`. Turning the glued result into a number afterwards gives you `84`, a number and still wrong.

So when should you write a type? Inference is right most of the time, and a type that repeats an obvious value adds little. Write one when the value comes from somewhere you do not control, like a form, or when you know what a result must be and want the compiler to hold the code to it. In this issue the tasks ask you to write them all, so you get used to the shape.

## Your work in this issue

Open `src/order-form.ts`. The lines above `// Task 1` are what the form sent and what the stock book says; leave them as they are. Under each task, write the types the comment asks for and fix the values. Run `node src/order-form.ts` to see what the form does and `npm run types` to see what the compiler thinks. Check runs your lines with form values of its own, so make every value from the names above, not from a number you typed.
