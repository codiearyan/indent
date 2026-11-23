# Sorting and choosing

## What you will be able to do

You have sorted lists of numbers and of text with `sorted` and `sort`, and found the smallest and largest with `min` and `max`. Each compared the items themselves. Real records are not numbers: a callout is a dictionary, and Python cannot tell which of two dictionaries comes first. In the last issue you handed functions to other functions. Here you hand one to `sorted`, to say what to compare. By the end of this issue you will be able to:

- sort by any part of a record with `key=`, and the other way round with `reverse=`
- sort by two things at once, and say why equal items keep their order
- sort a list in place, and tell that from making a new one
- pick the smallest or largest record with `min` and `max`, and ask questions of a whole list with `any` and `all`

## The request from Rhona

> **Rhona:** The council wants this winter's callouts longest first, and the hill reports want them by hill and then by date. Dougie's rope shelf is in the order 101, 12, 3, which helps nobody. And before I close the year I need to know two things at a glance: the quickest and the longest callout, and whether every callout has its team written down and none ran over the limit.

All five tasks are in `callout_lists.py`.

## key= says what to compare

```python
kit = [
    {"name": "stove", "kg": 1.2, "shelf": "B"},
    {"name": "tent", "kg": 2.5, "shelf": "A"},
    {"name": "flask", "kg": 0.8, "shelf": "B"},
    {"name": "rope", "kg": 2.5, "shelf": "A"},
]


def weight(item):
    return item["kg"]


lightest_first = sorted(kit, key=weight)
```

`sorted(kit)` stops with `TypeError: '<' not supported between instances of 'dict' and 'dict'`. With `key=weight`, `sorted` calls `weight` once for each item and sorts by what it gives back: the names come out as flask, stove, tent, rope. `key=` takes the function itself, without round brackets, as `send` did in the last issue. `key=weight(kit[0])` calls it at once and hands over `2.5`, and `sorted` stops with `TypeError: 'float' object is not callable`.

A key is usually small, so it is often a `lambda`: `sorted(kit, key=lambda item: item["kg"])` sorts the same way. `reverse=True` gives the biggest first: `sorted(kit, key=lambda item: item["kg"], reverse=True)` gives tent, rope, stove, flask.

## Equal items keep their order

The tent and the rope weigh the same. In both orders above the tent stays before the rope, because it came first in `kit`. Python's sort promises that: items whose keys are equal keep the order they had, even with `reverse=True`. Sorting first and then turning the whole list round with `[::-1]` does not keep it: the tent and the rope come out swapped.

That promise also lets you sort by two things. A key can give back a tuple, and Python compares tuples item by item: the first items decide, and the second only between tuples whose first items are equal.

```python
by_shelf = sorted(kit, key=lambda item: (item["shelf"], item["name"]))
```

This gives rope and tent from shelf A, then flask and stove from shelf B. The order inside the tuple matters: the first thing in it is the one that decides first. The same order comes from two sorts, the second rule first and the first rule last, because the last sort keeps the order of equal items from the one before.

## In place, or a new list

`sorted` gives back a new list and leaves the old one as it was. A list's own `sort` method changes that list, and gives back `None`:

```python
words = ["stove", "map", "flask"]
answer = words.sort()
print(answer, words)
```

This prints `None ['flask', 'map', 'stove']`. Two mistakes come from mixing them up: `sorted(words)` on a line by itself makes a sorted list and throws it away, and `result = words.sort()` keeps `None`. `sort` takes `key=` and `reverse=` too.

Numbers kept as text sort as text, one character at a time: `sorted(["9", "10", "100"])` gives `['10', '100', '9']`, because "1" comes before "9". With `key=int`, each is compared as a number, and the order is 9, 10, 100.

## Choosing: min, max, any and all

`min` and `max` take `key=` as well, and give back the item itself, not its key: `max(kit, key=weight)` is the whole tent dictionary. Of several equal items, they give back the first.

`any` and `all` ask a question of every item. Each takes a comprehension written in round brackets instead of square ones, which hands over one answer at a time; the next issue tells you more about it.

```python
print(all(item["kg"] < 3 for item in kit))
print(any(item["shelf"] == "C" for item in kit))
```

This prints `True`, then `False`. `all` stops at the first item that fails, and `any` at the first that passes. Given nothing at all, `all([])` is `True`, because no item fails, and `any([])` is `False`.

## Your work in this issue

Open `callout_lists.py`. The winter's callouts and Dougie's ropes are at the top. Write each function under its task, and try it under `if __name__ == "__main__":` with `python3 callout_lists.py`. Check does not run those lines: it calls your functions with lists of its own, where equal hours, hours of one and two digits and callouts out of date order show every near miss, and it looks at whether the list it gave came back as it was.
