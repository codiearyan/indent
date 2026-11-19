# Notes: finding the commit that broke it

Run everything from inside `repo/` (`cd repo`). Run `node setup.mjs` from the workspace to start over.

## Bisect by hand

```
git bisect start
git bisect bad                 # the commit you are on is broken
git bisect good <hash>         # this older commit worked
# git checks out a commit in the middle; test it, then say:
git bisect good                # or: git bisect bad
git bisect skip                # this commit cannot be tested
```

Repeat until git prints `<hash> is the first bad commit`.

## Let a script decide

```
git bisect start <bad> <good>
git bisect run <command>       # exit 0 = good, 1 to 127 = bad, 125 = skip
```

## Look and finish

```
git bisect log                 # what you marked so far
git show <hash>                # what the guilty commit changed
git diff <hash>~1 <hash>       # the same, as a plain diff
git bisect reset               # end the bisect, back to where you started
```

## Fix on top

```
git status                     # make sure you are on main again
git commit -am "<message>"     # commit tracked changes without an editor
```
