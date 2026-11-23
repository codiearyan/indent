# Text and f-strings

## What you will be able to do

The numbers work. On Saturday the team is called out for a walker with a twisted ankle, and you sit at the radio desk with Ailsa Rennie, who keeps the callout log. Every entry in it is a line of text built from bits heard over the radio. In this issue you make the laptop build those lines. By the end of it you will be able to:

- join pieces of text into one
- tidy text with methods such as `strip` and `upper`
- turn a number into text, and read the error you get when you forget
- write a line with the values in place, using an f-string

## The request from Ailsa

> **Ailsa:** I write the log by hand while the radio talks at me. Half the time the call sign is in small letters with a stray space, and I write the crew as a word one night and a number the next. I want every entry to look the same: who, where, and how many went out.

All four tasks are in `radio_log.py`.

## Joining text

Text in Python is called a string, and you have used it since your first line. Double quotes and single quotes both make text. When the text has an apostrophe in it, use double quotes around it, so the apostrophe does not end the text: `"It's raining"`.

`+` joins two pieces of text into one:

```python
hall = "Glebe Hall"
booking = hall + " at seven"
print(booking)
```

This prints `Glebe Hall at seven`. `+` adds nothing of its own, so a space has to be inside the quotes. Without it you get `Glebe Hallat seven`.

`len` tells you how many characters a text has, spaces included: `len("Glebe")` is `5`.

## Methods tidy text

Text comes with methods: small tools you call with a dot and round brackets after it. Each one gives back a new text and leaves the old one as it was.

```python
name = "  glebe hall "
print(name.strip())
print(name.upper())
print(name.strip().title())
```

`strip()` removes the spaces at the start and the end, but not the ones in the middle, and prints `glebe hall`. `upper()` gives the same text in capitals, `lower()` in small letters, and `title()` with a capital at the start of each word. You can write one method straight after another: the second works on what the first gave back, so the last line prints `Glebe Hall`.

The round brackets matter. `name.upper` without them is the method itself, not what it gives back, and printing it shows something like `<built-in method upper of str object at 0x...>`. A method only runs when brackets follow its name.

## Text and numbers do not mix

`+` means "join" for text and "add" for numbers, and Python will not guess which you meant when you give it one of each:

```python
chairs = 40
print("Chairs: " + chairs)
```

The first line of this file runs, then the second stops with:

```
Traceback (most recent call last):
  File "/Users/you/workspace/hall.py", line 2, in <module>
    print("Chairs: " + chairs)
TypeError: can only concatenate str (not "int") to str
```

A `TypeError` means a value of the wrong kind was used. "Concatenate" is the programmer's word for joining text, so the message says: `+` can only join text to text, and it was given a whole number (`int`). Newer versions of Python also draw marks under the `+`.

The fix is to turn the number into text first with `str`: `"Chairs: " + str(chairs)` gives `Chairs: 40`. It also works the other way round. `int("12")` turns the text `"12"` into the number `12`, so you can do sums with it. `int("twelve")` stops with a `ValueError`, because that text is not a number.

## f-strings put values in place

Joining many pieces with `+` and `str` gets hard to read. An f-string is easier: write the whole line as it should read, put an `f` right before the opening quote, and put each name inside curly braces where its value goes:

```python
hall = "Glebe Hall"
chairs = 40
note = f"{hall} has {chairs} chairs out"
print(note)
```

This prints `Glebe Hall has 40 chairs out`. Python works out each name in braces and puts its value there, and numbers need no `str` inside an f-string. Every space you see in the quotes is a space in the result.

Forget the `f` and Python treats the braces as ordinary characters: `"{hall} has {chairs} chairs out"` prints exactly that, braces and all. If you see your variable names in braces in the output, look for the missing `f`.

## Your work in this issue

Open `radio_log.py`. Near the top is tonight's callout, as Ailsa took it down: the hill, the grid reference, the call sign and how many went out. Check runs your file with other callouts in their place, so build on those names. Do the four tasks in order under their `# Task` comments. Task 4 uses what Tasks 1 and 2 made, and Check starts it from the right values, so a mistake earlier does not spoil it. Run `python3 radio_log.py` after every change and compare each line with the task, space by space.
