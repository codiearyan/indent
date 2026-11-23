# Splitting and joining

## What you will be able to do

The radio desk's lines come out tidy now. Rhona has a bigger job: the callout book, typed up as one long text with a line for each callout. To add anything up you have to take that text apart into lines, each line into its parts, and the numbers out of the parts. By the end of this issue you will be able to:

- split a text into words, into parts at a separator, and into lines
- turn the number inside a text such as `3 hours` into a number you can add
- join a list of texts back into one line
- read the errors that `int()` and `join` give when they get the wrong thing

## The request from Rhona

> **Rhona:** The callout book is typed up, one callout a line: the date, the hill, the hours and the crew, with a semicolon between them. I need the hours added up for the year, and someone keeps spelling a hill wrong. Ailsa also wants to know how many words a radio message has, because long messages get cut off.

All five tasks are in `callout_book.py`.

## Splitting at spaces

`split()` with nothing in its brackets cuts a text at its spaces and gives back a list of the pieces:

```python
notice = "  Jumble sale  on Saturday \n"
print(notice.split())
print(notice.split(" "))
```

This prints `['Jumble', 'sale', 'on', 'Saturday']`, then `['', '', 'Jumble', 'sale', '', 'on', 'Saturday', '\n']`. Without a separator, any run of spaces, tabs and line ends counts as one cut, and nothing empty is left at the ends. With `" "` in its brackets, `split` cuts at every single space, so two spaces in a row leave an empty text between them, and the line end stays on.

## Splitting at a separator

Give `split` another separator and it cuts only there:

```python
booking = "Choir;Monday; 7 pm ;20"
print(booking.split(";"))
```

This prints `['Choir', 'Monday', ' 7 pm ', '20']`. The separator itself is gone, and the spaces around each piece stay, so strip each piece when people typed them. Every piece is text, the `20` too.

## Lines

Three double quotes start a text that runs over several lines, and it ends at the next three. Each line in it ends with a line end, written `\n`. `splitlines()` cuts a text into its lines:

```python
hall_log = """Monday; choir
Tuesday; yoga
"""
print(hall_log.splitlines())
print(hall_log.split("\n"))
```

This prints `['Monday; choir', 'Tuesday; yoga']`, then the same with an empty text at the end: splitting at `"\n"` makes one more piece after the last line end. A text typed on Windows ends each line with two characters, `\r\n`, and `splitlines()` knows that too, where `split("\n")` would leave a `\r` on every line.

## Numbers inside text

`int()` turns text into a whole number only when the text is a whole number and nothing else, spaces around it aside: `int(" 20\n")` is `20`. Anything more and it stops:

```python
print(int("7 pm"))
```

This stops with `ValueError: invalid literal for int() with base 10: '7 pm'`. "Literal" here means the text it was given, which is quoted at the end, and "base 10" means ordinary numbers. Take the number out first: `"7 pm".split()[0]` is `"7"`, and `int` of that is `7`. Do not take only the first character, `"12 pm"[0]`: that is `"1"`.

A number read out of text is text until `int()` turns it into one. Add two of them with `+` and you get `"7" + "20"`, which is `"720"`, and adding one to a number stops with a `TypeError`.

## Joining

`join` is the other way round from `split`. It is called on the text that goes between the pieces, and the list of pieces goes in its brackets:

```python
days = ["Monday", "Tuesday", "Friday"]
print(", ".join(days))
```

This prints `Monday, Tuesday, Friday`, with nothing added at the ends. Two mistakes are common. `days.join(", ")` stops with `AttributeError: 'list' object has no attribute 'join'`, because `join` belongs to text, not to lists. And every piece must be text: `", ".join(["Monday", 7])` stops with `TypeError: sequence item 1: expected str instance, int found`, which says the piece at position 1 is a whole number.

## Your work in this issue

Open `callout_book.py`. At the top is the book as Rhona typed it, spaces where people put them, and a radio message; Check calls your functions with values of its own. Task 4 and Task 5 may use your `callout_parts` from Task 3, and Check gives your file its own version for those tasks, so a mistake in one task does not count in the next. Run `python3 callout_book.py` after each task.
