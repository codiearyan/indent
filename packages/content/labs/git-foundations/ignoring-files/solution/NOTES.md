# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Ignoring files

```
.gitignore                            one pattern per line, edited in the editor
notes.txt                             a pattern for one file, in any folder
*.log                                 * stands for any characters
untested/                             a folder and everything in it
git check-ignore -v <file>            which line of .gitignore matches a file
git rm --cached <file>                stop tracking a file, keep it on disk
```

A pattern only keeps out files Git does not track yet. Commit `.gitignore` like any other file.

## Undoing before a commit

```
git restore <file>                    throw away the change in the working folder (cannot be undone)
git restore --staged <file>           take a file out of the staging area, keep the edit on disk
```

## Reading and saving

```
git status                            what is in each place: working folder, staging area, history
git add <file>                        copy a file into the staging area, as it is now
git commit -m "Message"               save everything staged as one commit
git log --oneline                     one line per commit, with the short hash
git show <hash>                       one commit: its message and its changes
git diff                              changes in the working folder, not staged yet
git diff --staged                     what is staged: what the next commit will hold
```

Press `q` to leave a long list.
