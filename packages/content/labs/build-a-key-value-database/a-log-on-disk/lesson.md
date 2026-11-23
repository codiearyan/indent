# A log on disk

## What you will be able to do

Your store keeps keys and values, but only while the program runs. This issue puts them in a file, in the one shape a stop halfway cannot hurt much: a log that only ever grows at its end. By the end of it you can:

- add every change to the end of a file as one record, and never write over what is there
- open the store again and replay the log, so the last change to each key wins
- record a delete, so a deleted key stays deleted after a restart

## The request from Idris

> **Idris:** The counts have to be there in the morning, whatever happened in the night. And please, not one big file written again on every change. That is exactly what broke twice.

Idris is right about what broke. Writing a whole file again means that for a moment the old text is gone and the new text is not all there yet. A stop in that moment leaves neither. The fix is not a faster write. It is never writing over anything you already have.

## Never write over what you have

Think of a ship's logbook. Nobody rubs out yesterday's entry to write today's position; each entry goes on the next line. If the pen stops in the middle of an entry, every entry before it is still there and still true.

Your store's file works the same way. Every change becomes one record, added to the end of `store.log` in the store's folder. `appendFile` from `node:fs/promises` does exactly that, and makes the file the first time:

```js
await appendFile(join(dir, 'visits.log'), 'Tuesday\tgreenhouse\n')
```

The store still keeps every key in memory as well, so `get` answers at once. The log is what lets a new store find the same keys after a restart. So a `set` adds its record, waits until it is in the file, and only then counts as done. That waiting is the promise `set` returns.

`close()` is the store's way of saying it is finished. It resolves once every change is in the file. Since each of your changes already waits for its own write, there is nothing left to wait for, and `close` can be empty. It is still worth having: a store that wrote later, several changes at once, would wait there.

## The format of a record

In this issue the format is fixed, so the check can read your log: a set is `set`, a tab, the key, a tab, the value and a line break; a delete is `delete`, a tab, the key and a line break. A store with a few changes behind it looks like this:

```
set	paper	linen
set	ink	black
set	paper	cotton
delete	ink
```

That breaks as soon as a value holds a tab or a line break. For now, keys and values in this issue hold neither. The next issue gives the store a format that holds any text.

`encode(change)` builds the record for one change, and `decode(text)` turns the text of a log back into a list of changes. Keeping the format in those two functions means the next issue changes them and nothing else.

## Replaying the log

The log is the whole history of the store. To open a store, read the log and replay each record in order: a set puts its value under its key, replacing any value before it. When the replay reaches the end, every key holds the value of its last record, exactly what the store held when it stopped. Above, `paper` ends as `cotton`.

A folder with no log yet is simply a new store. Reading a file that is not there fails with the error code `ENOENT`: catch that one error and start empty, and let any other error through.

## A delete is a record too

If a delete only removed the key from memory, the next replay would find the key's last set and bring it back. The log has no way to remember a delete unless it says so. So a delete is a record of its own, with no value, and the replay removes the key when it meets one. A later set brings the key back. Deleting a key the store does not hold changes nothing, so it writes nothing either.

One honest note: when `appendFile` resolves, the system has the record, but it may hold it in memory for a moment before it reaches the disk itself. A store that must survive the power going in that moment asks the system to flush the file to the disk. Ashgrove's store does not, and that is fine for a shop.

## Your work in this issue

All three tasks are in `src/db.js`: first `set` adds its record and `close` is written, then `open` replays the log, then `delete` adds its record and the replay follows it. Try your work with:

```sh
node src/try.js
```

It starts from an empty `data/stock-db` folder, puts Idris's counts in, prints the log line by line, and opens the same folder again as a new store. The check never uses the shop's counts. It opens stores of its own, a fresh folder for every case, and it reads `store.log` where this issue fixes its format.
