# Classes and objects: a second boat

## What you will be able to do

Lanternquay Ferries has bought a second boat, the Gannet, and from Monday two boats cross the river. Every number the programs keep about the Linnet now has a twin: two names, two seat counts, two counts of people on board. With variables alone that means `linnetSeats`, `gannetSeats`, `linnetAboard` and so on, and a third boat would mean more of them everywhere. Java has a better way: describe once what a boat is, then make as many boats as you need. By the end of this issue you will be able to:

- write a class with fields, and make objects of it with `new`
- write a method that works with the fields of the object it is called on
- say why two names can point at one object, and make a real copy
- read a `NullPointerException`, and keep a program from using an object that is not there

## The request from Bridie

> **Bridie:** With two boats I need the seats free on each one, not one number for the whole river. When a family buys tickets I want to copy the first one for the next person, and Ossian says his copies keep changing my first ticket. And the early crossings have no boat yet: the program falls over on them.

All three tasks are in `Fleet.java`.

## A class describes, an object is one of them

A class is a description: what every thing of that kind has. The things it has are its fields, written like variables inside the class:

```java
class Stall {
    String goods;
    int jars;
    int sold;
}
```

This makes no stall yet. It says that every stall has goods, a number of jars and a number sold. To make one, use `new`, and keep it in a variable whose type is the class:

```java
Stall honey = new Stall();
honey.goods = "Honey";
honey.jars = 40;
```

The dot reaches into one object: `honey.jars` is the jars field of that stall. A file can hold several classes. `java Market.java` runs the first one, which has `main`, and only that first class has `public` in front.

Misspell a field and the compiler says which object it looked in: `cannot find symbol`, then `symbol: variable jar` and `location: variable honey of type Stall`.

## Each object keeps its own fields

Make a second stall and it gets fields of its own:

```java
Stall cheese = new Stall();
cheese.jars = 12;
```

Now `honey.jars` is 40 and `cheese.jars` is 12. Changing one never touches the other.

A class can have methods too, and here they have no `static` in front. A method without `static` belongs to each object, and inside it the field names mean the fields of the object it was called on:

```java
int jarsLeft() {
    return jars - sold;
}
```

`honey.jarsLeft()` uses the honey stall's fields, `cheese.jarsLeft()` the cheese stall's. Such a method needs an object in front of the dot. Call `jarsLeft()` alone from `main` and the compiler says `cannot find symbol`, `symbol: method jarsLeft()`, `location: class Market`: the class with `main` has no such method. Put `static` in front of a field and there is only one of it, shared by every object, so every stall would show the last value given. A later issue is about exactly that.

## Two names for one object

A variable of a class type does not hold the object itself. It holds where the object lives, just as with an array or a list in the last part. So this makes no second stall:

```java
Stall spare = honey;
spare.sold = 5;
System.out.println(honey.sold);    // 5
```

`spare` and `honey` are two names for one stall. Only `new` makes another object. To copy a stall, make a new one and give each of its fields the value of the old one's. `==` on two objects asks whether they are the very same object, not whether their fields match.

## null: no object at all

A field whose type is a class starts out holding `null`, which means no object, until something is put there. Using it as if it held an object stops the program:

```java
class Pitch {
    Stall stall;

    int jarsHere() {
        return stall.jarsLeft();
    }
}
```

```
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "Stall.jarsLeft()" because "this.stall" is null
	at Pitch.jarsHere(Market.java:22)
```

Read it as before: the first line says what was tried and which name held `null` (`this.stall` is the pitch's own `stall` field), and the `at` line says where. To handle a missing object, ask first with `==`: `if (stall == null)`. Never call a method or read a field through a name before you know it holds an object.

## Your work in this issue

Open `Fleet.java`. The class `Fleet` holds `main`, and `main` is yours: take the `//` off each group of lines in it once its class is written. Each class goes under its own `// Task` comment, below the closing brace of `Fleet`. Check makes objects of your classes with values of its own, calls their methods and reads their fields. Task 3 builds on Task 1.
