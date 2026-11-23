# A script of your own

## What you will be able to do

Every command so far was typed, run and gone. When you type the same few commands every day, you can save them in a file and run the file instead. That file is a script, and it is the first program you write. By the end of this issue you will be able to:

- save commands in a script and run it with `sh`
- give a script a first line that names the program that runs it
- make a script runnable and start it with `./`
- hand a script a file to work on, with `$1`
- read a command's exit status, and make a script say when it failed

## The request from Idris

> **Idris:** Every evening I type the same four lines to see how the day went, and some evenings I get one wrong. Can one word do all four? And Sol left a `count.sh` that only ever counts today's orders. It also says `Counted.` when it counted nothing at all.

The jobs and Idris's four lines are in `today.txt`.

## A file of commands

A script is a plain text file with one command on each line. `sh` reads it and runs the lines in order, as if you typed them:

```
touch tidy.sh
sh tidy.sh
```

Make the file with `touch`, open it from the file panel, and write the commands in it; the editor saves it for you. A line that starts with `#` is a comment, which the shell skips. Every line runs in the folder you were in when you started the script, not the folder the script sits in.

Keep plain line ends. A file written on Windows can end every line with an invisible extra character, and the shell then reads it as part of each command. It shows as `^M` in messages such as `bad interpreter: /bin/sh^M`. The editor here writes plain line ends; a file copied from elsewhere may not.

## The first line, and ./

The first line of a script can name the program that reads the rest:

```
#!/bin/sh
echo "Shop closed."
```

`#!` must be the very first two characters of the file, with no space and no empty line before them. `/bin/sh` is on every Mac and every Linux. On Linux, `sh` can be a smaller shell than bash, so keep to the commands from this repo. Other shells, such as zsh, are not on every computer.

To start the script by its name, let yourself run it, then give its path:

```
chmod u+x tidy.sh
./tidy.sh
```

`./` means the file in this folder. `tidy.sh` alone gives `command not found`, because the shell looks for commands only in certain folders; the next issue shows which. Without `x`, zsh says `permission denied: ./tidy.sh` and bash says `Permission denied`. Without the first line, `./tidy.sh` may still run, but each shell guesses differently how. With it, the script runs the same everywhere.

## Arguments: $1

Words typed after a script's name are its arguments. Inside the script, `$1` is the first one and `$2` the second:

```
#!/bin/sh
grep -c "$1" guests.txt
```

`./find.sh Ana` counts the lines with `Ana`. Keep `$1` in double quotes, so a name with a space stays one name; without them, `week one.csv` becomes `week` and `one.csv`. A path given as an argument is read from the folder you are in, the same as for any command. From inside `notes`, the same script is `../find.sh`.

`<` hands a file to a command as what it reads: `wc -l < guests.txt` prints the number alone, without the file's name after it.

## Exit status

Every command ends with a number, its exit status: 0 when it worked, and another number when it did not. The shell keeps the last one in `$?`:

```
ls nowhere
ls: nowhere: No such file or directory
echo $?
1
```

Linux words the message as `cannot access 'nowhere'` and ends with 2; any number but 0 means it failed. A script ends with the status of its last command. When the last line is an `echo`, the script says it worked even when a line before it failed. `exit 1` stops a script at once with status 1. `&&` runs the next command only if the one before it worked:

```
cp menu.txt backup/ && echo "Saved."
```

When the copy fails, `Saved.` is not printed, and the line ends with the failed copy's status.

## Your work in this issue

The terminal starts in the top folder. Make `evening.sh`, write Idris's four lines in it and run it with `sh`, then give it its first line and make it runnable. Then change Sol's `count.sh`: try it on each file in `orders`, from the top folder and from inside `orders`, on a file that does not exist too, and run `echo $?` after each try. For a missing file the shell prints a message that names it, worded a little differently on a Mac and on Linux. Check runs your scripts in a copy of the top folder, with orders of its own.

Reset puts `count.sh` back as Sol left it. `evening.sh` is yours, and stays.
