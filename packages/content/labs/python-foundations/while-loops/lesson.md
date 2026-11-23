# Repeat with while

## What you will be able to do

Dougie's kit night went faster than ever. On Saturday the team is out all night searching Stob Ruadh for an overdue walker, and you sit with Ailsa at the radio desk. Nobody knows how many rounds of anything the night will take, and a `for` loop needs to know that in advance. A `while` loop does not. By the end of this issue you will be able to:

- repeat lines for as long as a condition is True, with `while`
- spot a loop that never ends, and stop it in the terminal
- leave a loop early with `break`
- skip the rest of one round with `continue`

## The request from Ailsa

> **Ailsa:** On a long search I count down to the vehicle leaving, I keep asking how long the radio battery will last, I tick off the search squares until someone shouts found, and I call round every channel but our own. Dougie wrote the countdown for me, and it never stops.

All four tasks are in `radio_watch.py`.

## while repeats while a condition holds

A `while` loop asks its condition, runs its block if the condition is True, then goes back and asks again. It stops the first time the answer is False. Here the hall warms up until it reaches 18 degrees:

```python
temperature = 12
while temperature < 18:
    print("Heating on at", temperature)
    temperature = temperature + 2
print("Warm enough")
```

This prints the heating line for 12, 14 and 16, then `Warm enough`. When `temperature` reaches 18, the condition is False and Python goes on to the line after the block. If the condition is False the very first time, the block never runs at all.

Use `for` when you know how many rounds there are: one per radio, one per letter. Use `while` when you only know when to stop.

## When a loop never ends

The block has to change something the condition looks at. Leave out the line that raises `temperature`, and `temperature < 18` stays True for ever: the loop prints the same line again and again and never reaches `Warm enough`. Changing the wrong name, or working out a new value without storing it, as in `temperature + 2` on its own line, does the same.

In the terminal you will see the same line racing past, or nothing at all with the cursor waiting. Nothing is broken. Press **Ctrl+C**: hold Ctrl and press C. Python stops and prints a traceback that ends with:

```
KeyboardInterrupt
```

The line above it is whichever line Python was running when you pressed, somewhere inside the loop. Then read the loop's condition, find the name it looks at, and ask which line in the block changes that name.

Check stops such a loop by itself after a couple of seconds, says which task it was under, and still judges the tasks before and after it.

## Stopping early with break

Sometimes you find what you were looking for before the loop would end by itself. `break` leaves the loop at once, and Python goes on after the block. It works the same in a `for` loop and in a `while` loop:

```python
for seat in range(1, 41):
    if seat == lost_keys_seat:
        print("Keys under seat", seat)
        break
print("Search over")
```

Without the `break`, the loop would go on checking every seat up to 40 after the keys were found. With it, the loop ends at the seat with the keys, or after seat 40 if they are not in the hall. `break` usually sits inside an `if`, because a loop that always breaks only ever runs one round.

## Skipping a round with continue

`continue` skips the rest of the block for this round and goes straight back to the condition:

```python
table = 0
while table < 6:
    table = table + 1
    if table == 4:
        continue
    print("Lay table", table)
```

This lays tables 1, 2, 3, 5 and 6: table 4 has a broken leg.

Watch where the line that moves the loop on sits. Here `table` goes up before the `continue`. If that line were at the bottom of the block, the `continue` would skip it, `table` would stay at 4, and the loop would never end. `continue` works in `for` loops too, where the loop moves itself on.

## Your work in this issue

Open `radio_watch.py`. Near the top is the night as Ailsa has it: minutes until the vehicle leaves, the radio's battery, the search squares and the channels. Check runs your file with other values in their place, so build on those names. The first time you run `python3 radio_watch.py`, it never stops: that is Dougie's countdown, and fixing it is Task 1. Press Ctrl+C, then fix it. Do the other three tasks in order under their `# Task` comments, and run the file after each.
