# Import what Python already has

## What you will be able to do

You have written every line of your programs yourself, apart from a few import lines in the issues on files. Python comes with hundreds of modules of ready-made functions, called the standard library, and most everyday jobs already have one there. In this issue you learn to bring them into your file and to find the one you need. By the end of it you will be able to:

- import a module and use what is in it through its name
- import one name from a module with `from`, and give it a name of your own with `as`
- read a module's page in the documentation to find the function you need
- read the errors Python gives when an import goes wrong

## The request from Ailsa

> **Ailsa:** The new pagers show 24 letters to a line, and long pages come out cut in the middle of a word. People type hill names wrong in the log, so the same hill turns up three ways. And Rhona wants a one-line summary of every page for her report.

All three tasks are in `pager.py`.

## A module is a file of tools

A module is a Python file full of functions and values that someone else wrote. The `string` module, for one, has a function that gives every word a capital letter. To use it, import the module, then reach inside it with its name and a dot:

```python
import string

print(string.capwords("scarth fell north top"))
print(string.ascii_uppercase)
```

This prints `Scarth Fell North Top` and `ABCDEFGHIJKLMNOPQRSTUVWXYZ`. `import string` runs once, usually at the top of the file, and makes one name, `string`, that stands for the whole module. Everything in it is then `string.` and a name. The import line must run before the line that uses it: without it, Python stops with `NameError: name 'string' is not defined`.

Modules made by other people, outside the standard library, are installed with a separate tool first. This repo needs none of them: everything here comes with Python.

## Taking one name with from

When you use one thing from a module a lot, `from` brings that one name into your file by itself:

```python
from string import capwords

print(capwords("lowther crag"))
```

Now `capwords` works on its own, and the name `string` is not made at all. Each way has its use: `string.capwords` says where the function comes from every time you read it, `capwords` is shorter. What does not work is mixing them up. After `import string`, a bare `capwords(...)` stops with `NameError: name 'capwords' is not defined`, because only `string` was made.

`as` gives what you import a name of your own:

```python
from string import capwords as title_case
```

Here the file gets `title_case`, not `capwords`. That matters when your file already has a name. An import makes a name like `=` does, and a name stands for one thing: if your file has its own `capwords`, `from string import capwords` puts the module's in its place, and every later call gets the module's version.

That is why `from string import *`, which brings in every public name of a module at once, is a trap. You cannot see from your file which names it made, so it can quietly replace one of yours. `from os import *` replaces Python's own `open` with another function of that name, and opening a file with it stops with `TypeError: open() missing required argument 'flags' (pos 2)`.

## Where Python looks

When Python meets `import string`, it looks for the module in a list of places, in order. The first is the folder of the file you ran. After that come the modules that come with Python. So a file of your own, saved beside your program, can be imported by its name without `.py`, and the next issue does just that.

When nothing is found, Python stops with `ModuleNotFoundError: No module named 'strng'`. Read the name in the quotes: it is usually a spelling mistake. When the module is found but has no such name, an import with `from` stops with `ImportError: cannot import name 'capword' from 'string'`, followed by where that module is on your computer. Used through the module, the same mistake stops with `AttributeError: module 'string' has no attribute 'capword'`. Python 3.14 adds a guess at what you meant to both.

## Reading a module's page

Every module of the standard library has a page in Python's documentation. You do not need to read it all. Near the top a sentence says what the module is for. Then each function has its own entry: its name, what it takes in round brackets, and a few sentences on what it gives back. A value after `=` in the brackets, such as `width=70`, has a default and can be left out.

Look for the job in those sentences, not for a name you expect. When an entry looks right, try it on a small value in your file and print what comes back before you build on it.

## Your work in this issue

Open `pager.py` and run `python3 pager.py`. Write each task's import above the function that uses it. Task 2 names the module but not the function: find it on the module's page. Check calls your functions with messages and hills of its own.
