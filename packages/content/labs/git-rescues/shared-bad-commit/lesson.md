# Undo a commit everyone already has

## What you will be able to do

Gullwick Ferries runs the Gull Island ferry, and every timetable and price lives in one small git repository. You look after it. By the end of this issue you will be able to:

- read a repository's history from the terminal
- undo one commit with `git revert`, without an editor popping up
- explain why `git reset` is the wrong tool once a commit is shared
- push a fix that every teammate can pull without trouble

## The ticket

Ines Calder, who runs operations, messages you before the first sailing.

> **Ines:** The ticket machines just tried to charge a family 65 pounds for one adult. Pavel's "Load spring fares" commit went out last night and everyone has pulled it. Can you undo it? Keep my Sunday sailings, they went in after.

Run `node setup.mjs` in the terminal. It builds the repository in `repo/` and a shared remote called `origin` that already has every commit. Then `cd repo` and look around.

## Reading history

Three commands answer most questions:

```
git log --oneline --graph --decorate --all
git show 5e1d2c0
git status
```

The first shows every commit, one per line, with branch names beside them. The second shows what one commit changed, as a diff. The third tells you whether the working tree has anything uncommitted. If output opens in a pager, press `q`, or run `git --no-pager log` instead.

## Two ways to undo

`git reset` moves a branch pointer backwards. The commits after that point drop out of the branch, as if they never happened. That is a rewrite of history.

`git revert <commit>` leaves history alone. It reads what the commit changed and makes a new commit with the opposite change. The bad commit is still there, followed by a commit that cancels it.

When a commit only exists on your machine, either works, and reset is often tidier. Once a commit is pushed, it is in other people's clones too. If you reset and force the remote to match, their next pull finds a history that no longer contains commits they built on. Work goes missing, or comes back in confusing merges. A revert is just one more commit, so everyone pulls it normally.

There is a second reason to revert here: Ines wants to keep a commit that came after the bad one. Resetting to before "Load spring fares" would also throw away the Sunday sailings, and you would have to redo them by hand.

## Revert without an editor

A revert opens your editor so you can change the message. Your editor setup is unknown, so skip it:

```
git revert --no-edit <commit>
```

You can also set `GIT_EDITOR=true` for one command, which accepts whatever message git suggests. If a revert ever stops on a conflict, fix the files, `git add` them and run `git revert --continue`, or back out with `git revert --abort`.

## Pushing the fix

Your main is now one commit ahead of `origin/main`, so a plain push is a fast-forward:

```
git push origin main
```

The remote in this issue refuses non-fast-forward pushes, like many team servers do. If you tried a reset, your push would be rejected, which is the remote protecting everyone else's history. Do not reach for `--force` on a shared branch. Run `node setup.mjs` again to start over instead.

## How it is checked

The check reads your repository. It looks at the fares and timetable on main, confirms that all four original commits are still in main's history, that nothing is half done, and that main on `origin` matches your main. Any route that reaches that state passes.
