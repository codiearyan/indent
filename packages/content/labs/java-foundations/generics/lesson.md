# Generics: types that hold any type

## What you will be able to do

All through this part you have written `List<String>`, `Map<String, Integer>` and `Set<Seat>`. The type in angle brackets tells the list what it holds, and the compiler checks every add and every get against it. Those classes were written once, for any type. You can write classes and methods like that too. By the end of this issue you will be able to:

- write a class with type parameters, like `Pair<A, B>`
- write a generic method that works for a list of anything
- bound a type parameter with `extends`, so the method may call `compareTo`
- say what a raw type loses, and why a `List<String>` is not a `List<Object>`

## The request from Bridie

> **Bridie:** The programs at the hut have three copies of the same rota code: one for skippers, one for boats, one for the cleaning. And two copies of "find the biggest". Can we have one of each, that works for anything?

All three tasks are in `HutTools.java`.

## A class with a type parameter

A box at the market that holds one thing, of a type chosen when the box is made:

```java
class Box<T> {
    private final T held;

    Box(T held) {
        this.held = held;
    }

    T held() {
        return held;
    }
}
```

`T` is a type parameter: a name that stands for a type the class does not know yet. Each box chooses it when it is made, `Box<String> jam = new Box<>("plum");`, and from then on `jam.held()` gives back a `String`, with no cast. A class may have several, separated by commas: `class Pair<A, B>`. Single capital letters are the custom, so they never look like a class name.

The type parameter belongs to each object, so a `static` field or method cannot use it: `static T held;` is refused with `non-static type variable T cannot be referenced from a static context`.

## What a raw type loses

Leave the angle brackets off and you get a raw type, the way Java was written before generics:

```java
Box raw = new Box("plum");
String jam = raw.held();
```

That does not compile: `incompatible types: Object cannot be converted to String`. A raw box forgets its type, so everything in it is only an `Object`. A cast would make it compile, and move the check from the compiler to a `ClassCastException` on some later day. Java also warns as the box is made: `warning: [unchecked] unchecked call to Box(T) as a member of the raw type Box`. Always write the type.

## A generic method

A method can have type parameters of its own, written in angle brackets before what it gives back:

```java
static <T> T lastOf(List<T> items) {
    return items.get(items.size() - 1);
}
```

Called with a `List<String>`, `T` is `String` and it gives back a `String`; with a `List<Integer>`, an `Integer`. Java works `T` out from what you hand it.

Why not write `List<Object>` and take everything? Because a `List<String>` is not a `List<Object>`, even though a `String` is an `Object`. A method handed a `List<Object>` may add any object at all to it, a number or a boat, and that would break a list of text. So the compiler refuses: `incompatible types: List<String> cannot be converted to List<Object>`. You met the same rule in part 4 with lists of stalls. A type parameter says "whatever type you hand me, I give it back". Java also has a `?` for "a list of some type", which this repo does not need.

## A bound

Inside `lastOf`, `T` could be anything, so you may only use what every object has. To find the heavier of two things you need `compareTo`, and not every type has it:

```java
static <T> T heavier(T a, T b) {
    return a.compareTo(b) > 0 ? a : b;
}
```

```
Market.java:10: error: cannot find symbol
        return a.compareTo(b) > 0 ? a : b;
                ^
  symbol:   method compareTo(T)
  location: variable a of type T
```

A bound says which types `T` may be. `<T extends Comparable<T>>` reads "any `T` that can be compared with another `T`", and now `a.compareTo(b)` compiles. `extends` here means "is", whether the bound is a class or an interface. The bound works at the call too: `heavier(new Object(), new Object())` no longer compiles, so a list of things that cannot be compared is refused before the program ever runs, not with a `ClassCastException` halfway through.

## Your work in this issue

Open `HutTools.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each task under its own `// Task` comment. Check uses your types and methods with types of its own, writes lines that compile only when the types fit, and lines that must fail to compile, such as a list of plain objects handed to `largest`. Run the file with `java HutTools.java`.
