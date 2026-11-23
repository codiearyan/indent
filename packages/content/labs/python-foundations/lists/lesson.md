# Lists

## What you will be able to do

Your functions so far take one value at a time: one call sign, one crew, one battery. Most of what the team keeps is many values in order: the names on the call-out list, the kit in a bag, the squares of a search. A list holds them under one name. By the end of this issue you will be able to:

- make a list and read any item by its position, from the start or from the end
- cut a new list out of another with a slice
- ask whether a value is on a list, and how many items it holds
- add, insert, remove and take items, and know that this changes the list itself

## The request from Rhona

> **Rhona:** When a page goes out, I phone down the call-out list on the whiteboard, top to bottom. The first three I reach go up the hill. New members get added at the bottom, whoever leads that night moves to the top, and I cross names off as I go. By the end of a night the board is a mess of arrows.

All five tasks are in `call_list.py`.

## A list keeps values in order

A list is written with square brackets, with commas between its items:

```python
cakes = ["sponge", "flapjack", "scones", "tiffin"]
print(cakes)
print(len(cakes))
```

This prints `['sponge', 'flapjack', 'scones', 'tiffin']` and then `4`. Python shows text inside a list with single quotes; it is the same text. `len` gives how many items a list holds, and `[]` is a list with nothing in it, whose length is 0.

Each item has a position, and positions start at 0. So `cakes[0]` is `"sponge"` and `cakes[2]` is `"scones"`. A position below 0 counts from the end: `cakes[-1]` is the last item, `"tiffin"`, and `cakes[-2]` the one before it. `-1` is always the last, however long the list is.

Ask for a position the list does not have, such as `cakes[4]`, and Python stops with `IndexError: list index out of range`. The last position is always one less than the length, so `cakes[len(cakes)]` is always one too far.

## Slices

A slice cuts a new list out of another. It has a start and a stop, with a colon between them, and it stops just before the stop:

```python
print(cakes[1:3])
print(cakes[:2])
print(cakes[2:])
```

These print `['flapjack', 'scones']`, then `['sponge', 'flapjack']`, then `['scones', 'tiffin']`. With nothing before the colon a slice starts at the beginning, and with nothing after it a slice runs to the end. So `cakes[:2]` is the first two items: the stop is also how many you get from the start.

A slice never stops with an error. A stop past the end gives everything up to the end. A slice also leaves the list it was cut from as it was.

## Asking and changing

`in` asks whether a value is on a list, and `not in` the opposite. Both give `True` or `False`, so they fit an `if`:

```python
if "scones" in cakes:
    print("Scones today")
```

A list can change after it is made. Its methods change the list itself:

- `cakes.append("shortbread")` adds an item at the end.
- `cakes.insert(1, "fruit loaf")` puts an item in at position 1, and every item from there moves along one place.
- `cakes.remove("flapjack")` takes out the first item equal to `"flapjack"`. If there is none, Python stops with `ValueError: list.remove(x): x not in list`.
- `cakes.pop()` takes the last item off and gives it back; `cakes.pop(0)` does the same with the first. Taking from an empty list stops with `IndexError: pop from empty list`.

`cakes[0] = "carrot cake"` puts a new value at a position, and replaces what was there.

These methods change the list and give back `None`, except `pop`, which gives back the item it took. So `cakes = cakes.append("tart")` loses the whole list: `cakes` now holds `None`. Call the method on its own line.

## A function gets the same list

When a list is handed to a function, the parameter is a second name for that same list, not a copy. A change made through the parameter is a change to the caller's list:

```python
def sold_out(stall):
    stall[0] = "sold"

sold_out(cakes)
print(cakes)
```

`sold_out` gives nothing back, and still `cakes` has changed outside the function: it prints `['sold', 'flapjack', 'scones', 'tiffin']`. So read every task carefully: some ask for a new list and leave the one they are given alone, like a slice; others ask to change the list they are given and give nothing back.

## Your work in this issue

Open `call_list.py`. The call-out list at the top is tonight's whiteboard, there to try your functions on; Check calls them with lists of its own. Tasks 1 and 2 read the list and leave it as it was. Tasks 3, 4 and 5 change the list they are given, so run `python3 call_list.py` after each one and watch `call_list` change from one print to the next.
