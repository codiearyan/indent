# Enums and records: kinds of ticket

## What you will be able to do

The hut sells three kinds of ticket now: adult, child and bike. The programs pass the kind around as text, and text can be written any way at all: last week a ticket marked `Adult`, with a capital A, matched none of the checks and was sold at the child's price. Java has a type for a fixed set of values, which the compiler checks, and another for a value that is made once and never changes. By the end of this issue you will be able to:

- write an enum for a fixed set of values, and a `switch` over it
- give each value of an enum a number of its own, with a constructor and a method
- write a record, and say what Java writes in it for you
- choose between a record and a class

## The request from Bridie

> **Bridie:** A ticket said Adult with a capital A, the program did not know it, and charged a child's fare. I want the kinds of ticket fixed, so a wrong one cannot be typed. And while you are at it: each route's crossing time, kept with the route, and tickets that nobody can change after they are printed.

All three tasks are in `TicketKinds.java`.

## A fixed set of values: enum

At the market, jars come in three sizes. An enum lists them, and they are the only values its type can ever have:

```java
enum Size {
    SMALL, MEDIUM, LARGE
}
```

You write a value as `Size.MEDIUM`. Spell it wrong and the program does not compile, so a size can never be a typo found next week. Values are compared with `==`, which is right here, because each value exists exactly once. `Size.values()` gives them all, in order, and `Size.valueOf("LARGE")` finds one by its name when it comes in as text.

Every value also has `name()`, its name as text, and `ordinal()`, its position from 0. Do not build on either. Comparing `size.name().equals("LARGE")` brings back every danger of text, and a price worked out from `ordinal()` changes the day someone adds a size in the middle.

## A switch over an enum

A `switch` picks a branch by value. Over an enum, each case names a value alone:

```java
static int jarPence(Size size) {
    switch (size) {
        case SMALL:
            return 250;
        case MEDIUM:
            return 400;
        default:
            return 550;
    }
}
```

Write `case Size.SMALL:` and Java 17, which Check uses, says `an enum switch case label must be the unqualified name of an enumeration constant`. Java 21 and newer accept it, so your terminal may say nothing, but Check refuses it. With colons, a case that matches runs on into the cases below it until a `return` or a `break`; forgetting a `break` is a classic slip. A `switch` with arrows never runs on, and it can give back a value directly:

```java
return switch (size) {
    case SMALL -> 250;
    case MEDIUM -> 400;
    case LARGE -> 550;
};
```

That form has one more guard. Leave a value out and it does not compile: `the switch expression does not cover all possible input values`. A `switch` with colons and no `default` says nothing, and quietly does nothing for the value it missed. That is also why a method whose `switch` with colons has a `return` in a case for every value still brings `missing return statement`: Java does not count the values for you, so it needs a `default`, or a `return` after the `switch`.

## An enum that carries a value

Better still, keep each size's number with the size itself. Each value of an enum is an object, made once, by the enum's own constructor, with what is in its brackets:

```java
enum Size {
    SMALL(250), MEDIUM(400), LARGE(550);

    private final int grams;

    Size(int grams) {
        this.grams = grams;
    }

    int grams() {
        return grams;
    }
}
```

The list of values ends with a semicolon, then come the field, the constructor and the methods, as in any class. Each value has its own `grams`, so `Size.LARGE.grams()` is 550. The field must not be `static`: the values are made before the static fields are ready, and the compiler says `illegal reference to static field from initializer`. Add a size and its number goes in the same place, and nothing else needs to change.

## A value that never changes: record

Some things are only their values: a sale of one item at one price, once it has happened, never changes. A record says so in one line:

```java
record Sale(String item, int pence) {
}
```

Java writes the rest for you: a `private final` field for each part, a constructor taking them in that order, a method to read each one (`sale.item()`, `sale.pence()`, without `get`), and `equals`, `hashCode` and `toString` from all the parts. Printing one shows `Sale[item=jam, pence=400]`. You may add methods of your own inside the braces.

Every field is final, so a record can never change. A method that tries brings `cannot assign a value to final variable pence`. To get a sale at another price, make a new one: `new Sale(sale.item(), 350)`.

## Record or class

Use a record for a value that is made and never changed: a sale, a ticket once printed, a date. Use a class for a thing whose state changes over time: a boat whose passengers board and land, a stall whose stock goes down. Those need fields that change, and a record has none.

## Your work in this issue

Open `TicketKinds.java`. `main` is yours: take the `//` off a line once what it uses is written. Write each task under its own `// Task` comment. Check judges Task 3 beside a `Kind` of its own, with the values Task 1 asks for, so it passes on its own lines. Run the file with `java TicketKinds.java`.
