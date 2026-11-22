# Three places a change lives

## What you will be able to do

The shop's website has a history now: the site as Femi left it, then Wilma's Saturday hours. On Saturday Femi worked on the site again and left without committing anything. Before you save his work, you need a clear picture of where a change sits on its way into the history. By the end of this issue you will be able to:

- name the three places a change lives: the working folder, the staging area and the history
- read the three lists in `git status`
- stage some files and not others, so each commit holds one change
- explain why a file edited after `git add` has to be added again

## The request from Femi

> **Femi:** I did three things on Saturday and committed none of them: two new books on the finds page, the shop's phone number on the visit page, and a page for the reading group. Wilma wants each change as its own commit, and she wants to read the reading group page before it goes in. Oh, and I think I typed the phone number wrong.

One commit with everything in it would mix three changes, one of them unchecked and one with a mistake. Git lets you choose what goes into each commit.

## The working folder, the staging area and the history

A change passes through three places.

The working folder is the files as they are on disk, the ones you open and save in the editor. Saving a file changes only the working folder.

The staging area is the next commit being put together. `git add` copies a file from the working folder into it. Nothing in the history changes yet.

The history is the commits. `git commit` takes everything in the staging area and saves it as one new commit, then the staging area matches that commit again.

Think of packing a parcel at the shop's counter: the books on the shelves are the working folder, the open box on the counter is the staging area, and a sealed, labelled parcel is a commit. You choose which books go in the box before you seal it.

## Reading git status

`git status` tells you what sits in each place. In a folder of recipes it might say:

```
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   soups.txt

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   cakes.txt

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        breads.txt
```

"Changes to be committed" is the staging area: `soups.txt` goes into the next commit. "Changes not staged for commit" are files Git already tracks, changed in the working folder but not staged. "Untracked files" are files Git has never been asked to keep. The lines in brackets are Git's own tips; `git restore` comes in a later issue.

`git status --short` prints the same thing in two columns: `M ` is staged, ` M` is changed but not staged, `??` is untracked. Your branch may be called `main` or `master`; it makes no difference here.

## One change, one commit

`git add` with a file name stages just that file, so you choose what the next commit holds:

```
git add soups.txt
git commit -m "Add a leek soup"
```

`git commit` takes everything in the staging area, including anything you staged earlier and forgot about. Run `git status` before every commit and read the first list.

Two messages you may meet. Commit with nothing staged, and Git says `no changes added to commit` or `nothing added to commit but untracked files present`; nothing was saved. Give `git add` a name that is not there, and it says `pathspec 'soup.txt' did not match any files`; check the spelling and that the terminal is inside `shop`.

## Staged means a copy

`git add` copies the file as it is at that moment. Edit the file again afterwards, and `git status` lists it twice: once under changes to be committed, which is the old copy, and once under changes not staged, which is your newer edit. A commit now would save the old copy. Run `git add` again to stage the file as it is now.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop` and start with `git status`. The setup made the repository with its first two commits and set the name `You` in its settings, so you can commit straight away. Open `shop/visit.html` in the editor for the phone number, and save before you stage it. Do the tasks in order and press Check after each.

If a commit takes in more than you meant, this issue has no way to take it back yet: run `node setup.mjs` in the top folder to start over (`node ../setup.mjs` from inside `shop`).
