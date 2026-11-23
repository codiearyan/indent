# Numbers and text

## What you will be able to do

Your tokenizer reads marks and the words `true`, `false` and `null`. But a price list is mostly numbers and names, and those are exactly where the old import went wrong. This issue teaches the tokenizer the two harder tokens. By the end of it you can:

- read a number by its rules, and refuse what only looks like one
- read a text between quotes and turn its escapes into the characters they stand for
- read `\u` escapes, and stop cleanly at a text that never closes

## The request from Sefton

Sefton wrote the old import script, and he has been reading its output with Idris.

> **Sefton:** My script looks for a price with digits and dots, so the ink supplier's `1.85e1` came out as 1.85: we would have sold press wash at a tenth of its price. And it stops a name at the first quote it sees, so `Kraft \"natural\"` became `Kraft \`. I wrote it for lists that had none of that. I want ours to read numbers and names the way JSON really writes them.

Run `node src/try.js`. Under "Your tokenizer" you will see `Not implemented`: `tokenize` now hands numbers to `readNumber` and texts to `readString`, and both are yours to write.

## Rules, read in order

A good way to read a token with rules is to walk them in order, moving an index past each part you find, and to stop with an error the moment a part is missing. Here is the idea for something else, a time on a timetable such as `9:05` or `23:59`: one or two digits, a colon, then exactly two digits.

```
9:05    one digit, colon, two digits        a time
23:59   two digits, colon, two digits       a time
9:5     only one digit after the colon      not a time
```

JSON numbers work the same way, with four parts:

- an optional `-`
- the whole part: `0` alone, or a digit from 1 to 9 followed by any digits
- an optional fraction: a `.` and at least one digit
- an optional exponent: `e` or `E`, an optional `+` or `-`, and at least one digit

So `-12.5`, `0.42`, `1e3` and `2.5E-2` are numbers. `01` is not, because a 0 that starts a number is the whole part by itself. A lone `-`, `1.` and `1e` are not either, because a part that must have a digit has none. A number has no `+` in front and cannot start with a dot.

Read only as far as the rules allow, then stop. In `1.2.3` the number is `1.2`, and the second dot starts no token, so your tokenizer from issue 1 throws there.

## Find the end, then the value

Once you know where a number ends, getting its value is one call: `Number(text.slice(at, end))`. That is safe because you checked the characters first. What is not safe is calling `Number` or `parseFloat` on whatever follows, the old script's mistake: `parseFloat('1.2.3')` happily gives 1.2, and `Number('01')` gives 1. Adding the digits up by hand is not safe either, because the last place of a fraction can come out wrong.

## A text and its escapes

A JSON text sits between double quotes. A backslash inside it starts an escape: two characters that stand for one. JSON has exactly eight short ones, the same as in a JavaScript string:

| Written | Stands for |
| ------- | ---------- |
| `\"`    | a quote |
| `\\`    | a backslash |
| `\/`    | a slash |
| `\b` `\f` | backspace, form feed |
| `\n` `\r` `\t` | line feed, carriage return, tab |

A backslash is never part of the value. It changes what the next character means, so `"say \"hi\""` holds `say "hi"`, and the quote after a backslash does not close the text. A backslash before any other letter is a mistake to refuse, not a character to keep.

## Four hex digits, and the end of the input

The ninth escape is `\u` with exactly four hex digits, the code of a character written in base 16: `\u00e9` is `é`. JavaScript does the last step for you: `String.fromCharCode(0xe9)` is `'é'`. Check the four digits first. `parseInt('12G4', 16)` stops at the G and quietly gives 18. A picture character is two codes in a row, `\ud83d\udcdc`, and putting both into the text gives one character.

A text can also fail to close. A loop that waits for the closing quote must stop at the end of the input, or it reads characters that are not there and never ends. A line break typed straight into a text is refused too: inside a text it is written `\n`. That rule is what lets a reader say a text broke on line 6 instead of swallowing the rest of the file.

## Your work in this issue

Task 1 is `readNumber`, tasks 2 and 3 are `readString`, both in `src/json.js`. Try your work with:

```sh
node src/try.js
```

It shows pieces of the ink and paper lists through your tokenizer. The check uses numbers and texts of its own, some made up for each run, and compares every value with what the built-in reader makes of the same text.
