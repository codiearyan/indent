# Joining commands

## What you will be able to do

Each command so far did one job on one file. The command line gets its power from joining them, so that what one command prints goes straight into the next. In this issue you build short chains of commands, and learn where `>` can destroy a file. By the end of it you will be able to:

- send what one command prints into another with a pipe, `|`
- sort lines with `sort`, and drop repeats with `uniq`
- count how often each line appears with `uniq -c`
- add lines to the end of a file with `>>`
- change a file without emptying it by mistake

## The request from Hesper and Idris

> **Hesper:** Saturday's market went well, and I noted every sale on my phone as it happened. What did we sell, and what sold best?
>
> **Idris:** Two small jobs for me. Today's finished jobs belong at the end of my running list, and the stock list is in a muddle.

The jobs are in `today.txt`. `market/sold.txt` has one line for every item sold, in the order it was sold, so the same item appears many times.

## Pipes: |

A pipe, typed `|`, sends what one command prints into the next command instead of onto the screen. On most keyboards it is Shift and the backslash key.

```
grep -i soup recipes/menu.txt | head -n 3
```

`grep` finds every line about soup and `head` keeps the first three. The command after a pipe gets no file name: it reads what comes through the pipe. You can chain as many commands as you like, each taking what the one before it printed.

Build a chain one step at a time. Run the first command and read what it prints, press the up arrow, add `|` and the next command, and run it again.

## Sorting: sort

`sort` prints the lines it is given in alphabetical order. `-r` reverses the order. Plain `sort` compares lines character by character, so `10` comes before `9`, because `1` comes before `9`. `-n` compares the numbers at the start of each line instead, and `-rn` puts the biggest first. Capitals and signs can sort a little differently on a Mac and on Linux; small letters sort the same.

## Repeats: uniq

`uniq` drops a line when it is the same as the line right above it. Repeats that are spread apart stay. That is why `uniq` almost always comes after `sort`, which puts equal lines next to each other:

```
sort guests.txt | uniq
```

`uniq -c` writes in front of each line how many times it appeared in a row:

```
sort guests.txt | uniq -c
   2 Ana
   1 Bo
   3 Cy
```

Linux puts more spaces in front of the numbers; the counts are the same. Add `| sort -rn` and the most frequent line comes first, and `| head -n 2` keeps the top two.

## Adding to a file: >>

`>` replaces what a file holds. `>>` adds to its end instead, and makes the file if it does not exist yet:

```
grep leek recipes/soups.txt >> shopping.txt
```

Everything already in `shopping.txt` stays. `>>` adds every time it runs, so running the command twice puts the lines in twice.

## When > destroys

`>` empties its file before the command even starts, with no bin to get it back from. Two mistakes follow from that. A `>` aimed at a file you meant to keep wipes it. And a command that reads the same file it writes into, such as

```
sort names.txt > names.txt
```

finds the file already empty, so `names.txt` ends up with nothing in it. To change a file, save the result under a new name, look at it, then move it over the old one with `mv`:

```
sort names.txt > names-sorted.txt
cat names-sorted.txt
mv names-sorted.txt names.txt
```

The `mv` replaces `names.txt`, which this time is what you want.

## Your work in this issue

The terminal starts in the top folder. For the market jobs, build each chain one command at a time and read what it prints before you add `>`. For Idris's jobs, change the two files without losing a line: list them with `cat` before and after.

If a file is lost or emptied, the Reset button puts back every file this issue started with, `jobs-done.txt` and `stock.txt` included, as they were. The files you made stay, and the next `>` replaces them.
