# Sets

## What you will be able to do

A list keeps everything you give it, in order, repeats included. Some questions do not care about order or repeats at all: which teams called in, have we heard this one before, who is on both rotas. Python has a set for those. By the end of this issue you will be able to:

- make a set, and know why it holds each value once and in no order
- use a set to remember what you have already seen
- find what two groups share, and what one has that the other does not
- turn a set back into a list in order when the order matters

## The request from Ailsa

> **Ailsa:** On a busy night the radio log is a long list of call signs, the same teams again and again. I want to know how many teams we actually heard, the first time one called twice, who is on both weekend rotas, and any call sign we do not know, in case someone is on the wrong channel.

All four tasks are in `call_signs.py`.

## A set holds each value once

A set is written with curly braces, like a dictionary but with values only:

```python
classes = {"yoga", "choir", "pilates"}
print(len(classes))
print("choir" in classes)
```

This prints `3` and `True`. Two things make a set different from a list. Each value is in it once: adding a value that is there already changes nothing. And it has no order: printing a set shows its items in an order Python chooses, which can be different the next time you run the file. So a set has no positions, and `classes[0]` stops with `TypeError: 'set' object is not subscriptable`.

`set()` makes a set from a list, which drops the repeats:

```python
signed_in = ["Shona", "Morag", "Shona", "Fergus", "Morag"]
people = set(signed_in)
print(len(people))
```

This prints `3`: five signatures, three people. An empty set is `set()`. Empty curly braces, `{}`, make an empty dictionary instead.

## A set for what you have seen

A set grows with `add`, not `append`: a set has no end to add at, and `classes.append("tai chi")` stops with `AttributeError: 'set' object has no attribute 'append'`. `in` asks whether a value is in a set, and it answers quickly however big the set is.

Together they make a memory. Here the hall checks raffle tickets as they come in and stops at the first number handed in twice:

```python
tickets = [17, 4, 22, 4, 17]
seen = set()
for ticket in tickets:
    if ticket in seen:
        print("Handed in twice:", ticket)
        break
    seen.add(ticket)
```

This prints `Handed in twice: 4`. The order of the two steps matters. Ask first, then add: add first and every ticket is in `seen` by the time you ask about it.

## What two sets share

Three operators compare two sets, and each gives back a new set:

```python
monday = {"Shona", "Morag", "Fergus"}
thursday = {"Morag", "Iain", "Shona"}
print(sorted(monday & thursday))
print(sorted(monday | thursday))
print(sorted(monday - thursday))
```

These print `['Morag', 'Shona']`, then `['Fergus', 'Iain', 'Morag', 'Shona']`, then `['Fergus']`. `&` gives what is in both, `|` what is in either, and `-` what is in the first and not in the second. They work on sets, not lists: `["a"] & ["b"]` stops with a `TypeError`, so make a set from each list first.

## Putting a set in order

The prints above use `sorted`, because a set has no order of its own. `sorted` takes a set and gives back a new list, from the smallest up, or in alphabetical order for text. So when a task wants each value once and in order, a set does the first half and `sorted` the second. A list made with `list(people)` has each value once too, but in the set's own order, which is not alphabetical and can change from one run to the next.

## Your work in this issue

Open `call_signs.py`. The call signs, the rotas and the known call signs at the top are tonight's; Check calls your functions with values of its own. Task 3 gives back a set, which Check compares whatever its order, and Task 4 gives back a list, which must be in alphabetical order. Run `python3 call_signs.py` after each task, and run it twice after Task 3: the names may print in another order, and that is fine.
