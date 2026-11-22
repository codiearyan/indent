# A commit that says why

## What you will be able to do

Femi's Saturday work is in the history now, along with Wilma's reading group page. Wilma has started reading the history in the evenings, and one message stopped her. Every commit carries a message, and the message is the part a person reads. By the end of this issue you will be able to:

- write a first line that says what a commit changed
- write a body that says why
- give a commit both parts from the terminal
- change the message of your last commit, and know when not to

## The request from Wilma

> **Wilma:** I read the history last night. Femi's last commit just says "changes". Changes to what? Also, the courier put its price up on the first of March, so postage goes from 2.50 to 3.20. Whoever reads that commit next year should know why we did it, not only that we did.

A history is only as useful as its messages. The changes themselves say how a file changed; only the message can say what that means and why it happened.

## What a message is for

`git log --oneline` shows one line per commit: the short hash and the first line of the message. That list is how people find their way through a history, so each first line should make sense on its own, months later, to someone who was not there.

Compare these from a bakery's history:

```
a41c9e2 changes
7d02b3f fix
c3e8811 update menu.txt
5b1f0aa Add a rye loaf to the Saturday menu
```

The first three say nothing a reader can use. The file name in the third is already part of the commit, so it adds nothing. The last one says what happened.

## The first line

The first line, often called the subject, says what changed. A few habits make it easy to read:

- Write it like an instruction: "Add", "Remove", "Raise", "Move". Read it as "this commit will add a rye loaf".
- Keep it short, about 50 characters and never more than 72, so it fits in every list.
- Name the thing that changed in the words the shop uses, not the file it is in.

## The body

After the first line comes an empty line, then the body: as many lines as it takes to say why. Why was the change needed? What was wrong before? The changes already show how; the body explains what they cannot. For the rye loaf: "Three customers asked for it last month, and the mill now sells rye flour in small bags."

The easiest way to give a commit both parts from the terminal is two `-m` options. Git makes each one a paragraph and puts the empty line between them:

```
git commit -m "Add a rye loaf to the Saturday menu" -m "Three customers asked for it last month."
```

Keep messages to plain letters, digits and simple punctuation; some shells treat signs such as `!` and `$` inside quotes in their own way. `git log` without `--oneline` prints each commit's whole message, and `git show` prints one commit, the last one if you name none, with its message and its changes.

## Changing the last message

A message with a typo or no meaning can be changed while the commit is still the last one:

```
git commit --amend -m "Add a rye loaf to the Saturday menu"
```

Amend does not edit the commit. It replaces it with a new commit that has the same parent, the new message, and the old commit's changes plus whatever is staged right now. So run `git status` first: anything staged gets swept in. The new commit has a new hash, and `git log` no longer shows the old one.

Two limits. Amend only works on the last commit; with a newer commit on top, it would change that one instead. And amend only what nobody else has. Once a commit is shared, other people have the old one, and replacing it causes trouble for them; sharing comes in a later part of this repo. Femi's commit has never left this computer, so it is fine to amend here.

## Your work in this issue

Run `node setup.mjs` in the top folder, then `cd shop`, and read `git log --oneline` first. Do the tasks in order: reword Femi's commit while it is still the last one and nothing is staged. Then change the postage in `shop/finds.html` in the editor, save, stage it, and commit it with its first line and its body together. If you forget the body, the postage commit is your last one, so amend it with both parts. Press Check after each task. To start over, run `node setup.mjs` in the top folder (`node ../setup.mjs` from inside `shop`).
