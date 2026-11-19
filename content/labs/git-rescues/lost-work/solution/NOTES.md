# Notes: getting lost work back

Run everything from inside `repo/` (`cd repo`). Run `node setup.mjs` from the workspace to start over.

## Find where things were

```
git reflog                    # every move of HEAD, newest first
git reflog show main          # every move of the main branch
git log -g --oneline          # the same list, as a log
git show <hash>               # check a commit before you trust it
```

Entries read like `HEAD@{3}: commit: <message>` or `reset: moving to HEAD~2`.
`main@{1}` means "where main was one move ago".

## Put a name on a commit

```
git branch <name> <hash>      # new branch pointing at that commit
git switch <name>             # or: git checkout <name>
```

## Move the current branch

```
git reset --hard <hash>       # move branch and files to that commit (drops uncommitted changes)
git reset --hard main@{1}     # undo the last move of main
```

## Good to know

- The reflog is local. It is not pushed or cloned.
- Lost commits stay for weeks, until garbage collection prunes old reflog entries.
- Run `git status` first. `reset --hard` throws away uncommitted edits for good.
