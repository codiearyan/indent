# Order: Comparable and Comparator

## What you will be able to do

Text and numbers already know their order: Java can sort a list of names or a list of ages with no help. A ticket or a departure does not. Which comes first, and by what? You decide, by writing it down in a way the sorting code understands. By the end of this issue you will be able to:

- give a class of your own a natural order with `Comparable` and `compareTo`
- sort a list with `Collections.sort` and `list.sort`
- write a `Comparator` class for another order, with a second rule for ties
- say what `compareTo` and `compare` must give back, and the traps in getting there

## The request from Bridie

> **Bridie:** The new ticket roll prints long serial numbers, and I want the tickets in the stub book in serial order. The noticeboard should show the departures with most seats free at the top. And the desk wants a list without the full ones.

All three tasks are in `Noticeboard.java`.

## What compareTo gives back

Sorting needs one question answered again and again: of these two, which comes first? `compareTo` answers it with a number. `a.compareTo(b)` gives back a number below 0 when `a` comes first, 0 when the two are level, and a number above 0 when `a` comes second. Only the sign counts. `"fig".compareTo("plum")` is -10, and `Integer.compare(3, 9)` is -1: both mean "first".

A class gets a natural order by implementing `Comparable` with its own type in angle brackets, and writing `compareTo`:

```java
record Jar(String flavour, int grams) implements Comparable<Jar> {
    @Override
    public int compareTo(Jar other) {
        return Integer.compare(grams, other.grams);
    }
}
```

Now `Collections.sort(jars)` sorts a list of jars lightest first, and so does `jars.sort(null)`: no comparator means the natural order. A `TreeSet` and a `TreeMap` of jars work too.

Sort things that have no natural order and Java stops you. `Collections.sort` on a list of a class without `Comparable` does not compile, with `no suitable method found for sort(List<Stall>)`. `list.sort(null)` compiles and stops the program: `java.lang.ClassCastException: class Stall cannot be cast to class java.lang.Comparable`.

## Three traps

**Only two answers.** `return grams > other.grams ? 1 : 0;` never says "first". Sorting needs all three answers, and 0 only when the two are truly level.

**Subtraction.** `return grams - other.grams;` looks neat, and works while the numbers are small. Far apart, the difference no longer fits in an `int` and wraps round, as part 1 showed: `2_000_000_000 - (-2_000_000_000)` comes out as `-294967296`, with the wrong sign. With `long` values, `(int) (a - b)` keeps only part of the number and is wrong the same way. `Integer.compare` and `Long.compare` never overflow.

**Text that holds numbers.** Compare `"10"` with `"9"` and `"10"` comes first, because 1 comes before 9. Numbers kept as text sort as text: compare them as numbers.

## Ties, and agreeing with equals

Two jars of 450 grams compare as 0, so the sort may put plum or rhubarb first. When the order of ties matters, add a second rule, used only when the first says 0:

```java
int byWeight = Integer.compare(grams, other.grams);
if (byWeight != 0) {
    return byWeight;
}
return flavour.compareTo(other.flavour);
```

That also makes `compareTo` give 0 only for jars that are equal. A natural order that calls two different things level disagrees with `equals`, and a `TreeSet`, which uses `compareTo`, would keep only one of them.

## A Comparator for another order

A class has one natural order. For any other, write a `Comparator`: a small class that implements `Comparator` with the type it compares, and writes `compare`, which takes both things:

```java
class ByFlavour implements Comparator<Jar> {
    @Override
    public int compare(Jar a, Jar b) {
        return a.flavour().compareTo(b.flavour());
    }
}
```

`compare(a, b)` follows the same rules as `a.compareTo(b)`. Hand an object of it to the sort: `jars.sort(new ByFlavour())`, or `Collections.sort(jars, new ByFlavour())`. To put the largest first, compare the other way round, `b` with `a`.

Sorting changes the list it is called on. A method that must leave its caller's list alone copies it into a new list and sorts that.

## Your work in this issue

Open `Noticeboard.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Departure` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Check compares pairs of its own both ways round, and sorts lists whose right order differs from every near miss. It judges Task 3 beside its own right `Ticket` and `MostSeatsFirst`, so Task 3 passes on its own lines. Run the file with `java Noticeboard.java`.
