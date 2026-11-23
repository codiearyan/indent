# Type hints

## What you will be able to do

Every function you have written takes values of some kind and gives back a value of some kind, and until now only its name and its comments said which. A type hint says it in the def line itself, in a form the editor can read too. This is the last issue of the repo. By the end you will be able to:

- write hints on parameters and on what a function gives back, and read them back from Python
- write the hint of a list, a dictionary, a value that may be `None`, and a function handed in
- say what a hint does while the program runs, and what it does not do
- read a file into objects of a class of your own and give back a sorted report, with hints on all of it

## The request from Rhona

> **Rhona:** Next winter somebody else will look after this code, and I want them to know what each function takes and gives back without reading every line. Dougie's hours_between says it takes text, and it does not. And to close the season I want the longest callouts from the season's file, as proper records, longest first.

All five tasks are in `season_report.py`, and the season's callouts are in `season.csv`.

## Hints on a function

```python
def pack_weight(items: list[float]) -> float:
    return sum(items)


print(pack_weight.__annotations__)
```

A parameter's hint comes after its name and a colon. The hint for what the function gives back comes after `->`, between the round brackets and the colon at the end. This prints `{'items': list[float], 'return': <class 'float'>}`: Python keeps the hints in `__annotations__`, and the editor reads them to say what a function takes when you call it, and to warn about a value of the wrong kind.

`int`, `float`, `str` and `bool` are the kinds you know. `list[float]` is a list of decimal numbers: the kind of the items in square brackets. A bare `list` says a list but not of what. `dict[str, str]` is a dictionary from text keys to text values. Code written for older Pythons writes `List[float]` and `Dict[str, str]`, with capitals, imported from the `typing` module, and Python reads them as the same kinds. From Python 3.9 on, both ways work.

## What a hint does when the program runs

Nothing. Python keeps the hints and does not check them:

```python
def double(n: int) -> int:
    return n * 2


print(double("ab"))
```

This prints `abab`, with no error, though the hint says a whole number. A hint is a note for the people and the editor that read the code. A wrong one never stops the program, and misleads every reader. Separate tools, called type checkers, read a whole program's hints and say where they disagree with the code; you do not need one for this repo. And a hint changes no value: text read from a file stays text, whatever a hint says, until `int()` turns it into a number.

Hints only count where Python keeps them. A comment such as `# takes a list of numbers` is not a hint, and `__annotations__` stays empty.

## A value that may be None

```python
from typing import Optional


def owner_of(item: str, owners: dict[str, str]) -> Optional[str]:
    return owners.get(item)
```

`Optional[str]` means text or `None`, and `get` gives back `None` for an item that is not there. A hint of plain `str` would leave the `None` out. `Optional` comes from the `typing` module, so the file needs the import line; without it, Python stops with `NameError: name 'Optional' is not defined`, at the def line or, on the newest Pythons, when the hints are first read. Newer Pythons, from 3.10, also read `str | None` for the same thing. On older ones that line stops with `TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'`, unless the file starts with `from __future__ import annotations`. `Optional[str]` works on every Python this repo uses.

## The hint of a function

A function handed in has a hint too:

```python
from typing import Callable


def count_if(weights: list[float], test: Callable[[float], bool]) -> int:
    return sum(1 for w in weights if test(w))
```

`Callable[[float], bool]` is a function that takes one decimal number and gives back `True` or `False`: what it takes in square brackets inside the square brackets, then what it gives back. A bare `Callable` says a function, but not what it takes or gives. A class of your own is a kind as well: after `@dataclass class Peak`, a hint can say `list[Peak]`.

## The whole repo in one task

The last task reads a file, makes a `Callout` for each line, sorts them by two things and gives back the first few, with hints on all of it. You have written every part of it before.

## Your work in this issue

Open `season_report.py`. `Callout` and the season's leaders are at the top, and `hours_between` waits under Task 2. Write each function under its task, and try it under `if __name__ == "__main__":` with `python3 season_report.py`; print a function's `__annotations__` to see what Python kept. Check calls your functions with values and files of its own, then reads the hints Python keeps, as kinds, so `list[int]` and `List[int]` are the same to it.

When this issue is green, you have finished the repo. You can read a traceback, write functions, classes and generators, keep data in files, sort and choose, and say in hints what your code expects. The other repos in the app are the next step: a project that builds one larger program, or a bug hunt where the code is someone else's and something in it is wrong.
