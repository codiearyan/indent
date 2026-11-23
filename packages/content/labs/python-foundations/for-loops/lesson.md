# Repeat with for

## What you will be able to do

The laptop now makes Rhona's decisions the same way every time. On Thursday, kit night, Dougie Nairn spreads the store across the floor of the base and does the same small job over and over: check a radio, then the next, then the next. A program can repeat a job for you, and that is what loops are for. By the end of this issue you will be able to:

- repeat lines a set number of times with `for` and `range`
- count from any number to any other, and know where `range` stops
- keep a running total as a loop goes round
- go through a text one letter at a time

## The request from Dougie

> **Dougie:** Thursday is the long night. I tick off every radio by its number, I add up the rope for a crag lower on the back of an envelope, and I cut a stencil for every letter of the new stretcher's name. It is all the same thing again and again, and I always lose my place.

All four tasks are in `kit_check.py`.

## for repeats a block

A `for` loop runs a block of lines once for each value it is given. Here it numbers the tables at the village hall:

```python
for table in range(3):
    print("Table", table, "laid")
print("All laid")
```

This prints `Table 0 laid`, `Table 1 laid`, `Table 2 laid`, then `All laid`. Read the first line as "for each value of `table` in `range(3)`". The line ends with a colon and the block under it is moved in, just like an `if`. Each time the block runs is one round, and before each round Python gives the name `table` the next value. You choose that name: pick one that says what it holds. `All laid` is not moved in, so it prints once, after the loop has finished.

A line moved in by mistake runs on every round. If `All laid` printed three times, look at how far it is moved in.

## range counts

`range(3)` gives the numbers 0, 1 and 2: it starts at 0, and it stops just before the number it is given. That is three numbers, so `range(n)` always gives n rounds, which is handy when you only need the count.

To start somewhere else, give `range` two numbers, the start and the stop. The stop is still left out:

```python
for table in range(1, 4):
    print("Table", table)
```

This prints tables 1, 2 and 3, not 4. To include a last number, stop one after it. When a loop seems to miss the last value, or starts at 0 where you wanted 1, this is nearly always why.

`for` needs something to go through. `for table in 3:` stops with `TypeError: 'int' object is not iterable`: a plain number is not a list of values. `range(3)` is.

## A running total

To add things up in a loop, keep a total in a variable. Start it before the loop and add to it on every round:

```python
raffle_total = 0
for book in range(4):
    raffle_total = raffle_total + 25
print("Raised:", raffle_total)
```

Four books of tickets at 25 each print `Raised: 100`. The order matters. Start the total inside the loop and it goes back to 0 at the start of every round, so it ends up holding only the last round's amount. Put the `print` inside the loop and you get a line on every round instead of one at the end.

A value can change on each round too. Keep it in its own variable and update it at the end of the block, ready for the next round:

```python
price = 5
for night in range(3):
    print("Ticket price:", price)
    price = price + 1
```

This prints the prices 5, 6 and 7.

## Letter by letter

A `for` loop can go through a text, one character on each round, spaces included:

```python
for letter in "Glebe":
    print(letter)
```

This prints `G`, `l`, `e`, `b` and `e`, each on its own line. Put an `if` inside the loop to deal with some letters and not others. This counts the letter e on a poster, with a count that starts before the loop:

```python
poster = "Cheese and wine at Glebe Hall"
e_count = 0
for letter in poster:
    if letter == "e":
        e_count = e_count + 1
print(e_count)
```

It prints `6`. The capital letters are other characters to Python, so an `E` would not count. `len(poster)` tells you how many characters the poster has in all, spaces included.

## Your work in this issue

Open `kit_check.py`. Near the top is Thursday's kit: how many radios are out, the pitches of tonight's crag lower, and the label for the new stretcher. Check runs your file with other values in their place, so build on those names. Do the four tasks in order under their `# Task` comments, and run `python3 kit_check.py` after each one. Work the first answer out by hand as well, and compare.
