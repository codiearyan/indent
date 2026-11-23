# Cleaning up: finally and try with resources

## What you will be able to do

Some things a program opens must be closed again, whatever happens: the hut's shutter, the ticket printer, the till. Last Tuesday the printer ran out of paper halfway through the morning, the program stopped, and the shutter stayed up all night with the hut empty. The printer's exception was right to stop the sale. What was wrong is that nothing cleaned up on the way out. By the end of this issue you will be able to:

- clean up in a `finally` block, which runs however the `try` ends
- say why a `return` inside `finally` hides an exception
- open and close a resource with a try with resources, and say what `AutoCloseable` is for
- say what is closed, and in which order, when the body fails

## The request from Bridie

> **Bridie:** I came in on Wednesday and the shutter had been up all night, and the printer was still humming. The program had stopped at the paper. I do not mind it stopping. I mind it leaving the hut open.

All three tasks are in `ClosingUp.java`. The starter gives the shutter, the printer and the till, each as a small class: use them as they are.

## finally

A market stall puts its awning out before it sells and takes it in afterwards. If selling throws, the line that takes the awning in must still run. A line after the `try` does not: an exception leaving the `try` skips everything after it. A `finally` block does:

```java
awning.out();
try {
    sellAll(jars);
} finally {
    awning.in();
}
```

`finally` runs when the `try` finishes normally, when it gives back a value with `return`, and when an exception leaves it. In that last case the exception carries on to the caller as soon as `finally` is done. There is no `catch` here, and none is needed: the stall does not handle the failure, it only tidies up and lets it go on.

## Never return from finally

A `return` inside `finally` replaces whatever the `try` was doing, an exception included:

```java
int jars = 0;
try {
    jars = Integer.parseInt("lots");
    return jars;
} finally {
    return jars;
}
```

This gives back 0, and the `NumberFormatException` vanishes. No message, no trace: the caller believes all went well. Keep `finally` for cleaning up, and give back values from the `try`.

## try with resources

Things that must be closed usually have a method for it called `close()`, and a class that has one can say so by implementing `AutoCloseable`, an interface of Java's with that one method. Then the `try` can close it for you: make it in round brackets after `try`, and Java calls its `close()` on every way out of the block.

```java
static void weigh(int[] grams) {
    try (CashBox box = new CashBox(); Scale scale = new Scale()) {
        for (int g : grams) {
            scale.weigh(g);
        }
    }
}
```

Here the scale refuses a weight below 0, and this is what the program prints:

```
Cash box open
Scale on
Weighed 450 grams
Scale off
Cash box locked
Exception in thread "main" java.lang.IllegalArgumentException: No jar weighs -1 grams
	at Scale.weigh(Stalls.java:33)
	at Stalls.weigh(Stalls.java:9)
	at Stalls.main(Stalls.java:3)
```

Both were closed, each once, and the exception still reached the caller. Resources open in the order they are written and close in the opposite order: the last one opened is the first one closed, as you would put away the scale before you lock the cash box it sits on. If making the second one throws, the first is still closed, and the second, which never existed, is not.

A resource made before the `try` and never named in its brackets is not closed by it. And a `close()` of your own inside the block closes it a second time, because Java closes it again on the way out.

The class you put in the brackets must implement `AutoCloseable`. Anything else is refused with `incompatible types: try-with-resources not applicable to variable type`.

## Which one when

Use a try with resources whenever the thing has a `close()` and implements `AutoCloseable`: it is shorter and cannot forget. Use `finally` for cleaning up that is not a `close()`, such as an awning, or a shutter, that someone handed you. And close only what you opened: a thing you were handed belongs to whoever handed it over.

## Your work in this issue

Open `ClosingUp.java`. Write each class under its own `// Task` comment, and take the `//` off the lines in `main` to try them with `java ClosingUp.java`. The starter's printer holds paper for four tickets: print more and watch what is left open. In every task, an exception still reaches the caller; cleaning up never hides it.
