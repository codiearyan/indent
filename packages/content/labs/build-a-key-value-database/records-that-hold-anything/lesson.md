# Records that hold anything

## What you will be able to do

Your store survives a restart, as long as nobody writes a note with two lines in it, and as long as no stop lands in the middle of a write. This issue fixes both. By the end of it you can:

- write records that hold any text, line breaks and tabs included
- tell a whole record from one that a stop cut short, and leave that one out
- cut the broken end off the log, so the store goes on as if nothing happened

## The request from Sefton

> **Sefton:** I put a note on the card stock, two lines, "Keep dry" and "Store flat". After a restart the note says "Keep dry" and there is a new key called "Store flat." with nothing in it. And Hesper asks what happens if the power goes in the middle of a write. I said the log saves us. Does it?

Run `node src/try.js` to see both. The tab format trusts that a value holds no line break, so the note's second line becomes a record of its own. And when a stop cuts the last bytes off the log, the cut record is read as if it were whole, and the next change, added after the broken bytes, is lost too.

## Two ways to hold any text

A record has parts: what kind of change, the key, the value. The reader has to find where each part ends, and the text inside a part can be anything at all. There are two honest ways.

**Length first.** Write how long each part is before the part. The reader takes exactly that many characters, whatever they are, so a line break inside a value is just another character:

```
set 4 21
noteKeep dry.
Store flat.
```

The header says the key has 4 characters and the value 21; the record ends with one more line break after them.

**Escaping.** Keep one character as the end of a record, and write a stand-in for every place that character appears in the text: a line break inside a value becomes `\n`, two characters. Then the backslash itself needs a stand-in too, `\\`, or a value that really contains a backslash and an `n` comes back as a line break. Escape the backslash first when writing, and turn the stand-ins back in one pass when reading.

`JSON.stringify` escapes for you and is a fair choice too. Whichever you pick, the check never reads your log in this issue.

## Characters and bytes

A string's `length` counts characters as JavaScript sees them, and a file is bytes. `é` takes two bytes in a file and one place in a string; an emoji takes four bytes and two places. That is fine as long as you count the same way when you write and when you read: lengths in characters, with the file read as text, work. It matters again when you cut the file, which counts in bytes. `Buffer.byteLength(text)` says how many bytes a piece of text takes.

## A record cut short

A stop can come between any two bytes of a write. So the last record of a log may be missing its end, or most of its value, or everything after its first letter. Even a cut right after a line break inside a value can look like a whole record to a reader that splits on lines.

A record counts only when every byte of it is there, its end included. Your format already knows where a record should end: after the lengths it gives, or at its end mark. When the text stops before that point, the record is cut short. Leave it out, and keep every whole record before it: the key keeps the value it had, or stays deleted, or stays there. Never throw away the whole log because its last record is broken, and never throw: a cut record is what a stop leaves, not a mistake.

A reader loop that meets a broken record must stop or move forward. One that keeps trying the same place never ends, and the check stops it and says so.

## Carrying on after a cut

Leaving the cut record out is not enough. The next change is added to the end of the file, right after the broken bytes, and the reader will try to read the broken part and the new record together. So when `open` finds a broken end, it cuts the file back to the end of the last whole record before anything else is written. `truncate` from `node:fs/promises` cuts a file to a length in bytes.

## Your work in this issue

All three tasks are in `src/db.js`: a format that holds any text in `encode` and `decode`, then leaving out a record cut short, then cutting the broken end off in `open`. Try your work with:

```sh
node src/try.js
```

It keeps notes with line breaks and tabs, opens the store again, then cuts the last 4 bytes off the log and opens it once more. The check never reads your log. It writes through your store, cuts the file at every byte inside the last record, and opens your store on each, a fresh folder for every case.
