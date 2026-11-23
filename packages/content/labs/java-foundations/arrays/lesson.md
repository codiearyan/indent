# Arrays: a whole day in one variable

## What you will be able to do

The fare rules are methods now, written once. Ossian wants his log next. Every crossing he writes down how many people it carried, and by evening there are a dozen numbers. A variable for each, `crossing1`, `crossing2` and on, would never work: tomorrow has a different number of crossings. An array holds a whole row of values of one type under one name. By the end of this issue you will be able to:

- make an array, with its values or with a size
- read and change a value by its position, starting at 0
- use `length`, and loop over every value of an array
- pass arrays to methods and give them back, and read the error for going past the end

## The request from Ossian

> **Ossian:** My log is one long row of numbers, one for each crossing. Bridie wants the last one when I tie up, the day's total for the council, and which crossing was the busiest, so she can move the tea urn. And I need a list of tomorrow's departure hours to pin on the boat.

All four tasks are in `Crossings.java`.

## Making an array

An array has a type with square brackets: `int[]` is an array of `int`s, `String[]` an array of `String`s. When you know the values, write them in braces:

```java
int[] eggs = {6, 4, 12, 9};
String[] hens = {"Hazel", "Pip", "Moss"};
```

When you know only how many there will be, make it with `new` and a size:

```java
int[] tomorrow = new int[7];
```

That is seven places, each starting at 0 (a `String[]` starts with `null` in each place). An array's size is fixed once it is made: it cannot grow or shrink. The next issue meets something that can.

## Reading and changing by position

Each place has a position, its index, and the first is 0, as with the characters of a `String`. Square brackets after the name pick a place:

```java
int first = eggs[0];      // 6
eggs[2] = 11;             // the third place now holds 11
```

`eggs.length` is how many places there are, 4 here. Note: no round brackets. For a `String` it is `length()`, a method; for an array it is `length`, written without them. Mix them up and the compiler says `cannot find symbol`.

The positions of `eggs` are 0, 1, 2 and 3. There is no position 4, even though the length is 4. Ask for it and the program compiles, starts, and stops:

```
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4
	at Henhouse.main(Henhouse.java:6)
```

Read the first line to the end: it says which position was asked for and how long the array is. The line starting with `at` says where.

## Looping over an array

To do something with every value, loop over the positions:

```java
for (int i = 0; i < eggs.length; i++) {
    System.out.println("Box " + i + ": " + eggs[i]);
}
```

`i` starts at 0 and goes up to `eggs.length - 1`. The condition is `<`, not `<=`: with `<=` the last time round asks for position `length`, and the program stops with the exception above. Writing `eggs.length` instead of a typed number makes the loop right for an array of any length.

When you only need the values, not their positions, the for-each loop is shorter. Read it as "for each `int` called `box` in `eggs`":

```java
for (int box : eggs) {
    System.out.println(box);
}
```

## Arrays and methods

A method can take an array, and give one back. The type is written with its brackets, as anywhere else:

```java
static int smallest(int[] boxes) { ... }
static int[] emptyShelf(int places) {
    return new int[places];
}
```

Passing an array to a method passes the array itself, not a copy of all its values, so a method that changes a place changes it for the caller too. The methods in this issue only read the arrays they are given, or make new ones.

## Your work in this issue

Open `Crossings.java`. `main` holds today's log and is yours to try things in: take the `//` off its lines as you write each method. Each method goes under its own `// Task` comment below `main`. Check calls your methods with arrays of its own, of different lengths, an empty one included where the task allows it, so build on the array you are given and its `length`, never on today's numbers.
