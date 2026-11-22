# Many files at once

## What you will be able to do

Moving one file at a time works, but the studio has dozens of them. In this issue you learn to name a whole group of files in a few characters, and to hand that group to any command. By the end of it you will be able to:

- match many names with the wildcards `*` and `?`
- test a pattern with `ls` before you use it
- move or copy a group of files in one command
- tell what happened when a pattern matched nothing

## The request from Maeve

Maeve wrote today's list in `today.txt`.

> **Maeve:** I saved my new drawings straight into `downloads`, and the March invoices landed there too, mixed up with my price ideas and the stock count. Can you get the drawings into `artwork` and the invoices where Idris keeps them? And Idris wants all the Pellow Bakery orders in one place.

`downloads` holds more than a dozen files of three kinds. Doing this one name at a time would be slow and easy to get wrong.

## Wildcards

A wildcard is a character that stands for others in a name:

- `*` matches any run of characters, including none at all.
- `?` matches exactly one character.

So `*.txt` means "every name that ends in `.txt`", `report-*` means "every name that starts with `report-`", and `*-final.txt` fixes the end of the name and leaves the start free. `photo-?.jpg` matches `photo-1.jpg` and `photo-7.jpg` but not `photo-12.jpg`, which has two characters where the `?` is.

A pattern can sit at the end of a path, so `letters/*.txt` matches the `.txt` files in `letters`.

## The shell does the matching

The command never sees your pattern. Before it runs anything, the shell replaces the pattern with every name in the folder that matches it, in alphabetical order. If `letters` holds `bank.txt`, `gas.txt` and `photo.jpg`, then

```
mv letters/*.txt old
```

is turned into this before `mv` starts:

```
mv letters/bank.txt letters/gas.txt old
```

That is why wildcards work with every command you know: `ls`, `cp`, `mv`, `rm` and the rest. It is also why a pattern can hand `mv` many files at once, and then the last name must be a folder that exists. If it is not, `mv` says that name `is not a directory`, or names it as a target that does not exist, and moves nothing.

Two details. A `*` does not match the dot at the start of a hidden name, so hidden files stay out of patterns. And quotes switch wildcards off: `"*.txt"` means a file whose name really is `*.txt`.

## Look before you move

Because the shell builds the list for you, you can see it first. Run the pattern with `ls`:

```
ls letters/*.txt
letters/bank.txt   letters/gas.txt
```

If the list is exactly what you meant, press the up arrow, change `ls` to `mv` or `cp`, and add where the files go. If the list holds something you did not mean, change the pattern and try `ls` again. This habit costs a second and saves you from the classic mistake, a pattern like `letters/*` that matches every file in the folder when you meant only some.

## When nothing matches

If no name matches, the two common shells react differently. zsh, the usual shell on a Mac, stops and runs nothing:

```
zsh: no matches found: *.jpeg
```

bash hands the pattern to the command unchanged, and the command looks for a file that is really called `*.jpeg`, so it reports `No such file or directory`. Either way, nothing was moved. Check which folder you are in and how the names really end.

When a pattern caught too much and moved files where they do not belong, move those files back with a narrower pattern or one by one. The Reset button puts every starter file back where it started, but it does not remove the files you moved, so after a Reset they are in both places.

## Your work in this issue

The terminal starts in the top folder. For each job in `today.txt`, first find a pattern that `ls` lists exactly right, then use it with `mv`. List both folders afterwards and press Check.
