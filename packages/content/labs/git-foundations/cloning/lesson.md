# A copy from the server

## What you will be able to do

Until now the shop's history lived in one folder on one computer. As soon as two people work on the site from two computers, the history needs a home that both can reach. In Git that home is another repository, and each person works in a copy of it. By the end of this issue you will be able to:

- say what a remote is, and what `origin` names
- copy a repository with `git clone`
- read `origin/main`, Git's memory of a branch on the server
- make a branch of your own from a branch on the server, and commit on it

## The request from Wilma

> **Wilma:** Femi wants to work on the website from home on Fridays, so he put the shop's repository on the little server under the till. From now on the history lives there, and everyone takes a copy. Your new laptop has none yet. I also started gift vouchers on a branch there, but my line says they never expire. They last two years. Fix it on your laptop, and do not send it until I have read it.

One history on the server, and a copy on each computer.

## A remote

A remote is another repository that yours knows by a short name. On a real team it sits on another computer, reached over the network with an address that starts with `https://` or `ssh`. In this repo it is a folder beside `shop`: `server/shop.git`. Git treats both the same way; only the address differs.

The server holds a bare repository: the history only, with no working folder. Nobody edits files there, which is why its name ends in `.git` like the hidden folder in your own repository. Leave the files in `server` alone; Git reads and writes them for you.

## Cloning

`git clone` copies a repository, its whole history and every branch, into a new folder. In a bakery's back office, with the server at `server/bakery.git`:

```
git clone server/bakery.git bakery
```

The address comes first, then the folder for the copy. Run it in the folder that will hold the copy, not inside it. Git answers `Cloning into 'bakery'...` and then `done.` If the folder already has files in it, Git stops with `destination path 'bakery' already exists and is not an empty directory`. An empty folder is fine.

The copy is a full repository. It also remembers where it came from, under the name `origin`:

```
git remote -v
origin  /home/kit/bakery-work/server/bakery.git (fetch)
origin  /home/kit/bakery-work/server/bakery.git (push)
```

Here the address is the folder's full path. A clone is a new repository, so the name and email you set in an older one do not come with it. If `git commit` says `Author identity unknown`, set them in the copy as in the first issue.

## origin/main

`git branch` in a fresh clone lists one branch, `main`. `git branch -a` lists more:

```
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/origin/winter-menu
```

`origin/main` and `origin/winter-menu` are not branches you work on. They are Git's memory of where those branches were on the server the last time your copy heard from it. `git status` compares your branch with that memory: `Your branch is up to date with 'origin/main'`.

To work on `winter-menu`, you need a branch of your own. Switch to it by its plain name:

```
git switch winter-menu
```

You have no `winter-menu`, but `origin` has one, so Git makes yours at the same commit and says `branch 'winter-menu' set up to track 'origin/winter-menu'`. To track means to follow: from now on `git status` on it compares it with `origin/winter-menu`. Switching to `origin/winter-menu` itself instead gives a detached HEAD, as in the lesson on branches: you are on no branch. `git switch main` takes you back.

## Your commits stay with you

A commit in your copy changes your copy only. The server, and Git's memory of it, stay where they were. After one commit on `winter-menu`, `git status` says:

```
Your branch is ahead of 'origin/winter-menu' by 1 commit.
  (use "git push" to publish your local commits)
```

Ahead by one: your branch has a commit the server does not. Sending it is the last issue of this part. Here it stays on your laptop, as Wilma asked.

## Your work in this issue

Run `node setup.mjs` in the top folder. It builds `server/shop.git` and leaves `shop` empty. Clone the server's repository into `shop` from the top folder, then `cd shop` and run `git remote -v` and `git branch -a`. Then get `gift-vouchers`, fix the voucher line in `shop/visit.html` and commit it. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
