# Dataclasses

## What you will be able to do

Many classes are mostly a record: a few named values, an `__init__` that keeps them, a `__repr__` that shows them and an `__eq__` that compares them. Writing those three by hand for every record is slow and easy to get wrong. A dataclass writes them for you from a list of fields. By the end of this issue you will be able to:

- make a record class with `@dataclass` and say what it writes for you
- give fields default values, and a new list to each object with `field(default_factory=list)`
- make a record that cannot change with `frozen=True`
- choose between a plain class, a dataclass, a dictionary and a tuple

## The request from Rhona

> **Rhona:** Every callout is a dictionary somebody typed, and the council's form changes every year. I want each callout as a proper record that prints itself and compares, a search that keeps its own list of teams, and the base's grid reference fixed, so nobody moves the base by accident and every team gets its bearing from the right place.

All three tasks are in `callout_records.py`.

## @dataclass

```python
from dataclasses import dataclass, field

@dataclass
class Peak:
    name: str
    height: int


ben = Peak("Ben Ledi", 879)
print(ben)
print(ben == Peak("Ben Ledi", 879))
```

This prints `Peak(name='Ben Ledi', height=879)`, then `True`. Each field is a name, a colon and a type: `str` for text, `int` for a whole number, `list` for a list. From the fields, in the order they are written, `@dataclass` writes an `__init__` that takes them and keeps them, a `__repr__` that shows them, and an `__eq__` that compares them all. `@dataclass` sits on the line above the class line, a decorator like `@property`, and it comes from the `dataclasses` module.

The types are notes for people and tools: Python does not check them, and part 8 tells you more about them. A name with no type is not a field. Written as `height = 0`, it stays a value of the class, `__init__` does not take it, and `Peak("Ben Ledi", 879)` stops with something like `TypeError: Peak.__init__() takes 2 positional arguments but 3 were given`.

## Defaults, and the list trap

A field can have a default, written after `=`, and an object made without that value gets it:

```python
@dataclass
class Booking:
    name: str
    nights: int = 1
    guests: list = field(default_factory=list)


first = Booking("Morag")
second = Booking("Ross", 2)
first.guests.append("Iain")
print(first, second)
```

This prints `Booking(name='Morag', nights=1, guests=['Iain']) Booking(name='Ross', nights=2, guests=[])`. Fields with a default come after the fields without one; the other way round stops with a `TypeError` that says a non-default argument follows a default argument.

A list cannot be a default as it is. You met the trap in this part's first issue: one list made once and shared by every object. A dataclass refuses it outright: `guests: list = []` stops with `ValueError: mutable default <class 'list'> for field guests is not allowed: use default_factory`. `field(default_factory=list)` gives the field a maker instead: `list`, without round brackets, which the dataclass calls for each new object, so each booking gets a new, empty list. A plain class with `def __init__(self, guests=[])` has the same trap, and there Python says nothing.

## A record that stays put

Some values must not change once they are made. `@dataclass(frozen=True)` makes every field read-only:

```python
@dataclass(frozen=True)
class Summit:
    name: str
    height: int
```

Writing `peak.height = 900` to a frozen `Summit` stops with `dataclasses.FrozenInstanceError: cannot assign to field 'height'`, and that holds inside the class's own methods too. To get a changed value, make a new object, as the methods that give back a new object did in the issue on methods.

## Which tool when

- A **dictionary** when the keys are only known as the data comes in: callouts per hill, a count per item.
- A **tuple** for two or three values that travel together for a moment and are taken apart at once, such as a `(date, hill)` pair from a log.
- A **dataclass** for a record whose fields are known in advance: it prints, compares, and misspells nothing, because a wrong field name stops at once.
- A **plain class** when the object has rules to keep and methods that change it, such as a pack that refuses to go over its limit.

## Your work in this issue

Open `callout_records.py`. The import line is there; write each dataclass under its task. Try them under `if __name__ == "__main__":`. Check makes records of its own, compares and prints them, adds a team to one search to see whether another gets it, and tries to change a grid reference.
