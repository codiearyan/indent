# Formatting for people

## What you will be able to do

The callout book adds up now. The numbers still have to reach people: Rhona reads the year out at the team's meeting, from a printed sheet. Numbers that show nine decimals, and columns that wander, are hard to read out loud. In this issue you decide exactly how a value looks when it becomes text. By the end of it you will be able to:

- show a number with a set number of decimal places
- give a value a width, on the left or the right of it
- pad a number with zeros in front
- build a table whose columns line up

## The request from Rhona

> **Rhona:** The meeting is in March and I read the year out from a sheet. Last year the hours had nine decimals, the columns went all over the place, and the incident numbers were 2025-7 on one page and 2025-007 on the next. Make it look the same every time, so I can read it without squinting.

All four tasks are in `year_report.py`.

## Decimal places

In an f-string, a colon after the name inside the braces starts a format: a short code that says how the value should look. `.2f` means two decimal places:

```python
cost = 7.0
per_head = 47.5 / 6
print(f"{cost:.2f} and {per_head:.2f}")
print(f"{per_head}")
```

This prints `7.00 and 7.92`, then `7.916666666666667`. The format rounds to the nearest, and it always shows that many places, even for a number that has none. `round(per_head, 2)` rounds too, but it gives back a number, and a number prints as Python likes: `round(7.0, 2)` prints `7.0`, and `round(7, 2)` prints `7`. Python keeps most decimals only approximately, so a value that looks exactly halfway, such as `2.25`, may round either way.

## Widths and alignment

A number in the format is a width: the value takes at least that many characters, and spaces fill the rest. `<` puts the value on the left of its width, `>` on the right, and `^` in the middle:

```python
room = "Annexe"
seats = 40
print(f"[{room:<10}][{seats:>5}]")
print(f"[{room:>10}][{seats:<5}]")
```

This prints `[Annexe    ][   40]`, then `[    Annexe][40   ]`. The square brackets are only there to show where the spaces are. Without `<` or `>`, text goes on the left and numbers on the right. A value longer than its width is never cut: it pushes the rest of the line along.

A width and decimal places go together, the width first: `f"{per_head:>8.2f}"` gives `    7.92`, eight characters with two decimal places, on the right.

## Padding with zeros

Some numbers are read as codes and always have the same number of digits. `zfill` pads a text with zeros on the left up to a width:

```python
booking = 9
print(str(booking).zfill(4))
print("1234567".zfill(4))
```

This prints `0009`, then `1234567` untouched, because it is longer than the width already. `zfill` is a method of text, so a number has to become text first: `booking.zfill(4)` stops with `AttributeError: 'int' object has no attribute 'zfill'`.

## A table that lines up

Spaces typed between values only line up when every value has the same length. Widths make every row the same length, so the columns sit under each other:

```python
rooms = [("Main hall", 120, 35.0), ("Annexe", 40, 12.5)]
print(f"{'Room':<12}{'Seats':>6}{'Price':>8}")
for room, seats, price in rooms:
    print(f"{room:<12}{seats:>6}{price:>8.2f}")
```

```
Room         Seats   Price
Main hall      120   35.00
Annexe          40   12.50
```

The heading uses the same widths and sides as the rows, without decimal places, because its values are text. Look at the quotes: the f-string is in double quotes, so the texts inside its braces are in single quotes. Python 3.12 and later allow the same quotes inside, but older versions stop with a `SyntaxError`, and the computer at the base may have one of those.

## Your work in this issue

Open `year_report.py`. At the top are this year's hills with their callouts and hours; Check calls your functions with values of its own and compares the text they give back space by space. Task 4 uses your `report_row` from Task 3, and Check gives your file its own version for that task. Run `python3 year_report.py` after each task and look at whether the columns line up.
