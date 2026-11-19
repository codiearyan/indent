# Notes: merge conflicts

Run everything from inside `repo/` (`cd repo`). Run `node setup.mjs` from the workspace to start over.

## Start the merge

```
git switch main                   # or: git checkout main
git merge --no-edit <branch>      # --no-edit: keep the default message, no editor
```

## When it stops on a conflict

```
git status                        # "both modified" lists the conflicted files
git diff                          # shows each conflict with both sides
git log --merge --oneline         # commits on either side that touched the conflicted files
```

A conflict in a file looks like this:

```
<<<<<<< HEAD
your side (the branch you are on)
=======
their side (the branch you are merging in)
>>>>>>> other-branch
```

Edit the file so it says what it should, and delete all three marker lines.

## Finish or give up

```
git add <file>                    # mark one file as resolved
git commit --no-edit              # create the merge commit with the default message
git merge --abort                 # back to how things were before the merge
```

## Check the result

```
git log --oneline --graph -n 8
git show --stat HEAD
```
