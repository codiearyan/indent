# Get lost work back

## What you will be able to do

Commits feel fragile when a branch disappears, but git rarely throws anything away at once. By the end of this issue you will be able to:

- explain why a deleted branch or a hard reset does not delete commits
- read `git reflog` to find where a branch and HEAD used to point
- put a branch back on a commit you found
- undo a reset that went too far

## The ticket

You stayed late at Gullwick Ferries to clean up the repository. It did not go well.

> **Pavel:** Morning! Did you see my harbour-alerts branch? The storm and fog wording is in there and Ines wants it on the website today.
>
> **You:** About that. I deleted it, thinking it was merged. Then I reset main to drop one commit and typed HEAD~2.

Run `node setup.mjs`, `cd repo` and run `git log --oneline --all`. Two commits, no harbour-alerts. Your winter note, the bike notice and all three of Pavel's commits are missing from the log.

## Why the work is still there

A branch is only a name that points at a commit. Deleting the branch removes the name. `reset --hard HEAD~2` moves the name of the current branch back two commits. In both cases the commits themselves stay in the repository's object store. They are just unreachable: no branch leads to them, so `git log` does not show them.

Git also keeps a diary of every move. Each time HEAD or a branch points somewhere new, through a commit, a checkout, a reset or a merge, git writes a line to the reflog. That diary is how you find the commits again.

## Reading the reflog

```
git reflog
```

prints HEAD's moves, newest first:

```
a41c0d2 HEAD@{0}: checkout: moving from docs to main
7be93f1 HEAD@{1}: commit: Describe the night boat
```

Each line has the commit HEAD pointed at, a name you can use for that moment (`HEAD@{1}`) and what caused the move. Read from the top: the most recent entry is often the mistake itself, and the line just below it is where you were before.

`git reflog show main` shows only the moves of main, so `main@{1}` is wherever main pointed one move ago. Before trusting a hash, run `git show <hash>` or `git log --oneline <hash>` to look at it.

## Bringing commits back

Once you have the right hash, give it a name again:

```
git branch <name> <hash>
```

This creates a branch at that commit without touching your current branch or files. For the branch you are on, move it instead:

```
git reset --hard <hash>
```

Here `--hard` is the tool you want, because you are going back to a state you trust and the working tree should match it. Run `git status` first, because a hard reset discards uncommitted edits, and those are not in any reflog.

## Limits worth knowing

The reflog is local to your clone. It is not pushed, so it cannot rescue work that only existed on someone else's machine. Entries also expire: unreachable commits are usually pruned after a few weeks, when garbage collection runs. Recover soon, and when you are about to do something risky, create a backup branch first. It costs nothing.

## How it is checked

The check reads your repository. `harbour-alerts` must exist and point at exactly the last commit it had. `main` must point at the commit it had before the reset, with the matching files, and the working tree must be clean.
