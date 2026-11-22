# What is new on the server

## What you will be able to do

Your laptop has a copy of the shop's repository, and so do Femi and Wilma. When one of them sends commits to the server, your copy does not hear of it by itself. It has to ask. By the end of this issue you will be able to:

- fetch what is new on the server without changing your own work
- read what came in before you take it
- bring a colleague's commits into your branch
- pull, and read the merge commit a pull can make

## The request from Femi

> **Femi:** I sent two commits for main from home last night: a new find and the August book for the reading group. And Wilma linked her vouchers from the home page on her branch. Can you take all of that onto your laptop? Your voucher fix stays where it is.

Work arrived on the server. Your copy has to bring it in, and keep what it has of its own.

## Up to date with what Git last heard

`origin/main` moves only when your copy talks to the server. So `git status` can say `Your branch is up to date with 'origin/main'` while the server has moved on: it compares your branch with what Git last heard, not with the server as it is now.

`git fetch` asks. It downloads every commit your copy does not have yet, from every branch of `origin`, and moves the `origin/` names to match. In a bakery's copy:

```
From ../server/bakery
   3dbd671..5e0b7a1  main         -> origin/main
   41aa3c0..9c41d2e  winter-menu  -> origin/winter-menu
```

One line for each branch that moved, from its old commit to its new one. A fetch changes nothing else: not your branches, not your files, not the staging area. It is always safe. When nothing is new, it prints nothing.

## Look before you take it

After the fetch, `git status` says where you stand:

```
Your branch is behind 'origin/main' by 2 commits, and can be fast-forwarded.
```

Behind by two: the server's `main` has two commits yours does not. To read them before you take them:

```
git log --oneline main..origin/main
```

`main..origin/main` means the commits on `origin/main` that are not on `main`. `git log --oneline --graph --all` draws the same thing with every branch, and `git diff main origin/main` shows the changes line by line.

## Taking it in

`origin/main` can be merged like any branch, into the branch you are on:

```
git switch main
git merge origin/main
```

Your `main` has nothing of its own since the last fetch, so Git only moves it forward, and prints `Fast-forward` as in the merging issue. Afterwards `git status` says up to date again, and this time it is true.

`git pull` does both steps in one: a fetch, then a merge of the server's version of the branch you are on, the branch it follows. On `main` it fetches, then merges `origin/main`. When there is nothing to merge it says `Already up to date.`

## When both sides have new commits

When your branch has commits the server's does not, and the server's has commits yours does not, `git status` after a fetch says:

```
Your branch and 'origin/winter-menu' have diverged,
and have 1 and 1 different commits each, respectively.
```

Neither can just move forward, so the merge inside the pull makes a merge commit, with a message Git writes: `Merge branch 'winter-menu' of ../server/bakery into winter-menu`. As with any merge, `--no-edit` keeps it without an editor:

```
git pull --no-edit
```

If an editor opens anyway, close it as the merging issue showed. If both sides changed the same lines, the pull stops with a `CONFLICT`, and you settle it as in the last issue.

The setup tells your copy to merge when a pull needs to. On other computers Git may stop instead with `Need to specify how to reconcile divergent branches`. `git pull --no-rebase` then merges, as in this repo.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`. Fetch first, and read `git status` and the graph before and after. Bring Femi's commits into `main` and look at `shop/finds.html`. Then switch to `gift-vouchers` and pull Wilma's link in beside your fix. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
