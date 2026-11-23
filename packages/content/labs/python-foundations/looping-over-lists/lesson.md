# Looping over a list

## What you will be able to do

The call-out list taught you to read and change one item at a time. Most questions about a list are about all of it: the lowest, the total, every item in turn. A `for` loop goes through a list the way it went through a text. By the end of this issue you will be able to:

- go through every item of a list with `for`, and number them with `enumerate`
- keep a total, or the largest so far, as the loop goes round
- use `len`, `sum`, `min`, `max` and `sorted`, and tell `sorted` from `.sort()`
- build a new list in a loop, and then in one line with a list comprehension

## The request from Dougie

> **Dougie:** Kit night again. The thermometer on the tops logs a reading every few hours and I want the coldest. I want one line for what the vehicle carries, the bags heaviest first so they go in at the back, a numbered list of the kit, and which ropes are long enough for the crag. I do it all with a pencil.

All five tasks are in `kit_night.py`.

## for goes through a list

A `for` loop over a list runs its block once for each item, in order, with the name after `for` holding that item:

```python
raffle = [12, 30, 8, 25]
total = 0
for sold in raffle:
    total = total + sold
print(total)
```

This prints `75`, the tickets sold over four nights. The total starts before the loop, as it did with `range`.

To keep the largest so far, start with an item of the list and change it only when a bigger one comes:

```python
best = raffle[0]
for sold in raffle:
    if sold > best:
        best = sold
print(best)
```

This prints `30`. Start `best` at a made-up number such as 0 and it goes wrong as soon as every item is below it: on a list of negative numbers, 0 would win.

When you need each item's number too, `enumerate` gives both, as two names after `for`. It counts from 0 unless you give it a start:

```python
for night, sold in enumerate(raffle, start=1):
    print(f"Night {night}: {sold}")
```

This prints `Night 1: 12` down to `Night 4: 25`.

## Functions for a whole list

Python has these loops built in. Each takes a list and gives back one value: `len(raffle)` is `4`, `sum(raffle)` is `75`, `min(raffle)` is `8` and `max(raffle)` is `30`. On an empty list `sum` gives `0`, but `min` and `max` stop with a `ValueError` that says the list is empty, because nothing is smallest in an empty list.

## Putting a list in order

There are two ways, and they are easy to mix up:

- `sorted(raffle)` gives back a new list in order, `[8, 12, 25, 30]`, and leaves `raffle` as it was.
- `raffle.sort()` puts `raffle` itself in order and gives back `None`.

Both go from the smallest up; `reverse=True` turns them round. The mistake to watch for is using `.sort()` for its result: `ordered = raffle.sort()` changes `raffle` and leaves `ordered` holding `None`. When you want a new list, use `sorted`.

## Building a new list

To make a new list from an old one, start an empty list before the loop, add to it on each round, and use it after:

```python
doubled = []
for sold in raffle:
    doubled.append(sold * 2)
print(doubled)
```

This prints `[24, 60, 16, 50]`. Make the empty list inside the loop instead and it starts again on every round, so it ends up with only the last item.

A list comprehension says the same in one line. It is the new list's square brackets with the loop inside them: first the value to keep, then the `for`:

```python
doubled = [sold * 2 for sold in raffle]
```

It can keep only some items, with an `if` at the end:

```python
good_nights = [sold for sold in raffle if sold >= 20]
```

This gives `[30, 25]`, in the order they came. Read it as "each `sold`, for each `sold` in `raffle`, if `sold` is at least 20". A comprehension always gives back a new list; the old one is left as it was.

## Your work in this issue

Open `kit_night.py`. The lists at the top are tonight's readings, bags, kit and ropes, there to try your functions on; Check calls them with lists of its own. Every function in this issue leaves the list it is given as it was and gives back something new. Task 1 asks for a loop by hand, and Task 5 for a list comprehension; Check looks at your code for both. Run `python3 kit_night.py` after each task.
