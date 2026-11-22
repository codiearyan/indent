# Where you are and what is here

## What you will be able to do

Ashgrove Print Studio is a two-person screen-print studio on Tanner Row. Maeve draws and prints the posters, cards and tote bags. Idris takes the orders and keeps the books. Their shared laptop holds years of artwork, orders and invoices in one folder, and since Sol, their Saturday helper, left, nobody can find anything in it. You are going to sort it out from the terminal, a window where you type commands instead of clicking. You have never typed one, and that is where this issue starts. By the end of it you will be able to:

- type a command and read what it prints
- find out which folder you are in with `pwd`
- list what a folder holds with `ls`
- see sizes and hidden files with `ls -l` and `ls -a`

## The request from Idris

> **Idris:** Before you move a single file, tell me what we are dealing with. Where on the laptop is this folder? Which drawing is the huge one that keeps filling the memory stick? And Sol says there is a handover note in `desk`, but I cannot see it anywhere.

You answer Idris in `notes.txt`, the file open in the editor.

## Typing a command

The terminal is the panel under the editor. Click in it and you see a short line ending in a sign such as `%` or `$`, with a blinking cursor after it. That line is the prompt: the shell, the program that reads your commands, is waiting for you. What comes before the sign differs from computer to computer; it often shows your name and the folder you are in.

Type a command after the prompt and press Enter. The shell runs it, prints what the command printed, and shows a new prompt when it is done. Commands are typed in small letters, and a space separates the parts of a command. Two keys save typing: the up arrow brings back the command you ran last, and `clear` empties the panel when it gets crowded.

If you mistype a command's name, the shell says so:

```
zsh: command not found: pwdd
```

On some computers the shell is called bash and the words come in another order, but `command not found` means the same: no command has that name. Fix the typo and run it again. Nothing breaks when a command fails.

This repo is written for the shells of a Mac and of Linux. On Windows the terminal runs PowerShell, a different shell where many of these commands behave differently, so the tasks may not work there as written.

## Where you are: pwd

The files on a computer sit in folders, and folders sit inside other folders, like boxes in boxes. At the very top of the computer is one folder, written `/`. The shell is always inside exactly one folder, called the working folder. `pwd` prints which one:

```
pwd
/home/sam/recipes
```

That line is a full path. It starts at the top of the computer with `/` and names every folder on the way down, each followed by a `/`. Here: the top, then `home`, then `sam`, then `recipes`, where the shell is now. On a Mac a path usually starts with `/Users` instead of `/home`.

## What is here: ls

`ls` lists what is in the working folder:

```
ls
cakes   notes.txt   soups
```

Some names are folders and some are files; a name with a dot and an ending, like `notes.txt`, is usually a file. To list another folder, give `ls` its name after a space. `ls soups` lists what is inside `soups`, without moving there.

If nothing has that name, `ls` says so, with words such as `No such file or directory`. Check the spelling, and remember that capital letters count: type every name exactly as the listing shows it.

## Options change what a command does

Most commands take options: a dash and a letter, typed after the command's name. `-l` asks `ls` for the long listing, one line per name:

```
ls -l soups
total 16
-rw-r--r--  1 sam  staff  1840 Mar  3 09:12 leek.txt
-rw-r--r--  1 sam  staff   312 Mar  9 17:40 tomato.txt
```

Skip the `total` line at the top. On each line after it, the first column says who may read and change the file (a `d` at its start marks a folder, and a Mac may add a sign such as `@` at its end). Then come a count, the owner and the group. The number before the date is the size in bytes, so `leek.txt` is the bigger of the two. The name is last.

Some files are hidden on purpose. Their names start with a dot, like `.settings`, and a plain `ls` leaves them out, as does the file panel beside the editor. `-a`, for all, shows them:

```
ls -a cakes
.   ..   .oven-times   sponge.txt
```

Two names are in every folder: `.` is the folder itself and `..` is the folder above it. You will use both in the next issue. Options can be combined, so `ls -la` gives the long listing with hidden names. In the folder the terminal starts in you will also see `.indent`. It belongs to the app; leave it alone.

## Your work in this issue

The folder the terminal starts in, the one that holds `notes.txt`, is this issue's top folder; the tasks of every issue in this repo call it that. Click in the terminal and run `pwd` first. Then use `ls`, with a folder's name and with the options above, to find the answers. Write each one in `notes.txt` after its colon, on the same line, copying names exactly as the terminal prints them. Press Check when an answer is in. Nothing you do in this issue changes a file except `notes.txt`.
