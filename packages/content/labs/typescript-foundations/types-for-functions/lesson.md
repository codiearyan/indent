# Types for functions

## What you will be able to do

The form's values have honest types now. Next to them sits Rafe's price list: a handful of functions that take whatever they are given and hand back whatever comes out. A function is where types pay the most, because one function is called from many places, and every one of those calls is checked against it. By the end of this issue you will be able to:

- give a function's parameters their types, and say why the compiler insists
- write the type of what a function gives back, and say when it is worth writing
- let a call leave a parameter out, with a default or with a question mark
- read `void`, and write a whole typed function yourself

## The request from Imogen

> **Imogen:** Rafe's price list worked, as long as he was the one calling it. Last week I called the label function without the size and printed forty labels that said "undefined g". I want the code to stop me before I do that.

All four tasks are in `src/pricing.ts`.

## Parameters need a type

A variable gets a value on the line that makes it, so the compiler can work out its type. A parameter does not: its value comes from a call somewhere else. So the compiler does not guess, and in this repo it refuses a parameter with no type:

```
src/scones.ts:1:20 - error TS7006: Parameter 'scones' implicitly has an 'any' type.

1 function trayPrice(scones, pencePerScone) {
                     ~~~~~~
```

`any` is the type that switches checking off: anything goes in and anything goes out. "Implicitly" means you did not ask for it. The compiler is telling you it would have to give up on this parameter, and it will not do that quietly.

A parameter takes a type the way a variable does, with a colon after its name:

```ts
function trayPrice(scones: number, pencePerScone: number) {
  return scones * pencePerScone
}
```

Now every call is checked. `trayPrice('4', 90)` is refused with the `Argument of type ... is not assignable to parameter of type ...` message you read in the first issue, and so is a call with too few or too many values.

## The result type

What a function gives back has a type too, written after the round brackets of the parameters:

```ts
function trayPrice(scones: number, pencePerScone: number): number {
  return scones * pencePerScone
}
```

Leave it out and the compiler works it out from the `return` lines. Write it and the compiler does the opposite: it checks the body against it. That matters when the body is wrong. Without a written result type, a mistake inside changes the type the function seems to have, and the error shows up far away, at a call. With it, the error is in the function, where the mistake is:

```
src/scones.ts:11:39 - error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.

11 function sconeLabel(flavour: string): string {
                                         ~~~~~~
```

That function promises text and only prints. Printing is not giving back.

## void

Some functions only do something, such as printing, and give nothing back. Their result type is `void`, which means "nothing useful comes out". The compiler works it out for any function with no `return`. If you then use the result as if it were a value, it says so:

```
src/scones.ts:10:7 - error TS2322: Type 'void' is not assignable to type 'string'.

10 const said: string = announce('cheese')
         ~~~~
```

When you see `void` where you expected a value, look at the function: it probably prints the value instead of returning it.

## Parameters a call may leave out

A parameter with a type is required. There are two ways to say a call may leave it out.

A **default value** comes after the type. When a call leaves the parameter out, the default is used, so inside the function it always has a value:

```ts
function trayCount(trays: number, perTray: number = 12): number {
  return trays * perTray
}
trayCount(3) // 36
```

A **question mark** after the name makes the parameter optional without a default: `perTray?: number`. Inside the function it may then be `undefined`, and you have to deal with that yourself, for example with `perTray ?? 12`. A default is shorter when there is an obvious usual value.

Optional parameters go after the required ones.

## Your work in this issue

Open `src/pricing.ts`. Each task is one function. Give it its types, read what the compiler says, and fix what it finds; in Task 4 you write the whole function. Run `npm run types` after each change and `node src/pricing.ts` to see the prices. Check calls your functions with values of its own, so keep the names the comments give and the `export` in front of each.
