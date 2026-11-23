# Dictionaries

## What you will be able to do

A list finds things by position: the first name, the last reading. The store is not like that. Nobody asks for the third kind of kit; they ask how many ropes there are. A dictionary finds a value by a key you choose, such as the name of the kit. By the end of this issue you will be able to:

- make a dictionary and read a value by its key, safely when the key may be missing
- add, change and delete keys, and know that this changes the dictionary itself
- go through a dictionary with `.items()`, and count things with one
- work with a list of dictionaries, one record each

## The request from Dougie

> **Dougie:** The store sheet is a list of every kind of kit and how many we have. People sign kit out and forget to cross it off, nobody can tell what came back off the hill, and Rhona keeps asking what is running low. She also wants the hours we spent on each hill this year, from the callout records.

All five tasks are in `store_counts.py`.

## Keys and values

A dictionary is written with curly braces. Each item is a key, a colon and its value:

```python
furniture = {"chairs": 80, "tables": 12, "urns": 2}
print(furniture["tables"])
print(len(furniture))
```

This prints `12` and `3`. Square brackets after the dictionary take a key and give back its value. Each key is in a dictionary once, and `in` asks whether a key is there: `"urns" in furniture` is `True`.

Ask for a key that is not there and Python stops with a `KeyError` that names it: `furniture["benches"]` stops with `KeyError: 'benches'`. A misspelt key does the same, because `"chair"` is not `"chairs"`.

When a key may be missing, `.get` reads it without an error. `furniture.get("benches")` gives back `None`, and `furniture.get("benches", 0)` gives back `0`: the second value is what to give back when the key is missing.

## Changing a dictionary

Square brackets with `=` give a key a value. If the key is new, it is added; if it is there, its value is replaced:

```python
furniture["benches"] = 6
furniture["chairs"] = furniture["chairs"] - 10
del furniture["urns"]
print(furniture)
```

This prints `{'chairs': 70, 'tables': 12, 'benches': 6}`. `del` takes a key and its value out, and a key that is not there is a `KeyError` again. A dictionary keeps its keys in the order they were added.

Like a list, a dictionary handed to a function is the caller's own dictionary under a second name. A change made inside the function shows outside it.

## Going through a dictionary

A `for` loop over a dictionary itself gives only its keys:

```python
for thing in furniture:
    print(thing)
```

This prints `chairs`, `tables` and `benches`, no numbers. To have each key with its value, loop over `.items()`, which gives them as pairs that two names take apart:

```python
for thing, how_many in furniture.items():
    print(f"{how_many} {thing}")
```

Write `for thing, how_many in furniture:` without `.items()` and Python tries to take each key, a text, apart into two names, and stops with a `ValueError` about values to unpack. Adding or deleting keys while a loop goes through the same dictionary stops with `RuntimeError: dictionary changed size during iteration`.

## Counting with a dictionary

A dictionary is the natural place for a count of each thing. Here the hall counts the votes for its new name:

```python
votes = ["Glebe Hall", "Burnside", "Glebe Hall"]
tally = {}
for vote in votes:
    tally[vote] = tally.get(vote, 0) + 1
print(tally)
```

This prints `{'Glebe Hall': 2, 'Burnside': 1}`. The first time a name comes round it is not a key yet, so `.get` gives `0` and the line stores `1`. Write `tally[vote] = tally[vote] + 1` instead and the first vote stops with a `KeyError`.

## A list of dictionaries

When each record has several parts, a dictionary per record and a list of them is a common shape:

```python
bookings = [
    {"group": "choir", "night": "Monday", "people": 20},
    {"group": "yoga", "night": "Tuesday", "people": 12},
]
for booking in bookings:
    print(booking["group"], booking["people"])
```

Each round of the loop gives one booking, a dictionary, and its values are read by their keys.

## Your work in this issue

Open `store_counts.py`. The store, the kit that came back and the callouts at the top are tonight's; Check calls your functions with values of its own. Task 2 changes the store it is given, and the other tasks leave what they are given as it was. Run `python3 store_counts.py` after each task, and read any `KeyError` to the end: it names the key that was not there.
