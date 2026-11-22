# Git notes

Run `node setup.mjs` here in the top folder. It builds `server/shop.git`, which stands in for the
shop's server, and leaves `shop` empty. Clone in this top folder, then `cd shop`: every other Git
command runs inside `shop`. Running the setup again empties `shop` and `server` and starts the
issue over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this
file and `setup.mjs`; it leaves `shop`, `server` and their history as they are.

## The server

```
server/shop.git                       stands in for the shop's server: a history, no files to edit
git clone server/shop.git shop        copy it into shop, run in the top folder; sets up origin
git remote -v                         the remotes of this repository and where they point
git branch -a                         your branches, and the server's as remotes/origin/<name>
git switch <name>                     make a branch of your own from origin/<name>, following it
```

`origin/main` is where your copy last heard the server's `main` was. A commit moves `main`, not
`origin/main`: `git status` then says `ahead of 'origin/main' by 1 commit`. A clone is a new
repository: set `user.name` and `user.email` in it again if Git asks who you are.

## Conflicts

```
<<<<<<< HEAD                          the branch you are on
=======
>>>>>>> <branch>                      the branch you are merging in
git add <file>                        mark a file as settled
git commit --no-edit                  finish the merge with Git's message
git merge --abort                     call the merge off, as if it never started
```

Settle a file in the editor: keep what should stay, delete all three marker lines, save.

## Merging

```
git merge <branch>                    bring a branch into the one you are on
git merge --no-edit <branch>          the same, keeping Git's message for a merge commit
git merge --abort                     call off a merge that is open
git branch -d <name>                  delete a branch that is merged
```

An editor opened for a merge message? Type `:q` and press Enter, or Ctrl+X if it shows `^X Exit`:
Git's message stays. `Not committing merge`? Run `git commit --no-edit`.

## Branches

```
git branch                            list the branches; * marks the one you are on
git switch -c <name>                  make a branch and switch to it
git switch <name>                     switch to a branch
git branch -m <old> <new>             rename a branch
git log --oneline --graph --all       every branch, drawn as a graph
```

Git older than 2.23 uses `git checkout -b <name>` and `git checkout <name>`. Switch when
`git status` says nothing to commit. `HEAD detached at ...`? Run `git switch main`.

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
