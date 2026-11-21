# Two changes to the same lines

## What you will be able to do

Merging is usually quiet. Git combines two branches on its own unless both changed the same lines. By the end of this issue you will be able to:

- explain when a merge stops with a conflict and what git wants from you
- read conflict markers and turn them into the file you actually want
- finish a merge without an editor, or abort it cleanly
- check that nothing from either side was lost

## The ticket

Gullwick Ferries is adding sailings for the summer, and two people worked at once.

> **Ines:** I put the new 08:00 Seal Bay run on main and the adult fare is 7.00 from Monday.
>
> **Pavel:** My weekend-sailings branch adds the 08:30 Puffin Rock run, and fares now show the age range. Can you merge it? Both runs go out, and the board should list sailings in time order.

Run `node setup.mjs`, then `cd repo`. You are on main, and the merge has not started.

## Why git stops

A merge compares three versions of each file: the common ancestor, your branch and the other branch. If only one side changed a region, git takes that side. If both sides changed the same lines, or inserted lines at the same spot, git cannot know which you mean. It writes both versions into the file, marks the file as conflicted and stops before the merge commit.

That is not an error. Git is handing you a decision that needs a person. Pavel's other change, a new `weekend.txt`, merges on its own without fuss.

## Reading a conflict

Start the merge with `git merge --no-edit weekend-sailings`. Then `git status` lists the files as "both modified". Inside one of them you find a block like this, here from a different file:

```
Departures leave from
<<<<<<< HEAD
the north pier.
=======
pier 2, beside the cafe.
>>>>>>> harbour-signs
```

Everything between `<<<<<<<` and `=======` is your side (HEAD, the branch you are on). Everything between `=======` and `>>>>>>>` is the branch you are merging in. If your git is set to show the original too, you will also see a `|||||||` section with the ancestor's lines.

Resolving means editing the file so it says what it should, then deleting all three marker lines. Sometimes one side wins. Often, as here, the right answer keeps both intents. For the pier sign above that might be "pier 2 on the north side". You decide based on what each person wanted, not on which lines arrived first.

You can edit the files in the editor beside the terminal, or with any tool you like.

## Finishing the merge

Once a file looks right, stage it with `git add <file>`. When `git status` shows no unmerged paths, create the merge commit:

```
git commit --no-edit
```

`--no-edit` keeps git's suggested message ("Merge branch ...") and skips the editor. If things get tangled, `git merge --abort` returns everything to how it was before the merge, and you can try again.

Before you commit, search the files for leftover `<<<<<<<` lines. Git will happily commit a file with markers still in it once you have staged it.

## How it is checked

The check reads the last commit on main. `timetable.txt` must list all six sailings in time order with no markers, `fares.txt` must keep both changes to the adult line, and nothing else may change. main's last commit must be a merge of both branches, `weekend.txt` must have come along, you must be on main, and the working tree must be clean.
