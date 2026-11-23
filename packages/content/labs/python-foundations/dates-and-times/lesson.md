# Dates and times

## What you will be able to do

Dates look easy until you count with them: months have 28 to 31 days, a leap year has one more, and a date written as text is only letters to Python. The `datetime` module knows all of it. In this issue you read dates, count and add days, and write dates out for a report. By the end of it you will be able to:

- make a date or a date with a time, from its parts or from text
- find the days between two dates, and the date some days after another
- find the day of the week, and write a date the way a report wants it
- keep code that works with dates from depending on the day it runs

## The request from Dougie

> **Dougie:** The sign-out book says the stretcher went out at 22:40 on the 14th, and the kit sheet says it was last checked in January. Every piece of kit is checked every 90 days, and I count those days on my fingers. Then the council wants each one written out in full. Can the laptop do the counting?

All four tasks are in `kit_dates.py`.

## Three types in one module

The `datetime` module holds three types you will use. A `date` is a day, a `datetime` is a day and a time of day, and a `timedelta` is a gap between two of them. Each is made from its parts, biggest first:

```python
from datetime import date, datetime, timedelta

training = date(2026, 5, 6)
start = datetime(2026, 5, 6, 19, 30)
print(training)
print(start)
```

This prints `2026-05-06` and `2026-05-06 19:30:00`. A part that does not exist, such as the 30th of February, stops with a `ValueError` that says which part is out of range.

Mind the names. The module is called `datetime`, and so is one of the types inside it. After `from datetime import datetime`, the name `datetime` is the type, and `datetime.datetime(...)` stops with `AttributeError: type object 'datetime.datetime' has no attribute 'datetime'`. After `import datetime`, the name is the module, and `datetime(2026, 5, 6)` stops with `TypeError: 'module' object is not callable`; Python 3.14 adds a guess at what you meant. Pick one way per file. This issue uses `from`.

These dates know nothing of time zones: they are the time on the clock at the base. Python can handle time zones, but not here.

## From text to a date

Dates usually arrive as text. Text written year-month-day is the one form `date` reads by itself:

```python
print(date.fromisoformat("2026-11-28"))
```

Any other form needs a format, given to `datetime.strptime`. Each code after a `%` stands for one part, and every other character must be in the text exactly as in the format:

```python
print(datetime.strptime("06.05.2026 19:30", "%d.%m.%Y %H:%M"))
```

`%d` is the day, `%m` the month, `%Y` the four-digit year, `%H` the hour and `%M` the minute. This prints `2026-05-06 19:30:00`. When the text does not fit, Python says so with both in quotes: `ValueError: time data '2026-05-06' does not match format '%d/%m/%Y'`. `strptime` always gives back a `datetime`; `.date()` keeps only its day.

## Counting days

One date taken from another gives a `timedelta`. Its `.days` is the whole number of days between them, months and leap years counted for you:

```python
gap = date(2026, 11, 28) - date(2026, 5, 6)
print(gap.days)
print(training + timedelta(days=14))
```

This prints `206`, then `2026-05-20`: a date plus a gap of 14 days. Taking one day of the month from another, or counting every month as 30 days, goes wrong as soon as the two dates are in different months. A date and a text cannot be taken one from another either: `date(2026, 5, 6) - "2026-05-01"` stops with `TypeError: unsupported operand type(s) for -: 'datetime.date' and 'str'`. Turn the text into a date first.

## Today is a value

`date.today()` reads the computer's clock. A function that calls it gives a different answer every day, so nobody can check it, and the report for last month cannot be written again. Hand today in as a value instead, like any other date, and only the line that runs the program reads the clock, if it has to.

## Writing a date for a report

`training.weekday()` gives the day of the week as a number, Monday as 0 and Sunday as 6, so here it gives `2` for a Wednesday. A list of day names in that order turns it into a name, and the same works for months, which count from 1 while a list counts from 0. `.day`, `.month` and `.year` are plain numbers.

For the rest, a format writes a date as text, with the same codes as `strptime`. In an f-string it goes after a colon: `f"{start:%d/%m/%Y at %H:%M}"` gives `06/05/2026 at 19:30`, and `start.strftime("%H:%M")` gives `19:30`. `%d` always writes two digits, so the 6th comes out as `06`; for no 0 in front, use `.day`. `%-d` drops the 0 on some computers and stops with an error on others, so Check does not take it.

## Your work in this issue

Open `kit_dates.py` and run `python3 kit_dates.py`. Write the import under Task 1 for the whole file. Check calls your functions with dates far from today and hands today in as a value, and a function that reads the clock fails.
