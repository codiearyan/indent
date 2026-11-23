# Numbers and their traps

## What you will be able to do

The program keeps the seats count now, and Bridie has started bringing you the harder numbers: what a return ticket costs, how many trips a long queue needs, the average crossing, the ticket numbers. Java does sums well, but it has a few habits that surprise everyone the first time: dividing two whole numbers throws the rest away, and a number that grows too big wraps around without a word. By the end of this issue you will be able to:

- do sums with `+`, `-`, `*`, `/` and `%`, in the right order
- choose between `int` and `double`, and turn one into the other
- spot integer division and overflow before they cost you
- tell an error at run time from one the compiler gives

## The request from Bridie

> **Bridie:** On busy mornings the queue goes right along the quay, and I need to tell people how many trips it will take. Ossian wants the average crossing for his log, and his calculator says something different from the clipboard. And the new ticket numbers come out of the printer wrong.

All four tasks are in `Fares.java`.

## Sums and their order

Java does arithmetic with `+`, `-`, `*` for times and `/` for divide. It multiplies and divides before it adds and subtracts, as in maths, and brackets change that:

```java
int boxes = 3 + 2 * 4;      // 11
int crates = (3 + 2) * 4;   // 20
```

That is why money in this repo is counted in whole pence as an `int`: `320` pence is a fare, and sums on whole numbers come out exact.

## Dividing whole numbers

Here is the first trap. When both sides of `/` are `int`s, Java gives an `int`: the whole number of times, with the rest dropped. Not rounded, dropped:

```java
int rolls = 20;
int perBox = 6;
int fullBoxes = rolls / perBox;   // 3, not 3.33
int spare = rolls % perBox;       // 2
```

`%` gives what is left after the division, so together they answer "how many full boxes, and how many left over". That is often exactly what you want.

When it is not, a `double` on the left does not help. In `double share = rolls / perBox;` the division happens first, between two `int`s, and gives `3`. Only then is it stored, as `3.0`. The part after the point was gone before the `double` ever saw it.

## int, double and casts

To divide with decimals, at least one side must be a `double` before the division. A cast does that: the type in brackets in front of a value turns the value into that type.

```java
double share = (double) rolls / perBox;   // 3.3333333333333335
```

The cast applies to `rolls` only, and that is enough: once one side is a `double`, Java divides with decimals. `(double) (rolls / perBox)` is too late: the brackets divide first, as `int`s, and the cast gets `3`.

A cast the other way, `(int) 3.9`, drops the part after the point and gives `3`. Java never does that by itself, which is why `int pieces = 2.5;` is refused with `possible lossy conversion from double to int`.

## How big an int can get

An `int` holds whole numbers up to 2147483647, a little over two thousand million. One more and it does not stop or complain: it wraps around to the most negative `int`.

```java
int big = 2147483647;
big = big + 1;
System.out.println(big);   // -2147483648
```

That is overflow. For bigger numbers there is `long`, which holds up to about nine million million million. A whole number written in the code is an `int` unless it ends in `L`: `5000000000L` is a `long`, and `5000000000` without the L is refused with `integer number too large`.

The same habit as division applies. In `long total = 70000 * 70000;` the multiplication happens first, between two `int`s, and overflows; only the wrong answer reaches the `long`. Make one side a `long` first, with `70000L` or `(long)`, and the whole sum is worked out in `long`.

## Errors at run time

Some mistakes the compiler cannot see, because they depend on the values. Divide an `int` by zero and the program compiles, starts, and stops at that line:

```
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at Bakery.main(Bakery.java:7)
```

This is an exception, and what it prints is a stack trace. It looks different from a compiler error on purpose. A compiler error starts with the file name and `error:`, and nothing runs at all. An exception starts with `Exception in thread "main"`, and everything printed before it did run. Its first line says what went wrong; the line starting with `at` says where: the class, `main`, and the file and line number in brackets.

## Your work in this issue

Open `Fares.java`. Near the top of `main` are today's numbers from the clipboard; Check runs your lines with other numbers in their place, so build on the names. Do the tasks in order under their `// Task` comments. Nothing prints yet: after each task, print your variable with `System.out.println` and run `java Fares.java`, and ask whether the number looks right before you press Check.
