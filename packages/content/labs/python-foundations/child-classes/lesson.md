# A class built on another

## What you will be able to do

Dougie's kit comes in kinds: ropes, batteries, maps, first aid kits. Every kind is kit, with a name and a weight, and each has something of its own. A class can be built on another, take everything it has, and add or change only what is different. By the end of this issue you will be able to:

- write a class built on another, and hand values to its `__init__` with `super()`
- give a child class its own version of a method that builds on the parent's
- ask with `isinstance` whether an object is of a kind, the kinds built on it included
- go through a list of mixed kinds and let each one answer in its own way
- write an error class of your own

## The request from Dougie

> **Dougie:** The kit sheet has ropes, batteries, maps and first aid kits on it, and they are not all checked the same way. A battery is ready when it is charged; most kit is ready when it is on the shelf. I want each rope's label to show its length, the ropes picked out for the crag, and the lot checked before a callout, with a proper error that says what is not ready.

All four tasks are in `kit.py`.

## A child class

```python
class Shelter:
    def __init__(self, name, sleeps):
        self.name = name
        self.sleeps = sleeps

    def label(self):
        return f"{self.name}, sleeps {self.sleeps}"

    def usable(self):
        return True


class Tent(Shelter):
    def __init__(self, name, sleeps, poles):
        super().__init__(name, sleeps)
        self.poles = poles


ridge = Tent("ridge tent", 2, 3)
print(ridge.label(), ridge.poles)
```

This prints `ridge tent, sleeps 2 3`. `class Tent(Shelter):` builds `Tent` on `Shelter`: `Shelter` is the parent, `Tent` the child, and a tent has every method of a shelter. Tent's own `__init__` takes the place of Shelter's, so Shelter's would never run for a tent. `super()` stands for the parent, and `super().__init__(name, sleeps)` runs Shelter's `__init__` on this tent, before Tent's adds what is its own. Leave that line out and reading `ridge.name` stops with `AttributeError: 'Tent' object has no attribute 'name'`. Writing `self.name = name` in Tent as well works today, and falls behind the next time Shelter's `__init__` changes.

## Your own version of a method

Written inside `Tent`, a method called `label` takes the place of Shelter's, for tents only:

```python
    def label(self):
        return f"{super().label()}, {self.poles} poles"
```

Now `ridge.label()` gives `ridge tent, sleeps 2, 3 poles`, and every other shelter keeps Shelter's label. `super().label()` is the parent's label for this same tent. Inside Tent's `label`, `self.label()` would be Tent's own label again, which calls itself without end and stops with a `RecursionError`. Copying the parent's line into the child works until someone changes the parent.

## Is it a kind of...?

`isinstance(ridge, Tent)` and `isinstance(ridge, Shelter)` are both `True`: a tent is a shelter. `type(ridge) == Shelter` is `False`, because `type` gives the one class an object was made from. For a class built on Tent, such as `class Dome(Tent):`, `isinstance(dome, Tent)` is `True` and `type(dome) == Tent` is `False`. To ask about a kind, ask `isinstance`.

## Each answers for itself

```python
class Bothy(Shelter):
    def __init__(self, name, sleeps, roof_ok):
        super().__init__(name, sleeps)
        self.roof_ok = roof_ok

    def usable(self):
        return self.roof_ok


for shelter in [ridge, Bothy("Corrie bothy", 6, False)]:
    print(shelter.name, shelter.usable())
```

This prints `ridge tent True`, then `Corrie bothy False`. The loop never asks what kind each shelter is: it calls `usable()`, and each kind answers in its own way. A chain of `if isinstance(shelter, Bothy):` and `elif` has to change for every kind someone adds, and gets wrong the kinds it has never heard of.

## An error of your own

```python
class ShelterFull(Exception):
    pass


raise ShelterFull("Corrie bothy sleeps 6")
```

An error class is a class built on `Exception`, and `pass` says it adds nothing. It takes a message as `ValueError` does, `except ShelterFull:` catches it and nothing else, and the traceback ends with `ShelterFull: Corrie bothy sleeps 6`, with `__main__.` in front on older versions of Python. A class not built on `Exception` cannot be raised: `raise ShelterFull("...")` then stops with `TypeError: ShelterFull() takes no arguments`.

## Your work in this issue

Open `kit.py`. `Kit` and `Battery` are there: `Battery` is built on `Kit` and has a `ready` of its own. `Rope` is opened for you. Build it on `Kit` and give it an `__init__` (Task 1), then a `label` of its own inside it (Task 2), then write `ropes_in` and the check. Try your code under `if __name__ == "__main__":`. Check makes kit of its own, kinds your file has never heard of among them, and uses its own `Rope` in Tasks 3 and 4, so those tasks do not wait on the first two.
