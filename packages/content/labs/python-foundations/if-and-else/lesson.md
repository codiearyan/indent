# Decisions with if

## What you will be able to do

A fortnight in, the laptop answers the team's questions with True or False and reads its own errors back to you. On a wet Tuesday night Rhona sits at the radio desk planning the route to a callout, and the answers alone are not enough: she wants the laptop to act on them. By the end of this issue you will be able to:

- run lines only when a condition is true, with `if`
- choose between two or more paths with `else` and `elif`
- join conditions with `and`, `or` and `not` inside an `if`
- say what Python counts as true, and read the errors that come with blocks

## The request from Rhona

> **Rhona:** Every callout I decide the same things in my head. The bridge or the ford, how bad the wind is on the tops, whether the helicopter can come or we carry the stretcher. When I am tired I get one wrong. Can the laptop decide them the same way every time, from what we know?

All four tasks are in `route_in.py`.

## if runs lines only sometimes

So far every line of a file has run, top to bottom. An `if` runs some lines only when a condition is true. Take the village hall:

```python
temperature = 9
if temperature < 12:
    print("Heating on")
    print("Close the doors")
print("Hall open")
```

The `if` line holds a condition, anything that is True or False, and ends with a colon. The lines under it are moved in by a few spaces. Together they are a block, and they run only when the condition is True. `Hall open` is not moved in, so it is not part of the block and always prints. With `temperature = 15`, only `Hall open` prints.

How far you move the lines in does not matter to Python, as long as every line of the block starts at exactly the same place. The examples here use four spaces. After a colon, the editor moves the next line in for you.

Blocks bring three new errors, and all three stop Python before it runs anything:

- No colon at the end of the `if` line: a `SyntaxError`. Newer versions of Python say `expected ':'`; Python 3.9 says only `invalid syntax` and puts the `^` at the end of the line.
- Nothing moved in under the colon: `IndentationError: expected an indented block`, naming the line after the colon. Newer versions add which line the block belongs to.
- A line moved in by a different number of spaces than the lines above it: `IndentationError: unindent does not match any outer indentation level`.

One more: `if temperature = 9:` is a `SyntaxError` too. A condition asks a question, so it needs `==`. Newer versions of Python add `Maybe you meant '=='`; Python 3.9 says `invalid syntax`.

## else and elif

`else` gives the other path, for every case the `if` does not catch:

```python
if temperature < 12:
    heating = "on"
else:
    heating = "off"
```

Exactly one of the two blocks runs, so `heating` always gets a value. Without the `else`, a warm night leaves `heating` never made, and the next line that uses it stops with a `NameError`.

For more than two paths, put `elif`, short for "else if", between them:

```python
if guests >= 80:
    room = "main hall"
elif guests >= 20:
    room = "back room"
else:
    room = "kitchen"
```

Python asks the questions from the top and runs only the first block whose condition is True, then skips the rest. So the order matters. With `guests >= 20` asked first, a party of 100 would go to the back room, because 100 is also 20 or more, and the main hall would never be chosen. Put the strictest question first. `else` has no condition and always comes last; an `elif` after an `else` is a `SyntaxError`.

## Joining conditions

`and`, `or` and `not` from the last issues work inside an `if`:

```python
if hall_booked and not keys_lost:
    print("Open the hall")
```

Each side is a whole question. `guests > 10 and guests < 50` works; `guests > 10 and < 50` is a `SyntaxError`. In the same way, `day == "Sat" or day == "Sun"` asks two questions, while `day == "Sat" or "Sun"` is always true, for a reason the next part explains.

## What counts as true

An `if` takes any value, not only `True` and `False`. Python counts these as false: `False`, `None`, the number `0`, and empty text `""`. Everything else counts as true, including any text with at least one character in it.

```python
note = ""
if note:
    print("Note:", note)
else:
    print("No note")
```

This prints `No note`. Read `if note:` as "if there is a note". `bool` shows how Python counts a value: `bool("")` is `False` and `bool("Urn")` is `True`. That is also why `"Sun"` on its own side of an `or` is always true.

Do not compare text with `True` to ask whether it holds something: `"Urn" == True` is `False`, because text is never the same value as `True`.

## Your work in this issue

Open `route_in.py`. Near the top is tonight's callout: the river level and the ford's limit, the wind on the tops, whether it is daylight, and the casualty's name, which is empty text tonight. Check runs your file with other values in their place, so build on those names. Tasks 1 and 2 make a variable, Tasks 3 and 4 print a line. Run `python3 route_in.py` after each task, then change a value at the top and run it again to see the other path run.
