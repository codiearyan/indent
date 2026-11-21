# Notes: undoing a shared commit

Run everything from inside `repo/` (`cd repo`). Run `node setup.mjs` from the workspace to start over.

## Look before you touch

```
git log --oneline --graph --decorate --all   # every branch, one line per commit
git show <commit>                            # what one commit changed
git status                                   # what is staged, changed or untracked
```

Add `--no-pager` after `git` (`git --no-pager log`) if output opens in a pager. Press `q` to leave a pager.

## Undo without rewriting: revert

```
git revert --no-edit <commit>     # new commit that applies the opposite change
git revert --abort                # give up on a revert that hit a conflict
```

`--no-edit` keeps the default message, so no editor opens.

## Rewrite: reset (only for commits nobody else has)

```
git reset --soft HEAD~1    # drop the last commit, keep its changes staged
git reset --hard HEAD~1    # drop the last commit and its changes
```

## Share

```
git push origin main                 # fast-forward only, safe
git push --force-with-lease ...      # rewrites the remote; avoid on shared branches
```
