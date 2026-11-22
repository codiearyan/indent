# Names and values

## What you will be able to do

The laptop prints the radio check, and Rhona is pleased. The next evening Dougie Nairn, who looks after the kit store, catches you by the door. A count has to be remembered and changed as the night goes on, and that is what variables are for. By the end of this issue you will be able to:

- tell text values from number values, and ask Python which is which
- keep a value under a name
- give a variable a new value as things change
- choose names that say what a variable holds

## The request from Dougie

> **Dougie:** Ropes go out on every callout and nobody writes down how many came back. I keep the count on a whiteboard and it gets wiped. Can the laptop keep it? And someone left a file where things are called x and y. I have no idea what they are.

All four tasks are in `kit_store.py`.

## Values

Everything a program works with is a value. In this issue you meet two kinds.

**Text**, which programmers call a string, sits inside quotes: `"Brackenridge"`, `"rope"`, `"Hall open"`. The quotes are not part of the text; they show Python where it starts and ends.

**Whole numbers** are written as they are, with no quotes: `24`, `0`, `1250`. You can do sums with them, like `7 - 2` or `3 + 4`. The next issue goes much further with numbers.

`"24"` with quotes is text that happens to look like a number, and Python will not do sums with it. When you are not sure what kind a value is, ask Python with `type`:

```python
print(type(24))
print(type("24"))
```

This prints `<class 'int'>` and then `<class 'str'>`. `int` is Python's word for a whole number, and `str` its word for text.

## Variables keep a value under a name

A variable is a name that holds a value, so you can use the value later without typing it again:

```python
chairs = 40
print(chairs)
```

Read the first line as "store `40` under the name `chairs`". The `=` here does not mean "equals" as in maths; it means "put the value on the right under the name on the left". When you write the name later, Python uses the value it holds, so the second line prints `40`.

`print` can show several things on one line, separated by commas. Text in quotes is printed as it is, and a variable's name is replaced by its value. `print` puts one space between the things it is given, so you do not add one yourself:

```python
print("Chairs out:", chairs)
```

prints `Chairs out: 40`. If you write `print("Chairs out: ", chairs)`, with a space inside the quotes, you get two spaces.

A variable can also start with the value of another variable:

```python
chairs_out = chairs
```

## Giving a variable a new value

To change what a variable holds, write its name, `=` and the new value. The right side may use the variable's own value from before:

```python
tables = 6
tables = tables - 2
print(tables)
```

The second line reads "take the value `tables` has now, take 2 away, and store the result back in `tables`". It prints `4`. The old value is gone; a variable holds one value at a time.

Python reads `=` and `==` differently. One `=` stores a value. Two, `==`, only compare two values and store nothing, so `tables == tables - 2` leaves `tables` as it was. You will use `==` a few issues from now.

## Good names

Names have a few rules: letters, digits and underscores only, no spaces, and no digit at the start. Capital letters count, so `chairs_left` and `Chairs_left` are two different variables. When a name has several words, Python joins them with underscores, all in small letters: `chairs_left`, `hall_name`, `first_guest_name`.

Beyond the rules, a good name says what the variable holds. `x` tells the next reader nothing; `chairs_left` tells them everything. Code is read far more often than it is written, so names are worth a few extra letters.

When you rename a variable, rename it everywhere it is used. If you miss one, Python stops at that line:

```
Traceback (most recent call last):
  File "/Users/you/workspace/hall.py", line 3, in <module>
    print("Chairs left:", chairs_left)
NameError: name 'chairs_left' is not defined
```

The lines above it have already run and printed. Read it from the bottom: a `NameError` names the variable Python does not know, and the line above it is a copy of the line that uses it, line 3. Newer versions of Python also draw `^` marks under the name and may suggest a name you meant. Either the name is spelt differently from where it was made, or no line made it at all.

## Your work in this issue

Open `kit_store.py`. Near the top, under "Tonight's count", are two variables the team gives you: how many ropes are in the store and how many went out. Check runs your file with other numbers in their place, so build on those names rather than on the numbers. Do the tasks in order under their `# Task` comments, and run `python3 kit_store.py` after each one to see the count change.
