# Doing it again: loops

## What you will be able to do

Ossian's log runs now, and Bridie has noticed something about every program so far: each line runs once. A ferry day is the same few things again and again: a departure every hour, a count at every crossing, a countdown before every boarding. A loop runs the same lines many times. By the end of this issue you will be able to:

- repeat lines while a condition is true, with `while`
- count through a range of numbers with `for`
- keep a running total that a loop adds to
- leave a loop early with `break`, and stop a program that never ends

## The request from Bridie

> **Bridie:** Ossian made a countdown for the boarding gate, and it has been saying five minutes since breakfast. I also want the day's departures on the board, the passengers added up for the day, and the council wants to know how long until the fare goes up to five pounds. And the printer needs to know where the boat's name ends on a ticket.

All five tasks are in `Timetable.java`.

## while: again, as long as it is true

A `while` loop runs its block, checks its condition, and runs the block again, for as long as the condition is true:

```java
int jars = 3;
while (jars > 0) {
    System.out.println("Jars left: " + jars);
    jars = jars - 1;
}
System.out.println("Shelf empty");
```

That prints three lines for the jars, then `Shelf empty`. Each time round, one line inside the loop changes `jars`, and that is what lets the condition become false in the end. If the condition is false at the start, the block never runs.

`jars = jars - 1` is common enough to have short forms: `jars -= 1`, or `jars--`. In the same way `count++` adds one.

## A loop that never ends

Take out the line that changes `jars` and the condition is true forever. The program prints `Jars left: 3` again and again, as fast as it can, and never reaches `Shelf empty`. Nothing is wrong as far as the compiler can see: whether a loop ends depends on the values.

To stop a program that does not end, click in the terminal and press Ctrl+C. Then look for the loop whose condition nothing inside it changes. Check stops such a program by itself after a few seconds and says so.

## for: counting through a range

When a loop counts, `for` puts the three parts of counting on one line:

```java
for (int row = 1; row <= 4; row++) {
    System.out.println("Planting row " + row);
}
```

Read the brackets as: start with `row` at 1; keep going while `row <= 4`; after each time round, add one. That plants rows 1, 2, 3 and 4. Watch the condition: with `row < 4` the loop stops after row 3. A loop that runs one time too few or too many is the most common loop mistake there is, so check the first and the last time round by hand. `row` exists only inside the loop; after its closing brace it is gone.

## Adding up as you go

To add up over a loop, make the total before the loop, starting at 0, and add to it each time round:

```java
int seedsSown = 0;
for (int row = 1; row <= 4; row++) {
    seedsSown = seedsSown + 12;
}
System.out.println(seedsSown);    // 48
```

The total has to be made outside the loop. Made inside the braces, it would start again at 0 each time round, and after the loop it would not exist at all: using it there gets `cannot find symbol`. A loop can hold an `if`, so each time round can add a different amount.

## Leaving early with break

Sometimes a loop is looking for something, and once it has found it there is no reason to go on. `break` leaves the loop at once, and the program carries on after its closing brace:

```java
int pots = 0;
for (int day = 1; day <= 30; day++) {
    pots = pots + day;
    if (pots >= 40) {
        System.out.println("Shelf full on day " + day);
        break;
    }
}
```

The shelf fills on day 9, and the loop stops there instead of counting to day 30. Without the `break`, it would go on and print a line for every day after that too.

The same goes for walking through a `String` one position at a time. Positions run from 0 to one less than the length, so such a loop keeps going while the position is below `length()`. With `<=` it asks for one position too many, and `charAt` stops the program with a `StringIndexOutOfBoundsException`.

## Your work in this issue

Open `Timetable.java` and run `java Timetable.java`. The countdown in Task 1 will run away at once: press Ctrl+C, and make that your first fix. Then do the other tasks in order under their `// Task` comments. Near the top of `main` are today's numbers; Check runs your lines with other values in their place, so build on the names. Print what you make, and check the first and last time round of every loop by hand.
