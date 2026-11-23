# Inheritance: boats of a new kind

## What you will be able to do

Lanternquay has more than two boats now, and they are not all the same. One carries bikes, one runs late at night with its own fares, and one is hired out whole. Each is still a boat, with a name and seats and everything `Boat` already does, and each has something more or something different. Writing three copies of `Boat` would mean three places to fix every mistake. Java lets a class start from another one and add to it. By the end of this issue you will be able to:

- write a class that extends another, and say what it gets and what it adds
- start a child's constructor by running the parent's with `super(...)`
- override a method, so the child's version runs, and mark it with `@Override`
- call the parent's version of a method from the child with `super.`

## The request from Ossian

> **Ossian:** The council's cycle path ends at our quay now, so the Cormorant carries bikes. From June the Shearwater runs a late crossing with a night fare, and the Petrel is hired out whole for trips. They are all boats. I do not want three copies of Boat to keep in step.

All three tasks are in `BoatKinds.java`. `Boat` is given above them, and stays as it is.

## A class that extends another

At the market, a food stall is a stall with one thing more: a hygiene rating. `extends` says so:

```java
class FoodStall extends Stall {
    private int rating;

    int getRating() {
        return rating;
    }
}
```

`Stall` is the parent and `FoodStall` the child. The child gets every field and method of the parent without writing them again: a food stall has the stall's name and pitch, and `getPitch()` works on it. The child writes only what it adds. A class has exactly one parent.

A child is a kind of its parent, so a `FoodStall` fits wherever a `Stall` is asked for: `Stall s = new FoodStall(...);` compiles. The other way round does not. A stall in general may not be a food stall, so `FoodStall f = new Stall(...);` is refused with `incompatible types: Stall cannot be converted to FoodStall`.

The child gets the parent's `private` fields too, but it cannot use them by name: they belong to the parent's own code. `name` used in `FoodStall` brings `name has private access in Stall`. The child reads them through the parent's methods, like any other class.

## The parent's constructor: super(...)

A food stall is made by making its stall part first. The first line of the child's constructor runs a constructor of the parent with `super(...)`, which hands it the values it needs:

```java
FoodStall(String name, int pitch, int rating) {
    super(name, pitch);
    this.rating = rating;
}
```

Leave `super(...)` out and Java runs the parent's constructor that takes nothing. `Stall` has none, so the compiler says `constructor Stall in class Stall cannot be applied to given types;`, with the values the parent requires listed under it. Put it anywhere but first and it says `call to super must be first statement in constructor`.

Do not give the child fields of its own called `name` or `pitch`. It would then have two of each, its own and the parent's, and the parent's methods would only ever see their own.

## Taking the place of a method: @Override

Sometimes a child does something differently. Stall rent is 500 a day, but food stalls pay 650. The child writes the method again, with exactly the parent's name and parameters:

```java
@Override
int rentFor(int days) {
    return days * 650;
}
```

Now the child's version runs for every food stall, even one held in a variable of type `Stall`: Java picks the method by what the object really is, not by the variable's type. That is called overriding.

It only works when the first line matches. Write `rentFor(long days)` and you have a second method beside the parent's, and code that holds a `Stall` still runs the parent's. `@Override` on the line above catches that: it asks the compiler to check, and a method that takes the place of nothing brings `method does not override or implement a method from a supertype`. An override also may not be less public than the method it replaces: make it `private` and you meet `attempting to assign weaker access privileges`.

## Asking the parent: super.

Often the child's version is the parent's plus a little. Inside the child, `rentFor(days)` alone means the child's own method, so a method that calls itself that way never stops, until Java gives up with a `StackOverflowError`. `super.` reaches the parent's version:

```java
@Override
String label() {
    return super.label() + ", rated " + rating;
}
```

This keeps one place for the parent's part. If the market changes how a stall's label reads, the food stall follows by itself. Copying the parent's lines into the child would mean two places to change.

## Your work in this issue

Open `BoatKinds.java`. `main` is yours: take the `//` off a group of lines once its class is written. Write each class under its own `// Task` comment, below `Boat`, and leave `Boat` as it is. Check makes boats of its own and keeps them in variables of type `Boat`. In Task 3 it runs your class beside a `Boat` of its own, whose `describe` words things differently. Run the file with `java BoatKinds.java`.
