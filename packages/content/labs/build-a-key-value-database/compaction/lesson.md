# A log that stays small

## What you will be able to do

A log never writes over anything, which is why a stop cannot hurt it. It also means the log only grows: every count that ever changed is still in it. This issue makes it small again without giving up that safety. By the end of it you can:

- write the store's keys and values again as a new, short log
- put the new log in the old one's place in one step, so a stop at any moment leaves one whole log
- keep the store working on the new file afterwards

## The request from Idris

> **Idris:** The card count changes forty times a day. After a month, `store.log` is mostly old card counts that nobody will ever read, and opening the store reads every one of them. Can it forget the old ones, without me losing the new ones?

Run `node src/try.js`: a month of orders turns four counts into well over a thousand bytes of log, and every one of those records is replayed each time the store opens.

## Compaction

A store opened later needs one thing from the log: the last value of each key. Everything else, the old values and the deleted keys, is history. And your store already holds exactly that one thing in memory.

So compaction writes a new log from what the store holds now: one record for each key, written the way `set` writes it, and nothing for a deleted key. Replaying that log builds the same store as replaying the old one. That is also how the check knows your compaction is right without reading your format: the new log must be exactly as long as the log of a fresh store in which each key was set once.

## Swapping in one step

The danger is in how the new log takes the old one's place. Write it into `store.log` itself, and a stop halfway leaves half the new log, and the old records are already gone. That is the stock file of the first issue all over again.

Think of a road crew replacing a bridge. They do not take the old bridge down and then build the new one; they build the new one beside it, and when it is finished they switch the road over. At every moment there is one whole bridge to drive on.

So compaction writes the new log beside the old one, into `store.log.new`, from the start. Only when that file is whole does it take the name `store.log`, with `rename` from `node:fs/promises`:

```js
await writeFile(join(dir, 'menu.txt.new'), text)
await rename(join(dir, 'menu.txt.new'), join(dir, 'menu.txt'))
```

A rename onto a name that is taken replaces that file, in one step. There is no moment without a `menu.txt`, and no need to remove the old one first; removing it first would make exactly such a moment. On Windows a rename replaces the file too, though Windows does not promise it in one step as Linux and macOS do, and it throws while another program has the file open, leaving the old log in place. A stop before the rename leaves the whole old log, plus a `store.log.new` that may be half written. A stop after it leaves the whole new log. Either way, the store has one whole log.

That half-written leftover is why `open` reads only `store.log`, and pays no attention to a `store.log.new`. A file cut at a record boundary looks just like a shorter, whole log. It is also why compaction writes `store.log.new` from the start with `writeFile`, never adds to it with `appendFile`: whatever an earlier stop left under that name has to go.

## After the swap

After the rename, the name `store.log` belongs to the new file. A store that writes with `appendFile(log, ...)` opens the file by its name each time, so its next change lands in the new log. A store that opened the file once and kept the handle, with `fs.open`, is still holding the old file, which nobody will ever read again: every change it writes there is lost. If your store keeps a handle, close it before the rename and open the new `store.log` after.

The same honest note as in the second issue holds here: a stop of the program leaves one whole log, but a power cut can still catch the system holding `store.log.new` in memory, because the store never asks for it to be flushed to the disk before the rename. A store that must survive that flushes first.

Two more honest notes. This store compacts when you call `compact()`; a busier one would do it by itself when the log grows past some size. And compaction needs every key in memory, which is fine for a shop's stock and not for a store bigger than memory.

## Your work in this issue

All three tasks are in `src/db.js`, in `compact()`: first a new log with one record per key, then writing it to `store.log.new` and renaming it, then making sure the store carries on afterwards. Try your work with:

```sh
node src/try.js
```

It prints the size of the log before and after `compact()`, then sets a count and opens the store again. The check never reads your records. It compares sizes, keeps a second name for the old log's bytes to see whether they were written over, notes whether `store.log` was ever removed, and leaves half-written `store.log.new` files where a stop would.
