# Private fields and the rules they keep

## What you will be able to do

The Gannet carries thirty, the Linnet twelve, and the law says not one more. Ossian keeps the list of who is on board, and the program has to keep the same rule he does. But a field anyone can change is a field anyone can get wrong: one stray line like `gannet.aboard = ...` anywhere in any program, and the count says what it likes. By the end of this issue you will be able to:

- make fields `private`, so only the class's own code can change them
- write methods that read and change private fields while keeping a rule true
- hand out a copy of a list instead of the list itself
- write `toString`, and say what printing an object shows without it

## The request from Ossian

> **Ossian:** I want a passenger list per boat that cannot break the rules. Nobody gets on a full boat, whoever writes the code. When someone lands, they come off the list. Bridie wants the list for the harbour office, but whatever they do with their copy must not change mine. And when I print a boat, I want to read it, not a string of nonsense.

All four tasks are in `Manifest.java`.

## private: only the class may touch it

`private` in front of a field means only code inside its own class can use it:

```java
class Stall {
    private String goods;
    private int jars;

    Stall(String goods, int jars) {
        this.goods = goods;
        this.jars = jars;
    }

    int getJars() {
        return jars;
    }
}
```

Code in another class that tries `honey.jars = -5;` is refused before anything runs:

```
Market.java:4: error: jars has private access in Stall
```

So the outside reads a private field through a method, often called a getter, like `getJars()`. The field and its rules now live in one place, and nothing outside the class can get round them.

## Methods that keep a rule

Making a field private is half the job. The other half is giving the class methods that change it only in allowed ways. A stall can never sell more jars than it has:

```java
boolean sell(int wanted) {
    if (wanted < 1 || wanted > jars) {
        return false;
    }
    jars = jars - wanted;
    return true;
}
```

The method checks first and changes after, and when the change would break the rule it changes nothing at all. Giving back a `boolean` tells the caller whether it happened. Think about the edges: what happens at exactly the limit, one past it, and with a value nobody should send.

## Handing out a list

A private list is only safe if the class never hands the list itself out. A getter that gives back the field gives the caller a second name for the very same list, as in the last issue, and the caller can then add to it, clear it, or fill it past any rule:

```java
ArrayList<String> orders() {
    return new ArrayList<>(orders);
}
```

`new ArrayList<>(orders)` makes a new list holding the same items. The caller can do what it likes with that copy; the stall's own list stays as it was.

## toString: what printing shows

Print an object of a class that does nothing special, and you get its class name, an `@` and a code:

```
Stall@4f51b3e0
```

That is the text Java gives every object. To print something useful, write a method that gives back the text you want, with exactly this first line:

```java
public String toString() {
    return goods + ": " + jars + " jars";
}
```

Now `System.out.println(honey)` prints `Honey: 40 jars`, and so does `"" + honey`. `println` asks the object for its text by calling `toString`, so toString only gives the text back; it never prints. The first line must match exactly, or yours does not take the place of Java's. Leave out `public` and the compiler says `toString() in Stall cannot override toString() in Object` with `attempting to assign weaker access privileges; was public`. Every object already has a `public` toString, and yours may not offer less. The issue on packages says more about `public`.

## Your work in this issue

Open `Manifest.java`. `main` is yours: take the `//` off its lines as you go. Everything you write goes inside the class `Boat`, under the `// Task` comments. Check makes boats with its own names and seats, boards them up to their seats and past, and its own code tries to change each field from outside `Boat`. Tasks 2, 3 and 4 build on Task 1, and Tasks 3 and 4 board passengers with Task 2's method.
