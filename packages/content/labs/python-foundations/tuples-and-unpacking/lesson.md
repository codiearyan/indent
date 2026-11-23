# Tuples and unpacking

## What you will be able to do

A list is for things that come and go: names on a rota, squares on a board. Some values belong together and should never change one at a time, like the two numbers of a grid reference. Python keeps those in a tuple. By the end of this issue you will be able to:

- make a tuple, read it, and know why it cannot be changed
- give back two values from one function
- take a tuple apart into names, in one line or in a `for` loop
- go through two lists side by side with `zip`

## The request from Rhona

> **Rhona:** Every position we pass on the radio is a grid reference: how far east, then how far north. I need the high and low points of a route, a casualty's position moved when they drift down the hill, each team sent to its own square, and the last time we heard from a team. Last month someone read a northing as an easting and a team went the wrong way.

All four tasks are in `grid_refs.py`.

## A tuple is a fixed group

A tuple is written with round brackets and commas:

```python
main_hall = ("Main hall", 120)
print(main_hall)
print(main_hall[0])
```

This prints `('Main hall', 120)` and then `Main hall`. A tuple is read by position like a list, it has a length, and `in` works on it. What it cannot do is change. `main_hall[1] = 150` stops with `TypeError: 'tuple' object does not support item assignment`, and `main_hall.append("stage")` with `AttributeError: 'tuple' object has no attribute 'append'`.

That is the point of a tuple. A room and its seats, or an easting and a northing, are one value made of parts. To change one, you make a new tuple:

```python
main_hall = (main_hall[0], 150)
```

## Giving back two values

A function gives back one value, but that value can be a tuple. Two values after `return`, with a comma between them, make one:

```python
def opening_hours(times):
    return times[0], times[-1]

print(opening_hours([9, 12, 14, 17]))
```

This prints `(9, 17)`. The round brackets are optional after `return`; the comma is what makes the tuple. Be careful with the order: the code that calls the function relies on it.

## Unpacking

Several names on the left of `=` take a tuple apart, one value each, in order:

```python
room, seats = main_hall
print(seats)
```

This prints `150`. The number of names must match the number of values. With too few values Python stops with `ValueError: not enough values to unpack (expected 2, got 1)`, and with too many with `ValueError: too many values to unpack`.

Unpacking works in a `for` loop too. Here the hall's bookings are a list of tuples, each a day and a group:

```python
bookings = [("Monday", "choir"), ("Tuesday", "yoga"), ("Friday", "choir")]
for day, group in bookings:
    print(f"{group} on {day}")
```

Each round takes one tuple apart into `day` and `group`. Choose names for the loop that are not already in use. A loop name that is the same as a parameter of the function it is in replaces that parameter's value on the first round, and the value the function was given is lost.

## Two lists side by side

`zip` goes through two lists at once. On each round it gives a tuple of the items at the same position:

```python
rooms = ["Main hall", "Back room"]
groups = ["choir", "yoga"]
for room, group in zip(rooms, groups):
    print(f"{group} in the {room}")
```

This prints `choir in the Main hall` and `yoga in the Back room`. It pairs the first with the first and the second with the second, which is not what a loop inside a loop does: that would pair every room with every group. When one list is shorter, `zip` stops at its end.

## Your work in this issue

Open `grid_refs.py`. The route, the casualty's position, the teams and the radio log at the top are tonight's; Check calls your functions with values of its own and looks at what they give back, so a tuple must be a tuple and a list a list. Run `python3 grid_refs.py` after each task. If Python stops with a `TypeError` about a tuple, you tried to change one: make a new one instead.
