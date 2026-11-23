# Arguments and defaults

## What you will be able to do

Ailsa's radio functions took the four teams on Saturday without a single edit to the file. Now Rhona wants the same for the pager, the rota and the rope count, and they bring three things functions have not needed yet: values that are nearly always the same, calls with many values, and names inside a function that look like names outside it. By the end of this issue you will be able to:

- give a parameter a default value, used when a call leaves it out
- name the values in a call, to skip a default or to make the call clear
- tell which names a function can see and which belong to it alone
- give a new value back from a function instead of changing a name outside it

## The request from Rhona

> **Rhona:** Nine pages out of ten are routine, and I am tired of typing it. Ailsa's page function makes every exercise urgent, so half the team turns up at a run. The rota prints my name every night, even when Kirsty leads. And Dougie's rope count stops with an error he cannot read.

All four tasks are in `pager.py`.

## Default values

A parameter can have a default: a value it takes when the call gives it none. You write it in the `def` line with `=`:

```python
def booking(name, room="main hall"):
    return f"{name} in the {room}"

print(booking("Quiz night"))
print(booking("Choir", "back room"))
```

These print `Quiz night in the main hall` and `Choir in the back room`. A value given in the call always wins over the default. Inside the function, use the parameter itself: a function that writes `"main hall"` into its line instead of `room` ignores whatever the call gives it.

Parameters with a default come after the ones without. `def booking(room="main hall", name):` is a `SyntaxError`. Newer versions of Python say a parameter without a default follows one with a default; Python 3.9 says `non-default argument follows default argument`.

## Naming the values in a call

So far each value in a call has gone to the parameter in the same place. You can also name the parameter, with `=`:

```python
booking(room="kitchen", name="Bake sale")
```

Once a value is named, its place no longer matters. Naming is how you skip a default and give one after it. With `def poster(event, day="Saturday", colour="green")`, the call `poster("Ceilidh", colour="red")` keeps Saturday and changes only the colour. Written as `poster("Ceilidh", "red")`, the second value goes to the second parameter, `day`, and the poster says the ceilidh is on red.

Values in order come first, then the named ones: `poster(day="Friday", "Ceilidh")` is a `SyntaxError`, `positional argument follows keyword argument`. A name that is not in the `def` line is a `TypeError`: `poster() got an unexpected keyword argument 'color'`, and newer versions add the name you may have meant.

## Where a name lives

A name made inside a function, its parameters included, lives only inside it, and only while the call runs. After the call it is gone, and using it outside the function is a `NameError`.

Names from the top of the file are different: a function can read them. That makes a quiet mistake easy:

```python
caretaker = "Morag"

def keys_line(name):
    return "Keys with " + caretaker
```

`keys_line(caretaker)` gives back the right line, so the file looks fine. But `keys_line("Fergus")` gives back `Keys with Morag` too, because the function never looks at `name`. A function should work from what it is given: its parameters.

## Changing a name inside does not change it outside

Reading a name from outside works. Giving it a new value inside a function does not:

```python
chairs = 40

def put_out(extra):
    chairs = chairs + extra

put_out(10)
```

Inside a function, any name that gets a value with `=` belongs to that function. So the `chairs` in `put_out` is a new name of its own, not the one at the top, and the line reads it before it has a value. Python stops with an `UnboundLocalError` that names `chairs`. Python 3.9 says `local variable 'chairs' referenced before assignment`; newer versions say it `cannot access local variable 'chairs'`.

The fix is to pass the value in and give the new one back, and let the line that calls store it:

```python
def put_out(chairs, extra):
    return chairs + extra

chairs = put_out(chairs, 10)
```

Now `chairs` at the top holds 50. The function changes nothing outside itself; the `=` on the last line does.

## Your work in this issue

Open `pager.py`. Near the top are the team's values to try your functions on: the leader on call, Sunday's exercise and the rope count. Check calls your functions with values of its own and puts other values at the top. Task 1 is a new function, Task 2 is a call to Ailsa's function, and Tasks 3 and 4 fix functions already in the file. Run `python3 pager.py` after each task: until Task 4 is done, it ends with Dougie's error.
