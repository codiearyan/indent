# Lambdas: a rule in one line

## What you will be able to do

In part 6 every order was a small class: `MostSeatsFirst`, five lines and a name, for one rule. Java can say the same rule in one line, where it is used, with a lambda. This part is about handing rules around as values, and lambdas are where it starts. By the end of this issue you will be able to:

- turn a small class into an anonymous class, and then into a lambda
- say what a functional interface is, and write one
- write a lambda that reads a variable, and say why that variable may not change
- build an order with `Comparator.comparing` and `thenComparing`

## The request from Bridie

> **Bridie:** The noticeboard file has a class for every order now, and every new order is another class at the bottom. And at the window I need to know which boats have room for the family in front of me, and the family is a different size every time.

All three tasks are in `BoardOrders.java`.

## From a class to a lambda

Here is part 6's way, a jar order from the market:

```java
class ByFlavour implements Comparator<Jar> {
    @Override
    public int compare(Jar a, Jar b) {
        return a.flavour().compareTo(b.flavour());
    }
}
```

The class has a name only so that `new ByFlavour()` can make one. Java lets you write the class right where its object is needed, with no name, as an anonymous class:

```java
jars.sort(new Comparator<Jar>() {
    @Override
    public int compare(Jar a, Jar b) {
        return a.flavour().compareTo(b.flavour());
    }
});
```

Most of that is still ceremony. `Comparator` has only one method to write, so Java already knows which method you mean and what it takes. A lambda keeps only what is new: the parameters, an arrow, and what comes back.

```java
jars.sort((a, b) -> a.flavour().compareTo(b.flavour()));
```

A lambda is an object like any other: you can keep it in a variable, `Comparator<Jar> byFlavour = (a, b) -> ...;`, or give it back from a method whose type is `Comparator<Jar>`.

## Functional interfaces

A lambda can stand only for a functional interface: an interface with exactly one abstract method. `Comparator` is one. So is any interface of your own with one method:

```java
@FunctionalInterface
interface Scale {
    boolean heavy(Jar j);
}
```

Now `Scale big = j -> j.grams() > 400;` works, and `big.heavy(plum)` runs the lambda. With one parameter the round brackets may go. `@FunctionalInterface` is optional: it asks the compiler to make sure there is exactly one abstract method. Give `Scale` a second one, and the lambda line is refused with `incompatible types: Scale is not a functional interface`, or the annotation with `Unexpected @FunctionalInterface annotation`.

A lambda's body is one expression, and its value is what comes back. A body in braces is like a method's, and needs `return`:

```java
Comparator<Jar> lightFirst = (a, b) -> { Integer.compare(a.grams(), b.grams()); };
```

That is refused, with something like `incompatible types: bad return type in lambda expression` and, on the next line, `missing return value`. Put `return` inside the braces, or drop the braces.

## A lambda that reads a variable

A lambda may read a local variable, or a parameter, of the method it is written in:

```java
static Scale heavierThan(int grams) {
    return j -> j.grams() > grams;
}
```

Each `Scale` that `heavierThan` gives back keeps its own `grams`, long after the method has ended: `heavierThan(400)` and `heavierThan(100)` are two different rules. That works only because `grams` never changes. Change it anywhere in the method, before the lambda, after it or inside it, and the compiler refuses: `local variables referenced from a lambda expression must be final or effectively final`. Effectively final means given its value once and never again. A count that a lambda adds to cannot be such a variable; the next issues show better ways to count.

## comparing and thenComparing

`Comparator.comparing` builds a comparator from a lambda that picks what to compare, and `thenComparing` adds a rule used only when the first one says 0:

```java
Comparator<Jar> heaviestFirst = Comparator.comparing((Jar j) -> j.grams())
    .reversed()
    .thenComparing(j -> j.flavour());
```

Two things to see. First, `(Jar j)`: at the start of a chain, nothing tells the first lambda what it is handed, so Java takes it to be an `Object`, and `j.grams()` fails with `cannot find symbol` and `location: variable j of type Object`. Naming the type fixes that; the next lambdas in the chain know it. Second, `reversed()` turns round the whole comparator it is called on. Here it comes before `thenComparing`, so only the weight is turned round. Called at the very end, it would turn the flavours round too. To turn round only a later rule, hand `thenComparing` a comparator that already runs the other way.

## Your work in this issue

Open `BoardOrders.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Departure` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Check compares pairs of its own both ways round and sorts lists of its own, asks the functions you give back about its own departures, and looks at whether a lambda came back where the task asks for one. Run the file with `java BoardOrders.java`.
