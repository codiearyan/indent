# Text in depth: build it, line it up, take it apart

## What you will be able to do

Part 1 joined text with `+`, cut it with `substring` and compared it with `equals`. A board in columns, a text built a row at a time and a reference pasted from an email need more. By the end of this issue you will be able to:

- line values up in columns with `String.format` and its widths
- build a long text with a `StringBuilder`, and say why a `String` cannot be changed
- take text apart with `split`, and tidy it with `strip`, `join` and `repeat`
- compare text whatever its capital letters, and count its characters with `chars`

## The request from Ossian

> **Ossian:** The board at the slip is chalk, and nobody can read my nines. Print it: each boat, the time it leaves, the seats left, in straight columns, and a line under it. And the new tickets have a reference people read out on the phone, LQ dot 2031 dot something. Half of them type it in small letters, and some paste it from an email with odd spaces round it.

All three tasks are in `SlipBoard.java`.

## A String never changes

Every method of a `String` gives back a new one and leaves the old one as it was. So `+` in a long loop is slow: `text += "x"` copies the whole text into a new one each time.

A `StringBuilder` is text that can change. `append` adds to its end, and gives back the same builder, so calls can follow one another:

```java
StringBuilder shelf = new StringBuilder();
for (String flavour : flavours) {
    shelf.append(flavour).append("\n");
}
String text = shelf.toString();
```

A `StringBuilder` is not a `String`. Give one back from a method that promises a `String`, and the compiler says `incompatible types: StringBuilder cannot be converted to String`; `toString()` hands over the text it has built. A method handed a `StringBuilder` can add to the caller's own, as part 6 showed for a list: the builder is one object, whoever holds it.

## Lining up with String.format

`String.format` fills a pattern with values. Each `%` starts a place: `%s` takes text, `%d` a whole number, `%.2f` a number with two decimal places. A number after the `%` is the width of the place, filled with spaces on the left, so the value stands on the right; a `-` in front puts the value on the left; a `0` in front fills a number with zeros:

```java
String.format("%-8s|%6s|%05d", "fig", "plum", 42)    // "fig     |  plum|00042"
```

A value longer than its width is never cut: it pushes the rest of the row along. And remember the money issue: a pattern with `%.2f` follows the computer's language unless it is given one.

`"\n"` ends a line the same way on every computer. `%n` in a pattern and `System.lineSeparator()` end it the way the computer does, which on Windows is `"\r\n"`. When a file or a board says which line end it wants, write that one.

## Taking text apart

`split` cuts a text at each place a pattern matches, and gives back an array. The pattern is not plain text: in it, a point means any character, and `|` means or. So `"fig.plum.quince".split(".")` gives back an empty array, because every character is a place to cut and nothing is left between them, and `"fig|plum".split("|")` cuts between every letter. A backslash in front makes them plain, and in Java text a backslash is written twice: `split("\\.")` gives `[fig, plum, quince]`, and `split("\\|")` gives `[fig, plum]`.

`trim()` takes off the spaces at either end, but only the plain space and the characters below it. Text pasted from an email or a web page can carry other spaces, such as the em space. `strip()` takes off every character Java counts as a space. Give it `" fig "` with em spaces at its ends and `trim()` leaves them, while `strip()` gives back `fig`.

`String.join(" / ", list)` puts text between the items of a list, never at the ends: `fig / plum / quince`. `"=".repeat(5)` gives back `=====`.

## Comparing and counting

`equalsIgnoreCase` compares two texts taking no notice of capital letters: `"Plum".equalsIgnoreCase("PLUM")` is `true`. `==` still asks whether two variables hold the very same object, and still fails on text made while the program runs.

`chars()` gives the characters of a text as a stream of `int`s, the stream of numbers from part 7, so `label.chars().filter(Character::isLetter).count()` counts the letters. `Character` has `isDigit`, `isLetter` and `isWhitespace` for the questions you ask a character.

One honest warning: a `String` counts in units that hold most letters, not in letters themselves. An `é` may be stored as one unit, or as an `e` and an accent mark, and then `length()` says 2. For anything beyond plain Latin letters, test with real names.

## Your work in this issue

Open `SlipBoard.java`. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java SlipBoard.java`. Print a row between brackets to see its spaces. Write each class under its own `// Task` comment. Check hands every method values of its own, hands `addRows` a `StringBuilder` that already holds a line, and runs with the line end of a Windows computer.
