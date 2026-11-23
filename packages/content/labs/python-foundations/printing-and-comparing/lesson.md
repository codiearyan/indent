# Objects that print and compare

## What you will be able to do

A list prints itself, two dates compare with `<`, and `in` asks a dictionary about a key. Your objects can do all of that too: Python calls methods with special names, two underscores on each side, whenever it prints, compares or asks. By the end of this issue you will be able to:

- make an object print as a line for people with `__str__`, and as Python with `__repr__`
- say when two objects are equal with `__eq__`
- sort a list of your objects with `__lt__`
- answer `len()` and `in` for a class that holds things

## The request from Ailsa

> **Ailsa:** The radio log prints as a row of object at 0x and a number. When two of us type the same call, I cannot tell it is the same call. I want the night's calls in order of time for Rhona, however they were typed in, and I want to ask the log whether a team has called at all.

All four tasks are in `radio_log.py`.

## Printing: __str__ and __repr__

Here is a temperature reading from a weather station, with both methods:

```python
class Reading:
    def __init__(self, time, place, celsius):
        self.time = time
        self.place = place
        self.celsius = celsius

    def __str__(self):
        return f"{self.time} {self.place}: {self.celsius} C"

    def __repr__(self):
        return f"Reading({self.time!r}, {self.place!r}, {self.celsius!r})"


dawn = Reading("06:00", "summit", -3)
print(dawn)
print([dawn])
```

This prints `06:00 summit: -3 C`, then `[Reading('06:00', 'summit', -3)]`. `print`, `str()` and f-strings use `__str__`, the line for people. `repr()` and a list or a dictionary that prints what it holds use `__repr__`, which by custom looks like the Python that makes the object. `!r` in an f-string puts in the repr of a value, so a text gets its quotes. A class with no `__str__` uses `__repr__` for both; a class with neither prints as `<__main__.Reading object at 0x...>`.

Both must give back text. One that prints its line and gives back nothing stops with `TypeError: __str__ returned non-string (type NoneType)`.

## Equal: __eq__

Without `__eq__`, `==` between two of your objects asks whether they are one and the same object, so two readings made apart are never equal, whatever they hold. `__eq__` says what counts:

```python
    def __eq__(self, other):
        if not isinstance(other, Reading):
            return NotImplemented
        return self.time == other.time and self.place == other.place
```

`isinstance(other, Reading)` is `True` when `other` is a `Reading`; the next issue tells you more. Asking first matters: `dawn == "06:00"` would otherwise read `other.time` from a text and stop with `AttributeError: 'str' object has no attribute 'time'`. `NotImplemented` tells Python this class cannot compare with that value, and Python then gives `False`. `!=` follows `__eq__` by itself. A class with `__eq__` and no `__hash__` can no longer go into a set or be a dictionary key, which is fine for these tasks.

## In order: __lt__

`sorted()`, `min()` and `max()` compare the items of a list with `<`. Between two readings with no `__lt__`, that stops with `TypeError: '<' not supported between instances of 'Reading' and 'Reading'`. `__lt__` gives back whether this object comes before the other:

```python
    def __lt__(self, other):
        return self.celsius < other.celsius
```

Now `sorted(readings)` gives the coldest first, and `min(readings)` the coldest. Python works out `a > b` from `b < a` by itself; `<=` needs a method of its own, and sorting does not use it. Times written as two digits each side, such as `"06:00"` and `"18:30"`, compare as text in the order of the day.

## A class that holds things: __len__ and __contains__

```python
class Logbook:
    def __init__(self):
        self.readings = []

    def __len__(self):
        return len(self.readings)

    def __contains__(self, place):
        for reading in self.readings:
            if reading.place == place:
                return True
        return False
```

`len(book)` calls `__len__`, which gives back a whole number, and `"summit" in book` calls `__contains__` with the text on the left, and gives back `True` or `False`. Without them, `len(book)` stops with `TypeError: object of type 'Logbook' has no len()`, and `in` stops with a `TypeError` that says a `Logbook` is not iterable. Inside `__len__`, `len(self)` would call `__len__` again, without end: count what the object holds instead.

## Your work in this issue

Open `radio_log.py`. `Call` and `Log` are there with their `__init__`, and each task is a method you write inside one of them. Try your methods in the lines under `if __name__ == "__main__":`; Check does not run them. Check makes calls and logs of its own and prints, compares, sorts and asks them, one task at a time.
