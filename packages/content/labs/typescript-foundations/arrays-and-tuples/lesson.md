# Lists and pairs

## What you will be able to do

Single values have types now: the form, the prices. But most of what happens at the packing table is a list. A parcel is a list of tins, the morning is a list of orders to pick, and an order is a list of lines, each a blend and a number of tins. Rafe's code kept all of them in plain arrays and hoped each one held what he thought. In this issue you give lists their types. By the end of it you will be able to:

- write the type of a list, and of a list that starts empty
- read `never` and `string | number` in a message
- write a tuple: a short list with a type for each place
- write a function that takes a list of pairs and gives back a list

## The request from Bryn

> **Bryn:** The picking desk is all lists, and half of them hold the wrong thing. Yesterday a product code came out as two halves the code could not tell apart, so a tin of 250 g went into a parcel as "250" and the weight added up to nonsense. Can the types say what each list holds?

All four tasks are in `src/picking.ts`.

## The type of a list

A list's type is the type of one item, followed by an empty pair of square brackets:

```ts
const traysBaked: number[] = [12, 12, 8]
const flavours: string[] = ['cheese', 'fruit']
```

Read `number[]` as "a list of numbers". Every item must fit, and the compiler checks each one, at the place it goes wrong:

```
src/scones.ts:10:31 - error TS2322: Type 'string' is not assignable to type 'number'.

10 const ovens: number[] = [180, '200']
                                 ~~~~~
```

You may also see the same type written `Array<number>`. It means the same thing. The angle brackets come later in the course.

A list with items in it rarely needs its type written: the compiler works it out from the items. Point at `flavours` with no type and the editor shows `string[]`. A parameter that takes a list needs its type written, like any parameter.

## A list that starts empty

An empty list is a puzzle for the compiler. There is nothing in it to work a type out from, and in a list shared across the file it cannot see what you will add later. So it picks the narrowest type there is:

```
src/scones.ts:2:11 - error TS2345: Argument of type '"cheese"' is not assignable to parameter of type 'never'.

2 sold.push('cheese')
            ~~~~~~~~
```

`never` is the type with no values at all. A list of `never` is a list nothing may go into. The message looks strange, but the fix is plain: say what the list will hold, on the line that makes it. (`"cheese"` in double quotes is the compiler's way of naming that exact text as a type; it comes later too.)

## When a list is really a pair

Sometimes a function gives back two different things at once, and an array is the easy way to do it:

```ts
function tray(name: string, count: number) {
  return [name, count]
}
const [flavour, count] = tray('fruit', 12)
```

The compiler looks at `[name, count]` and works out a list whose items are each a string or a number. It writes that `(string | number)[]`. The `|` reads "or", and you will meet it properly later. Here it means the compiler has forgotten which item is which, so it refuses to do arithmetic on `count`:

```
src/scones.ts:7:26 - error TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

7 const twoTrays: number = count * 2
                           ~~~~~
```

A **tuple** says exactly what each place holds: `[string, number]` is a list of two items, text first and a number second. Written as the result type of `tray`, it gives each place its own type again. A tuple also knows its length:

```
src/scones.ts:9:23 - error TS2493: Tuple type '[string, number]' of length '2' has no element at index '2'.

9 const nothing = fixed[2]
                        ~
```

Use a tuple for a small group whose places are fixed and obvious, like a name and a count. When the places need names to make sense, an object is clearer; that is the next issue.

A list of tuples is written the same way as any list: `[string, number][]` is a list of pairs. Inside `.map` or a `for...of` over it, the compiler already knows each item is a pair, so `([name, count]) => ...` needs no types of its own.

## What the compiler does not check

A list type says what the items are, not how many there are. `flavours[7]` has the type `string` as far as the compiler knows, and is `undefined` when Node runs it. Types catch the wrong kind of thing in a list; a list that is too short is still yours to check.

## Your work in this issue

Open `src/picking.ts`. Each task gives one list its type: a parcel's weights, the picking list, a product code split in two, and the lines of an order, which you write as a whole function. Run `npm run types` after each change and `node src/picking.ts` to see the desk at work. Check calls your functions with lists of its own.
