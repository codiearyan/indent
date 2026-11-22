# Bringing the branches in

## What you will be able to do

A branch keeps work apart until it is ready. Then it has to come back: the commits of one branch go into another. That is a merge. By the end of this issue you will be able to:

- merge a branch into the branch you are on
- tell a merge that only moves a branch forward from one that makes a merge commit
- keep Git's message for a merge commit, and get out of the editor if one opens
- call off a merge, read the graph afterwards and delete the branches that are merged

## The request from Wilma

> **Wilma:** It is July! The summer sale goes on the site today, and so does the July book for the reading group. Femi's window display is on a branch too, but I have not decided about it yet, so leave that one where it is.

Each change waits on its own branch. Now two of them join `main`, and one stays out.

## A merge goes into the branch you are on

`git merge` takes the name of another branch and brings its commits into the branch you are on. In a bakery's repository, to put the winter menu on `main`:

```
git switch main
git merge winter-menu
```

The direction matters. On `winter-menu`, `git merge main` would bring `main`'s commits into `winter-menu` instead, and `main` would not move. When the other branch has nothing you do not already have, Git says `Already up to date.` and changes nothing. That usually means the merge ran on the wrong branch, or it was done already.

## When Git only moves the branch forward

If `main` has no commits of its own since `winter-menu` started from it, there is nothing to combine: `winter-menu` is `main` plus a few commits. Git moves `main` forward to the last of them and makes no new commit:

```
Updating 3dbd671..5e0b7a1
Fast-forward
 menu.txt | 1 +
```

Afterwards both names point at the same commit, and the history is still one line.

## When Git makes a merge commit

If both branches have commits the other does not, Git combines the two and saves the result as a merge commit: a commit with two parents, one from each line. It says `Merge made by the 'ort' strategy.`

Like every commit, a merge commit needs a message, and Git writes one for you: `Merge branch 'winter-menu'`. In a terminal it opens an editor to let you change it. `--no-edit` keeps Git's message and opens no editor:

```
git merge --no-edit winter-menu
```

If an editor opens anyway, close it without changing anything, and the merge commit is made with Git's message. In a screen full of `~` signs, type `:q` and press Enter; if the bottom lines show `^X Exit`, press Ctrl+X. This is different from a commit in the first part of this repo: there the message was empty, here Git has written it already.

If Git stops with `Not committing merge; use 'git commit' to complete the merge`, the editor could not run, and the merge is waiting for its commit. `git commit --no-edit` finishes it.

## Calling a merge off

While a merge waits, `git status` says you are still merging. `git merge --abort` calls it off: the branch and the files go back to how they were before the merge started. It works whenever a merge is open, and the next issue needs it.

A merge, like a switch, refuses to start when you have changes that are not committed in a file it would change: `Your local changes to the following files would be overwritten by merge`. Commit them, or throw them away with `git restore`, and merge again.

## Reading the graph and tidying up

After the bakery's two merges, `git log --oneline --graph --all` looks like this:

```
*   b70c9e4 (HEAD -> main) Merge branch 'spring-prices'
|\
| * 41aa3c0 (spring-prices) Raise the price of spelt
* | 5e0b7a1 (winter-menu) Add a winter soup
|/
* 3dbd671 Add a rye loaf to the Saturday menu
```

The merge commit has two lines going into it. Every commit of `winter-menu` and `spring-prices` is now in `main`'s history, so those names are no longer needed:

```
git branch -d winter-menu spring-prices
```

That deletes the names only; the commits stay, because `main` holds them. `-d` refuses a branch with commits that the branch you are on does not have, and says `error: the branch 'x' is not fully merged`. Git then suggests `-D`, which deletes the branch anyway and throws its commits away. Do not use it here. Git also never deletes the branch you are on: it says `cannot delete branch` and names the folder, so switch to `main` first.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and start with `git log --oneline --graph --all`. Merge `summer-sale` first, then `reading-group`, both while on `main`, and read what Git prints each time. Then tidy up. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
