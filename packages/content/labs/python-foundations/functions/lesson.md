# Functions

## What you will be able to do

The night search ended well: the walker was found in the sixth square, cold but fine. On Monday Ailsa looks at the files you have written and sees a problem. Each one works for one set of values, the ones at the top of the file. On a big night there are four teams on the radio, and she wants the same work done for each of them without copying the lines four times. A function is a set of lines with a name, and you can run it again and again with new values. By the end of this issue you will be able to:

- make a function with `def`, and call it with values
- give a value back with `return`, and tell `return` from `print`
- read the errors you get when a call does not match its function
- build a function on other functions

## The request from Ailsa

> **Ailsa:** Your code is right, but only for the call sign at the top. Saturday I had four teams calling in, and I was changing the file between every call. I want to hand it any call sign, any crew, any radio, and get the answer back.

All four tasks are in `radio_tools.py`.

## def makes a function

This function works out the price of a ticket for the hall's film night:

```python
def ticket_price(age):
    if age < 16:
        return 3
    return 5
```

The first line says: here is a function called `ticket_price`, and it takes one value, which it calls `age`. That name in the round brackets is a parameter. The line ends with a colon, and the lines under it are moved in: they are the function's body.

Making a function runs none of its body. It runs when you call it, with its name and a value in round brackets:

```python
print(ticket_price(12))
print(ticket_price(40))
```

These print `3` and `5`. On each call, `age` holds the value given in that call. That is the point of a function: one set of lines, any number of values. A function has to be made before it is called, so the `def` comes higher in the file than the first call. Call it too early and Python stops with a `NameError`.

## return gives a value back

`return` ends the function at once and gives a value back to the line that called it. That line can print the value, store it in a variable, or use it in a sum: `total = ticket_price(12) + ticket_price(40)` makes `total` 8.

`print` is different. It shows a line in the terminal, and the code that called the function gets nothing from it. A function that ends without `return` gives back `None`:

```python
def ticket_note(age):
    print("Child ticket")

note = ticket_note(12)
```

This prints `Child ticket`, and `note` holds `None`. Use the value later, in a sum or with `+`, and you get a `TypeError` about `NoneType`. When a function gives back `None` and you did not expect it, look for the path through it that ends without `return`: a missing line, or one branch of an `if` that has none.

Because `return` ends the function, where you put it matters. Inside a loop, it gives back on the first round, and the rest of the loop never runs. A total worked out in a loop is given back after the loop, lined up with the `for` or `while`.

## When the call does not match

A call gives a value for each parameter, in order. Give too few or too many and Python stops with a `TypeError` that names the function:

```
TypeError: ticket_price() missing 1 required positional argument: 'age'
TypeError: ticket_price() takes 1 positional argument but 2 were given
```

The first comes from `ticket_price()`, the second from `ticket_price(12, 40)`. The values in a call are called arguments. Compare the call with the `def` line and count. The order matters too: with `def seats(rows, per_row)`, calling `seats(10, 12)` gives `rows` 10, and swapping them swaps their meaning.

## Functions that use functions

A function can call another function, just as your files call `print`:

```python
def booking_line(name, age):
    return f"{name}: {ticket_price(age)} pounds"
```

`booking_line("Kirsty", 12)` gives back `Kirsty: 3 pounds`. The price is worked out in one place only. When the hall changes its prices, you change `ticket_price`, and every function that calls it follows.

## Your work in this issue

Open `radio_tools.py`. Near the top is tonight's callout, there to try your functions on. Check calls your functions with values of its own, so each function must work only with its parameters, not with the names at the top. Write each function under its `# Task` comment, then print what it gives back for tonight's values and run `python3 radio_tools.py`. Task 4 calls the functions from Tasks 1 and 2.
