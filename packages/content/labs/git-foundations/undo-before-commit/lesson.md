# Undo before you commit

## What you will be able to do

So far every change you met was one you wanted. Some are not: an experiment that did not work out, a file staged too early. Before a change is committed, Git can take it back from either of the two places it may be sitting. By the end of this issue you will be able to:

- use the tips `git status` prints to find the way back
- throw away a change in the working folder with `git restore`
- take a file out of the staging area with `git restore --staged`, keeping your edit
- choose between the two, and know which one cannot be undone

## The request from Wilma

> **Wilma:** Femi had a go at a new look for the site on Monday. Pink, with enormous headings. No. He also staged a note about closing for the book fair, and I have not booked the stall yet, so not that either, but keep it, I may need it next week. The fern book he found can go up today.

Three changes again, and this time two of them must not go in. One should vanish completely; one should wait, out of the staging area but still in the file.

## The way back is in git status

Look at what `git status` prints above each list:

```
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   menu.txt

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   prices.txt
```

The lines in brackets are the moves out of each list. When you are not sure how to undo something, run `git status` and read them. Older versions of Git, before 2.23, suggest `git reset HEAD <file>` and `git checkout -- <file>` instead; they do the same two jobs. `git --version` tells you which version you have.

## Throwing a change away: git restore

```
git restore prices.txt
```

This puts the working folder's copy of `prices.txt` back to the version Git has for it: the staged copy if the file is staged, otherwise the one in the last commit. Your edit is gone.

That is the one move in this issue that cannot be undone. The change was never staged or committed, so Git never kept a copy of it, and the editor shows the restored file once it reads it again. Before you restore, be sure you do not want the change, and look at it with `git diff` if you are not.

## Taking a file out of the staging area: git restore --staged

```
git restore --staged menu.txt
```

With `--staged`, `git restore` works on the staging area instead of the working folder. The staging area's copy of `menu.txt` goes back to the version in the last commit, and the file on disk stays exactly as it is. `git status` now lists `menu.txt` under changes not staged: your edit is safe, it is just no longer part of the next commit. Stage it again with `git add` whenever it is ready.

## Which one to use

- A change you do not want at all, not staged: `git restore <file>`.
- A staged change you want to keep, but not in the next commit: `git restore --staged <file>`.
- A staged change you do not want at all: `git restore --staged <file>`, then `git restore <file>`.

Mind the difference on a staged file: `git restore` without `--staged` copies the staged version into the working folder. The file stays staged, and anything you edited after staging it is lost.

`git restore` only knows files Git tracks. For a file that was never added, it says `pathspec ... did not match any file(s) known to git`; there is nothing in Git to go back to.

## What restore does not undo

Neither move touches the history. Once a change is committed, `git restore` cannot take it back out of that commit; undoing commits comes in a later part of this repo. That is why the habit from the last issues matters: `git status` and `git diff --staged` before every commit, so nothing goes in that should not.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and start with `git status`: one file is changed, two are staged. Keep `shop/visit.html` open in the editor to see that the closing note survives. Do the tasks in order, and unstage the note before you commit the new find. Press Check after each task. If a change goes into a commit or disappears by mistake, run `node setup.mjs` in the top folder to start over (`node ../setup.mjs` from inside `shop`).
