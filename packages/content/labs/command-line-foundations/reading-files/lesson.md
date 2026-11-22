# Looking inside files

## What you will be able to do

The shop laptop is sorted, and now Idris needs what is inside the files: an order list of hundreds of lines, a press log for every month and two lists of email addresses. Opening each one and scrolling is slow, and some are too long to read whole. In this issue you read files from the terminal and keep what a command prints. By the end of it you will be able to:

- print a file with `cat`, and join files with it
- read a long file one screen at a time with `less`
- show only the start or the end of a file with `head` and `tail`
- count lines and words with `wc`
- save what a command prints into a file with `>`

## The request from Idris

> **Idris:** Our accountant wants a look at the web orders, just the header and the first ten. Press 2 stopped on Tuesday, and Hesper wants to see what the March log says at the very end. I want to know how busy the presses were each month. And the market and shop sign-up lists should be one mailing list.

The jobs are in `today.txt`. Since the web shop opened in January, `sales/web-orders.csv` has grown to hundreds of lines, far too many to copy by hand.

## Printing a file: cat

`cat` prints a file into the terminal:

```
cat recipes/soup.txt
```

Give it several names and it prints them one after the other, as if they were one file. That is where its name comes from: it concatenates, which means it joins files end to end.

```
cat part-1.txt part-2.txt
```

If the name is a folder, `cat` says `Is a directory`. If nothing has that name, you get `No such file or directory`, as with `ls`.

Typed with no file name at all, `cat` does not finish. The cursor sits on an empty line, waiting for you to type text for it to print. Many commands do this when you forget the file. Press Ctrl+C, holding Control while you press C, to stop the command and get the prompt back. It works for any command that runs too long.

## Long files: less

`cat` prints everything at once, so a long file scrolls past before you can read it. `less` shows a file one screen at a time:

```
less recipes/big-book.txt
```

Space or the down arrow moves on, `b` or the up arrow moves back, and `/` followed by a word and Enter jumps to the next place that word appears. Press `q` to leave and get the prompt back; Ctrl+C does not leave `less`. If the terminal says `command not found` for `less`, use `more`, which does the same job and also leaves with `q`.

## The start and the end: head and tail

Often you only need part of a file. `head` prints its first 10 lines and `tail` its last 10. `-n` and a number asks for another amount:

```
head -n 3 recipes/soup.txt
tail -n 20 diary.txt
```

A file that grows, like a diary or a log, gets its newest lines at the bottom, so `tail` shows what happened last. A spreadsheet saved as `.csv` has the names of its columns on the first line, the header, so `head` shows the header along with the first rows. Remember that the header is a line too when you count.

## Counting: wc

`wc`, short for word count, counts the lines, words and bytes of a file. `-l` counts only lines and `-w` only words:

```
wc -l diary.txt
     214 diary.txt
```

Given several files, or a pattern like `diary/*.txt`, it prints one line per file and a `total` line at the end. A Mac puts spaces before each number and Linux does not; the numbers are the same.

## Keeping what a command prints: >

Everything so far prints into the terminal and is gone when you clear it. Put `>` and a file name after a command, and what the command would have printed goes into that file instead:

```
head -n 3 recipes/soup.txt > soup-start.txt
```

Nothing shows in the terminal. The shell makes the file if it does not exist yet, in the folder you are in, and `cat soup-start.txt` shows what went in. Error messages still show in the terminal and stay out of the file.

Be careful: when the file already exists, `>` empties it first and replaces everything it held. Saving into the same name twice keeps only the second output. And never send output into the file the command reads, as in `head -n 3 soup.txt > soup.txt`. The shell empties `soup.txt` before `head` starts, so the file ends up empty. The last issue of this part comes back to this.

## Your work in this issue

The terminal starts in the top folder. For each job in `today.txt`, read the file first with `cat`, `less`, `head` or `tail`. When the terminal shows exactly what the job asks for, press the up arrow, add `>` and the name from `today.txt`, and run it again. Look at what you saved with `cat`, then press Check.

A saved file that came out wrong is easy to fix: run the right command again, and `>` replaces what the file held. If a starter file was emptied or changed by mistake, the Reset button puts back every file this issue started with, as it was, and leaves the files you made.
