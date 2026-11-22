# Files Git should leave alone

## What you will be able to do

The shop's history is in good shape: you can commit, read and undo. This issue starts the second part of the repo, Branching out, and it begins with the files that do not belong in a history at all. By the end of this issue you will be able to:

- tell Git to leave files alone with a `.gitignore` file
- write a pattern for one file and a pattern for a whole folder
- make Git forget a file it already tracks, and keep the file on disk
- explain why `.gitignore` itself is committed

## The request from Wilma

> **Wilma:** Every time I run git status there is a heap of things that are not the website: the till's stock list, Femi's drafts, and that upload log, which says it is modified every single week. I am always afraid one of them goes in by mistake. Can Git just stop showing them?

Some files live in the folder and are never meant for the history: files a program writes, private notes, work that is not ready. `git add .` would sweep them all in.

## A file of patterns

A file called `.gitignore` in the top folder of a repository holds patterns, one per line. Git leaves out every untracked file that matches one of them: `git status` stops listing it, and `git add .` skips it. A bakery's folder might have this `.gitignore`:

```
# The oven writes this every night
oven.log

# Recipes nobody has tried yet
untested/
```

The name starts with a dot, and names like that are hidden in many places. The files panel shows this one because the issue opens it, and the setup made it for you, empty. Edit it in the editor and save it; Git reads it again every time it runs.

## Writing patterns

- A plain name, like `oven.log`, matches a file of that name, in any folder of the repository.
- `*` stands for any characters in a name: `*.log` matches every file that ends in `.log`.
- A name that ends with a slash, like `untested/`, matches a folder and everything in it, now and later.
- A line that starts with `#` is a note for people. Empty lines are fine.

Spelling counts, and so do spaces: ` oven.log` with a space in front is a different name. After you save, run `git status` and see what is gone from the list. To ask Git which line keeps a file out, run `git check-ignore -v oven.log`. It prints the file of patterns, the line number and the pattern; it prints nothing when no line matches.

A pattern that is too wide is as bad as a typo. `*.html` would also hide every page of the shop's website, and a new page would never be committed.

## Files Git already tracks

A pattern only keeps out files Git does not track yet. Once a file has been committed, Git keeps tracking it whatever `.gitignore` says, and `git status` goes on listing it as modified after each change. When a file that you ignored still shows up, that is why.

To make Git forget such a file, take it out of the staging area only:

```
git rm --cached oven.log
```

`git rm` stops tracking a file. With `--cached` the file stays in the folder, untouched; without it, Git deletes the file from the folder too. If the file has changes that are not committed, `git rm` without `--cached` refuses and says `has local modifications`. If a file is deleted by mistake, `git status` shows the way back, as in the last issue.

After `git rm --cached`, `git status` lists the file as `deleted` under changes to be committed. That means deleted from what Git tracks, not from the disk: the next commit records that Git stops keeping it. Because the file matches a pattern, it does not come back as untracked.

The old commits still hold the file. Ignoring it changes what happens from now on, not the history. That is one more reason to set up `.gitignore` early, and never to commit a password, even for a moment.

## The rules belong in the history

`.gitignore` is a file like any other. Until it is committed, its patterns live only in this one folder, and nobody who gets the history later has them. So the new `.gitignore` goes into a commit, together with the change that made Git forget a file.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and start with `git status`. Open `shop/.gitignore` in the editor and add one line per task, saving each time, and run `git status` after every save to see the effect. The third task needs `git rm --cached`, and the last one commits it all. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`); it puts back an empty `.gitignore`.
