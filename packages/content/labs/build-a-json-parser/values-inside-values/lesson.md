# Values inside values

## What you will be able to do

Your tokenizer cuts a supplier list into marks, words, numbers and texts. But a list of tokens is not a price list yet: nothing knows that these three tokens are one item, or that the item sits inside an array inside an object. This issue writes the second half of the reader, the parser, which turns tokens into the values a program works with. By the end of it you can:

- read arrays and objects from tokens, one inside another, as deep as they go
- hold a text to the comma rules: one comma between two values, never first, last or twice
- read exactly one value from a text, and refuse whatever comes after it

## The request from Idris

> **Idris:** The tokens are lovely, but I need the items. I want to write `list.items[2].price` and get a number, like I would from the built-in reader. And when a supplier leaves a comma at the end of a list, which they do, I want the reader to say so, not guess.

Run `node src/try.js`. Every line says `Not implemented`: `parse` is the function this issue is about.

## A value can hold values

JSON has six kinds of value. Four of them are a single token: a text, a number, and the literals `true`, `false` and `null`. The other two hold values: an array holds a list of them, an object holds pairs of a key and a value. Any of those values can be an array or an object again, so a supplier list is an object that holds an array of objects, each holding texts and numbers.

That shape tells you how to read it. Write one function per kind of thing that holds values, and let them call each other. Here is the idea for something else, lists of numbers in round brackets with no commas, such as `(1 (2 3) 4)`:

```
readList sees (           a list starts
  readItem: 1
  readItem sees (         another list: readList again
    readItem: 2
    readItem: 3
    sees )                that list is done: [2, 3]
  readItem: 4
  sees )                  done: [1, [2, 3], 4]
```

The function that reads one item does not need to know how deep it is. When it meets an opening bracket, it asks the list reader for a whole list and gets one back. A function that calls itself, here through another function, is recursion. It works because each call moves forward through the tokens before it calls again, and because a single number or word holds nothing more, so the calls always end.

## A reader with a position

The functions share one thing: where they are. `src/json.js` suggests a reader, an object with the tokens and the position of the next one, `{ tokens, pos: 0 }`. Each read function reads one value starting at `reader.pos`, moves `reader.pos` past it, and returns the value. A position kept in a closure, or a parser that reads the characters directly, works just as well: the check only calls `parse`.

## Commas take turns with values

Inside an array, values and commas take turns: value, comma, value, comma, value. So after each value only two tokens may come next. A comma means another value follows; the closing bracket means the array is done. Everything else is a mistake to report: `[1,]` has a comma with nothing after it, `[1 2]` has two values with nothing between them, and `[1, 2` runs out of tokens. That last one is easy to miss. If your code reads `reader.tokens[reader.pos]` after the last token, it gets `undefined`, and the next line crashes with a `TypeError` instead of saying the array never closed.

An object follows the same rule, with pairs in place of values: a key, a colon, a value. A key is always a text in quotes. JavaScript lets you write `{ price: 1 }`, but JSON does not.

## Two keys that need thought

A supplier may send the same key twice in one item. The built-in reader keeps the last value, and so does yours, so the two always agree.

The other is the key `__proto__`. In JavaScript, `object['__proto__'] = value` does not add a key: it changes the object's prototype. A text from a supplier must never be able to do that, so add each key with `Object.defineProperty`, which always makes an ordinary key, or with any other way that makes `__proto__` a key like the rest.

## One value, then the end

A JSON text holds exactly one value. Reading that value tells you where it ends, but not whether the text ends there too. `{"price": 0.42} {"price": 0.95}` is two values, and a reader that returns the first one quietly loses the second. So once `parse` has its value, it checks that no tokens are left. A text with no value at all, empty or only space, is not JSON either.

## Your work in this issue

All three tasks are in `src/json.js`: `parse`, `readValue` and `readArray` for arrays, `readObject` for objects, then the rules for the whole text in `parse`. Try your work with:

```sh
node src/try.js
```

It reads the three supplier lists and a few small pieces. The card list still stops at its single quote, which is right. The check uses texts of its own, some thousands of levels deep, and compares every value with what the built-in reader makes of the same text.
