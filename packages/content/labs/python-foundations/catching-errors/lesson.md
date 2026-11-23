# Catch an error

## What you will be able to do

So far an error has always meant the end: Python stops, prints a traceback, and nothing after it runs. Often that is right. But some errors are expected, such as hours written as a word in a log typed by many hands, and one scrawled entry should not throw away the whole night's report. In this issue you catch the errors you expect and let the others through. By the end of it you will be able to:

- catch one named error with `try` and `except`, and carry on
- say why an `except` that names no error hides mistakes
- keep the `try` around only the line that can fail, and use `else`
- read what the caught error holds with `as`

## The request from Ailsa

> **Ailsa:** One entry says two instead of 2, and the whole total stops with a traceback. I want the hours that can be read added up, and a list of the ones that cannot, so I can go and ask who wrote them. But if the program itself is wrong, I want to know that too.

All four tasks are in `log_totals.py`, and `radio_log.txt` is tonight's radio log.

## Try and except

Code that may stop goes in a `try` block. Under it, an `except` block names the error it handles:

```python
def seats_from(text):
    try:
        return int(text)
    except ValueError:
        return 0


print(seats_from("40"))
print(seats_from("forty"))
```

This prints `40` and then `0`. When a line in the `try` stops with a `ValueError`, Python skips the rest of the `try` and runs the lines under `except ValueError:` instead, and the program carries on after them. When nothing goes wrong, the `except` block never runs. An error of any other kind is not handled: it travels up to the code that called the function, as if there were no `try` at all.

The name after `except` is the kind of error from the last line of a traceback. Find it by running the line that fails: `int("forty")` stops with `ValueError`, and `int(None)` stops with `TypeError: int() argument must be a string`, followed by more words that differ between versions of Python.

## Name the error

An `except` with no name, or `except Exception:`, catches every error. That sounds safe, and it is the opposite:

```python
def seats_from(text):
    try:
        return int(txet)
    except:
        return 0
```

`txet` is a typo, so this line stops with a `NameError` every time, and the bare `except` catches it. The function gives back `0` for every booking, quietly, and nobody finds out why. A mistake in your code should stop with a traceback that points at it. So name the one error you expect, the one the task is about, and let everything else through.

Errors come in families. `FileNotFoundError` and the error for opening a folder are both kinds of `OSError`, so `except OSError:` catches both. Name the narrowest one that fits.

## Only around the line that can fail

The same kind of error can come from more than one line:

```python
room, seats = line.split(":")
try:
    count = int(seats)
except ValueError:
    count = 0
```

A line without a colon stops on the first line with `ValueError: not enough values to unpack`. That is a different problem, a line that is not a booking at all, and it should not become `0`. Because the `try` holds only the `int()` line, it does not.

## Else, and what the error holds

A `try` can have an `else` block, which runs only when nothing in the `try` went wrong. And `as` gives the caught error a name, so you can use its message:

```python
for line in ["choir: 12", "yoga: lots"]:
    room, seats = line.split(":")
    try:
        count = int(seats)
    except ValueError as error:
        print("Skipped", room, "because", error)
    else:
        print(room, "books", count)
```

This prints `choir books 12`, then `Skipped yoga because invalid literal for int() with base 10: ' lots'`. Printed, or put in an f-string, the error shows its message: the words after `ValueError:` in a traceback. The space before `lots` is there because `int()` was given the text after the colon as it was.

## Your work in this issue

Open `log_totals.py`. Run `python3 log_totals.py` after each task. Check calls your functions with values and files of its own, some that work, some that fail in the way the task expects, and one each time that fails in another way, where the error must reach Check. Task 4 is the missing file from the files issue again: this time it is expected, so it is caught.
