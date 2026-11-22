# A download that leaves its folder

## What you will be able to do

Before Ashgrove Press prints anything, the customer approves a proof: a picture of exactly what will be printed. The portal lets them download it. By the end of this issue you will be able to:

- explain how a file name from a link can reach files it was never meant to
- reproduce a download that reads a file outside its folder
- fix the download by checking where the name really leads
- write a test that catches the check fooled by a folder with a similar name

## The ticket

Rune Kasprzak looks after the proofs, and reads the download log once a week.

> **Rune:** Something odd in the download log. Someone asked for a proof called ../proofs-staff/2041-costs.txt and got it. That is our cost sheet for Greta's invitations, with our margin on it. There is also a request for ../config/mail.json, which holds the shop's mail password. Nobody should get either. AP-22.

A proof link looks like `/proofs?file=2041/front.txt`. The portal reads `2041/front.txt` from its `proofs` folder and sends the text back. In the real portal a proof is a PDF; here a text file stands in for it.

## The idea: a name is a path, and paths can climb

A file name with a slash in it is a path. Paths have a special part: `..` means the folder above. Take a different shop, a photo studio that serves pictures from `/srv/photos`:

```js
import { join } from 'node:path'

join('/srv/photos', '2024/beach.jpg')        // '/srv/photos/2024/beach.jpg'
join('/srv/photos', '../secrets/keys.txt')   // '/srv/secrets/keys.txt'
```

`join` does exactly what it should: it follows the `..` up and out of `photos`. It never promised to stay inside. So whoever writes the name chooses any file the program is allowed to read, and the program can read a lot more than its proofs.

Nobody broke in here either. The program was asked for a file by name and read it. The folder only kept people in because nobody had tried to leave.

## Why looking at the name is not the fix

The tempting fixes all judge how the name looks.

Refusing any name that contains `..` breaks honest names: a designer may well call a file `back..v2.txt`, and that file is inside the folder. Removing `../` from the name is worse: remove it from `....//config/mail.json` and what is left is `../config/mail.json`, which climbs out again. Keeping only the last part of the name, the file name without folders, breaks the proofs that live in an order's own folder. And there are more ways to write the same path than you will think of: a full path from the root of the disk, backslashes on Windows, and so on.

What matters is not how the name looks, but where it ends up.

## How to fix it: resolve, then compare

Turn the folder and the name into one full path, with every `..` followed, and only then decide:

```js
import { resolve, sep } from 'node:path'

resolve('/srv/photos', '2024/../../secrets')  // '/srv/secrets'
resolve('/srv/photos', '/etc/hosts')          // '/etc/hosts'
```

`resolve` gives the real destination, so a full path is caught too: it leaves the folder at once. Resolve the folder the same way, then ask one question: does the file's path start with the folder's path?

That question has one trap. `/srv/photos-old/a.jpg` starts with `/srv/photos`. The letters match, but `photos-old` is a different folder beside it. The file must start with the folder's path followed by a separator, `path.sep`, so only things truly inside count. The portal has exactly such a neighbour: `proofs-staff`, beside `proofs`.

When the name leads outside, give the same answer as for a proof that does not exist. The person asking learns nothing about what lives beyond the folder.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It downloads three names with `PROOFS_DIR` from `src/folders.js`. Look at the folders beside `proofs` in your workspace: `proofs-staff` and `config`. In `src/reproduce.js`, pick a name that climbs out of `proofs` to one of their files. Its text in your result is the proof you attach to AP-22.

## How to test it

Call `readProof()` with `PROOFS_DIR`. Ask for names that lead outside and expect `null`, including one into the folder beside it whose name starts the same. Keep a test that a real proof still downloads, so a fix that refuses everything fails.

## Your work in this issue

Start in `src/reproduce.js`, then fix `src/proofs.js`, then write `src/proofs.test.js`. Run your tests with `npx vitest run src/proofs.test.js`. The check runs them beside the original code, a correct fix, a fix that only checks the start of the path and a fix that refuses every name, and expects fail, pass, fail, fail.
