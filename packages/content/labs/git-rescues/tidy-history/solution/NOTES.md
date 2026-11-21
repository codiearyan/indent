# Notes: tidying history before sharing

Run everything from inside `repo/` (`cd repo`). Run `node setup.mjs` from the workspace to start over.

## Look first, keep a backup

```
git log --oneline main..route-planner     # commits on the branch that main does not have
git diff main route-planner --stat        # what the branch changes overall
git branch <backup-name>                  # a safety net at the current commit
```

## Route 1: soft reset, one new commit

```
git reset --soft main                     # move the branch back, keep every change staged
git commit -m "<subject>" -m "<body>"     # each -m becomes a paragraph
```

## Route 2: fixup commits and autosquash (when you made them along the way)

```
git commit --fixup <hash>                 # "fixup! ..." commit aimed at an earlier one
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash main
```

`GIT_SEQUENCE_EDITOR=true` accepts the planned list without opening an editor.

## Route 3: squash merge onto a fresh branch

```
git switch -C <branch> main               # recreate the branch at main
git merge --squash <backup-name>          # stage the backup's whole change
git commit -m "<subject>"
```

## Check the result

```
git log --oneline --graph --all -n 10
git diff <backup-name> route-planner      # no output means the content is the same
git commit --amend -m "<better subject>"  # reword the last commit
```

## A good message

- First line: what the change does, 10 to 72 characters, no "wip".
- Blank line, then the why and anything a reviewer should know.
