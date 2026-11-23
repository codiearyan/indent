# Read the traceback

## What you will be able to do

A week in, the laptop is part of the base. On Monday evening Rhona opens the night report, the file that tells the next shift how the week went, and gets a block of error text instead. Dougie tried to tidy it last night. Nothing is lost. The error is Python telling you where it got stuck, and in this issue you learn to read it. By the end of it you will be able to:

- find the file and the line an error points at
- read a traceback from the bottom up
- name the four errors you meet most often and what each usually means
- tell an error Python meets before it runs anything from one it meets on the way

## The request from Rhona

> **Rhona:** Dougie says it was only a few lines of tidying. Now the report is all error and I cannot read any of it. Can you make it print again? And show Dougie what the error says, so the next one gets fixed without you.

All four tasks are in `night_report.py`.

## Two kinds of error

Python meets errors at two moments.

**Before it runs anything.** Python first reads the whole file. If one line cannot be read, nothing runs, not even the lines above it. These are syntax errors: a missing quote or bracket, two things side by side, a line indented that should not be.

**While it runs.** Once the file is read, Python runs it from the top. The lines above the problem run and print as usual, then one line stops everything. A name Python does not know, or text and a number joined with `+`, are the ones you have met.

Either way Python shows one error at a time. Fix it, run the file again, and the next one appears. Each new error is progress.

## Reading an error from while it runs

Take this small file for the village hall:

```python
chairs_out = 40
print("Chairs out:", chairs_out)
print("Tables out:", tables_out)
```

Running it prints `Chairs out: 40`, then:

```
Traceback (most recent call last):
  File "/Users/you/workspace/hall.py", line 3, in <module>
    print("Tables out:", tables_out)
NameError: name 'tables_out' is not defined
```

This is a traceback. Read it from the bottom up.

**The last line is the kind of error and a message.** `NameError` says a name is unknown, and the message names it: `tables_out`.

**Above it is a copy of the line** that stopped, so you can see it without opening the file. Newer versions of Python also draw `^` marks under the part that failed, and may suggest a name you meant.

**Above that is where.** The path to the file, then the line number. The start of the path is the folder on your computer, so skip to the end: `hall.py`, line 3. `in <module>` means the line is in the main part of the file, not inside anything.

**The first line** only says that a traceback follows. Later, when your code calls other code, more `File` lines appear between it and the error, one for each step.

## Reading an error from before it runs

A syntax error has no `Traceback` line, because nothing ran:

```
  File "/Users/you/workspace/hall.py", line 2
    print("Urn on")
IndentationError: unexpected indent
```

The parts are the same: where, a copy of the line, and the kind of error at the bottom. `IndentationError: unexpected indent` means the line starts further right than Python expects. Spaces at the start of a line mean something in Python, and a line that is not inside anything starts at the very left. A tab counts as indentation too.

For most syntax errors there is also a line with a `^` that points into the copy. Where it points, and the words of the message, differ between versions of Python. A quote that never ends is `EOL while scanning string literal` in Python 3.9 and `unterminated string literal` in newer versions; both start with `SyntaxError` and name the same line.

## The four you will meet most

- **SyntaxError**: Python cannot read the line. Look for a quote, bracket or comma that is missing.
- **IndentationError**: a line starts in the wrong place. Look at the spaces in front of it.
- **NameError**: a name nobody made. Compare it, letter by letter and capitals included, with the line that makes it.
- **TypeError**: a value of the wrong kind. `can only concatenate str (not "int") to str` means `+` was asked to join text and a number.

## When the line looks fine

Sometimes the line an error names has nothing wrong with it. A bracket that opens and never closes is the usual cause:

```python
print("Urn on"
print("Cups out")
```

Newer versions of Python point at line 1 and say `'(' was never closed`. Python 3.9 points at line 2, the first place it was sure something was wrong, and says only `invalid syntax`. So when the line looks right, look at the line above it.

Read an error in this order: the line number, then the kind of error, then the message, then the marks. Compare the line with a similar line that works.

## Your work in this issue

Open `night_report.py`. Each task has one broken line, and the comment above it says what the line should print. Run `python3 night_report.py`, read the error, fix the line it names, and run it again. Change only the broken lines: the lines that make the values are fine, and Check runs your file with values of its own.
