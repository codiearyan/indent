# Clean up, whatever happens

## What you will be able to do

Some work leaves things changed while it runs: a radio tuned away from the team's channel, a file open, a log half rewritten. When the work ends well, you put things back at the end. When it stops with an error halfway, the end never comes. In this issue you make the putting back happen either way, and let the error carry on. By the end of it you will be able to:

- put things back in a `finally` block, which runs whatever happens
- say what `with` does for a file when a line inside it stops
- keep a file whole when the work of writing it fails halfway
- tell cleaning up from catching: the error still reaches the caller

## The request from Ailsa

> **Ailsa:** Last night the laptop scanned the channels, stopped with an error on a dead one, and left the radio there. We sat on a silent channel for an hour. And when the log writer stops halfway, the log is half gone. Whatever goes wrong, put the radio back and leave the log whole.

All three tasks are in `radio_desk.py`.

## Finally

A `try` can have a `finally` block. Its lines run after the `try`, whether the `try` ended well or stopped with an error:

```python
def make_tea(urn, cups):
    urn["on"] = True
    try:
        for cup in range(cups):
            if urn["water"] < 1:
                raise ValueError("the urn is empty")
            urn["water"] = urn["water"] - 1
    finally:
        urn["on"] = False
```

Asked for five cups from three cups of water, `make_tea` raises, and the urn is still switched off. Then the error carries on to the caller as if the `finally` were not there: `finally` puts things back, it does not catch. Without it, a line after the loop that switches the urn off would never run, because Python leaves the function at the line that raised.

Keep what you need to put back before you change it, then change it inside the `try`.

Two ways to throw the error away by mistake: an `except` that does not raise again, and a `return` inside `finally`. A `return` there ends the function normally and the error is lost, so the caller never hears of it. Newer versions of Python warn about a `return` in a `finally` block; Python 3.9 says nothing.

## With, when something fails

A file needs putting back too: it must be closed. Opened with `open` and closed with `close()` at the end, a file is never closed when a line before `close()` stops. A file left open may not hold what was written to it yet, and on Windows other programs cannot move or delete it.

That is what the `with` line has done for you since the files issue. A file opened on a `with` line is closed as soon as the lines moved in under it end, also when one of them stops with an error, and then the error carries on. It is a `try` and a `finally` that closes the file, written for you.

## A partly written file

Closing a file does not make it whole. Opening it with `"w"` empties it at once, so this loses the old notices the moment it starts:

```python
with open("notices.txt", "w", encoding="utf-8") as notices:
    for notice in new_notices:
        notices.write(notice_line(notice))
```

If `notice_line` stops on the third notice, the file is closed, and it holds two new notices and none of the old ones. Nobody can tell from the file that anything went wrong.

The cure is to do everything that can fail before the file is touched: make every line first, into a list, and only then open the file and write them. If a line fails, the function stops before `open`, and the file is exactly as it was. When there was no file before, there is still none.

## Your work in this issue

Open `radio_desk.py`. `listen` and `entry_line` are given, and Check gives your file its own copies of them. Run `python3 radio_desk.py` after each task, and try each function with a value that makes it stop, inside a `try`, to see what is left afterwards: the channel the radio is on, and what `tonight.txt` and `saved.txt` hold.
