# Removing for good

## What you will be able to do

The studio folder is nearly sorted. What is left is clutter: duplicates, temporary files and a whole old web site. This issue is about removing things, the one job where the terminal gives you no second chance, so it is as much about care as about commands. By the end of it you will be able to:

- remove files with `rm`, one by one or with a pattern
- remove a folder with everything inside it with `rm -r`
- make `rm` ask before each removal with `-i`
- check what you are about to remove before you remove it

## The request from Maeve

> **Maeve:** Let's finish this. There is a copy of the fox poster I never asked for, and `downloads` is full of `.tmp` rubbish from the printer. Sol's note says the old web site can go, but keep the logo, I still like it.

The list is in `today.txt`.

## Removing a file: rm

You met `rm` in passing when you undid a typo. It removes the files you name:

```
rm old-letter.txt
```

It prints nothing and asks nothing. The file does not go to a bin; it is gone, and no command brings it back. That is the whole reason this issue exists: the commands are short, and the care is up to you.

Everything you learned about names still applies. A name with a space needs quotes or a backslash, and here a slip costs more than an error message. Without quotes, `rm holiday photo.jpg` asks `rm` to remove two files, `holiday` and `photo.jpg`. If a file called `holiday` happens to exist, it is the one that goes.

## Patterns and rm

Wildcards work with `rm` as with every command, and a pattern can remove many files in one go:

```
rm drafts/*.bak
```

That is useful and dangerous in equal measure. One extra space, as in `rm drafts/ *.bak`, and the pattern means something else entirely. So the rule from the last issue becomes a must here: run the pattern with `ls` first, read the list, then press the up arrow and change `ls` to `rm`. A pattern that fits too loosely, like `drafts/*`, takes everything in the folder.

## Removing a folder: rm -r

`rm` on its own refuses a folder. On a Mac it says the folder `is a directory`; on Linux, `cannot remove` it because it `Is a directory`. `rmdir`, which you know, refuses a folder that still holds anything, with `Directory not empty`.

The option `-r`, for recursive, removes a folder and everything inside it, folders in folders included:

```
rm -r old-drafts
```

This is the most destructive command in this course. Before you run it, list the folder, and make sure nothing inside it is still wanted. If something is, move it out first.

You may see `rm -rf` in instructions online. The `f` means force: it never asks and stays quiet even when a name is wrong. You do not need it here, and as a beginner you are safer without it.

## Making rm ask: -i

`-i` makes `rm` ask before each file, so you can say yes or no one at a time:

```
rm -i drafts/*.bak
remove drafts/may.bak?
```

Type `y` and press Enter to remove that file, or `n` to keep it. The question looks a little different on Linux. With a folder, `rm -ri` asks about every file inside it, which is slow but safe when you are not sure.

## A habit for every removal

1. `pwd`: are you where you think you are?
2. `ls` with the exact names or pattern you are about to remove.
3. Only then `rm`, with the same names.

In this issue, if something is removed by mistake, the Reset button puts back every file the issue started with, including a removed folder and the files in it. Outside this app there is no such button, so build the habit now.

## Your work in this issue

The terminal starts in the top folder. Do the jobs in `today.txt` in order: rescue what has to stay before you remove what holds it. List before every removal, and press Check after each job.
