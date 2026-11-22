# True, False and None

## What you will be able to do

Ailsa likes the new log lines. On Sunday morning the pager goes off again, and before the team leaves the base someone always runs down the same checklist: enough crew, radio on the team channel, stretcher packed. Ailsa wants the laptop to answer those questions with a plain yes or no. By the end of this issue you will be able to:

- compare two values and keep the answer, `True` or `False`
- tell `=` from `==`
- join answers with `and`, `or` and `not`
- use `None` for a value nobody has given yet, and ask about it

## The request from Ailsa

> **Ailsa:** Before the vehicle leaves I shout three questions across the base and somebody shouts back. Last month nobody heard that the radio was on the wrong channel. Can the laptop just say whether we are ready? And the log has a gap for the casualty's name, which we usually do not know when we set off.

All four tasks are in `ready_to_go.py`.

## True and False

Some questions have only two answers. Python has a kind of value for them, written `True` and `False`, always with a capital letter. Without it, `true` is just a name Python does not know, and you get a `NameError`. These two values are called booleans, and their type is `bool`.

You rarely type `True` or `False` yourself. You get them by comparing:

| Comparison | Means                       | Example   | Result  |
| ---------- | --------------------------- | --------- | ------- |
| `==`       | the same as                 | `3 == 3`  | `True`  |
| `!=`       | not the same as             | `2 != 2`  | `False` |
| `<`        | smaller than                | `2 < 5`   | `True`  |
| `>`        | bigger than                 | `2 > 5`   | `False` |
| `<=`       | smaller than or the same as | `5 <= 5`  | `True`  |
| `>=`       | bigger than or the same as  | `4 >= 6`  | `False` |

A comparison is a value like any other, so you can store it:

```python
chairs = 40
enough_chairs = chairs >= 30
print(enough_chairs)
```

This prints `True`. Text compares too, letter for letter: `"Hall" == "hall"` is `False`. And a number is never the same as text that looks like it: `"6" == 6` is `False`.

## = and == are different

One `=` stores a value under a name. Two, `==`, ask whether two values are the same and store nothing. The line

```python
same_room = room == booked_room
```

reads "ask whether `room` is the same as `booked_room`, and store the answer, True or False, in `same_room`". Swap the `==` for `=` and Python does something else entirely: it stores the value of `booked_room` in both `room` and `same_room`, and asks nothing. No error tells you so. If a variable that should hold True or False holds a number or some text, look for a missing `=`.

## and, or, not

Answers can be joined:

- `a and b` is `True` only when both are `True`.
- `a or b` is `True` when at least one is `True`.
- `not a` turns an answer round: `not True` is `False`.

```python
hall_booked = True
keys_collected = False
can_open = hall_booked and keys_collected
print(can_open)
```

This prints `False`: the hall is booked, but nobody has the keys. You can join more than two with the same word, `a and b and c`, and brackets work as they do in sums when you mix `and` with `or`.

## None means nothing yet

Sometimes a value is not known yet. Python has a value for that: `None`, with a capital N and no quotes. Its type is `NoneType`, and there is only one `None`.

```python
key_holder = None
```

says "there is a key holder, and we do not know who yet". `None` is not the text `"None"`, not zero and not an empty text.

To ask whether a variable holds `None`, Python uses `is`, and `is not` for the opposite:

```python
print(key_holder is None)
print(key_holder is not None)
```

These print `True` and then `False`. `==` also works, but `is` is the way Python code asks about `None`.

You will also meet `None` by accident. Some things give back nothing, and then you get `None`. `print` is one of them: it shows a line and gives back `None`. So `result = print("Hall open")` prints the line and leaves `result` holding `None`. When a variable turns out to be `None` and you did not expect it, look at the line that should have given it a value.

## Your work in this issue

Open `ready_to_go.py`. Near the top is the team as it stands tonight: how many crew are ready and how many are needed, the radio's channel and the team's, whether the stretcher is packed, and the casualty's name, which is `None` for now. Check runs your file with other values in their place, so build on those names. Do the four tasks in order under their `# Task` comments, and run `python3 ready_to_go.py` after each. Then change a value at the top and run it again, to see the answers change.
