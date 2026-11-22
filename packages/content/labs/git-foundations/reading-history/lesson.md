# Reading the history

## What you will be able to do

The shop's history has grown to nine commits, by you, Wilma and Femi. A history is not only a safety net; it answers questions: what changed, when, who did it, and what a file looked like before. By the end of this issue you will be able to:

- list a history with `git log` and narrow it down to one file
- read one commit's changes with `git show`
- see what changed since the last commit with `git diff`, before you commit it
- point at a commit by its short hash

## The request from Wilma

> **Wilma:** A customer came by on Sunday and said our website does not mention Sundays at all. It used to! Somebody took it off, and I would like to know which change did it. And Femi says he left the April finds in the folder for you, but he was in a hurry, so look before you commit them.

Nobody remembers removing the Sunday hours, and nobody needs to. The history remembers.

## Reading the log

`git log` lists the commits, newest first, each with its full hash, author, date and message:

```
commit 5b1f0aa2c4e8d7f6a9b3e1c0d2f4a6b8c9e7d1f3
Author: Ottoline Brisk <ottoline@example.com>
Date:   Tue Mar 3 09:12:44 2026 +0000

    Add a rye loaf to the Saturday menu
```

For a quick overview, `git log --oneline` gives one line per commit. Two additions help in a longer history: `-n 5` shows only the last five commits, and a file name after `--` shows only the commits that changed that file:

```
git log --oneline -- menu.txt
```

When the list is longer than the terminal, Git shows it one screen at a time. Press Space for more and `q` to leave.

## Looking inside one commit

`git show` followed by a hash prints that commit's message and then its changes, in a form called a diff. The end of it looks like this:

```
diff --git a/menu.txt b/menu.txt
index 3e1c0d2..9a4b7f1 100644
--- a/menu.txt
+++ b/menu.txt
@@ -3,3 +3,3 @@
 Sourdough, 4.20
-Rye, 3.80
 Seeded, 4.00
+Seeded rolls, 2.50
```

The first lines name the file; `---` is it before and `+++` after. The `@@` line says where in the file the change sits. Then come the lines themselves: a line that starts with `-` was removed, one that starts with `+` was added, and lines that start with a space did not change; they are there so you can see where you are. Most terminals colour removed lines red and added lines green, but the sign at the start is what counts. Here a commit dropped the rye loaf and added seeded rolls. Its message might say something else entirely, which is why you read the change, not only the message.

## Hashes as names

Every commit has a hash of forty letters and digits. Git accepts the first few characters wherever a commit is meant, as long as no other commit starts the same way; seven is the usual length, and it is what `git log --oneline` prints. Copy it from there rather than typing it from memory.

Writing a hash into a commit message makes the history point at itself: "Put back the rye loaf dropped in 7d02b3f" tells the next reader exactly which commit to look at.

## Before you commit: git diff

`git diff` shows what changed in the working folder since the last commit, for the files Git tracks, in the same form as `git show`. `git diff --staged` shows what is in the staging area instead: exactly what the next commit will hold. When either prints nothing, there is nothing of that kind to show.

Reading the diff before every commit catches the change you did not mean to make: a line deleted by accident, a stray letter, a test you forgot to take out. If you find one, fix the file in the editor and run `git diff` again until only the change you meant is left.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`. Start with `git log --oneline` and read the history before you change anything. The first two tasks are one commit: the Sunday line goes back into `shop/visit.html`, and that commit's message names the commit that removed it. The third task is Femi's April finds in `shop/finds.html`: read `git diff` first. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
