# Methods that keep the rules

## What you will be able to do

Last issue your objects only held values. Now they do things. A method reads what its object holds, changes it, and refuses a change that would break a rule. By the end of this issue you will be able to:

- write methods that read and change the object they are called on
- keep a rule of the story inside the class, and refuse a bad value with `raise`
- tell a method that changes this object from one that gives back a new one
- work out a value from the others with `@property`

## The request from Dougie

> **Dougie:** Everyone packs their own rucksack and nobody weighs anything. Last month Iain carried 19 kilos up Scarth Fell because three of us added just one thing each. I want a pack that knows what it weighs and refuses what takes it over its owner's limit. And when the second team packs the same as the first, minus the stove, I want a copy I can change without touching the first.

All four tasks are in `packs.py`, inside the class `Pack`.

## A method works on its object

Here is a water tank at a mountain hut, with two methods:

```python
class Tank:
    def __init__(self, capacity):
        self.capacity = capacity
        self.litres = 0

    def fill(self, litres):
        self.litres = self.litres + litres

    def is_full(self):
        return self.litres == self.capacity


hut = Tank(200)
hut.fill(150)
print(hut.litres, hut.is_full())
```

This prints `150 False`. `hut.fill(150)` runs `fill` with `self` standing for `hut` and `litres` for `150`. A method reaches its object's values only through `self`: inside `fill`, `litres` alone is the parameter, and `capacity` alone stops with `NameError: name 'capacity' is not defined`, to which newer versions of Python add a guess at what you meant. A method whose def line leaves out `self` stops as `__init__` did last issue, with something like `TypeError: Tank.fill() takes 1 positional argument but 2 were given`.

A method that changes its object usually gives back nothing, as a list's `append` does. A method that answers a question gives its answer back with `return`.

## Keep the rule inside

Today anyone can fill the tank past its brim with `hut.fill(500)`. Every fill goes through the class, so the class is the one place to keep the rule:

```python
    def fill(self, litres):
        if litres <= 0:
            raise ValueError(f"fill with more than 0 litres, not {litres}")
        if self.litres + litres > self.capacity:
            raise ValueError(f"{litres} litres would overflow a {self.capacity} litre tank")
        self.litres = self.litres + litres
```

The checks come first and the change last, as in part 5: a refused fill leaves the tank as it was, and the code that called `fill` can catch the `ValueError`. Python does not stop anyone writing `hut.litres = 999` by hand, but by custom, code outside a class changes an object through its methods, and the methods keep the rules.

## Change this one, or make a new one

Some methods change the object they are called on: `hut.fill(20)` changes `hut`. Others leave it alone and give back a new object:

```python
    def emptied(self):
        return Tank(self.capacity)
```

`spare = hut.emptied()` gives a new, empty tank of the same size, and `hut` keeps its water. Python's own types make the same split: `names.sort()` changes the list, and `sorted(names)` gives back a new one.

Take care with a list or a dictionary inside. A new object whose attribute is the old object's dictionary, as in `new.stock = self.stock`, shares it: two names for one dictionary, as in part 3, so a change through one shows through the other. Give the new object a copy, such as `dict(self.stock)`.

## A value worked out from others

How much room is left in the tank is worked out from `capacity` and `litres`. Kept as a third attribute, it would be wrong the moment one method forgot to change it. A method works it out every time, and `@property`, on the line above its def, lets it be read like an attribute, without round brackets:

```python
    @property
    def room(self):
        return self.capacity - self.litres
```

After the fill above, `hut.room` is `50`. A line that starts with `@` above a def is a decorator: it changes how the def works, and `@property` turns the method into a value read without brackets. Called with brackets, `hut.room()` stops with `TypeError: 'int' object is not callable`, because `hut.room` already is the number. Without `@property`, `hut.room` is the method itself, printed as `<bound method Tank.room of ...>`, and `hut.room + 10` stops with a `TypeError` that names a `'method'`. A class can also have methods marked `@staticmethod` or `@classmethod`, which take no `self`; you will not need them here.

## Your work in this issue

Open `packs.py`. The class `Pack` and its `__init__` are there, and each task is a method you write inside the class, moved in under it and lined up with `__init__`. Try your methods in the lines under `if __name__ == "__main__":` at the bottom, the guard you met in part 6: they run when you run `python3 packs.py`, and Check does not run them. Check makes packs of its own, puts items in them itself, calls one task's method at a time, and reads what it gives back, what it raises and what is left in the pack, so an unfinished method does not turn the other tasks red.
