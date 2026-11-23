# Errors a person can act on

## What you will be able to do

Your reader reads every supplier list that is JSON, and refuses every one that is not. But a refusal is only as good as what it says. "Unexpected character at index 194" is true, and nobody can do anything with it: nobody counts to 194 in a file. This issue makes every error say what a person needs to fix it. By the end of it you can:

- turn a position in a text into a line and a column
- say what would have fitted at that place and what was there instead
- tell a text that was cut short from a text that is wrong

## The request from Hesper

> **Hesper:** I rang the card supplier about their list. I said "index 194" and they laughed. They have the file open in an editor, which shows lines and columns, so give me that. And tell me what is wrong in words they will understand: you wanted a comma and found a name. One more thing: half the time a file is broken because the download stopped. If the file is cut short, I want to know, because then I ask them to send it again rather than fix it.

Run `node src/try.js`. It reads the three lists and four broken pieces, and prints the message, then the `line`, `column`, `expected`, `found` and `ended` of each error. For now most of those say `undefined`.

## From an index to a line and a column

An index counts characters from the start of the text. A person counts lines down the page, then characters along the line. Here is the same idea for something else, a poem stored as one string:

```
"The press is cold,\nthe ink is thin,\nthe paper waits"
```

The `i` of `ink` is at index 23. Before it there is one line feed, so it is on line 2. That line starts just after the line feed, at index 19, so the `i` is 4 characters along, which is column 5, counting from 1 as editors do.

So the line is 1 plus the number of line feeds before the index, and the column is how far the index is from the start of its own line, plus 1. Only the line feed counts. Some files end each line with `\r\n`, a carriage return and a line feed; the carriage return is just a character at the end of the line, and counting it too would double every line number.

The work is the same for every error, so do it in one place. The `JsonError` constructor is a good one: give it the text and the index, and let it work out the rest.

## What was expected, what was found

At the place where a text goes wrong, the reader always knows what it was looking for. After a value inside an array it wanted a comma or a closing bracket. After a key it wanted a colon. That is the most useful thing an error can say, because it is the fix: put a comma here.

So each error carries two more things. `expected` says in words what would have fitted: the marks themselves, or "a value", "a key", "the end of the text". `found` is what is there, written exactly as it is in the text. A token knows where it starts and ends, so the text between is the token as written, the quotes around a name included. Together they make a message a supplier can act on:

```
Expected , or } but found "per" at line 4, column 3
```

## Cut short, or wrong

Picture a sentence that stops halfway, "Please send the", next to one with a wrong word, "Please sned the paper". The first needs more words; the second needs one word fixed. A file is the same. `[1, 2` is not wrong in any one place: it just stops. `[1 2]` is wrong at the `2`.

Every text that stops early fails at the same place, its very end. So an error for it has `at` equal to the length of the text, `found` is `end of input`, and `ended` is `true`. Every other error has `ended: false`. Watch the places inside a token too. A word that stops halfway, `[tru`, has run out; `[tru]` is wrong. A text whose closing quote never comes has run out. A number that ends on its minus or its dot has run out.

## Your work in this issue

All three tasks are in `src/json.js`: `lineAndColumn` and the `JsonError`, then every place that throws. You may change the constructor however you like; the check reads only the error's properties. Try your work with:

```sh
node src/try.js
```

The check parses broken texts of its own, over many lines and with all kinds of mistakes, and reads what each error says.
