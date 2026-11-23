# Decorators

## What you will be able to do

You have put `@dataclass` and `@property` above a class or a def without writing them yourself. Those are decorators: functions that take a function, or a class, and give back a new one. With what the first issue of this part taught, a function handed in and a function given back, you can write your own. By the end of this issue you will be able to:

- write a function that wraps another, with `*args` and `**kwargs` so it takes any values
- put it on a function with the `@` line, and say what that line does
- give the new function a value of its own, such as a count, and keep the wrapped function's name
- hand a decorator what it needs, such as a clock, with a default for every day

## The request from Dougie

> **Dougie:** On a busy night I want to know which handlers ran, how many times each ran, and how long they took, and I am not opening twenty handlers to add the same three lines to each. Can we write those lines once and put them on any handler we like? And the timings have to be testable: a test cannot wait for real seconds to pass.

All four tasks are in `base_handlers.py`.

## A function that wraps another

```python
def shout(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs).upper()
    return wrapper


def greet(name, end="!"):
    return "hello " + name + end


loud_greet = shout(greet)
print(loud_greet("Morag", end="?"))
```

This prints `HELLO MORAG?`. `shout` makes a new function, `wrapper`, and gives it back without calling it. When the new function is called, it calls `greet` with the same values and does something more with the result. Three mistakes come up again and again: a decorator that calls `fn` itself while it makes the new function, so it runs before anyone asked; one that forgets `return wrapper`, so it gives back `None`; and a wrapper that calls `fn` but does not give back what it gave, so every call gives `None`.

`*args` and `**kwargs` let the wrapper take any values. In a def line, `*args` takes every value given in order, as a tuple, and `**kwargs` every value given by name, as a dictionary: `def show(*args, **kwargs): print(args, kwargs)` called as `show(1, "two", three=3)` prints `(1, 'two') {'three': 3}`. In a call, `fn(*args, **kwargs)` hands them all on again, one by one, as they came. A wrapper written as `def wrapper(n):` takes one value only, and a call with a name stops with something like `TypeError: wrapper() got an unexpected keyword argument 'extra'`.

## The @ line

Writing `farewell = shout(farewell)` after a def puts the new function in the old name. The `@` line says the same, right above the def:

```python
@shout
def farewell(name):
    return "goodbye " + name


print(farewell("Ross"))
```

This prints `GOODBYE ROSS`. As soon as the def runs, Python calls `shout` with the new function and keeps what it gives back in the name `farewell`. The decorator is named without round brackets: `@shout()` calls `shout` first, with nothing.

## A function that keeps a value

A function is an object, so it can carry an attribute, as an object of a class can:

```python
def remember_last(fn):
    def wrapper(*args, **kwargs):
        wrapper.last = fn(*args, **kwargs)
        return wrapper.last
    wrapper.last = None
    return wrapper
```

After `@remember_last` on `def add(a, b)`, and the calls `add(2, 3)` and `add(10, 1)`, `add.last` is `11`. The attribute is set once, when the new function is made, and each call changes it through the name `wrapper`. Every function `remember_last` wraps gets a new `wrapper` with its own `last`. A value kept in one name of the file would be shared by all of them. And a plain name given a value inside `wrapper` belongs to that one call, and is gone when it ends.

## Keeping the name

The new function has a name of its own: after `@shout`, `farewell.__name__` is `'wrapper'`. A function's name is in `__name__`, and tracebacks and printouts use it, so every decorated function would be called wrapper there. `wrapper.__name__ = fn.__name__`, before `return wrapper`, gives the new function the name of the one it wraps. Python's own `functools.wraps` is a decorator you can put on `wrapper` that copies the name and a little more.

## Handing a decorator what it needs

A decorator can take more than the function, with a default:

```python
def logged(fn, write=print):
    def wrapper(*args, **kwargs):
        write("calling " + fn.__name__)
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper
```

With `@logged`, the default is used and the line is printed. A test can hand in a function of its own instead: `logged(add, write=notes.append)` puts the line in a list, where the test can read it. A clock works the same way. Code that reads the computer's clock itself gives a different answer on every run, and a test cannot wait for real seconds to pass. Code that calls the clock it is handed can be given a clock that says whatever the test needs.

## Your work in this issue

Open `base_handlers.py`. `log_call` is one of the base's handlers, and `page_team` waits under Task 4. Write each decorator under its task, and try it under `if __name__ == "__main__":` with `python3 base_handlers.py`. Check does not run those lines: it wraps functions of its own that note every call, hands in a clock of its own, and calls the new functions with values in order and by name.
