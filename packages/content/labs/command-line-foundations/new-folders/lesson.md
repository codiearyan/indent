# Making folders and files

## What you will be able to do

You can find your way around the studio laptop now. So far you have only looked; from this issue on, your commands change what is on the disk. First you make places for things to go. By the end of this issue you will be able to:

- make a folder with `mkdir`, or several at once
- make folders inside folders that do not exist yet with `mkdir -p`
- make an empty file with `touch`
- undo a folder or a file you made by mistake

## The request from Idris

Idris left a list for you in `today.txt`, the file open in the editor.

> **Idris:** Before we move anything, we need places to put it. Receipts need a folder. The orders need a folder per month this year. Maeve wants a folder for rough poster ideas, and an empty file to start the print queue.

Every job on the list is one folder or one file in the right place, with exactly the right name.

## Making a folder: mkdir

`mkdir`, for make directory, makes a new, empty folder in the working folder:

```
mkdir letters
```

Like `cd`, it prints nothing when it works. Run `ls` to see the new folder. Give `mkdir` several names and it makes them all, side by side:

```
mkdir letters bills photos
```

A path works too. `mkdir photos/2024` makes `2024` inside `photos`, without moving you there. But every folder on the way must already exist. If `photos` were missing, `mkdir` would stop with `No such file or directory`. The option `-p`, for parents, makes the missing folders on the way as well:

```
mkdir -p photos/2024/summer photos/2024/winter
```

`-p` has a second use: without it, `mkdir` refuses a folder that is already there and says `File exists`. With it, `mkdir` quietly leaves an existing folder as it is.

## Choosing names

A name can hold letters, digits, dots, dashes and underscores without any trouble. Spaces work, but you saw in the last issue that the shell splits a line at every space. The same happens here: `mkdir summer photos` makes two folders, `summer` and `photos`. When a name must have a space, keep it together with quotes or a backslash, exactly as with `cd`:

```
mkdir "summer photos"
```

Capital letters count. On Linux, `Letters` and `letters` are two different folders. On a Mac they count as the same name, so the second `mkdir` says `File exists`, but the name keeps the capitals you typed first, and that is the name people and checks read. Type names exactly as they are asked for.

## Making an empty file: touch

`touch` makes an empty file:

```
touch shopping.txt
```

If a file with that name already exists, `touch` leaves its contents alone and only updates the time it was last changed, so it never wipes anything. The file panel beside the editor shows the new file, and you can open it there to write in it. `ls -l shopping.txt` shows its size, `0` while it is empty.

## Undoing a mistake

Everyone makes a folder with a typo sooner or later. Two commands take it back:

- `rmdir` removes a folder, but only an empty one. If anything is inside, it stops and says `Directory not empty`, so it cannot destroy work.
- `rm` removes a file. Use it only on a file you just made by mistake, and type its name carefully: a file removed with `rm` does not go to a bin, and there is no undo.

```
mkdir lettters
rmdir lettters
```

A later issue covers removing in depth. Until then, use these two only to clean up your own mistakes.

The Reset button in the app puts back every file this issue started with, as it was. It does not remove the folders and files you made, so a wrong folder stays until you remove it yourself.

## Your work in this issue

The terminal starts in the top folder. Read `today.txt`, then do each job with `mkdir` or `touch`. After each one, run `ls` on the folder you changed to see the result, and press Check. If a name came out wrong, remove it and make it again.
