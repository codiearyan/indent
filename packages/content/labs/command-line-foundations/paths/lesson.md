# Moving around with paths

## What you will be able to do

In the last issue you looked at the shop laptop from one place: the folder the terminal starts in. That gets slow once folders hold folders. In this issue you move the shell itself from folder to folder, and learn the paths that tell it where to go. By the end of it you will be able to:

- move into a folder and back out with `cd`
- write a path from where you are, or from the top of the computer
- use `..` for the folder above and `~` for your home folder
- type names that have a space in them

## The request from Idris

> **Idris:** Thanks for the map. Now I need to get around in it. Hesper wants last autumn's market notes, which are deep in `archive`. I spend my day in `orders` and keep needing the March invoices from there. And nobody can get into `client proofs`: the terminal just complains.

You answer in `notes.txt` again.

## Changing folder: cd

`cd`, for change directory, moves the shell into another folder. Give it the folder's name:

```
cd recipes
```

It prints nothing when it works. Your prompt usually shows the new folder's name, and `pwd` confirms it. Everything you run now happens in `recipes`: `ls` alone lists `recipes`.

You can go down several levels at once by joining names with `/`:

```
cd recipes/cakes/sponges
```

`cd` with nothing after it takes you to your home folder, the folder that holds your own files. To get back to where the terminal started, use a path, as the next parts show.

When the name is wrong, `cd` stays where it is and says why, for example `no such file or directory: cakse`. If the name is a file, not a folder, it says `not a directory`. The words and their order differ a little between shells, but the meaning is the same.

## Two kinds of path

A path that starts with `/` is a full path, also called absolute. It starts at the top of the computer and means the same folder wherever you are, like a full postal address. `pwd` always prints one.

A path that does not start with `/` is relative. The shell starts walking from the working folder. `cakes/sponges` means "in the folder I am in, find `cakes`, and inside it `sponges`". The same relative path leads somewhere else, or nowhere, when you stand somewhere else.

Relative paths are short, so you will use them most. Two names help:

- `..` is the folder above the one you are in. `cd ..` climbs one level, and `cd ../..` climbs two.
- `~` is your home folder. `cd ~/Documents` works from anywhere.

`..` can start a longer path. Say you are in `recipes/cakes` and want `recipes/soups`. Both sit in `recipes`, so you climb one level and go down again:

```
cd ../soups
```

Paths work the same in every command, not only `cd`. `ls ../soups` lists that folder without moving there, which is a safe way to test a path before you use it.

If you lose track, run `pwd`. And to get back to the folder the terminal started in, climb with `..` as many times as you went down.

## Names with spaces

The shell splits what you type at every space: the first word is the command, the rest are separate arguments. A folder called `holiday photos` therefore gives trouble:

```
ls holiday photos
ls: holiday: No such file or directory
ls: photos: No such file or directory
```

`ls` was handed two names, `holiday` and `photos`, and neither exists. `cd` gets them too and complains in its own words: `string not in pwd` in one shell, `too many arguments` or `No such file or directory` in another.

There are two ways to keep a space inside one name. Put the whole name in quotes, `"holiday photos"` (single quotes work too), or put a backslash just before the space, `holiday\ photos`. Both reach the same folder.

## Let Tab type for you

Type the first letters of a name and press Tab. The shell finishes the name if only one fits, and adds the backslash before any space for you. If several names fit, it fills in what they share; press Tab again to see the choices. Tab saves typing and spelling mistakes, so use it all the time.

## Your work in this issue

The terminal starts in the top folder again. Move around with `cd`, check where you are with `pwd`, and test paths with `ls` before you write them down. Write each answer in `notes.txt` after its colon, and press Check when it is in. As in the last issue, only `notes.txt` changes.
