# Raise an error

## What you will be able to do

Last issue you caught errors that Python raised. Now your own functions raise them. A function that is asked for something it cannot do has two bad choices, giving back a made-up answer or carrying on with a wrong one, and one good one: stopping, and saying why. By the end of this issue you will be able to:

- raise a `ValueError` with a message a person can act on
- refuse bad input before the function changes anything
- choose between giving back `None` and raising
- note an error and raise it again with a plain `raise`

## The request from Dougie

> **Dougie:** After Saturday the store says we have minus two splints. Somebody took out more than we had, and the laptop just did the sum. And a misspelt kind on a packing list gives a weight of nothing, then the pack total falls over somewhere else entirely. If an order is wrong, I want it refused there and then, with words that say what is wrong.

All three tasks are in `kit_orders.py`.

## Raise

`raise` stops the function at once and hands an error to the code that called it, as if Python had found the problem itself:

```python
def lend_chairs(hall, count):
    if count < 1:
        raise ValueError(f"lend at least 1 chair, not {count}")
    if count > hall["chairs"]:
        raise ValueError(f"cannot lend {count} chairs: the hall has {hall['chairs']}")
    hall["chairs"] = hall["chairs"] - count
```

`lend_chairs(hall, 80)` with 40 chairs in the hall ends the program with a traceback whose last two lines are your own:

```
    raise ValueError(f"cannot lend {count} chairs: the hall has {hall['chairs']}")
ValueError: cannot lend 80 chairs: the hall has 40
```

`ValueError` is the error for a value of the right kind that will not do: a whole number, but too many. `TypeError` is for a value of the wrong kind, and `KeyError` for a key that is not there. The text in the round brackets is the message. Write it for the person who reads the traceback: name the value that was wrong and what it should have been. `ValueError()` with nothing in it, or `"bad input"`, leaves them guessing.

`raise "too many"` does not work: raise takes an error, and a text alone stops with `TypeError: exceptions must derive from BaseException`.

## Refuse early

Look at the order of the lines in `lend_chairs`: both checks come first, and the count changes only after them. If the change came first and the check after, a refused loan would already have taken the chairs, and the hall would be left with a count below zero and an error. Check what you are given, raise if it will not do, then do the work.

`print` is not a refusal. A function that prints a warning and carries on gives back something, and the code that called it carries on too, as if all were well.

## None, or raise

`None` is a good answer when "nothing" is a normal answer: the next booking of a day with no bookings, a phone number nobody gave. The caller expects it and checks for it.

When the caller asked for something that cannot be, raise. A room that does not exist is a mistake in the request, not an answer. Given back as `None`, it travels on, and much later something such as `None + 20` stops with a `TypeError` far from the cause, in a traceback that never mentions where the `None` came from. A raise right where the problem is puts that line at the bottom of the traceback.

## Raise it again

Sometimes a function wants to note an error and still let it travel on. A `raise` on its own, inside an `except` block, raises again the error being handled, with its kind and message as they were:

```python
try:
    lend_chairs(hall, 80)
except ValueError as error:
    refused.append(str(error))
    raise
```

`str(error)` is the message as text. The `refused` list keeps it, and the code above still stops with the same `ValueError`. Raising a new error with other words, or of another kind, would lose what the first one said. A `raise` on its own outside an `except` block has nothing to raise again, and stops with a `RuntimeError`.

## Your work in this issue

Open `kit_orders.py`. When you try a function with a value it refuses, call it inside a `try` and print the message in the `except`, so the rest of the file still runs. Run `python3 kit_orders.py` after each task. Check calls your functions with values of its own and looks at the kind of each error, whether your own `raise` line raised it, what its message names, and what the store and the list of problems hold afterwards.
