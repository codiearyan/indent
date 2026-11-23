# The settings a shell carries

## What you will be able to do

A shell carries settings while it runs: names with values, called variables. Some are handed to every program you start, one tells the shell where to look for commands, and all of them are gone when the shell ends. In this issue you set them, pass them on, and keep them for next time. By the end of it you will be able to:

- set a variable and read it with `echo`
- hand a variable to the programs you start, with `export`
- read `PATH` and say how the shell finds a command
- add a folder to `PATH` without losing what is on it
- make a setting last by keeping it in a file the shell loads

## The request from Idris

> **Idris:** Sol's label script prints `From:` and then nothing. Sol's stamp tool only works when I type where it lives. And whatever I set in the terminal is gone the next morning. Sol kept the shop's settings in `shop-settings.sh`. Can you put them right?

The jobs are in `today.txt`.

## Variables and echo

A variable is a name with a value. Set it with the name, `=` and the value, with no spaces around the `=`:

```
GUEST="Ana Lind"
echo $GUEST
Ana Lind
```

A `$` in front of a name puts in its value, anywhere on a line. Names are usually capitals, and `guest` is another name than `GUEST`. Quotes keep a value with a space together: without them, `GUEST=Ana Lind` stops at the space and tries to run `Lind`: zsh says `command not found: Lind`, bash says `Lind: command not found`. With spaces around the `=`, the shell takes the name for a command: zsh says `command not found: GUEST`, bash says `GUEST: command not found`. Inside single quotes a `$` is a plain sign, so `echo '$GUEST'` prints `$GUEST`.

The shell sets some variables for you. `HOME` is your home folder, the one `~` stands for. `USER` is your name, and `SHELL` the shell your account starts: often `/bin/zsh` on a Mac and `/bin/bash` on Linux.

## export: what a program sees

A program started from the shell, such as a script, gets a copy of the shell's exported variables, and only those. A plain variable stays in the shell. If `greet.sh` holds the line `echo "Hello, $GUEST"`:

```
GUEST="Ana Lind"
sh greet.sh
Hello,
export GUEST
sh greet.sh
Hello, Ana Lind
```

`export GUEST="Ana Lind"` sets and exports in one line. A program can change its own copy, but never the shell's. `env` lists every exported variable.

## PATH: how the shell finds a command

When you type a name such as `ls`, the shell looks through the folders listed in `PATH`, in order, and runs the first file of that name it may run:

```
echo $PATH
/usr/local/bin:/usr/bin:/bin
command -v ls
/bin/ls
```

The folders are separated by `:`. `command -v` says which file a name runs. `command not found` means that no folder on `PATH` has it, and a file that is found but has no `x` gives `permission denied`. A name with a `/` in it, such as `./count.sh`, skips the search and runs that file.

To add a folder, put the old value after it:

```
export PATH="/home/sam/tools:$PATH"
```

When two folders hold the same name, the one in front wins. `PATH=/home/sam/tools` alone replaces the whole list, and then even `ls` is `command not found`. The Restart button above the terminal starts a fresh shell, with the list it had before.

## Making a setting last

All of these live only as long as the shell. A new shell starts from its startup file, which it reads before the first prompt. Yours is in your home folder: `~/.zshrc` for zsh, `~/.bashrc` for bash on Linux (bash on a Mac reads `~/.bash_profile` in a new window). It is yours to change when you are ready; in this repo you change a stand-in, so nothing outside the issue changes.

`shop-settings.sh` plays that part. The dot command loads it into the shell you are in:

```
. ./shop-settings.sh
```

Each line runs in your shell, as if you typed it, so what it sets stays. `sh shop-settings.sh` would set everything in a copy that ends at once. A startup file is read wherever a shell starts, so a folder in it needs its full path, the kind `pwd` prints, in quotes. Add your lines in the editor, or with `>>`; a `>` would replace the whole file.

## Your work in this issue

The terminal starts in the top folder. For the first two jobs, set and read variables in the terminal, and save what a command prints with `>`. For the stamp and the shop's name, add one line each to `shop-settings.sh`, press Restart, load the file, and try `sh label.sh` and `stamp`, then `stamp` again from inside `bin`. Check loads the file in a copy of the top folder, starting in another folder.

Reset puts `shop-settings.sh`, `label.sh` and `bin/stamp` back as they were.
