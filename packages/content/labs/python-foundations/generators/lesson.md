# Generators

## What you will be able to do

A list holds all its items at once, in memory. That is fine for ten callouts, and a problem for a log of a whole winter, or for a file bigger than the computer's memory. A generator is a way to go through items one at a time, making each only when it is asked for, and holding just the one. By the end of this issue you will be able to:

- tell a list comprehension from a generator expression, and say what each holds
- write a generator function with `yield`, and read a big file with one line in memory at a time
- ask a generator for its next item with `next`, and say what happens when it has none left
- join two generators, and know that a generator gives its items only once

## The request from Ailsa

> **Ailsa:** The laptop at the desk freezes every time someone opens the winter's radio log, because the program reads every line before it shows a single one. I want to read it one line at a time, pick out one team's calls, find the first time anybody said a word without reading to the end of the winter, and add up hours without the total coming out as 0.

All four tasks are in `log_reader.py`, and the log is in `winter_log.txt`.

## A list holds everything, a generator holds one

```python
squares = [n * n for n in range(5)]
lazy = (n * n for n in range(5))
print(squares)
print(lazy)
```

This prints `[0, 1, 4, 9, 16]`, then something like `<generator object <genexpr> at 0x105741cb0>`. The square brackets make a list comprehension, which works out every item at once. Round brackets make a generator expression, which works out nothing yet: it gives the next square each time it is asked. A `for` loop asks it for one item each round, and `sum`, `max`, `list` and `any` ask for them all. `sum(n * n for n in range(1000000))` adds up a million squares and never holds more than one.

A generator has no positions, because it does not keep its items. `lazy[0]` stops with `TypeError: 'generator' object is not subscriptable`, and `len(lazy)` with `TypeError: object of type 'generator' has no len()`.

## yield

A function with `yield` in it is a generator function:

```python
def countdown(n):
    while n > 0:
        yield n
        n = n - 1


ticks = countdown(3)
print(next(ticks), next(ticks), next(ticks))
```

This prints `3 2 1`. Calling `countdown(3)` runs none of its lines: it gives back a generator. Each `next(ticks)` runs the function until the next `yield`, hands over that value, and pauses there, with its names kept, until it is asked again. `return` would give back one value and end the function; `yield` can give many, one at a time.

When the function ends, there is nothing more. One more `next(ticks)` stops with `StopIteration`, which is how Python says a generator has nothing left. `next` takes a second value to give back instead: `next(ticks, "done")` gives `'done'`. A `for` loop stops by itself at the end.

## Reading a big file one line at a time

A file opened with `open` is read one line at a time by a `for` loop over it: Python reads the next line only when the loop asks. `read()` and `readlines()` read the whole file at once. A generator function can open the file and hand over its lines one by one:

```python
def readings(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            yield float(line)
```

Nothing is read until the first `next`. Each round reads one line, hands over its number and waits. The `with` line closes the file once the loop has gone through the last line.

## Joining generators

A generator can take another one as what it goes through:

```python
cold = (r for r in readings("temps.txt") if r < 0)
print(next(cold))
```

With `temps.txt` holding `4.5`, `-1.0`, `3.25` and `-2.5`, one per line, this prints `-1.0`, and the loop inside `readings` has taken only two lines of the file. Each step asks the one before it for one item, so nothing runs ahead. A chain like this can go through a file of any size.

## A generator is used up

A generator gives its items once. Gone through to the end, it is used up, and the next loop over it finds nothing:

```python
temps = readings("temps.txt")
print(max(temps), sum(temps))
```

This prints `4.5 0`. `max` went through every reading, so `sum` was handed a generator with nothing left, and the total of nothing is 0, with no error to warn you. `min` and `max` of a used-up generator stop with a `ValueError` that says they were given nothing. When you need the items more than once, keep them in a list first, `temps = list(readings("temps.txt"))`, or do everything in one loop.

## Your work in this issue

Open `log_reader.py`. The try-out lines count the lines of `winter_log.txt` with a loop over the file. Write each function under its task, and try it there with `python3 log_reader.py`. Check does not run those lines. It writes logs of its own and hands over lines one at a time, counting how many your code has read when the first answer comes out, so a function that reads everything first fails even when its answer is right.
