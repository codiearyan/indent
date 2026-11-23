# Interfaces: more than boats to book

## What you will be able to do

The hut sells more than crossings now. Families hire bikes from the shed by the quay and take the harbour tour bus, and Bridie books it all at the same window. A bike shed is not a boat, and a bus is not either, so neither can extend `Vessel`. What they share is not what they are but what they can do: each can be booked. Java has a way to name an ability like that and let very different classes have it. By the end of this issue you will be able to:

- write an interface, a list of methods with no bodies
- write a class that implements one interface, and one that implements two
- write a method that asks only for an interface, and works for every class that has it
- say when an interface fits better than a parent class

## The request from Bridie

> **Bridie:** Peigi wants the boat over for four, four bikes from the shed and four seats on the tour bus. If any of it is full I sell her none of it, or she ends up on the island with no bikes. The booking program only knows boats.

All three tasks are in `Reservations.java`. `Departing` is given above them, and stays as it is.

## An interface names what a thing can do

At the market, a jar of jam, a bag of apples and a rented pitch have little in common, but each has a price. An interface says so:

```java
interface Priced {
    int pricePence();
}
```

An interface has methods with a first line and no body, like abstract methods. It has no fields to keep and no constructor, and it is never made by itself: `new Priced()` brings `Priced is abstract; cannot be instantiated`. Give one of its methods a body and the compiler says `interface abstract methods cannot have body`.

A class takes it on with `implements`, and then writes every method of the interface:

```java
class Pitch implements Priced {
    private int days;

    Pitch(int days) {
        this.days = days;
    }

    @Override
    public int pricePence() {
        return days * 500;
    }
}
```

Every method of an interface is public, even with no word in front, so the class must write it with `public`. Leave that out and you meet `attempting to assign weaker access privileges; was public`. Leave a method out altogether and the message is the one from abstract classes: `Pitch is not abstract and does not override abstract method pricePence() in Priced`.

## The class decides it, in its first line

Writing the right methods is not enough. A class that has a `pricePence()` but never says `implements Priced` is not a `Priced`, and `Priced p = new Pitch(3);` is refused with `incompatible types: Pitch cannot be converted to Priced`. Java goes by what the class says it is, not by what methods happen to match.

## One class, two interfaces

A class has one parent at most, but it can implement as many interfaces as fit it. A jar of jam has a price and a weight:

```java
interface Weighed {
    int grams();
}

class Jar implements Priced, Weighed {
    ...
}
```

A `Jar` then writes the methods of both, and fits wherever either is asked for: `Priced p = jar;` and `Weighed w = jar;` both compile. A class can also extend one class and implement interfaces at once: `class Stall extends Pitch implements Weighed`, the parent first.

`extends` and `implements` are not the same word for nothing. `extends` takes a class and `implements` takes interfaces, and mixing them up brings `no interface expected here` or `interface expected here`.

## A method that asks only for the ability

The point of an interface is the code that uses it. This adds up a basket at the market:

```java
static int total(ArrayList<Priced> basket) {
    int sum = 0;
    for (Priced item : basket) {
        sum += item.pricePence();
    }
    return sum;
}
```

It asks for nothing but a price. Jars, pitches and anything written next year that implements `Priced` can go in the basket, and `total` never changes. Through a `Priced` variable you can call only what `Priced` names: `item.grams()` does not compile there, even when the item is a jar.

## A parent class or an interface

Use a parent class when the children are kinds of one thing and share fields and code: every vessel has a name and a fare line. Use an interface when unrelated things share an ability: a pitch and a jar are not kinds of anything together, but both have a price. A parent can be only one; interfaces can be many.

## Your work in this issue

Open `Reservations.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each task under its own `// Task` comment, below `Departing`. Check judges Tasks 2 and 3 beside a `Bookable` of its own, written as Task 1 asks, and in Task 3 it hands your method bookable things of its own that you have never seen. Run the file with `java Reservations.java`.
