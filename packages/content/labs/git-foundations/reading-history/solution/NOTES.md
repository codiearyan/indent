# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Reading

```
git log                               every commit: hash, author, date, message
git log --oneline                     one line per commit, with the short hash
git log --oneline -n 5                only the last five
git log --oneline -- <file>           only the commits that changed that file
git show <hash>                       one commit: its message and its changes
git diff                              changes in the working folder, not staged yet
git diff --staged                     what is staged: what the next commit will hold
```

In a diff, `-` starts a removed line and `+` an added one. Press Space for more, `q` to leave.

## Messages

```
git commit -m "First line" -m "Body"  a commit with a first line and a body
git commit --amend -m "New message"   replace the last commit: new message, plus anything staged
```

## Saving

```
git status                            what is in each place: working folder, staging area, history
git add <file>                        copy a file into the staging area, as it is now
git commit -m "Message"               save everything staged as one commit
```
