# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Messages

```
git commit -m "First line" -m "Body"  a commit with a first line and a body
git commit --amend -m "New message"   replace the last commit: new message, plus anything staged
git log                               every commit with its whole message
git show                              the last commit: its message and what it changed
```

- First line: what changed, like an instruction, 72 characters at most.
- Body: why, after an empty line. Two `-m` options put the empty line in for you.
- Amend only the last commit, only when nothing else is staged, and only before anyone else has it.

## Three places

- working folder: the files on disk, what the editor saves
- staging area: what goes into the next commit
- history: the commits

## Saving

```
git status                            what is in each place
git add <file>                        copy a file into the staging area, as it is now
git commit -m "Message"               save everything staged as one commit
git log --oneline                     the commits, newest first
```

Press `q` to leave a long list. Stuck in an editor after `git commit`? Type `:q!` and press Enter, or Ctrl+X if it shows `^X Exit`.
