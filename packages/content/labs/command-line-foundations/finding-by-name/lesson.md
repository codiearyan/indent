# Finding files by name

## What you will be able to do

`ls` shows one folder at a time, which is fine when you know where a file is. When you do not, you need a command that looks in a folder, in every folder inside it, and in every folder inside those. In this issue you search a deep, untidy folder by name. By the end of it you will be able to:

- search a folder and everything below it with `find`
- keep only the names that match a pattern with `-name`
- ignore capitals with `-iname`
- tell files from folders with `-type`

## The request from Hesper

> **Hesper:** Before Sol left, they copied three of our old memory sticks into `old-sticks`, and nobody has looked inside since. My old drawings are in there somewhere, Idris wants every invoice, and each client's proofs folder should be in there too. Sol never put anything in the same place twice.

The jobs are in `today.txt`. `old-sticks` holds folders inside folders, some four levels deep.

## Searching with find

`find` walks through a folder and everything below it, and prints a path for each file and folder it meets:

```
find recipes
recipes
recipes/cakes
recipes/cakes/sponge.txt
recipes/soups
recipes/soups/leek.txt
```

The first thing after `find` is where to start. Always give it: on Linux `find` alone starts in the folder you are in, but on a Mac it stops with `illegal option`. Each path starts with the folder you gave, so the paths that `find recipes` prints work from where you ran it, and you can hand them straight to `ls` or `cat`. `find .` starts in the folder you are in, and its paths begin with `./`.

The paths come out in the order `find` meets them, which is not alphabetical and differs from one computer to the next.

## Finding by name: -name

After the starting folder come tests that pick what to print. `-name` keeps only the names that match a pattern, with the same `*` and `?` as in the issue on many files at once:

```
find recipes -name "*.txt"
```

Put the pattern in quotes. Without them, the shell tries the pattern on the folder you are in before `find` even starts. If a file there matches, say `notes.txt`, then `find` is handed `-name notes.txt` and looks for that one name only. If nothing matches, zsh stops with `no matches found`, while bash passes the pattern on and it works by luck. With quotes, the pattern reaches `find` as you typed it, and `find` tries it in every folder.

`-name` looks only at the last part of each path, the name itself, never at the folders above it.

## Capitals: -iname

`-name` treats `Sponge.txt` and `sponge.txt` as two different names. `-iname` ignores letter case:

```
find recipes -iname "*soup*"
```

That finds `soup-list.txt`, `Leek-Soup.txt` and a folder called `SOUPS`. The `*` on each side lets the word sit anywhere in the name; without the first one, the name would have to start with it.

## Files or folders: -type

A name can belong to a file or to a folder. `-type f` keeps only files, and `-type d` only folders, d for directory. Tests can be combined, and `find` prints only what passes all of them:

```
find recipes -type d -name old
```

That lists every folder called `old` and leaves out any file with the same name.

## When find complains

`find nowhere` says `No such file or directory` when the starting folder does not exist. If you start somewhere you are not allowed to open, such as `/` at the top of the computer, `find` prints `Permission denied` for every folder it may not read, and carries on with the rest. Those lines are messages, not results: with `>` they still show in the terminal and stay out of the file. Inside this issue's folder you will not see them.

## Your work in this issue

The terminal starts in the top folder. For each job in `today.txt`, run `find` from there, starting at `old-sticks`, and read the list it prints. When it shows exactly the right paths, press the up arrow and add `>` and the file name from `today.txt`, as in the last issue. Look at the file with `cat` and press Check.

Running a search again with `>` replaces the file, so a wrong list is fixed with one more run. If a starter file was moved or removed by mistake, the Reset button puts every file this issue started with back, and keeps the files you made.
