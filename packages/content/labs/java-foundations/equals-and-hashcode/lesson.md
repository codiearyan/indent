# The same booking, or an equal one

## What you will be able to do

The Gannet's Saturday crossings are full, so Bridie keeps a waiting list of bookings. When someone rings to cancel, the program makes a booking from what they say and asks the list to take it off. Nothing comes off, ever. The booking on the list and the one made from the phone call hold the same passenger and the same hour, but they are two objects, and Java does not know when two bookings count as one. By the end of this issue you will be able to:

- tell two names for one object from two objects that are equal
- write `equals`, with `instanceof` and a cast, so that equal objects are equal
- write `hashCode` to go with it, and say why the two always come together
- use a list's `contains` and `remove` on objects of your own

## The request from Bridie

> **Bridie:** Morag rang to cancel the nine o'clock. I took her off the list, the program said fine, and she is still on it. And when I ask whether someone is waiting, it says no while I am looking at their name.

All three tasks are in `WaitingList.java`, inside `Booking`. Its fields, constructor and `toString` are given above them.

## == asks for the very same object

You met this with text in part 1: `==` on two objects asks whether they are the very same object, not whether they hold the same thing. Two strings made separately with the letters `B4` are not `==`, but `equals` says they are equal, because `String` has an `equals` that compares the letters.

Every class gets an `equals` from `Object`, the parent of every class. That one only does what `==` does. A class of your own has to say what equal means for it, by overriding `equals`.

## Writing equals

At the market, a pitch is the same pitch when its row and number are the same:

```java
@Override
public boolean equals(Object other) {
    if (!(other instanceof Pitch)) {
        return false;
    }
    Pitch that = (Pitch) other;
    return row.equals(that.row) && number == that.number;
}
```

The first line takes an `Object`, because that is the method in `Object` it takes the place of. Write `equals(Pitch other)` instead and you have a second method beside the old one. Your own code calling `a.equals(b)` with two pitches would use yours, but a list holds its items as objects and calls `equals(Object)`, which still compares objects with `==`. `@Override` catches it: the compiler says the method overrides nothing. And `equals` is public in `Object`, so yours must be too.

`instanceof` asks whether an object is of a class, or a child of it. It gives `false` for `null`, so one test refuses both `null` and anything that is not a pitch. Only then does the cast `(Pitch) other` let you use `other` as a pitch and read its fields. A field that is private can be read through another object of the same class, so `that.row` works inside `Pitch`. A cast never changes the object. Cast a string to `Pitch` and the program stops: `java.lang.ClassCastException: class java.lang.String cannot be cast to class Pitch`. Ask first, then cast.

Compare text fields with `equals` and numbers with `==`, and leave out any field that may change while the thing stays the same.

## hashCode goes with equals

A hash code is a number each object gives back from `hashCode()`. A `HashSet`, and other quick ways to look things up, use it to know where to look: they only compare with `equals` the objects whose hash codes match. So there is a rule: objects that are equal must have the same hash code.

The `hashCode` every object gets from `Object` differs from one object to the next. Override `equals` alone, and two equal pitches have different hash codes, so a set never compares them:

```java
HashSet<Pitch> taken = new HashSet<>();
taken.add(new Pitch("B", 4));
taken.contains(new Pitch("B", 4));   // false, with equals but no hashCode
```

That is why `equals` and `hashCode` are written together, from the same fields. `Objects.hash` builds one for you:

```java
@Override
public int hashCode() {
    return Objects.hash(row, number);
}
```

Use exactly the fields `equals` compares. A field `equals` leaves out would give two equal objects different hash codes. Giving every object the same number keeps the rule but makes every lookup compare against everything, so different objects should mostly get different hash codes.

## Lists use equals too

A list's `contains(x)` and `remove(x)` go through the list asking each item whether it `equals` `x`. Without an `equals` of your own they look for that very object, so a booking made from a phone call is never found. With it, they find the equal one. `remove` takes off only the first item that is equal, and gives back `true` when it took something off, and `false` when nothing was equal. Taking an item off moves every later item one place back, so a loop that walks positions while it removes steps over the next one.

## Your work in this issue

Open `WaitingList.java`. `main` is yours: take the `//` off a line once what it uses is written. Write each task inside `Booking`, under its own `// Task` comment, and leave the given lines as they are. Task 3 builds on Task 1. Run the file with `java WaitingList.java`.
