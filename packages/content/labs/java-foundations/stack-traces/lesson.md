# Stack traces: where it broke, where it went wrong

## What you will be able to do

You have met a stack trace already: an array read past its end, a method called on `null`, each with one line starting with `at`. Real programs are methods calling methods, so a real trace has several of those lines, and sometimes a second exception tucked underneath the first. Ossian's evening report stops every night with one, and each time he mends the wrong place. By the end of this issue you will be able to:

- read a stack trace through several calls, from the top down
- find the lines that are yours among the lines that are Java's
- read a `Caused by` part, and say which exception started it all
- tell the line where a program broke from the line where it went wrong, and mend the second

## The request from Ossian

> **Ossian:** The report stopped again, with a whole stack of lines starting with at. I put a fix in the method on the top line, and the next night something else broke. Bridie needs those numbers by the evening boat. Can you find what is really wrong, and leave the rest alone?

All three tasks are in `EveningReport.java`. Each is a small program of a few methods, and in each exactly one method is wrong.

## A trace is the calls still running

When `main` calls `weekly`, and `weekly` calls `average`, Java keeps a pile of the calls that have started and not finished yet: the stack. When an exception stops the program, Java prints that pile, newest call first. Here is a market stall's weekly report:

```
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at Report.average(Market.java:15)
	at Report.weekly(Market.java:11)
	at Market.main(Market.java:4)
```

Read it from the top. The first line says what went wrong. The next line is where Java was when it happened: in `average`, on line 15 of `Market.java`. Each line below is the call that led there: `weekly` called `average` from line 11, and `main` called `weekly` from line 4. The bottom line is where it all started.

So the trace is a path. Going down it, each `at` line answers: who called the one above, and from which line?

## Where it broke is not always where it went wrong

Line 15 divides the week's jars by the days the stall was open:

```java
static int average(int[] sold, int days) {
    return total(sold) / days;
}
```

There is nothing wrong with that line. It does exactly what it says, with the `days` it was handed, and it was handed 0. So the question is not "what is wrong with line 15" but "where did that 0 come from". Go down one line of the trace, to `weekly` on line 11:

```java
int open = daysOpen(sold);
return "Jars a day: " + average(sold, open);
```

`weekly` passed on what `daysOpen` gave it. And `daysOpen` is not in the trace at all: it had already finished and given back its answer, so it was no longer on the stack. A method that makes a bad value and hands it on often leaves no line in the trace. Its comment says it counts the days with at least one jar sold, and its `if` counts the days with none. That is the mistake.

Had you mended `average` instead, with an `if (days == 0)`, the report would stop crashing and quietly print a wrong number. Mending where it broke hides the mistake; mending where it went wrong removes it. Each method in this issue has a comment that says what it should do. A method that does what its comment says, with what it was handed, is right, even if the trace starts there.

## Caused by

Sometimes code catches one exception and throws another in its place, keeping the first inside it. You will write code like that in the next issues. For now, read what it prints:

```
Exception in thread "main" java.lang.IllegalArgumentException: Not a price in pence: 1.20
	at Labels.pence(Prices.java:12)
	at Prices.main(Prices.java:3)
Caused by: java.lang.NumberFormatException: For input string: "1.20"
	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
	at java.base/java.lang.Integer.parseInt(Integer.java:662)
	at java.base/java.lang.Integer.parseInt(Integer.java:778)
	at Labels.pence(Prices.java:10)
	at Prices.main(Prices.java:3)
	at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
	at java.base/java.lang.reflect.Method.invoke(Method.java:580)
	at jdk.compiler/com.sun.tools.javac.launcher.Main.execute(Main.java:484)
	at jdk.compiler/com.sun.tools.javac.launcher.Main.run(Main.java:208)
	at jdk.compiler/com.sun.tools.javac.launcher.Main.main(Main.java:135)
```

The top part is the exception that stopped the program. `Caused by` is the one that started it: `Integer.parseInt` was handed `1.20`, which is not a whole number. The lines that begin with `java.base/` or `jdk.compiler/` are Java's own methods, and they are right. Skip them, and look for the first line that names your file: `Labels.pence`, line 10. The lines below `main` are how Java started your program; they are never yours either.

## Your work in this issue

Open `EveningReport.java` and run it with `java EveningReport.java`. Each line of `main` runs one task's program, and the first one that stops ends the run: put `//` in front of a line to see the next. For each task, read the trace from the top, walk down it, read each method's comment, and ask of each one: did it do what it says with what it was handed? Mend the one that did not, and leave the others exactly as they are. The `Ledger` class above the tasks is right, and stays as it is.
