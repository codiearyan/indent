# Static: what belongs to the class

## What you will be able to do

Every ticket from the hut now gets a number, so the harbour office can check them: the first of the day is 1, the next 2, and so on, across both boats. Each ticket keeps its own number, but the count of tickets issued so far is one count for the whole roll, not one per ticket. The adult fare is the same kind of thing: one value, the same for every ticket, and it should be written in exactly one place. By the end of this issue you will be able to:

- tell a field each object has from a field the whole class shares, and write both
- write a `static` method and call it through the class's name
- keep a value that never changes in a `static final` constant
- say why `main` is `static`, and read the errors that come from mixing the two

## The request from Bridie

> **Bridie:** The harbour office wants a number on every ticket, counting up from the first of the day, so nobody prints their own. And the adult fare is written in four places in the programs. When the council raised it last spring we missed one, and a whole week of tickets was wrong. I want it in one place.

All three tasks are in `TicketRoll.java`.

## One for each object, or one for the class

Every field so far belonged to each object: each stall has its own jars. `static` in front of a field makes one field for the class itself, shared by every object:

```java
class Stall {
    static int stallsOpen;
    int pitch;

    Stall() {
        stallsOpen++;
        pitch = stallsOpen;
    }
}
```

Make three stalls and there are three `pitch` fields, 1, 2 and 3, but only one `stallsOpen`, which is 3. Outside the class you read it through the class's name: `Stall.stallsOpen`. A static field exists before any object is made, and it starts at 0 like any other number field.

You met the danger of this in earlier issues: put `static` on a field that should be each object's own, and every object shows the last value given.

## Static methods

A method can be `static` too. Then it belongs to the class, not to an object, and you call it through the class's name with no object at all. Java's own classes have many: `Math.max(3, 8)` gives back the larger of two numbers, called through the class `Math`, with no object made.

```java
static int rentFor(int days) {
    return days * RENT_PENCE;
}
```

`Stall.rentFor(3)` needs no stall. Because a static method has no object, it cannot read a field that each object has. Write `pitch` inside it and the compiler says `non-static variable pitch cannot be referenced from a static context`: which stall's pitch would that be? A method without `static` has an object, so it can use that object's fields and everything static as well.

## Constants: static final

`final` on a field means it gets its value once and never another. Together with `static` you get a constant: one value for the whole class that no line can change. By habit its name is in capitals, with `_` between the words:

```java
static final int RENT_PENCE = 500;
```

Any line that tries to change it is refused: `cannot assign a value to static final variable RENT_PENCE`. Use the constant everywhere the value is needed, and work other values out from it. Then a new rent is one change in one line, and nothing is missed.

## Why main is static

When you run a program, Java has made no objects yet. It needs a method it can call through the class's name alone, and that is `main`: `public static void main`. That is why every method in part 2 was static: they were called from `main`, through no object.

So `main` lives in a static context, like any static method. Inside it, a field or method of the class that has no `static` needs an object in front of it: make one with `new`, then call through it. Using one alone from `main` brings the same message, `non-static variable visitors cannot be referenced from a static context`, or `non-static method` for a method.

## Your work in this issue

Open `TicketRoll.java`. `main` is yours: take the `//` off its lines as you go. Everything you write goes inside the class `Ticket`, under the `// Task` comments. Check makes tickets of its own and reads each one's fields, and it uses `issued`, `ADULT_PENCE` and `fareFor` through the class's name, with no ticket. Task 3 builds on Tasks 1 and 2.
