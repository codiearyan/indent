# A history for the shop

## What you will be able to do

Pennywhistle Books is a second-hand bookshop on Bramley Row in Orrinford. Wilma Quarrie runs it, and Femi Adeyemi, who helps on Saturdays, looks after its small website. The site is one folder, and every change starts with a copy of it: `site-final`, `site-final-2`, `site-wilma-edits`. Nobody can say which copy is the real one. You are going to give the folder a history with Git.

First, a word about two words. In this app a repo is a course, like the one you are in. In Git a repository is a folder whose history Git keeps. This repo teaches you to make and use repositories, so the lessons always say "repository" for Git's kind.

By the end of this issue you will be able to:

- turn a folder into a Git repository
- tell Git who you are, in one repository
- read what `git status` tells you
- save the state of the folder as a commit, and save a change as the next one

## The request from Wilma

> **Wilma:** I found four copies of the website on the shop computer this morning, and two of them say we open at different times. I want one folder, and a record of every change in it: what changed, when, and who did it. Start with the site as Femi has it now, then put in my new Saturday hours.

Copies drift apart and never say why. A history keeps one folder and remembers every version of it.

## A repository and a commit

Git is a program that keeps the history of a folder. You turn a folder into a repository with one command, run inside it:

```
git init
```

Git answers `Initialized empty Git repository in .../.git/`. It made a hidden folder called `.git`, where the whole history lives. The files panel does not show it, and you never edit it by hand. Delete it, and the history is gone while the files stay.

A commit is a snapshot of the folder at one moment: the files as they were, who saved them, when, and a short message about why. Commits in a row are the history. Each one has an id made of letters and digits, its hash, which Git usually shortens to seven characters, like `3dbd671`.

## Where you type

The terminal starts in the top folder of this issue, the one that holds `setup.mjs` and `NOTES.md`. Run `node setup.mjs` there once: it builds `shop`, the shop's folder. Then move into it with `cd shop`. Every Git command in this repo runs inside `shop`.

Run `git status` in a folder that is not a repository, and Git says so:

```
fatal: not a git repository (or any of the parent directories): .git
```

Inside `shop` before `git init`, that is expected. Later, it means the terminal is in the wrong folder. Never run `git init` in the top folder: it holds the app's own files. If it happens, running `node setup.mjs` again removes that repository.

What Git prints can differ a little between versions and computers. The meaning stays the same, so read for the meaning.

## Who you are

Every commit records a name and an email. Set them for one repository like this, inside it:

```
git config user.name "Kit Oduya"
git config user.email "kit@example.com"
```

The quotes keep a value with a space together. Both settings are stored in this repository only. With `--global` they would apply to every repository on the computer; this course never needs that. A made-up email is fine here.

If no name is set anywhere, `git commit` stops with `Author identity unknown` and `Please tell me who you are`. Set the two values and commit again.

## Two steps: stage, then commit

`git status` tells you where things stand. In a new repository it says `No commits yet` and lists the files as untracked: Git sees them but keeps no history of them yet.

Saving takes two steps. `git add` puts files in the staging area, the list of what goes into the next commit. `git commit` then saves everything on that list as one commit:

```
git add recipes.txt
git commit -m "Add the soup recipes"
```

`git add` takes file names, or `.` for everything in the folder you are in. `-m` gives the commit its message, in quotes. Forget `-m`, and Git opens a text editor for the message. If you are stuck in one, closing it with an empty message cancels the commit: in a screen full of `~` signs, type `:q!` and press Enter.

After the first commit the same two steps save each change: edit and save a file, and `git status` lists it as modified; add it and commit it. `git log --oneline` lists the commits, newest first. If a list fills the screen, press `q` to leave it.

On Windows Git may warn that LF will be replaced by CRLF. That is about how lines end in a file, and you can ignore it here.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and do the tasks in order, pressing Check after each. For the last task open `shop/visit.html` in the editor, change it, and save before you commit. `NOTES.md` keeps the commands of this repo in one place.

To start over, run `node setup.mjs` in the top folder again (from inside `shop`, run `node ../setup.mjs`). It empties `shop`, history and all, so you make the repository and set your name again. The app's Reset button does not do this: it puts back `setup.mjs` and `NOTES.md` and leaves `shop` as it is.
