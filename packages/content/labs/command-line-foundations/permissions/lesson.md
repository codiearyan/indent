# Who may do what with a file

## What you will be able to do

The laptop is sorted, and Hesper and Idris can find and read what they need. Now some files need protecting: a list that must not change by accident, and a file only one person may open. Every file carries a short note of who may do what with it. In this issue you learn to read that note and to change it. By the end of it you will be able to:

- read the permission letters at the start of a long listing
- say who owns a file, and who the group and others are
- change permissions with `chmod` and letters
- lock a file so nobody can change it, and unlock it when it has to change

## The request from Idris

> **Idris:** Last month someone saved over the price list by mistake, and we sold posters at last year's prices for a week. Lock it, and the old lists too. The bank details worry me more: Saturday helpers log in to this laptop with an account of their own, and they should not be able to open that file at all.

The jobs are in `today.txt`.

## Reading the letters

`ls -l` starts each line with ten letters:

```
ls -l recipes
-rw-r--r--  1 sam  staff  1840 Mar  3 09:12 leek.txt
drwxr-xr-x  4 sam  staff   128 Mar  9 17:40 soups
```

The first letter is the kind: `-` for a file, `d` for a folder. The nine after it are three groups of three, for three kinds of people:

- **the owner**, named in the third column, here `sam`. The files you make are yours, so in this repo the owner is you. `whoami` prints your name.
- **the group**, named in the column after the owner. A group is a set of accounts. On a Mac every account that can log in is in `staff`; on Linux your group often has your own name.
- **others**: every other account on the computer.

In each group of three, `r` means may read, `w` means may change, and `x` means may run it as a program. A `-` in a place means not allowed. So `rw-r--r--` says: the owner may read and change, the group may read, others may read.

For a folder the letters mean a little more: `r` lets you list the names in it, `w` lets you add, remove or rename names in it, and `x` lets you go into it. A Mac may print `@` or `+` after the ten letters, and Linux sometimes a `.`. They mark extra settings and do not change what the letters mean.

## Changing permissions: chmod

`chmod` changes the letters. After it come who, a sign and letters, then the files:

```
chmod go-r leek.txt
```

Who is `u` for the owner (the user), `g` for the group, `o` for others, or `a` for all three. The sign is `+` to give, `-` to take away, or `=` to set exactly the letters given and nothing else, so `o=` leaves others with nothing. Join changes with a comma, as in `chmod u+w,go-w leek.txt`, and use the patterns from earlier issues to change many files at once. `chmod` prints nothing when it worked: run `ls -l` to see the result.

A typo in the letters gives `Invalid file mode` on a Mac and `invalid mode` on Linux. A wrong name gives `No such file or directory`.

You will also meet numbers, such as `chmod 644 leek.txt`. Each digit is one group of three, with `r` worth 4, `w` worth 2 and `x` worth 1, added up. A number sets all nine letters at once, while letters with `+` or `-` change only what you name.

## Read-only, and changeable again

A file is read-only when nobody has `w`. `chmod a-w leek.txt` takes `w` from all three and leaves `r` alone. After that, sending output into the file fails:

```
echo "two leeks" >> leek.txt
zsh: permission denied: leek.txt
```

Bash says `bash: leek.txt: Permission denied`. The editor cannot save the file either, and `rm` asks before it removes it. To change the file, give the owner `w` back with `chmod u+w leek.txt`, make the change, and lock it again.

Locking a folder is not locking its files. A folder without `w` stops names from being added or removed, but each file inside can still be changed while it has its own `w`.

Never take `r` away from yourself. A file that nobody may read cannot be shown in the editor, opened by the app or read by Check. If it happens, `chmod u+r` gives it back.

## Your work in this issue

The terminal starts in the top folder. Run `ls -l` before and after each `chmod`, and read the letters each time. For the new price, unlock the list, change the line in the editor or from the terminal, and lock it again.

If a file goes wrong, Reset puts back every file this issue started with, as it was. On Linux, Reset cannot rewrite a file that is locked: give it `w` back first.
