# Git notes

Run `node setup.mjs` here in the top folder to build `shop`, then `cd shop`. Every Git command
runs inside `shop`. Running the setup again empties `shop`, history and all, and starts the issue
over. From inside `shop`, run it as `node ../setup.mjs`. The app's Reset only puts back this file
and `setup.mjs`; it leaves `shop` and its history as they are.

## Making a repository

```
git init                              make this folder a repository
git config user.name "Your Name"      who you are, in this repository only
git config user.email "you@example.com"
```

## Saving

```
git status                            where things stand
git add <file>                        put a file in the staging area
git add .                             put everything in this folder there
git commit -m "Message"               save what is staged as one commit
git log --oneline                     the commits, newest first
```

Press `q` to leave a long list. Stuck in an editor after `git commit`? Type `:q!` and press Enter.
