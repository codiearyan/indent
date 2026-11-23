# Cutting text into tokens

## What you will be able to do

Every program that reads data reads text first. A file, a reply from a server, a settings file: it all arrives as characters, and something has to turn those characters into arrays, objects and numbers. In JavaScript that something is usually `JSON.parse`, one call that nobody looks inside. In this repo you write it yourself, in plain JavaScript, so you know what happens each time a program reads JSON. By the end of this issue you can:

- cut a JSON text into tokens, the small pieces the rest of the reader works with
- skip the space between them without losing track of where each one sits
- stop at a character that belongs nowhere and say exactly where it is

## The request from Idris

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small scripts the shop runs on; Idris keeps the books and runs the price list every night. The shop's suppliers send their prices as JSON files, and an import script Sefton wrote years ago reads them.

> **Idris:** Every third file the import says "Could not read the file", and that is all it says. I phone the supplier, they ask me what is wrong and where, and I have nothing to tell them. Worse, on the days it does read a file, some prices come out wrong and it says nothing at all.

Hesper's rule is that no code stays on the workshop computer unless someone at Ashgrove can explain it. Node has a reader built in, `JSON.parse`, and it is very good. But nobody here can say what it does, so the shop is getting a reader of its own, and you are writing it. Building one is the surest way to understand the built-in one. Because of that, the check refuses any code that calls `JSON.parse`, `JSON.stringify` or `eval`.

Run `node src/try.js`. The old script reads the paper list but turns `Kraft "natural"` into `Kraft \`, reads the ink supplier's `1.85e1` as `1.85`, and gives up on the card list without a word about why.

## Tokens first

Reading a JSON text in one go is hard. Reading it in two steps is not. First you cut the text into tokens, the way you would split a sentence into words and punctuation. Then a second part works out what the tokens mean. This issue is the first step.

Here is the same idea for something else, a sum written as text:

```
12 + (3 * 40)
```

Cut into tokens, that is `12`, `+`, `(`, `3`, `*`, `40`, `)`. The spaces are gone, and each token knows what kind it is. Nobody has worked out the answer yet: tokens only say what the pieces are.

A JSON text has four kinds of token, and this issue does two of them:

- **marks**, the six characters `{` `}` `[` `]` `:` `,` that give a text its shape
- **literals**, the three words `true`, `false` and `null`

Numbers and texts in quotes come in the next issue. A token is a small object, `{ type, value, at, end }`. For a literal, the value is the JavaScript value itself: the word `true` becomes `true`, not the text `'true'`. `at` is the index of its first character and `end` the index just after its last, so `text.slice(at, end)` gives the token back as it was written.

## One index, one loop

A tokenizer walks the text with an index. Each time round the loop it looks at the character at the index and decides what kind of token starts there. Then it makes that token and moves the index past it. When the index reaches the end of the text, the list is done.

Two things make this go wrong. If the index does not move forward on some path through the loop, the loop never ends. And if each call does not start its own list, the second text you read still holds the tokens of the first.

## Space is skipped, not removed

JSON allows space between tokens, and suppliers use it: line breaks, indents, spaces after commas. Exactly four characters count as space: the space, the tab, the line feed and the carriage return. A tokenizer skips them by moving the index on without making a token.

Do not delete the space from the text first. Every token after it would then have the wrong `at`, and a position is the one thing Idris needs most. Other characters that look like space, such as a no-break space copied from a web page, are not space in JSON.

## A character that belongs nowhere

Sometimes a character starts no token at all: a single quote where a double one belongs, a comment, a stray `@`. The only honest answer is to stop and say so. `src/json.js` starts with a `JsonError` class for this. You throw it with a message and the index of the character, and whoever called `tokenize` learns what went wrong and where. Skipping the character would hide exactly the mistake Idris has to report.

## Your work in this issue

All three tasks are in `tokenize(text)` in `src/json.js`: first marks and words, then the space between them, then the stray character. Try your work with:

```sh
node src/try.js
```

It shows the old script on the three supplier lists, then your tokenizer on a few small pieces of JSON. The check never uses those pieces. It gives your tokenizer texts of its own and compares every token.
