# A module of your own

## What you will be able to do

In the last issue you imported modules that come with Python. Any Python file can be a module, yours included. When two programs need the same functions, you move those functions into a file of their own and both programs import it. In this issue you split one program into two files. By the end of it you will be able to:

- move functions into a second file and import them from it
- say which lines of a file run when it is imported
- keep try-out lines from running on import with a main guard
- read the errors of a file that hides one of Python's modules, and of two files that import each other

## The request from Rhona

> **Rhona:** Ailsa wants the functions that read a line of the callout log for her radio desk, and she has started copying them out of the report. Two copies will be two different answers by Christmas. Put them in one file that both can use.

The work is in two files: `report.py`, the report, and `callouts.py`, the module.

## A file is a module

Say a file called `weather.py` sits in the same folder as `briefing.py`:

```python
# weather.py
def feels_like(temperature, wind):
    return temperature - wind / 10
```

Then `briefing.py` imports it by its file name without `.py`, exactly like a module of Python's own:

```python
# briefing.py
from weather import feels_like

print("Feels like", feels_like(2, 30))
```

Run `python3 briefing.py` and it prints `Feels like -1.0`. Python looks for `weather` in the folder of the file you ran first, and finds it there. `import weather` and then `weather.feels_like(...)` works too.

A function that moves takes with it what it calls. If `feels_like` called a helper that stayed behind in `briefing.py`, `weather.py` would not know that name, and calling it would stop with a `NameError`. A module must make sense on its own.

## What runs when a file is imported

Importing a file runs it, once, from top to bottom. A `def` only makes a function, so nothing visible happens. But a `print` or a call at the top of the file, not inside any `def`, runs right then, in the middle of the program that imported it. Say `weather.py` ends with a line to try it:

```python
print(feels_like(2, 30))
```

Now `python3 briefing.py` prints `-1.0` before its own line, because the import ran it. A second `import weather` in the same program does not run the file again: Python keeps each module it has loaded.

To keep try-out lines in the module without that, Python gives every file a name, `__name__`, with two underscores on each side. In the file you ran it is the text `"__main__"`. In a file that was imported it is the module's name, here `"weather"`. So an `if` on it tells the two apart:

```python
if __name__ == "__main__":
    print(feels_like(2, 30))
```

`python3 weather.py` runs the lines under it, and `import weather` skips them. This is called the main guard. A misspelt guard, such as `"main"` without the underscores, is never true, and its lines never run at all.

## When an import finds the wrong file

Because the folder of your program comes first, a file of yours with the same name as one of Python's modules hides that module. Save a file of your own as `random.py`, and in the same folder `import random` finds your file:

```python
import random

print(random.choice(["Rhona", "Dougie"]))
```

This stops with `AttributeError: module 'random' has no attribute 'choice'`. Python 3.14 adds advice to rename your file; Python 3.9 says nothing more. When a module of Python's own seems to have lost a function it surely has, look in your folder for a file of that name, and give it another name in the terminal: `mv random.py rota_notes.py`.

## Two files that import each other

An import should go one way: the program imports the module, and the module needs nothing from the program. Say `weather.py` began with `from briefing import round_to`. Running `briefing.py` starts its import of `weather`, `weather` starts importing `briefing` again, and that second `briefing` asks `weather` for `feels_like` before the `def` of `feels_like` has run. This goes round in a circle and stops with something like `ImportError: cannot import name 'feels_like' from 'weather'`. Python 3.9 says the module is partially initialized, most likely due to a circular import. Python 3.14 may suggest renaming the file instead, which is the wrong lead here.

Moving the import inside a function only hides the circle: the import then runs the whole program again each time the function is called. The mend is to move what both files need into the module.

## Your work in this issue

Open `report.py` and `callouts.py`. Run `python3 report.py`, and `python3 callouts.py` by itself. Do Task 1 first, then put Ailsa's try-out lines under a guard, then write `hill_hours`. Check imports `callouts.py` the way an import line does and calls its functions with lines of its own.
