# Two names, one list

## What you will be able to do

Some of your list functions changed the list they were given, and some gave back a new one. Mix the two up and the program still runs, but a list changes somewhere you did not expect, or stays the same when it should have changed. This issue is about why. By the end of it you will be able to:

- tell a second name for a list from a copy of it
- write a function that changes the caller's list, and one that gives back a new list and leaves the caller's alone
- make a copy of a list when you need one
- take items out of a list without a loop skipping any

## The request from Ailsa

> **Ailsa:** On a search I keep the squares still to search on the board, and everyone works from it. Last week I tried a plan on the laptop and the real board changed with it. Then I crossed off two squares side by side and only one went. I need to know which code touches the board and which only looks.

All four tasks are in `search_board.py`.

## A second name is not a copy

`=` never copies a list. It gives the list another name:

```python
songs = ["Loch Lomond", "Caledonia"]
encore = songs
encore.append("Wild Mountain Thyme")
print(songs)
```

This prints all three songs. There is one list with two names, `songs` and `encore`, so a change made through either name shows through both. It is like two labels on one box.

Giving a name a new list is different: `encore = ["Auld Lang Syne"]` moves the label `encore` to a new box, and `songs` is not touched. So there are two kinds of line. A method call such as `encore.append(...)` changes the list the name is on. A line with `=` moves the name and changes no list.

## Two kinds of function

A parameter is a name too. When you call a function with a list, the parameter becomes a second name for the caller's list. That gives two honest kinds of function.

One kind changes the caller's list and gives nothing back:

```python
def add_encore(programme, song):
    programme.append(song)
```

After `add_encore(songs, "Mairi's Wedding")`, `songs` has a new last song. Write `programme = programme + [song]` inside it instead and nothing outside changes: that line makes a new list and moves the parameter onto it, and the new list is gone when the function ends.

The other kind leaves the caller's list alone and gives back a new list:

```python
def short_programme(programme, how_many):
    return programme[:how_many]
```

A slice, `+` between two lists, `sorted` and a list comprehension all make new lists. Methods such as `append`, `insert`, `remove`, `pop` and `sort` change the list they are called on. Read a task for which kind it wants, and pick your tools to match.

## Making a copy

When you need a list to change while the old one stays as it was, change a copy. Any of these makes one:

```python
plan = songs.copy()
plan = songs[:]
plan = list(songs)
```

Now `plan` is a new list with the same items, and `plan.remove("Caledonia")` leaves `songs` as it was.

## Changing a list while you loop over it

This one goes wrong without an error. Here the hall takes every raffle prize worth less than 4 pounds off its list:

```python
prizes = [3, 2, 5, 4]
for prize in prizes:
    if prize < 4:
        prizes.remove(prize)
print(prizes)
```

It prints `[2, 5, 4]`. A `for` loop keeps its place by position. On the first round it is at position 0 and takes out the 3, so every prize moves along one place and the 2 is now at position 0. The next round goes to position 1, the 5, and the 2 is never looked at. Every item right after one that was taken out gets skipped.

The way round it is to let the loop go through something that does not change. Loop over a copy and take the items out of the original:

```python
for prize in prizes.copy():
    if prize < 4:
        prizes.remove(prize)
```

Or, when a new list is fine, build one with a comprehension and leave the old list alone. Adding to a list while you loop over it is worse: the loop keeps finding new items and never ends, and you stop it with Ctrl+C.

## Your work in this issue

Open `search_board.py`. `board` at the top is tonight's search board; Check calls your functions with lists of its own and looks at them afterwards. Tasks 1 and 3 must leave the list they are given as it was, and Tasks 2 and 4 must change it. Each task's demo prints `board` after the call: run `python3 search_board.py` and check it changed only where it should.
