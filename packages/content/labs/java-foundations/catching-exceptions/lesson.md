# Catching an exception: when a line can fail

## What you will be able to do

Ossian's report crashed because of mistakes in the code. Bridie's desk is different: she types seat counts and seat numbers all day, and sometimes a smudge, a word or a stray space gets in. Today one bad entry stops the whole program and the queue waits. A typing slip is not a mistake in the code; it is something that will happen, and the program should answer it. By the end of this issue you will be able to:

- catch an exception with `try` and `catch`, naming the exception you expect
- put the `try` around only the line that can fail
- write more than one `catch`, in an order Java accepts
- read what a caught exception holds, and say why an empty `catch (Exception e)` hides bugs

## The request from Bridie

> **Bridie:** I typed "twelve" in place of 12 and the whole desk stopped. Then I typed a seat that the Gannet does not have, and it stopped again. I am going to make typing slips. The program should not fall over every time I do.

All three tasks are in `HutDesk.java`.

## try and catch

At the market, stallholders write their jar counts on a slate, and the program reads them as text. `Integer.parseInt(text)` gives back the whole number a text holds: `Integer.parseInt("12")` is 12. It takes nothing else, not even spaces: for `" 12 "` you first call `trim()`, which gives back the text without the spaces at either end. Handed `"a dozen"`, `parseInt` throws a `NumberFormatException`, and you have seen what that does to a program. A `try` with a `catch` answers it instead:

```java
static int jars(String counted) {
    try {
        return Integer.parseInt(counted);
    } catch (NumberFormatException e) {
        return -1;
    }
}
```

Java runs the lines inside `try`. If one throws a `NumberFormatException`, the rest of the `try` is skipped and the `catch` block runs; then the method goes on after it, here by giving back -1. If nothing is thrown, the `catch` never runs. `jars("a dozen")` gives back -1, and the program carries on.

The `catch` names the exception it is for, and catches only that kind (and kinds that extend it). Anything else goes on to the caller as if the `try` were not there.

## What a caught exception holds

The `e` in `catch (NumberFormatException e)` is the exception itself, an object like any other. `e.getMessage()` gives back its message, `For input string: "a dozen"`, and printing `e` shows its class and message: `java.lang.NumberFormatException: For input string: "a dozen"`. That message is often worth passing on: it says exactly what went wrong.

## Catch only what you expect, only where you expect it

Some exceptions are a mistake in the code, never a typing slip. Handed `null`, `counted.trim()` throws a `NullPointerException`, and that means some code passed a value it should not have. That one should reach the caller and stop the program, so the mistake is found and mended.

So keep the `try` around only the line that can fail with the exception you expect:

```java
String clean = counted.trim();
try {
    jars = Integer.parseInt(clean);
} catch (NumberFormatException e) {
    jars = -1;
}
```

Now a `null` fails on the first line, outside the `try`, and goes on to the caller. The same thinking decides what happens to the lines after a failure: everything in the `try` after the failing line is skipped, so a `try` around more than it needs skips more than it should.

This is why `catch (Exception e)` with an empty body is the worst line you can write. Every exception extends `Exception`, so it catches the typing slips, and the `null`, and the mistakes in your own lines, and says nothing. The program carries on with a wrong answer, and nobody ever learns why.

## Two catches, and their order

One `try` can have several `catch` blocks, one per kind of exception, and Java uses the first one that fits. A `NumberFormatException` is a kind of `IllegalArgumentException`, because it extends it, so this is refused:

```
Order.java:7: error: exception NumberFormatException has already been caught
        } catch (NumberFormatException e) {
          ^
```

The `catch` for `IllegalArgumentException` above it already catches every `NumberFormatException`, so this one could never run. Put the more particular one first. Two kinds that do not extend each other, such as `NumberFormatException` and `ArrayIndexOutOfBoundsException`, can come in either order.

## A variable set inside try

Here the `catch` prints and carries on:

```
Init.java:9: error: variable jars might not have been initialized
        return jars;
               ^
```

`jars` gets its value inside the `try`. When `parseInt` fails, that line never finishes, so after the `catch` `jars` may have no value at all. Give it one on every way through: in the `catch` too, or where it is made, or give back from inside the `try` and the `catch`.

## Your work in this issue

Open `HutDesk.java`. Write each class under its own `// Task` comment, and take the `//` off the lines in `main` to try them with `java HutDesk.java`. In every task, a slip in what Bridie types gets an answer, and a `null`, which is a mistake in the calling code, reaches the caller.
