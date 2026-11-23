# Your first line

## What you will be able to do

Brackenridge Mountain Rescue is a team of volunteers who go out, day or night, when someone is lost or hurt on the hills above the village. Rhona Halkett leads the team, Dougie Nairn looks after the kit and Ailsa Rennie keeps the callout log, all in a notebook and a spreadsheet nobody trusts. You offered to look after the laptop at the base, and you have never written a line of code. That is fine: this issue starts at the very first step. By the end of it you will be able to:

- run a Python file in the terminal with `python3`
- make your file print lines of text
- turn a line off without deleting it
- leave notes in your code for the people who read it

## The request from Rhona

Rhona meets you by the radio desk on your first evening.

> **Rhona:** Before you touch anything real, show me this laptop can talk. Print our name, then the radio check we read out at the start of every callout. And the old file still tells people to meet at the old base on Cluny Road. Switch that off, but keep it, in case we need the words again.

Everything here happens in one file, `first_line.py`.

## A file is a list of instructions

A Python file is plain text whose name ends in `.py`. Each line is an instruction, and the computer carries them out one after another, from the top of the file to the bottom. The program that reads and runs the file is called Python.

You run a file by typing a command in the terminal, the panel below the editor:

```
python3 first_line.py
```

`python3` starts Python, and `first_line.py` tells it which file to run. Press Enter and Python runs every line, then stops. You cannot break anything by running it, so run it after every change. The command is the same on every computer. If Python is missing, the banner at the top of the issue says how to get it.

## Printing with print

To make a file show something in the terminal, you print it:

```python
print("The urn is on")
```

`print` means "show this". What goes between the round brackets is printed on its own line. Text has to sit inside quotes, so Python knows where it starts and ends. Double quotes `"like this"` and single quotes `'like this'` both work; this repo uses double quotes. Write the text exactly as you want it to appear, because Python prints it exactly as you wrote it, capital letters and spaces included.

One `print` prints one line. To print three lines, write three, one under the other:

```python
print("Urn on")
print("Cups out")
print("Hall open")
```

Because Python goes from top to bottom, they print in that order.

## When something goes wrong

Sooner or later Python will refuse to run your file and print an error instead. That is normal, and the error helps you. Say a file for the village hall has a quote missing on its second line:

```python
print("Hall open")
print("Urn on)
```

Running it prints no `Hall open` at all, only something like this:

```
  File "/Users/you/workspace/hall.py", line 2
    print("Urn on)
SyntaxError: ...
```

The first line names the file and the line number, so look at line 2. The editor shows line numbers down its left edge. Next comes a copy of that line. Under the copy there is a line with a `^` that points at the place where Python got lost. The last line says what kind of error it is. A `SyntaxError` means Python could not read the line at all, so it ran nothing, not even the lines above it. Where exactly the `^` points, and the words after `SyntaxError:`, differ from one version of Python to the next, so do not worry if yours look a little different.

The most common causes on a first day are a missing quote, a missing bracket, or `Print` with a capital letter where Python expects `print`. Read the line it points at, fix it, and run the file again.

## Comments are notes for people

Sometimes you want to write something in a file that Python should skip. That is a comment. A comment starts with `#`, and Python ignores everything after it on that line:

```python
# The hall opens at seven on quiz nights
print("Hall open")
```

Comments have two everyday uses. The first is leaving a note for whoever reads the file next: what it does, or why a line is there. The second is switching a line off. Put `#` in front of a line of code and Python no longer runs it, but the line stays in the file, ready to be switched back on by removing the `#`:

```python
# print("Bingo at eight")
```

Your starter file is full of comments already: every line that starts with `#` is a note for you, and Python skips all of them.

## Your work in this issue

Open `first_line.py`. The comments at the top list the four tasks, and each task has its own `# Task` section below. Run the file first with `python3 first_line.py` to see what it prints today. Then work through the tasks in order, writing each one under its own `# Task` comment, and run the file after each change. When it looks right, press Check. Check runs your file with Python the same way and reads what each task's lines print.
