# Abstract classes: no boat is just a boat

## What you will be able to do

In the last issue every new kind of boat started from `Boat`, and `Boat` could still be made by itself, with the day fare. That was fine while most boats were plain ferries. Now Bridie works out the cost of a day of trips across every kind of vessel, and a vessel that is no kind in particular has no honest fare at all. Java can say that a class is only a starting point, and that every kind made from it must bring something of its own. By the end of this issue you will be able to:

- write an abstract class, which can never be made by itself
- write an abstract method, which every child must write
- keep children of different kinds in one list of the parent's type
- let each object answer for itself, with no question about what kind it is

## The request from Bridie

> **Bridie:** Struan crossed on the Linnet this morning and came back on the water taxi tonight. I want a program that adds up a day like his, whatever boats it uses. Last week somebody made a plain vessel with no fare in it, and it went down on the sheet as free.

All three tasks are in `Takings.java`.

## A class that is only a starting point

At the market there are food stalls and craft stalls, but no stall that is neither. Each kind pays its own rent. `abstract` in front of a class says that it is a starting point and never an object of its own:

```java
abstract class Stall {
    private String name;

    Stall(String name) {
        this.name = name;
    }

    String getName() {
        return name;
    }
}
```

`new Stall("Pitch 4")` is now refused with `Stall is abstract; cannot be instantiated`. An abstract class still has fields, a constructor and methods. Its children get them all, and each child's constructor runs the parent's with `super(...)`, as before. Only the children are ever made.

## A method every child must write

Every stall pays rent, but the parent cannot say how much. An abstract method has a first line and no body: it ends with a semicolon where the braces would be.

```java
abstract int rentFor(int days);
```

This is a promise: every kind of stall has a `rentFor`. A class that extends `Stall` and leaves it out does not compile: `CraftStall is not abstract and does not override abstract method rentFor(int) in Stall`. The message names the class, the method it is missing and where that method comes from. Two more errors to know: an abstract method given a body brings `abstract methods cannot have a body`, and an abstract method in a class that is not abstract brings the same message as a missing one, with the class's own name twice.

The parent can use its abstract method in its other methods, even though it has no body there:

```java
String rentLine(int days) {
    return getName() + " owes " + rentFor(days);
}
```

When `rentLine` runs on a food stall, `rentFor` is the food stall's. The parent writes the part that is the same for every kind, and each child fills in its own.

Why not give the parent a `rentFor` that gives back 0, for the children to override? Because a child that forgets to override it would quietly pay nothing, and nobody would notice. With an abstract method, forgetting is a compile error.

## A list of the parent's type

A list of `Stall` can hold food stalls and craft stalls side by side, because each of them is a `Stall`:

```java
ArrayList<Stall> stalls = new ArrayList<>();
stalls.add(new FoodStall("Pitch 4"));
stalls.add(new CraftStall("Pitch 9"));

int total = 0;
for (Stall stall : stalls) {
    total += stall.rentFor(7);
}
```

The loop never asks what kind each stall is. `stall.rentFor(7)` runs the method of the object the variable holds, so each stall answers for itself. This is called polymorphism: one call, and the right method for each object. When the market adds a new kind of stall next year, this loop works for it unchanged. A chain of `if` on the stall's name would need a new branch for every kind, and would be wrong the first time one was missed.

A list of a child's type is not a list of the parent's, though. A method that asks for `ArrayList<FoodStall>` cannot be handed an `ArrayList<Stall>`: `incompatible types: ArrayList<Stall> cannot be converted to ArrayList<FoodStall>`. That list may hold craft stalls too. Ask for the parent's type when you mean any kind.

## Your work in this issue

Open `Takings.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each task under its own `// Task` comment. Check judges Tasks 2 and 3 beside a `Vessel` of its own, written as Task 1 asks, so each task passes on its own lines. Check also writes kinds of vessel of its own, with fares you have not seen, and puts them in your methods. Run the file with `java Takings.java`.
