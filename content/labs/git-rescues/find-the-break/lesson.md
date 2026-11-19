# Find the commit that broke it

## What you will be able to do

Some bugs arrive quietly, inside a commit that looked harmless. Reading every diff by hand is slow. By the end of this issue you will be able to:

- use `git bisect` to find the first commit where a test fails
- let `git bisect run` drive the search with a script
- read the guilty commit to understand the bug
- fix it in a new commit and leave the repository as you found it

## The ticket

> **Ines:** The ticket desk charged a family of four the full price this morning. Groups of four have always had 10% off. Nobody remembers touching the discount.

Run `node setup.mjs`, then `cd repo` and `node check.mjs`. The check fails for a group of four on main. It passed when the fare calculator was first added, eight commits ago. Several of those commits touched `fares.mjs`, so the culprit is not obvious from the log.

## The idea: binary search over history

You know one good commit and one bad commit. Bisect checks out the commit halfway between them and asks you to test it. If it is good, the bug arrived later; if it is bad, earlier. Each answer halves the range. Eight commits take about three tests, and a thousand would take about ten.

Bisect assumes the history went from good to bad once. If a bug came and went, it still finds a commit where good turns into bad, just maybe not the one you expect.

## Bisect by hand

```
git bisect start
git bisect bad
git bisect good 4c1e9a0
```

The first `bad` marks the commit you are on. The `good` takes any commit you trust. Git then checks out a commit in the middle (HEAD is detached while you bisect, which is expected). Run your test there, answer `git bisect good` or `git bisect bad`, and repeat. When the range is down to one commit, git prints `<hash> is the first bad commit` with its details. If a commit cannot be tested at all, `git bisect skip` moves on.

Pick the good end carefully. A commit from before `check.mjs` existed fails because the file is missing, not because of the bug, and that would mislead the search.

## Let a script do the testing

When a command can tell good from bad by its exit code, bisect can run it for you:

```
git bisect start <bad> <good>
git bisect run node check.mjs
```

Exit code 0 means good, 1 to 127 (except 125) means bad, and 125 means skip. `check.mjs` already exits 1 when any case fails, so it fits. Bisect runs it at each step and prints the first bad commit at the end, without a single prompt.

## Finish and fix

Copy the full hash git printed into `repo/bisect-result.txt` (the repository already ignores that file). Then run `git show <hash>` to see what the commit changed. Small rewrites hide big changes: a comparison operator that changed in a "tidy up" commit is a classic.

End the search with `git bisect reset`. It returns HEAD to main, where you started. Do not fix the bug on the detached commit bisect left you on. Fix it on main, on top of everything else, so later work such as bike tickets stays in place. Commit with `git commit -am "<message>"`, which needs no editor.

## How it is checked

The check reads the hash in `bisect-result.txt` and compares it with the real first bad commit. It then runs the original fare check and a few hidden fare cases against `fares.mjs` in main's last commit, confirms the original history is still there underneath your fix, that bisect is over, that you are on main and that the working tree is clean.
