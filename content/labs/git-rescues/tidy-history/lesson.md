# Tidy history before sharing

## What you will be able to do

History is read far more often than it is written. Reviewers, bisect and future you all depend on commits that each say one clear thing. By the end of this issue you will be able to:

- decide when rewriting history is fine and when it is not
- keep a backup branch before any rewrite
- squash a run of scrappy commits into one, without an editor
- write a commit message a reviewer can use

## The ticket

You built a route planner for Gullwick Ferries: give it a harbour and a time, and it finds the next sailing. It works. The history does not read well.

> **Ines:** Happy to review the planner. Please don't send me five commits called wip and fix typo, though. One commit, a proper message, and leave main alone.

Run `node setup.mjs`, then `cd repo`. You are on `route-planner`. Compare it with main using `git log --oneline main..route-planner`, which lists the commits the branch has and main does not.

## When rewriting is fine

The first issue said not to rewrite shared history. This branch has never been pushed, and nobody else has its commits. Rewriting it hurts no one, and it is the polite thing to do before review. The rule is about who else has the commits, not about the commands themselves.

Before any rewrite, put a name on where you are:

```
git branch <branch>-backup
```

If the rewrite goes wrong, the backup still points at the old commits, and you can compare or start again. It is cheaper than digging through the reflog.

## Squashing with a soft reset

The most direct route has two steps. `git reset --soft <commit>` moves the current branch back to that commit, but leaves every change from the commits it skipped staged in the index. A single `git commit` then records all of them as one commit:

```
git switch docs-cleanup
git reset --soft main
git commit -m "Rewrite the harbour guide" -m "Merges the old pages and fixes broken links."
```

The content of your files does not change at any point. Only the commits that lead to it do. Afterwards, `git diff` between the backup and the branch printing nothing is your proof.

## Other routes

Interactive rebase can squash too, but it opens an editor with a list of commits. If you plan ahead, make small corrections with `git commit --fixup <hash>`, which names the commit the fix belongs to. Then:

```
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash main
```

folds every fixup into its target, and `GIT_SEQUENCE_EDITOR=true` accepts the plan without opening anything. A third route is `git merge --squash <branch>`, which stages a whole branch's change on top of another branch for one commit. Pick whichever you like. Every route that ends with the same files, one commit and an untouched main is correct.

## Writing the message

The first line is the subject. Keep it between 10 and 72 characters and make it say what the commit does, such as "Add bike tickets to the fare calculator". Leave out words that only meant something to you while working, like wip, typo or maybe. If there is more to say, add a body after a blank line: why the change exists and what a reviewer should try. Each `-m` you pass becomes its own paragraph. If you get the message wrong, `git commit --amend -m "<new subject>"` rewrites just the last commit.

## How it is checked

The check reads your repository. `route-planner-backup` must point at the original last commit. `route-planner` must be exactly one commit whose parent is main, with the same files as before, and main must not have moved. The message's subject must be 10 to 72 characters, new, and free of throwaway words.
