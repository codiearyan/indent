# Working with text

## What you will be able to do

The lists and lookups work, and Ailsa wants the radio log on the laptop next. The log is text, typed fast by whoever sits at the desk, so the same call sign comes in three different ways. In this issue you tidy text and ask questions of it. By the end of it you will be able to:

- tidy text with `strip`, `lower`, `upper` and `replace`, and keep what they give back
- ask whether a text starts or ends with something, or has something in it
- find where something is in a text, and take the part after it
- read the error you get when a text method is called on something that is not text

## The request from Ailsa

> **Ailsa:** Three of us type at the radio desk and no two lines look alike. One types call signs in small letters with a space in front, one puts spaces in grid references, and nobody can say which entries Rhona has to see straight away. I want the laptop to tidy each part and pick out the ones for Rhona.

All four tasks are in `radio_words.py`.

## A method gives back a new text

You met `strip` and `upper` in the text issue. There is one rule about them that matters more than any method: text in Python cannot be changed once it is made. Every method gives back a new text and leaves the old one as it was.

```python
hall = "  Glebe Hall\n"
hall.strip()
print(hall)
tidy = hall.strip()
print(tidy.lower())
```

The first `print` shows the text as it was, with its spaces and a blank line after it, because the second line threw away what `strip` gave back. The second prints `glebe hall`. A method whose result is not kept or given back does nothing you can see.

`strip()` with nothing in its brackets takes off spaces, tabs and line ends from both ends of a text, never from the middle. A line end, written `\n`, is the invisible character at the end of every line typed into a file or a terminal. `strip(" ")` takes off spaces only, and leaves the line end on.

Trying to change one letter of a text stops with an error: `hall[2] = "g"` stops with `TypeError: 'str' object does not support item assignment`.

## Replacing text

`replace` takes the text to find and the text to put in its place, and replaces every match, not only the first:

```python
note = "chairs in the hall, tables in the hall"
print(note.replace("hall", "annexe"))
print(note.replace(" ", ""))
```

This prints `chairs in the annexe, tables in the annexe`, then `chairsinthehall,tablesinthehall`. Empty quotes are a text with nothing in it, so replacing with them takes the match out. One method can follow another: `note.replace(" ", "").upper()` replaces first, then turns what that gave back into capitals.

## Asking questions of text

`startswith`, `endswith` and `in` give back `True` or `False`:

```python
booking = "Choir practice, Monday at seven"
print(booking.startswith("Choir"))
print(booking.endswith("seven"))
print("Monday" in booking)
print(booking.startswith("choir"))
```

This prints `True`, `True`, `True` and `False`. `startswith` looks only at the start, `endswith` only at the end, and `in` anywhere. Capitals count, which is why the last line is `False`. To ask without caring about capitals, turn the text into one kind of letter first: `booking.lower().startswith("choir")` is `True`.

## Finding a position

Text has positions, like a list: the first letter is at position 0, and slices work the same way, so `"Glebe Hall"[6:]` is `Hall`. `find` gives back the position where something first appears:

```python
line = "Key holder: Mrs Pattie, 01632 960412"
colon = line.find(":")
print(colon)
print(line[colon + 1:])
print(line.find("#"))
```

This prints `10`, then ` Mrs Pattie, 01632 960412` with a space at its start, then `-1`. When `find` does not find what it was asked for, it gives back `-1`, which is not an error. Slice with it anyway and you start at `-1 + 1`, which is 0, the whole text. So ask whether `find` gave back `-1` before you use the position.

## When it is not text

Text methods belong to text. Call one on something else and Python stops:

```python
chairs = 40
print(chairs.upper())
```

This stops with `AttributeError: 'int' object has no attribute 'upper'`. Read it from the end: a whole number has nothing called `upper`. You get the same error on `None`, which is what a function gives back when it printed instead of using `return`, and on a list of texts, where the method has to be called on each text in it.

## Your work in this issue

Open `radio_words.py`. At the top are tonight's call sign, grid reference and log entries as they were typed; Check calls your functions with values of its own. Write each function under its `# Task` comment and print what the task asks for. Run `python3 radio_words.py` after each task. A line end left on a text shows as a blank line after it when you print it.
