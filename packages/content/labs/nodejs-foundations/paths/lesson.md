# Where a script runs from

## What you will be able to do

Your scripts read files by name, and so far they always ran from the workspace's top folder, where the files are. The moment someone runs them from another folder, a name like `plots.txt` points somewhere else. This issue is about where a path starts. By the end of it you will be able to:

- tell the folder a command was typed in from the folder a script lives in
- read an `ENOENT` error whose path is relative to the wrong folder
- find a script's own folder, whatever folder it was run from
- build and take apart paths with `node:path`, the same way on every system

## The request from Imran

> **Imran:** I read the water meters on the troughs every Sunday and type them into `water/readings.txt`. I keep my terminal in the water folder, because that is where I work. The old adding-up script works when Rhiannon runs it, and when I run it, it says ENOENT and stops. The file is right there!

Imran Qadir looks after the society's water. He is right that the file is there. The script looked for it somewhere else.

## Two folders every script has

When you run a script, two folders are involved. The **working directory** is the folder your terminal was in when you typed the command; `process.cwd()` gives it. The other is the folder the script file is in. From the top folder, `node where.js` makes them the same. Move the terminal first, and they differ:

```
cd water
node ../where.js
```

`cd water` moves the terminal into the `water` folder, and `cd ..` moves it back up; it works the same way in every terminal. `..` means "the folder above", so `../where.js` is `where.js` one folder up.

## Relative paths start at the working directory

A path that does not start at the top of the disk, like `water/readings.txt`, is a **relative path**. Node finds it by starting from the working directory. That is why the old script fails for Imran:

```
Error: ENOENT: no such file or directory, open 'water/readings.txt'
```

Run from the `water` folder, `water/readings.txt` means `water/water/readings.txt`, which does not exist. When an ENOENT names a relative path, ask which folder it was relative to. The answer is the folder the command was typed in, not the folder of the script.

## A module knows its own folder

A file a script owns, like the readings, belongs next to the script, and the script can find its own place. In a module, `import.meta` holds facts about the module itself:

```js
console.log(import.meta.dirname)   // the folder that holds this file
console.log(import.meta.filename)  // the file itself, a full path
console.log(import.meta.url)       // the same as a file:// URL
```

You may see `__dirname` in older code. It belongs to the older kind of Node file, CommonJS, and in a module like yours it fails with `ReferenceError: __dirname is not defined in ES module scope`. `import.meta.dirname` is its replacement.

## Building paths with node:path

macOS and Linux separate the folders in a path with `/`; Windows uses `\`, after a drive letter like `C:`. A path glued together from text, like `dir + '/notes/' + name`, mixes the two on Windows, and code that splits a path at `'/'` misses the `\` paths Windows hands back. The built-in module `node:path` knows the rules of the system it runs on:

```js
import { basename, dirname, extname, join, resolve } from 'node:path'

join(import.meta.dirname, 'notes', 'compost.txt')  // the right separator for this system
resolve('notes', 'compost.txt')                    // a full path, starting at process.cwd()
basename('/srv/garden/notes/compost.txt')          // 'compost.txt'
extname('compost.txt')                             // '.txt', and '' for a name with no dot
dirname('/srv/garden/notes/compost.txt')           // '/srv/garden/notes'
```

`join` takes each folder and file name as its own argument, and tidies up as it goes: `join('notes', '..', 'seeds.txt')` is just `seeds.txt`. `resolve` works the same way but always gives a full path, starting from the working directory. On Windows each of these gives a path with `\` in it.

## Which folder to start from

There are two kinds of path, and each has its own starting folder:

- A path a **person types** is relative to where they typed it. `node show.js notes.txt` means the `notes.txt` beside them. Leave it relative, or `resolve` it.
- A file the **script owns** is relative to the script. Build it from `import.meta.dirname` with `join`.

## Your work in this issue

`where.js` first, then `water-total.js`, written afresh so that it works from any folder, then `file-info.js`. Try each from the top folder and from `water`. Check runs them from folders of its own and reads how `water-total.js` and `file-info.js` handle paths.
