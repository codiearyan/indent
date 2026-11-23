# Reading and writing files

## What you will be able to do

Until now every value lived inside your program and was gone when it ended. The radio log has to outlast the night: Ailsa wants it in a file, one entry a line, that the laptop reads and adds to. In this issue your functions work on files on the disk. By the end of it you will be able to:

- open a file with `with`, read it whole or line by line, and know it is closed afterwards
- write a new file, or add to the end of one, with the line ends in the right places
- say `encoding="utf-8"` every time, and know why
- join a folder and a file name with `pathlib`, and ask whether a file is there

## The request from Ailsa

> **Ailsa:** Every night's log is a page torn out of a pad, and the pads get lost. I want the log in a file on the laptop: read it back, start a fresh one, add each entry as it comes in, and find the log of any night in the logs folder.

All five tasks are in `night_log.py`. Tonight's log is `radio_log.txt`, and the `logs` folder holds one file per night.

## Opening a file

`open` takes a path, which says where the file is. A plain name such as `"bookings.txt"` means a file in the folder the program runs in, here your workspace. `open` gives back a file, and `read()` gives back everything in it as one text:

```python
with open("bookings.txt", encoding="utf-8") as bookings:
    text = bookings.read()
print(text)
```

The `with` line opens the file and closes it again as soon as the lines moved in under it end, even if one of them stops with an error. A file that is never closed may not hold what was written to it yet, and on some systems no other program can open it, so open every file on a `with` line. Using the file after the `with` block stops with `ValueError: I/O operation on closed file.`

A file is read from where the last read stopped. Call `read()` twice in the same block and the second gives back empty text. A path to a file that is not there stops with `FileNotFoundError: [Errno 2] No such file or directory`.

`encoding="utf-8"` says how the letters were saved. Without it Python uses the computer's own encoding, which is UTF-8 on a Mac or Linux and often something else on Windows, so a letter such as é comes out wrong there, or stops with a `UnicodeDecodeError`, which means the file holds bytes that are not letters in the encoding Python used.

## Line by line

A `for` loop over an open file gives one line on each round, with its line end still on:

```python
with open("bookings.txt", encoding="utf-8") as bookings:
    for line in bookings:
        print(repr(line))
```

`repr` shows a text with its quotes and its invisible characters, so this prints `'Monday; choir\n'` and the like. The last line of a file may have no line end, so cutting off the last character of each line would cut a letter there: `strip()` takes off what is there and nothing more. A blank line is `'\n'`, and empty once stripped. A file saved on Windows ends each line with `\r\n`, but Python turns every kind of line end into `\n` as it reads, so your code sees the same lines on every system.

## Writing and adding

The second value given to `open` says what the file is opened for. `"w"` writes: it makes the file, or empties it if it is there. `"a"` adds to the end and keeps what is there. `write` writes exactly the text it is given and adds no line end of its own:

```python
with open("notices.txt", "w", encoding="utf-8") as notices:
    notices.write("Hall closed on Friday\n")
with open("notices.txt", "a", encoding="utf-8") as notices:
    notices.write("Jumble sale on Saturday\n")
```

Now `notices.txt` holds both lines. Run it again and it still holds two: the `"w"` emptied it first. On Windows each `\n` you write is saved as `\r\n`, which editors show as an ordinary line end. Writing to a file opened without `"w"` or `"a"` stops with an error that says it is `not writable`.

## Paths

Python comes with modules, sets of tools that a program brings in with an import line. `pathlib` has `Path`, a path that knows it is one:

```python
from pathlib import Path

folder = Path("hall")
booking = folder / "monday.txt"
print(booking)
print(booking.exists())
```

The `/` between a Path and a name gives the Path of that name inside the folder, and prints `hall/monday.txt` on a Mac or Linux and `hall\monday.txt` on Windows. `exists()` gives back `True` when a file or folder is there, so you can ask before you open. `open` takes a Path as readily as text. `folder + "/monday.txt"` stops with a `TypeError`: `+` does not join a Path and a text.

## Your work in this issue

Open `night_log.py` and `radio_log.txt`. Check makes files of its own in a copy of your workspace and hands each function its path, so use the path the function is given, not a name typed into the code. Run `python3 night_log.py` from your workspace after each task, and open `tonight.txt` in the editor to see what Tasks 3 and 4 wrote.
