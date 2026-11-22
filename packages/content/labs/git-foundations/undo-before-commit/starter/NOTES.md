# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Undoing before a commit

```
git restore <file>                    throw away the change in the working folder (cannot be undone)
git restore --staged <file>           take a file out of the staging area, keep the edit on disk
```

`git status` prints these moves in brackets above its lists. Git older than 2.23 suggests
`git reset HEAD <file>` and `git checkout -- <file>`, which do the same.

## Reading

```
git log --oneline                     one line per commit, with the short hash
git show <hash>                       one commit: its message and its changes
git diff                              changes in the working folder, not staged yet
git diff --staged                     what is staged: what the next commit will hold
```

## Saving

```
git status                            what is in each place: working folder, staging area, history
git add <file>                        copy a file into the staging area, as it is now
git commit -m "First line" -m "Body"  save everything staged as one commit
git commit --amend -m "New message"   replace the last commit: new message, plus anything staged
```

Press `q` to leave a long list.
