# Sending your work to the server

## What you will be able to do

So far commits have only come from the server to your laptop. The last step goes the other way: your commits go to the server, where Femi and Wilma can fetch them. By the end of this issue you will be able to:

- push a branch to the server
- read what a push prints
- say why the server refuses a push
- pull, then push again, without losing anyone's work

## The request from Wilma

> **Wilma:** I read your voucher fix, and it is right. Put the vouchers branch on the server so Femi can see it. And we close for stocktaking from the 10th to the 16th of August: that has to go on the site today.

Two branches to send. One of them will not go the first time.

## Pushing a branch

`git push` sends the commits of a branch to the server and moves the server's branch to them. In a bakery's copy, on `winter-menu`:

```
git push
To ../server/bakery.git
   41aa3c0..9c41d2e  winter-menu -> winter-menu
```

With no names, a push sends the branch you are on to the server branch it follows. The last line says the server's `winter-menu` moved from one commit to another. Git moves `origin/winter-menu` as well, so `git status` says up to date again. When there is nothing new to send, Git says `Everything up-to-date`.

To send a branch by name, from any branch: `git push origin winter-menu`. A branch you made yourself follows nothing yet, so `git push` on it stops with `has no upstream branch`. `git push -u origin <name>` sends it and makes it follow the server's branch of that name.

## Why a push is refused

The server takes a push only when it moves its branch forward: when every commit the server's branch has is also in the branch you send. Otherwise the server would lose commits that someone else sent. So it refuses:

```
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '../server/bakery.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

`fetch first` means the server has commits your copy has never seen. When you have fetched them but not taken them in, Git says `(non-fast-forward)` instead, with `the tip of your current branch is behind its remote counterpart`. Both mean the same: someone else sent work, and your branch does not have it. Nothing was sent, and nothing was changed, on either side.

Git also mentions `--force` in its help. A forced push makes the server take your branch anyway and throws away the commits only it had. On a shared server that deletes a colleague's work. Never use it in this repo.

## Pull, then push again

The way through is the last issue's: bring their work in, then send yours.

```
git pull --no-edit
git push
```

Your branch and the server's have each moved, so the pull makes a merge commit, as you saw on `gift-vouchers`. Now your branch has every commit the server has, plus yours, and the push moves the server's branch forward. If the pull meets a conflict, settle it first; the push waits until the merge is finished.

The habit that saves a refusal: pull before you start, and again before you push. The server stays one line of history that everybody adds to.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`. Push `gift-vouchers` first. Then switch to `main`, add the closing week to `shop/visit.html`, commit it, and push. Read what Git says when it refuses, bring Femi's commit in, and push again. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
