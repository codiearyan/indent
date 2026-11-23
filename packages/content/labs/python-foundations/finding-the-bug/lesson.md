# Find the bug

## What you will be able to do

The hardest mistakes stop nothing. The program runs, prints an answer, and the answer is wrong. There is no traceback to read, so you have to make the program show you what it is doing. In this issue you hunt a wrong answer down. By the end of it you will be able to:

- print names and values to see where a program stops being right
- cut a failing input down to the smallest one that still fails
- mend the mistake where it is, once you have seen it
- state with `assert` what must be true, so the next mistake stops loudly

## The request from Rhona

> **Rhona:** The report says Cairn Dubh was our busiest hill last month. We were on Scarth Fell four times and on Cairn Dubh twice. Nothing crashed, which is worse: I nearly sent it. Find out why, and make sure it cannot quietly go wrong like that again.

All three tasks are in `busiest_hill.py`.

## Print names and values

Python runs what you wrote, not what you meant. To find where those part, print the values the code works with, each with its name, at the place you suspect:

```python
def average_attendance(counts):
    total = 0
    for count in counts:
        total = count
        print(f"{count=} {total=}")
    return total / len(counts)


print(average_attendance([12, 30, 9]))
```

An `=` after a name inside the braces of an f-string prints the name and its value. This prints `count=12 total=12`, `count=30 total=30`, `count=9 total=9`, and then `3.0`, where the average is 17.0. Three lines show it at once: `total` never grows, because `total = count` replaces it on every round instead of adding to it. A print with no name, just numbers, would have been much harder to read.

Print inside the loop, where the values change, and compare each line with what it should be. The first line that is wrong points at the mistake. Take the prints out once you have found it.

## Cut the input down

A long input makes a long trail of prints. Before you print, make the input as small as it can be while the answer is still wrong.

Take out one value and run it again. If the answer is still wrong, keep the cut; if it is right now, put the value back and try another. `[12, 30, 9]` goes wrong; so does `[12, 30]`, which gives 15.0 for an average of 21.0; `[30]` gives the right answer, and so does `[12]`. So two values are enough, and two values make two lines of prints.

Be careful with what counts as right. `[0, 4]` gives 2.0, and 2.0 is the right average, by luck. An input can hide a mistake, so compare with an answer you worked out by hand, and try more than one.

The smallest failing input also tells you something. Here every log of one value works and almost every log of two fails, so the mistake is in how values come together, not in any one value.

## Assert what must be true

`assert`, a condition, and an optional message state something your program needs to be true at that line:

```python
def average_attendance(counts):
    assert len(counts) > 0, "no meetings to average"
    ...
```

When the condition is true, nothing happens. When it is false, Python stops with `AssertionError: no meetings to average`, right at the line that says what was expected. Without it, an empty list stops later with `ZeroDivisionError: division by zero`, which says what broke but not why.

Leave out round brackets around the condition and its message: `assert (len(counts) > 0, "no meetings")` is a tuple, and a tuple with things in it is always true, so that assert can never fail. Python prints a `SyntaxWarning` that says the assertion is always true, then carries on.

An `assert` is for mistakes in your own program, things that cannot be wrong unless the code is. Python can be told to skip every `assert`, so never use one to check what a person typed: raise a `ValueError` for that.

## Your work in this issue

Open `busiest_hill.py`. Run `python3 busiest_hill.py` and count the month by hand to see the wrong answer. Find the smallest log that still goes wrong first, then use it with prints to find the mistake. Check tries your log on its own copy of `busiest_hill` as it came with the file, so mending the function does not change what Task 1 needs.
