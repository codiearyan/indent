# A class and its objects

## What you will be able to do

You have used objects that Python and its modules hand you: a date knows its weekday, a Counter knows its most common, a Path knows its name. Each one keeps its own values and has methods of its own. In this issue you make a kind of object of your own, with a class. By the end of it you will be able to:

- write a class with `__init__` and `self`, and make objects from it
- give each object attributes of its own, and read them with a dot
- read the errors a class gives when `self` or `__init__` is wrong
- keep a list on each object, not one list on the class that every object shares

## The request from Ailsa

> **Ailsa:** Every team on the hill is a dictionary on the radio desk, and three of us type the keys three ways: call_sign, callsign, Leader. Last night Bravo showed up as None led by None. Dougie tried something he calls a class for the vehicles, and now the rope he put in the van is in the Land Rover too.

All three tasks are in `hill_teams.py`.

## A class makes objects

A class is the plan for a kind of object, and calling it makes a new object of that kind. Here is a class for the tents in a kit store:

```python
class Tent:
    def __init__(self, name, sleeps):
        self.name = name
        self.sleeps = sleeps


small = Tent("ridge tent", 2)
big = Tent("dome tent", 4)
print(small.name, small.sleeps)
print(big.name, big.sleeps)
```

This prints `ridge tent 2`, then `dome tent 4`. `class Tent:` starts the class, and by custom its name starts with a capital letter. `Tent("ridge tent", 2)` makes a new, empty `Tent` object, then Python runs the method called `__init__` on it, with two underscores on each side, to fill it in. A method is a function written inside a class, moved in under it.

`self` is the new object itself. Python hands it to `__init__` as its first value, before the values in the round brackets, so the def line has one more parameter than the call has values. `self.name = name` makes an attribute: a name that lives on that object and is read with a dot, `small.name`. `small` and `big` each have a `name` and a `sleeps` of their own.

With dictionaries, one mistyped key gives `None` and nobody notices. With a class, every tent is filled in by the same `__init__`, so every tent has the same attributes, spelt the same way.

## When the class is not right

Four mistakes give errors you should be able to read.

Leaving out `self`, as `def __init__(name, sleeps):`, stops with something like `TypeError: Tent.__init__() takes 2 positional arguments but 3 were given`. You gave two values, and Python gave one more first, the object.

Misspelling `__init__`, as `_init_` or `__int__`, means Python never runs it, so the class takes no values at all: `TypeError: Tent() takes no arguments`.

Writing `name = name` without `self.` makes a name that belongs to `__init__` alone, gone when it ends. The object never gets the attribute, and reading it stops with `AttributeError: 'Tent' object has no attribute 'name'`.

`__init__` only fills in the object: Python itself hands the new object back to whoever made it. A `return` with a value in `__init__` stops with `TypeError: __init__() should return None, not 'Tent'`.

## One list for every object

A value written inside the class but outside any method belongs to the class, and every object shares it:

```python
class Hut:
    beds = 6
    guests = []

    def __init__(self, name):
        self.name = name


north = Hut("north hut")
south = Hut("south hut")
north.guests.append("Morag")
print(south.guests)
```

This prints `['Morag']`. Both huts read the one `guests` list of the class, so a guest written into the north hut shows up in the south hut too. Sharing `beds = 6` does no harm, because nothing changes it in place. A list that each object fills with its own items belongs in `__init__`, made new for every object: `self.guests = []`.

A list written as a default in the def line, as in `def __init__(self, name, guests=[])`, has the same fault. Python makes that list once, when the def line runs, and every hut made without a list of its own gets that same one.

## Many objects from data

Each call of the class makes a new object, so a loop that calls it once for each row makes one object for each row:

```python
tents = []
for name, sleeps in [("ridge tent", 2), ("dome tent", 4)]:
    tents.append(Tent(name, sleeps))
print(tents[1].sleeps)
```

This prints `4`. Printed whole, an object shows only its class and a number, such as `<__main__.Tent object at 0x100cc0690>`, so read its attributes to see what it holds. Two issues from now, objects learn to print themselves.

## Your work in this issue

Open `hill_teams.py` and run `python3 hill_teams.py`. Make the `Team` class first, then mend Dougie's `Vehicle`, then turn the rota into teams. Check makes teams and vehicles of its own, reads their attributes, and puts kit into one vehicle to see whether it shows up in another.
