# Count and group

## What you will be able to do

Counting things and putting them in groups are two of the jobs you have done most often by hand: a dictionary, a loop, and an `if` for the first time each key comes. The `collections` module has two dictionaries that do that part for you. In this issue you count and group the year's callouts with them. By the end of it you will be able to:

- count the items of a list with a `Counter`
- find the most common items, in a known order
- group items under a key with a `defaultdict`
- ask a `defaultdict` about a key without adding it by mistake

## The request from Ailsa

> **Ailsa:** At the end of the year the council asks the same three things: how many callouts on each hill, which hills were the busiest, and on which dates we were out on a given hill. I count them off the log with a pencil every January. Never again.

All four tasks are in `callout_counts.py`.

## Counting with Counter

Counting with a plain dictionary needs care: the first time an item comes, it has no key yet, and `plain[item] = plain[item] + 1` stops with `KeyError: 'rope'`. A `Counter` is a dictionary that starts every key at 0, and made from a list it counts the whole list at once:

```python
from collections import Counter

taken = ["rope", "flare", "rope", "helmet", "rope", "flare"]
counts = Counter(taken)
print(counts)
print(counts["rope"], counts["stretcher"])
```

This prints `Counter({'rope': 3, 'flare': 2, 'helmet': 1})`, then `3 0`. Asking a `Counter` about an item it never saw gives 0, and does not add it. Everything a dictionary does works on it too: `in`, `.items()`, a loop. `counts[item] += 1` adds one to a count, the first time too.

## The most common

`most_common(n)` gives back a list of the `n` items with the highest counts, each as a tuple of the item and its count, the highest first:

```python
print(counts.most_common(2))
```

This prints `[('rope', 3), ('flare', 2)]`. With no number it gives back every item. When two items have the same count, they come in the order they were first counted, not in the order of the alphabet: `Counter(["b", "a", "a", "b", "c"]).most_common()` gives `[('b', 2), ('a', 2), ('c', 1)]`, because `b` came first. That order is part of what `most_common` promises, so you can rely on it.

## Grouping with defaultdict

To group, each key needs a list before anything can be added to it. A `defaultdict` makes that list the first time a key is asked for. You give it the kind of value to start with, without round brackets, because it calls it itself for every new key:

```python
from collections import defaultdict

packed = [("red bag", "rope"), ("blue bag", "flare"), ("red bag", "helmet")]
bags = defaultdict(list)
for bag, item in packed:
    bags[bag].append(item)
print(bags["red bag"])
print(dict(bags))
```

This prints `['rope', 'helmet']`, then `{'red bag': ['rope', 'helmet'], 'blue bag': ['flare']}`. `dict(bags)` makes a plain dictionary of it, which prints more plainly; printed by itself, a `defaultdict` shows its starting kind first. Written as `defaultdict(list())`, with brackets, it stops with `TypeError: first argument must be callable or None`.

## A defaultdict grows when you ask

The same thing that makes grouping easy has a cost. Reading a missing key with square brackets adds it, even when you only wanted to look:

```python
print(len(bags["green bag"]))
print(dict(bags))
```

This prints `0`, which is right, and then `{'red bag': ['rope', 'helmet'], 'blue bag': ['flare'], 'green bag': []}`: there is now a green bag that nobody packed. A report that goes through the bags later would list it. To ask without adding, use `in`, which only looks, or `get` with a value for a missing key: `"yellow bag" in bags` is `False`, and `bags.get("yellow bag", [])` gives `[]`, and neither adds the yellow bag.

## Your work in this issue

Open `callout_counts.py` and run `python3 callout_counts.py`. The tasks go in order: count, find the busiest, group the dates, then count one hill without changing what you are given. Check calls your functions with logs of its own.
