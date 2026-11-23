# An exception of your own

## What you will be able to do

Java's own exceptions say what went wrong in Java's words: an index, a number format, a null. Some things that go wrong at the hut have no Java word: a boat with no room left, a line in the ledger that cannot be read. You can make exceptions for those, with the hut's own names, carrying what the caller needs to know. By the end of this issue you will be able to:

- write an exception class that extends `Exception`, with a message
- give it a field the caller can read
- catch it by its own type, and say why a catch for `Exception` cannot read that field
- wrap a low-level exception as the cause of your own, so nothing is lost

## The request from Bridie

> **Bridie:** When the Gannet is full I want the desk to say how many seats are left, not just no. And when a ledger line is smudged, I want to know which line, and what was wrong with it, both.

All three tasks are in `HutRules.java`.

## A class that extends Exception

In issue 23 the starter gave you `CancelledException`. Writing one is writing a class, as in part 4. A jam stall runs out of plum:

```java
class SoldOutException extends Exception {
    private final int jarsLeft;

    SoldOutException(String jam, int jarsLeft) {
        super("Not enough " + jam + " jam: " + jarsLeft + " left");
        this.jarsLeft = jarsLeft;
    }

    int jarsLeft() {
        return jarsLeft;
    }
}
```

`extends Exception` makes it a checked exception, which every caller must plan for; `extends RuntimeException` would make it unchecked, for a mistake in the code. The constructor's first line hands the message to `Exception` with `super(...)`, and that is where `getMessage()` finds it. Forget it, and `getMessage()` gives back `null`. Since `super(...)` must be the very first line, the message is put together inside its round brackets.

The field is the point. The message is for people; the field is for code. A caller that wants to offer the jars that are left should not have to pick a number out of a sentence.

## Catch it by its own name

```java
try {
    order("plum", 3, 5);
} catch (SoldOutException e) {
    System.out.println("Only " + e.jarsLeft());
}
```

A `catch` names the type it holds `e` as. Write `catch (Exception e)` and it still catches the `SoldOutException`, but `e` is only an `Exception` to the compiler, and an `Exception` has no `jarsLeft`:

```
Shop.java:6: error: cannot find symbol
            System.out.println("Only " + e.jarsLeft());
                                          ^
  symbol:   method jarsLeft()
  location: variable e of type Exception
```

It would also catch every other exception the `try` can throw, mistakes included. Catching by the exact type gives you its methods and leaves everything else alone.

## Keep the cause

Labels at the stall look like `plum:400`, and `label.split(":")` cuts one at each colon into an array of the pieces, here `plum` and `400`. When a label cannot be read, `parseInt` throws a `NumberFormatException` with the exact text it choked on. Throwing your own exception in its place is better for the caller, as long as you keep the first one inside it as its cause:

```java
class BadLabelException extends Exception {
    BadLabelException(String label, Throwable cause) {
        super("Cannot read the label " + label, cause);
    }
}
```

`Exception` has a constructor that takes a message and a cause; `getCause()` gives the cause back. Then the method that reads labels catches the low-level exception and throws its own, handing the first one over:

```java
} catch (NumberFormatException e) {
    throw new BadLabelException(label, e);
}
```

Run with `javac`, then `java Labels`, the trace has both, as in issue 21:

```
Exception in thread "main" BadLabelException: Cannot read the label plum:four
	at Labels.pence(Labels.java:11)
	at Labels.main(Labels.java:3)
Caused by: java.lang.NumberFormatException: For input string: "four"
	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
	at java.base/java.lang.Integer.parseInt(Integer.java:662)
	at java.base/java.lang.Integer.parseInt(Integer.java:778)
	at Labels.pence(Labels.java:9)
	... 1 more
```

`... 1 more` means the rest of that path is the same as the lines above it. Drop the cause, with `super(message)` alone, and `Caused by` disappears: the caller learns that a label was bad, but never why. Two `catch` blocks that do the same work can be joined into one with a bar between the types: `catch (NumberFormatException | ArrayIndexOutOfBoundsException e)`.

Wrap only what your method is about. A `null` handed in is still a mistake in the calling code, not a bad label, and it should reach the caller as the `NullPointerException` it is.

## Your work in this issue

Open `HutRules.java`. Write each class under its own `// Task` comment, and take the `//` off the lines in `main` to try them with `java HutRules.java`. Check judges Task 2 beside a `NoRoomException` of its own, written as Task 1 asks but with words of its own, so it passes on its own lines.
