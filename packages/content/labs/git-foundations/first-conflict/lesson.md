# When two changes meet

## What you will be able to do

Most merges finish on their own, as the last issue's did. Now and then Git stops halfway and asks you to decide. That is a conflict, and it is a normal part of working on branches, not a mistake. By the end of this issue you will be able to:

- say why a merge stops with a conflict
- read the conflict markers Git writes into a file
- settle a conflict in the editor and finish the merge
- call off a merge you do not want to finish

## The request from Femi

> **Femi:** On Saturday I tried to merge my window display into main, the terminal went all red, and I left it. Wilma says no to the window anyway. And my June find, A Lamp on Gull Island, is ready on its own branch, but Wilma added a book to the same list at the same time. Both books go on the site.

One merge to throw away, and one to finish where two people changed the same lines.

## Why a merge stops

To merge, Git looks at three versions of each file: the commit where the two branches parted, and the last commit of each. Where only one side changed something, Git takes that change. Where both sides changed the same lines, or added lines at the same spot, Git cannot know what you want. It writes both versions into the file, merges everything else, and stops before the merge commit:

```
Auto-merging menu.txt
CONFLICT (content): Merge conflict in menu.txt
Automatic merge failed; fix conflicts and then commit the result.
```

The merge is now open. `git status` says `You have unmerged paths` and lists the file as `both modified`.

## Reading the markers

In a bakery's `menu.txt`, after merging `spring-prices` into `main`, the conflict looks like this:

```
Sourdough, 4.20
<<<<<<< HEAD
Rye, 3.90
=======
Rye, 4.10
>>>>>>> spring-prices
Seeded, 4.00
```

The lines between `<<<<<<< HEAD` and `=======` are the version of the branch you are on, here `main`. The lines between `=======` and `>>>>>>> spring-prices` are the version of the branch you are merging in. Everything outside the markers merged without trouble. If your Git is set to show the starting version as well, a third part starts with `|||||||`.

## Settling it

Settling a conflict means editing the file until it says what it should. Sometimes one side is right and the other goes. Sometimes both sides belong: two new lines that happen to sit at the same spot, which is often how a list conflicts. Decide by what each person wanted, then delete all three marker lines and save. Here the baker settled on one price:

```
Sourdough, 4.20
Rye, 4.10
Seeded, 4.00
```

Git does not check your work. A file still full of markers is committed as it is once it is staged, so read the whole file before you go on.

## Finishing the merge

`git add menu.txt` marks the file as settled, and `git status` then says `All conflicts fixed but you are still merging`. The merge commit finishes it:

```
git commit --no-edit
```

`--no-edit` keeps the message Git wrote, `Merge branch 'spring-prices'`. Without it an editor opens; close it as the last issue said, and the commit is made. If a merge commit went in with markers, fix the file in the editor and commit it again.

## While a merge is open

Until the merge is finished or called off, Git refuses most other work, and says so: `Merging is not possible because you have unmerged files` for another merge, `Committing is not possible because you have unmerged files` for a commit, `cannot switch branch while merging` for a switch. It may suggest other commands then; you do not need them.

To call a merge off, run `git merge --abort`, as the last issue showed. The files and the branch go back to how they were before the merge began, conflict and all gone. When it says `There is no merge to abort`, no merge is open, and there is nothing to call off.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and start with `git status`: Femi's merge is still open. Call it off first, because Git starts no new merge while one is open. Then merge `june-finds` while on `main`, settle `shop/finds.html` in the editor, and finish the merge. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
