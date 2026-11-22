# Text and String

## What you will be able to do

The numbers add up now. Next on Bridie's list is the ticket printer, which wants text: how many people travel, a short code for where they are going, a check that the ticket is for today's boat, and a line that fits the paper. Text in Java is a `String`, and a `String` comes with methods that cut it, measure it and compare it. It also has two traps that catch everyone: `+` that glues numbers together, and `==` that says two equal texts differ. By the end of this issue you will be able to:

- join text and numbers with `+`, in the order you mean
- measure a `String`, find a character by its position and cut a piece out
- make a capital copy of a `String`
- compare two `String`s the right way, and say why `==` misleads

## The request from Bridie

> **Bridie:** The printer gets the tickets nearly right. A family of two adults and three children came out as 23 passengers. Ossian wants a three letter code on each ticket, like the luggage tags at the station. Yesterday someone boarded the Linnet with a ticket for the other boat and nobody noticed. And long tickets run off the edge of the paper.

All four tasks are in `Tickets.java`.

## Joining text with +

Between two numbers `+` adds. When either side is a `String`, it joins, and the number is written into the text:

```java
int apples = 2;
int pears = 3;
System.out.println("Fruit: " + apples + pears);     // Fruit: 23
```

Java works through a line of `+` from the left. `"Fruit: " + apples` is a `String`, `"Fruit: 2"`, so the next `+` joins again, and the 3 is glued on. Brackets are worked out first, so this adds before it joins:

```java
System.out.println("Fruit: " + (apples + pears));   // Fruit: 5
```

With the numbers first, `apples + pears + " pieces"` adds first and prints `5 pieces`. Reading from the left tells you which it will be.

## Methods of a String

A `String` has methods: things you ask it to do, written after a dot, with round brackets after the name. The brackets are needed even when nothing goes inside them; without them the compiler says `cannot find symbol` and calls the name a variable.

```java
String fruit = "Damson";
fruit.length()            // 6, the number of characters, spaces included
fruit.toUpperCase()       // "DAMSON"
fruit.toLowerCase()       // "damson"
```

A method never changes the `String` itself. `fruit.toUpperCase();` alone does nothing you can see: it makes a capital copy and throws it away. Keep the copy in a variable to use it.

## Positions start at 0

Each character of a `String` has a position, and the first is 0, not 1. In `"Damson"`, `D` is at 0 and `n` at 5. `fruit.charAt(0)` gives the character at a position, as a `char`.

`substring(start, end)` cuts out the characters from `start` up to, but not including, `end`:

```java
fruit.substring(1, 4)     // "ams": positions 1, 2 and 3
```

So `end - start` is how many characters you get. Ask for a position the text does not have, like `fruit.substring(0, 10)`, and the program compiles, starts, and stops with a `StringIndexOutOfBoundsException`. Its stack trace lists a few lines from inside Java first; the line that names your own file says where your code asked for it.

## Comparing text: equals, not ==

To ask whether two `String`s hold the same text, use `equals`:

```java
String label = "Damson jam";
String first = label.substring(0, 6);    // "Damson"
first.equals(fruit)       // true
first == fruit            // false
```

Why does `==` say false? A `String` is an object: the variable holds where the text lives, not the text. `==` asks whether two variables point at the very same object. `first` was cut out of `label` while the program ran, so it is a new object that happens to hold the same letters. Sometimes `==` says true, when both texts were typed in the code and Java shares one copy. That is what makes it dangerous: it works in a quick test and fails on real data. For text, always use `equals`. `==` is for numbers, `char`s and `boolean`s.

## One character or many

Double quotes make a `String` of any length; single quotes make one `char`. `'A'` is fine, but `'Corran'` is refused with `unclosed character literal`, because single quotes hold exactly one character.

## Your work in this issue

Open `Tickets.java`. Near the top of `main` is today's ticket: the party, the destination, today's boat and the ticket text, with the boat cut out of it for you. Check runs your lines with other values in their place, so build on the names. Do the tasks in order under their `// Task` comments, print what you make, and run `java Tickets.java` after each one.
