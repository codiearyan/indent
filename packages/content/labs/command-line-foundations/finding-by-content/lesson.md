# Finding words in files

## What you will be able to do

`find` looks at the names of files. Often what you need is inside them: the orders of one customer, the day something went wrong, every message that mentions a problem. In this issue you search the contents of files and folders for words. By the end of it you will be able to:

- print every line of a file that contains a word, with `grep`
- search for a phrase that has a space in it
- ignore capitals, count lines and number them, with `-i`, `-c` and `-n`
- search a folder and every folder inside it with `-r`

## The request from Idris

> **Idris:** I need every Pellow Bakery order out of the web orders, and how many orders nobody has paid for yet. Hesper wants every jam in the March log, however it was typed. And customers keep writing that their parcel went to the wrong address. I want to see each of those lines, and where it is.

The jobs are in `today.txt`. The messages are in `messages`, one folder per month.

## Lines that contain a word: grep

`grep` reads a file line by line and prints every line that contains the text you give it:

```
grep leek recipes/soups/winter.txt
leeks, three
```

The text comes first and the file after it. A match can be anywhere in the line, inside a longer word too: `grep cake` also prints a line about pancakes. Capitals count, so the line `Leek and potato` was not printed.

When no line matches, `grep` prints nothing at all; that is how it says no. A file that does not exist gets `No such file or directory`. And like `cat`, `grep` with no file waits for you to type: press Ctrl+C to get the prompt back.

## Phrases with a space

The shell splits what you type at every space, as you saw with names. So in

```
grep leek soup recipes/soups/winter.txt
grep: soup: No such file or directory
recipes/soups/winter.txt:leeks, three
```

`grep` searched for `leek` in two files, `soup` and `recipes/soups/winter.txt`. The first does not exist. And because it was handed more than one file, `grep` put the file's name in front of each line it printed. Put the phrase in quotes, `grep "leek soup" recipes/soups/winter.txt`, and it reaches `grep` as one piece of text.

## Options: -i, -c and -n

- `-i` ignores capitals: `grep -i leek` prints `Leek`, `leek` and `LEEK`.
- `-c` prints how many lines matched, instead of the lines. It counts lines, so a line with the word twice counts once.
- `-n` puts each line's number in front of it, followed by a colon: `1:Leek and potato`.

Options can be written together, so `grep -in leek` is the same as `grep -i -n leek`.

## Searching a folder: -r

`-r`, for recursive, makes `grep` search every file in a folder and in every folder below it, the way `find` walks folders. Each line it prints starts with the path of the file it came from:

```
grep -rn leek recipes
recipes/soups/winter.txt:3:leeks, three
```

With `-n` as well, the line number sits between two colons: the file, then the line number, then the line. As with `find`, the order of the files differs from one computer to the next.

Always name the folder you mean. Searching `.` searches everything in the folder you are in, including files you saved there earlier, and on Linux `grep` warns `input file is also the output` when it meets the file it is writing into.

## Saving what grep finds

`>` works the same as in the last two issues: run the search, read what it prints, then run it again with `>` and a file name. A search that finds nothing leaves an empty file, which is a sign to check the word, its capitals and the file you searched.

## Your work in this issue

The terminal starts in the top folder. Do the jobs in `today.txt` in order, each with `grep` and the option it needs. Run every search first without `>` and read its output, then save it under the name in `today.txt`, look at the file with `cat`, and press Check.

Running a search again replaces what the file held. If a starter file was changed by mistake, the Reset button puts every file this issue started with back as it was, and keeps the files you made.
