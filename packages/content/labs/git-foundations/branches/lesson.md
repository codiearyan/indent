# A branch for the summer sale

## What you will be able to do

Until now the shop's history was one line: each commit came after the one before. Real work is rarely that tidy. A change that is not ready has to wait somewhere while other changes go ahead. By the end of this issue you will be able to:

- say what a branch is, and which branch you are on
- make a branch and switch to it
- commit on a branch, then switch back and watch the files change
- read Git's message when a switch is refused, and get out of a detached HEAD

## The request from Wilma

> **Wilma:** I want the summer sale on the home page, half price on everything in July. Get it ready now, but it must not be on the site before the first of July. And the reading group moves to seven o'clock; that one cannot wait for July.

Two changes with two timetables. On one line of history, the sale would block the reading group, or go out too early.

## What a branch is

A branch is a name that points at a commit. The setup's repository has one branch, `main`, and every commit so far moved `main` forward to the new commit. `git status` names the branch you are on in its first line, `On branch main`, and `git branch` lists the branches, with a star at yours.

Making a branch adds a second name at the commit you are on. Nothing is copied. From then on, a commit moves only the branch you are on, so the two names go separate ways.

## Making a branch and switching to it

In a bakery's repository, a branch for a winter menu:

```
git switch -c winter-menu
```

`-c` makes the branch and switches to it, and Git answers `Switched to a new branch 'winter-menu'`. The same in two steps: `git branch winter-menu` makes it, and `git switch winter-menu` moves you onto it. Making a branch alone does not move you, so `git status` would still say `On branch main`. Git older than 2.23, and many guides, use `git checkout -b winter-menu` and `git checkout winter-menu` instead; they do the same.

Branch names have no spaces; small letters joined by hyphens are the habit. A name must match exactly: `git switch wintermenu` answers `fatal: invalid reference: wintermenu`, because there is no such branch. A branch with a typo in its name can be renamed: `git branch -m wintr-menu winter-menu`.

## Switching changes the files

Commits on `winter-menu` work as always: edit, stage, commit. Then `git switch main`, and Git puts the files of `main`'s last commit in the working folder. A file the winter menu changed goes back to how `main` has it, and the editor shows it. Switch to `winter-menu` again and the change is back. Nothing is lost; each branch keeps its own commits.

Only committed work belongs to a branch. A change you have not committed comes with you when you switch, as long as both branches have the same version of that file. When they do not, Git refuses:

```
error: Your local changes to the following files would be overwritten by checkout:
	menu.txt
Please commit your changes or stash them before you switch branches.
Aborting
```

Nothing happened, and you are still where you were. Commit the change on the branch it belongs to, or throw it away with `git restore`. Stashing is not part of this repo. The habit that avoids all this: run `git status` before you switch, and switch when it says nothing to commit.

## Seeing every branch

`git log --oneline --graph --all` draws the commits of every branch. In a terminal, names in brackets show where each branch points, and `HEAD ->` marks the one you are on:

```
* 9c41d2e (HEAD -> main) Lower the price of rye
| * 5e0b7a1 (winter-menu) Add a winter soup
|/
* 3dbd671 Add a rye loaf to the Saturday menu
```

Each `*` is a commit, and the lines join commits to their parents. Here both branches grew from `3dbd671`.

## A detached HEAD

If `git status` ever starts with `HEAD detached at 3dbd671`, you switched to a commit instead of a branch, for example with `git checkout 3dbd671` while reading the history. You can look around safely, but you are on no branch, and a commit made there belongs to none. `git switch main` takes you back onto a branch.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`. Keep `shop/index.html` open in the editor while you switch, and watch the sale line come and go. Run `git status` before each commit and each switch, and read its first line. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
