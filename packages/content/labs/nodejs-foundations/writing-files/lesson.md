# Writing files and folders

## What you will be able to do

Your scripts can read the society's files from any folder. Now they change them. A script that writes is more useful and more dangerous than one that reads: one wrong call and the waiting list is gone. By the end of this issue you will be able to:

- replace a file's text with `writeFile`, or add to its end with `appendFile`, and choose between them
- change part of a file by reading it, changing the text and writing it back
- make a folder with `mkdir`, and read the names in one with `readdir`
- read the errors a write gives when a folder is missing or already there

## The request from Rhiannon

> **Rhiannon:** People put their names down for a plot at the gate, and I write them on whatever paper I have. When a plot comes free I have to work out who has waited longest. And the committee wants a short report every month, kept somewhere I can find them. Can the laptop keep the list and the reports for me?

## Replacing a file: writeFile

`writeFile` from `node:fs/promises` puts text into a file. If the file is not there, it makes it. If it is there, everything in it is replaced:

```js
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const loans = join(import.meta.dirname, 'loans.txt')
await writeFile(loans, 'Rotavator: plot C2\nLong ladder: plot A4\n')
```

Nothing asks first and nothing keeps the old text. That is right when you mean to write the whole file, like a report, and a disaster when you meant to add one line. Text you write is only the characters you give it, so a line ends where you put `\n`.

## Adding to a file: appendFile

`appendFile` adds text to the end of a file and keeps what is there. Like `writeFile`, it makes the file when it is missing:

```js
await appendFile(loans, 'Hedge trimmer: plot B1\n')
```

The `\n` matters twice. Leave it off and the next line lands on the end of this one. And appending only stays tidy if the file already ends with a line break, which a file your scripts wrote always will.

## Changing part of a file

Neither function changes the middle of a file. To take a line out, you read the whole file, change the text in your script, and write the whole of it back:

```js
const text = await readFile(loans, 'utf8')
const kept = text.split(/\r?\n/).filter((line) => line !== '' && !line.startsWith('Rotavator'))
await writeFile(loans, kept.map((line) => `${line}\n`).join(''))
```

Here `writeFile` replacing everything is exactly what you want, because you give it everything that should stay.

## Folders: mkdir and readdir

A write never makes the folder a file goes into. Writing `minutes/2026-05.txt` while there is no `minutes` folder fails:

```
Error: ENOENT: no such file or directory, open '/srv/garden/minutes/2026-05.txt'
```

The file is not missing, it is new, but a folder on the way to it is. `mkdir` makes the folder first:

```js
import { mkdir } from 'node:fs/promises'

await mkdir(join(import.meta.dirname, 'minutes'))
```

Run that a second time and it fails with `EEXIST`, "error, it exists". With the option `{ recursive: true }`, `mkdir` makes every missing folder on the way and quietly does nothing when the folder is already there, which is almost always what a script wants.

`readdir` gives the names in a folder, as an array of strings:

```js
const names = await readdir(join(import.meta.dirname, 'minutes'))
// [ '2026-05.txt', '2026-04.txt', 'agenda.md' ]
```

Only the names, not full paths: join each with the folder when you want to open it. The order is whatever the system hands back, which is not the same everywhere, so sort the list when order matters. A folder that is not there gives `ENOENT`, the same error a missing file gives, and you can catch it the same way.

## Your work in this issue

The tasks go in order: `add-to-list.js`, `next-on-list.js`, `monthly-report.js`, `list-reports.js`. They change real files in your workspace, so open `waiting-list.txt` in the editor beside the terminal and watch it change. If you empty the list while trying things, `add-to-list.js` puts names back. Every file your scripts use sits beside them, so build each path from the script's own folder, as in the last issue.
