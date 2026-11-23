# Follow a traceback through calls

## What you will be able to do

In your first week you read a traceback with one `File` line: the line that stopped. Now the team's programs are made of functions that call other functions, and when one of them stops, the traceback lists every call on the way down. Rhona's hill report stops three times, and the mistake is never quite where Python stops. By the end of this issue you will be able to:

- read a traceback with several `File` lines from the bottom up
- tell where a program broke from where the mistake is
- skip the lines that are Python's own and find the last line that is yours
- mend the mistake where it is made, and leave the code that was right alone

## The request from Rhona

> **Rhona:** The hill report for the council stops with half a page of error, and it stopped differently each time Dougie had a go at it. He keeps changing the last function in the error. Find the real mistake in each part, and change nothing that was working.

All three tasks are in `hill_report.py`, and `positions.json` is the file Task 3 reads.

## A traceback with several calls

Here is a small program for the village hall. `hall_signs` pairs each room with its seats, `labels` goes through the pairs, and `label` makes one sign:

```python
def label(name, seats):
    return name.upper() + ": " + str(seats) + " seats"


def labels(rooms):
    signs = []
    for name, seats in rooms:
        signs.append(label(name, seats))
    return signs


def hall_signs(names, seats):
    return labels(zip(seats, names))


print(hall_signs(["main hall", "side room"], [120, 30]))
```

Running it prints this, with the start of each path cut short here:

```
Traceback (most recent call last):
  File ".../hall.py", line 16, in <module>
    print(hall_signs(["main hall", "side room"], [120, 30]))
  File ".../hall.py", line 13, in hall_signs
    return labels(zip(seats, names))
  File ".../hall.py", line 8, in labels
    signs.append(label(name, seats))
  File ".../hall.py", line 2, in label
    return name.upper() + ": " + str(seats) + " seats"
AttributeError: 'int' object has no attribute 'upper'
```

Each `File` line is a call that was still running when Python stopped, and the words after `in` name the function the line is in. `<module>` is the main part of the file. Read it as a story from the top: line 16 called `hall_signs`, which on line 13 called `labels`, which on line 8 called `label`, which stopped on line 2. Newer versions of Python also draw `^` and `~` marks under parts of some lines.

## Where it broke and where the mistake is

Read from the bottom up, as before. The last line says a whole number has no `upper`: `name` held `120`. The `File` line above it is where Python broke, in `label`. But `label` is right: given a room's name, it makes a good sign.

So go up and ask where the value came from. `labels` handed on what each pair held. The pairs were made on line 13, and there is the mistake: `zip(seats, names)` puts the seats first, so every pair is the wrong way round. Swap them there and the signs read `MAIN HALL: 120 seats`.

Changing `label` instead, say to `str(name).upper()`, would make the error go away and print `120: main hall seats`. The symptom is gone and the mistake is still there. Mend the function that made the wrong value, and leave the ones that only passed it on.

## The line that is yours

Sometimes the bottom `File` lines are not in your file at all:

```python
import json

with open("bookings.json", encoding="utf-8") as bookings:
    first = bookings.read()
    text = bookings.read()
print(json.loads(text))
```

The traceback ends with something like this:

```
  File ".../tea.py", line 6, in <module>
    print(json.loads(text))
  File ".../json/__init__.py", line 346, in loads
    return _default_decoder.decode(s)
  ...
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

The paths under `json` are Python's own code, and the line numbers in them differ from one version to the next. That code is fine: it stopped because of what it was given. Skip up to the last `File` line in your own file, here line 6, and look at what it hands over. `line 1 column 1` counts in the text `json.loads` was given, not in your file, and here that text is empty: the second `read()` starts where the first one stopped, at the end.

## Your work in this issue

Open `hill_report.py`. Each task is a few functions that call one another, with one mistake in one function. Run `python3 hill_report.py`, read the traceback from the bottom up, and follow the values up to where the wrong one is made. Mend only that function: Check looks at which functions you changed, and calls them with values of its own. When one task works, run the file again to see the next traceback.
