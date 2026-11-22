# Numbers

## What you will be able to do

The rope count works, and Dougie has stopped using the whiteboard. On Thursday evening, before the team's night exercise, Dougie is filling head torches at the kit store and doing sums on the back of an envelope. In this issue you make the laptop do them. By the end of it you will be able to:

- add, subtract, multiply and divide in Python
- tell whole numbers from decimal numbers
- divide into whole parts and find what is left over
- round a number to the places you need

## The request from Dougie

> **Dougie:** Every torch takes three batteries, the batteries come in packs of eight, and I always open one pack too many. Then Rhona asks how long the walk in will take and I guess. Can the laptop work it out the same way every time?

All four tasks are in `batteries.py`.

## Doing sums

Python does arithmetic with these operators:

| Operator | Means           | Example  | Result |
| -------- | --------------- | -------- | ------ |
| `+`      | plus            | `7 + 2`  | `9`    |
| `-`      | minus           | `7 - 2`  | `5`    |
| `*`      | times           | `7 * 2`  | `14`   |
| `/`      | divided by      | `7 / 2`  | `3.5`  |
| `//`     | whole times     | `7 // 2` | `3`    |
| `%`      | left over       | `7 % 2`  | `1`    |
| `**`     | to the power of | `2 ** 3` | `8`    |

A sum can use variables as well as numbers, and the result can go straight into a new variable:

```python
cups_per_urn = 40
urns = 3
cups = cups_per_urn * urns
print(cups)
```

This prints `120`. Writing names instead of numbers is what makes code useful: when tomorrow brings a different number of urns, the same line still gives the right answer.

When a sum mixes operators, `*`, `/`, `//` and `%` are worked out before `+` and `-`, as in school maths. So `2 + 3 * 4` is `14`, not `20`. Round brackets change the order: `(2 + 3) * 4` is `20`. When you are not sure, add brackets. They cost nothing and make the order plain to the next reader.

## Whole numbers and decimal numbers

Python has two kinds of number. A whole number, like `40` or `0`, is an `int`. A number with a decimal point, like `7.5` or `0.25`, is a `float`. You write a float with a point, never a comma: `7.5`, not `7,5`.

Plain division with `/` always gives a float, even when it comes out even. `6 / 3` is `2.0`, not `2`. The `.0` tells you it is a float. For distances and times that is what you want, because they often have a part after the point.

Floats are almost, but not quite, exact. Try `print(0.1 + 0.2)` and Python prints `0.30000000000000004`. The tiny error comes from the way computers store decimals. It is harmless for a walking time, which is one reason to round before you show a person a float.

## Dividing into whole parts

Some questions only make sense in whole things. Seventeen biscuits shared between five plates: how many does each plate get, and how many are left in the tin?

```python
biscuits = 17
plates = 5
each = biscuits // plates
left = biscuits % plates
```

`//` gives how many whole times one number fits into the other, and drops the rest: `17 // 5` is `3`. `%`, which programmers say as "modulo", gives what is left over: `17 % 5` is `2`. Together they split a number cleanly: 3 on each of 5 plates is 15, plus 2 in the tin makes 17. When both numbers are ints, both answers are ints.

## Rounding

`round` turns a number into a tidier one. Give it the number in round brackets, and after a comma, how many places to keep after the decimal point:

```python
print(round(2.567, 1))
print(round(3.14159, 2))
```

These print `2.6` and `3.14`. Leave out the places and `round` gives the nearest whole number as an int: `round(2.567)` is `3`.

The sum inside the brackets is worked out first, then rounded, so you can write the whole calculation inside them:

```python
hours = round(14 / 4, 1)
```

One thing surprises people: when a number is exactly half way, `round` goes to the even neighbour, so `round(2.5)` is `2` and `round(3.5)` is `4`. For the walking times in this issue that never matters.

## Your work in this issue

Open `batteries.py`. Near the top is tonight's kit and route: how many head torches, how many batteries each takes, how many come in a pack, how far the walk in is and how fast the team walks. Check runs your file with other numbers in their place, so build on those names. Do the four tasks in order under their `# Task` comments. Tasks 2 and 3 use the batteries from Task 1, and Check starts each of them from the right number of batteries, so a mistake in one task does not spoil the next. Run `python3 batteries.py` after every change and check one answer by hand.
