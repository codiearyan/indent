# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Three places

- working folder: the files on disk, what the editor saves
- staging area: what goes into the next commit
- history: the commits

## Saving

```
git status                            what is in each place
git status --short                    the same in two columns: M_ staged, _M not staged, ?? untracked
git add <file>                        copy a file into the staging area, as it is now
git add .                             stage everything in this folder
git commit -m "Message"               save everything staged as one commit
git log --oneline                     the commits, newest first
```

Edited a file after staging it? Add it again, or the commit saves the older copy.

## Making a repository

```
git init                              make this folder a repository
git config user.name "Your Name"      who you are, in this repository only
git config user.email "you@example.com"
```

Press `q` to leave a long list. Stuck in an editor after `git commit`? Type `:q!` and press Enter.
