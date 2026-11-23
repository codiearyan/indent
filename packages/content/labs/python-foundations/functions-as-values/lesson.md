# Functions as values

## What you will be able to do

You have written many functions and called each one by its name. A function is also a value, like a number or a list: it can sit in a name, in a list or in a dictionary, be handed to another function, and be given back by one. This is the last part of the repo, and most of what it teaches builds on that one idea. By the end of this issue you will be able to:

- keep a function in a name, a list or a dictionary, and call it from there
- hand a function to another function, and tell handing it over from calling it
- write a small function in one line with `lambda`
- write a function that makes and gives back a new function, which remembers a value from where it was made

## The request from Ailsa

> **Ailsa:** Every kind of call needs something different from the desk, and right now that is one long if and elif that I am scared to touch. I want each kind of call to have its own handler, the desk to send a call to the right one by its kind, and a pager for each team that puts the call sign in front of every message, so nobody types Bravo when they meant Alpha.

All four tasks are in `call_handlers.py`.

## A function is a value

```python
def to_f(c):
    return c * 9 / 5 + 32


convert = to_f
print(convert(10))
print(to_f)
```

This prints `50.0`, then something like `<function to_f at 0x109f07740>`. The def line makes a function and keeps it in the name `to_f`; `convert = to_f` puts the same function in a second name, and `convert(10)` calls it. The round brackets are what call a function. Without them, `to_f` stands for the function itself, and printing it shows only what it is and where it lives in memory.

So a function can go anywhere a value can. `changes = [to_f, round]` is a list of two functions, and `[f(21.4) for f in changes]` calls each in turn and gives `[70.52, 21]`. A dictionary can keep a function under each key, and reading a key gives back the function, which still has to be called: `units["f"](10)` reads the function under `"f"`, then calls it with `10`.

## Handing a function over

A function can take another function as a parameter and call it inside:

```python
def apply_each(numbers, change):
    return [change(n) for n in numbers]


print(apply_each([0, 10], to_f))
```

This prints `[32.0, 50.0]`. `to_f` is written without round brackets, so the function itself is handed over, and `apply_each` decides when to call it. Two mistakes are common, and Python's errors tell them apart:

- **Called where it should be handed over.** `apply_each([0, 10], to_f())` runs `to_f` at once, with nothing, and stops with `TypeError: to_f() missing 1 required positional argument: 'c'`. With a value, `to_f(3)` runs first and hands over `37.4`, and the call inside stops with `TypeError: 'float' object is not callable`. "Is not callable" means round brackets came after something that is not a function.
- **Handed over where it should be called.** `to_f + 1` stops with `TypeError: unsupported operand type(s) for +: 'function' and 'int'`. The word `function` in an error usually means a name was used without its round brackets.

## lambda, for a small one

A function that only works out one value can be written in one line:

```python
half = lambda n: n / 2
print(half(9))
```

This prints `4.5`. `lambda`, the parameters, a colon, then one expression, which is given back without `return`. It is the same as a def with one return line, and it is handy where a small function is handed straight to another one. It holds one expression only, and it gives back what that expression is: `lambda n: print(n)` prints, then gives back `None`.

## A function made by a function

```python
def make_scale(factor):
    def scale(n):
        return n * factor
    return scale


double = make_scale(2)
triple = make_scale(3)
print(double(5), triple(5), double(7))
```

This prints `10 15 14`. Each call of `make_scale` makes a new `scale` and gives it back, without calling it. The new function remembers `factor` from the call that made it, even after `make_scale` has ended, so `double` keeps 2 and `triple` keeps 3.

That remembering is a trap in a loop. A function written inside a loop that reads the loop's name looks that name up when it is called, not when it is made:

```python
scales = []
for factor in [2, 3, 4]:
    scales.append(lambda n: n * factor)
print([s(10) for s in scales])
```

This prints `[40, 40, 40]`: by the time any of them is called, the loop has ended and `factor` is 4. Made by a function of their own, `[make_scale(f) for f in [2, 3, 4]]`, each keeps its own value, and the same print gives `[20, 30, 40]`.

## Your work in this issue

Open `call_handlers.py`. Ailsa's teams, two ways to word a message and the desk's handlers are at the top. Write each function under its task, and try it under `if __name__ == "__main__":`. Run the file with `python3 call_handlers.py`. Check does not run those lines: it hands in functions of its own that note how they were called, and calls the functions yours give back, more than once.
