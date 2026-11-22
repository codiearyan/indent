# Copying and moving

## What you will be able to do

The shop has folders for everything now. Next, the files have to get into them. This issue is about the two commands you will use more than any other when sorting: one copies, one moves. By the end of it you will be able to:

- copy a file with `cp`, to a new name or into a folder
- copy a whole folder with `cp -r`
- move a file into a folder, or rename it, with `mv`
- avoid writing over a file without noticing

## The request from Idris

The list is in `today.txt` again.

> **Idris:** An invoice is lying loose in the top folder, and the fox poster has the silliest name I have ever seen. Before Hesper touches the price list, keep a copy of it as it is today. And before I start sorting orders, I want a backup of the whole folder, just in case.

## Copying a file: cp

`cp` takes two names: what to copy, then where the copy goes. When the second name is a new file name, you get a copy beside the original:

```
cp letter.txt letter-old.txt
```

When the second name is an existing folder, the copy goes inside it and keeps its name:

```
cp letter.txt drafts
```

Either way, the original stays where it was. Both names are paths, so `cp drafts/letter.txt ../archive` works from wherever you are, just as `ls` and `cd` do.

## Copying a folder: cp -r

Give `cp` a folder and it refuses. On a Mac it says the folder `is a directory (not copied)`; on Linux it says `-r not specified; omitting directory`. Either way, nothing was copied. The option `-r`, for recursive, copies the folder with everything inside it, folders in folders included:

```
cp -r photos photos-copy
```

Use a new name for the copy, one that does not exist yet: then `photos-copy` is made, and it holds exactly what `photos` holds. If `photos-copy` already existed, the copy would land inside it, as `photos-copy/photos`. So running the same `cp -r` twice leaves a second copy one level down. That does no harm, but look at what you made with `ls` after each copy.

## Moving and renaming: mv

`mv` looks just like `cp`, with what to move first and where it goes last, but it leaves nothing behind:

```
mv letter.txt drafts
```

Now `letter.txt` is inside `drafts` and gone from where it was. When the last name is not an existing folder, `mv` gives the file that name instead. That is how you rename:

```
mv letter.txt letter-to-bank.txt
```

A move into another folder under a new name works in one step: `mv letter.txt drafts/bank.txt`.

`mv` works on folders too, without any option: `mv drafts old-drafts` renames a whole folder.

## Writing over a file

Here is the one thing to watch. If the place you copy or move to already holds a file with that name, `cp` and `mv` replace it without asking. The old contents are gone, and there is no undo.

The option `-i`, for interactive, makes them ask first when a file would be replaced:

```
mv -i letter.txt drafts
overwrite drafts/letter.txt? (y/n [n])
```

The words differ a little between systems. Type `y` and press Enter to go ahead, or `n` to keep the old file. Use `-i` whenever you are not sure what is already there, or list the folder first.

## When something goes wrong

A typo in the first name gets `No such file or directory`, and nothing happens. A typo in the last name is sneakier: `mv letter.txt draft` with no folder called `draft` renames the file to `draft`. If a file seems to have vanished, list the folder you were in and look for a new name.

If you copied where you meant to move, the copy is harmless: move the original over it. If you moved where you meant to copy, move the file back first. The Reset button in the app puts every starter file back where it was and as it was, but leaves the files and folders you made.

## Your work in this issue

The terminal starts in the top folder. Read `today.txt`, then do each job with `cp` or `mv`. After each one, list both places, where the file was and where it went, and press Check. Use Tab to type the long names.
