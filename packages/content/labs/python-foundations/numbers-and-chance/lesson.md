# Numbers and chance

## What you will be able to do

You have done sums with `+`, `/` and `//` since the first part. Three modules of the standard library go further: `math` rounds the way you ask and takes square roots, `statistics` sums a list up, and `random` draws by chance, in a way you can repeat. In this issue you use all three for the team's numbers. By the end of it you will be able to:

- round up and round down, below 0 too, and take a square root
- find the mean and the median of a list
- shuffle a list and draw from it by chance
- make a draw by chance come out the same every time, with a seed

## The request from Rhona

> **Rhona:** I need four answers before the training weekend. How many people it takes to pass a message by hand radio to a team out of range. Which search square a team is in. What a typical callout costs us in hours. And the duty rota: drawn fairly, by chance, but nobody can say I fixed it, so I want to draw it again in front of them and get the same.

All five tasks are in `callout_numbers.py`.

## Rounding up and down

`round()` goes to the nearest whole number, and a half goes to the even one: `round(2.5)` is `2` and `round(3.5)` is `4`. That is often not what a job needs. Seventeen people in minibuses of eight need three buses, not two:

```python
import math

print(math.ceil(17 / 8))
print(math.floor(17 / 8))
```

This prints `3`, then `2`. `math.ceil` rounds up to the next whole number, and `math.floor` rounds down. A whole number stays as it is with both.

Below 0, down means towards the smaller number. `math.floor(-2.5)` is `-3`. `int(-2.5)` is `-2`, because `int()` only cuts off what is after the point, which goes towards 0, so it rounds up below 0. `//` rounds down, like `math.floor`: `-5 // 2` is `-3`.

## Square roots

`math.sqrt` gives the square root, as a decimal number. The straight distance between two points, 30 apart one way and 40 the other, is the square root of 30 squared plus 40 squared:

```python
print(math.sqrt(30 ** 2 + 40 ** 2))
```

This prints `50.0`. A number below 0 has no square root here, and `math.sqrt(-1)` stops with a `ValueError`; the two Pythons word its message differently.

## The mean and the median

The `statistics` module sums up a list of numbers without changing it:

```python
import statistics

weights = [12, 9, 15, 9, 30]
print(statistics.mean(weights))
print(statistics.median(weights))
```

The mean, everything added and divided by how many there are, is `15`. The median, the one in the middle once the list is in order, is `12`. With an even number of values the median is halfway between the two middle ones: for `[12, 9, 15, 30]` it is `13.5`. One very heavy pack pulls the mean up and hardly moves the median, which is why both are worth having.

Two mistakes are easy by hand. `sum(weights) // len(weights)` throws away what is left after dividing; here it happens to give 15, but for most lists it is wrong. And the middle of the list as it was given is not the median unless the list was in order. An empty list has no mean, and `statistics.mean([])` stops with `StatisticsError: mean requires at least one data point`.

## Chance you can repeat

The `random` module draws by chance. `random.choice` draws one item from a list, and `random.shuffle` puts a list in a new order:

```python
import random

urns = ["big urn", "small urn", "kettle"]
random.shuffle(urns)
print(urns)
print(random.choice(urns))
```

Run it twice and you get two different answers. `shuffle` changes the list itself and gives back `None`, like `sort`, so shuffle a copy when the original must stay as it was. A list made by drawing `choice` again and again can draw the same item twice; a shuffled list holds each item once.

The chance a computer uses is a long run of numbers worked out from a starting point. `random.seed(42)` sets that starting point, so everything drawn after it comes out the same every time. After `random.seed(42)`, `random.choice(["tea", "coffee", "soup"])` gives `soup`, on both Pythons. Set the seed once, before the draws. Setting it again before each draw starts the run from the same place each time, so every draw gives the same answer.

## Your work in this issue

Open `callout_numbers.py` and run `python3 callout_numbers.py`. Each task says which module to import. Check calls your functions with values of its own, and calls the drawing functions with seeds of its own, twice each, so a draw must come from the seed it is given.
