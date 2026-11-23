# Lists in depth: one list or two

## What you will be able to do

In part 2 you made an `ArrayList`, added to it and took names off it. At the hut, lists now pass from method to method, and a list one method changes is suddenly changed for everyone. By the end of this issue you will be able to:

- ask for a `List` and not an `ArrayList`, and say why
- make a list that can never change with `List.of`, and a copy that is a list of its own
- find things with `contains` and `indexOf`, and take a number off a list of numbers by its value
- take items off a list while you walk through it, without Java stopping the program

## The request from Bridie

> **Bridie:** The desk gave me the Gannet's boarding list, I added a late passenger at the gangway, and the desk's own list grew too. Then I freed seat 1 and seat 6 went instead. And voiding two tickets in a row only voided one of them.

All three tasks are in `BoardingList.java`.

## List is the type, ArrayList is one kind

`List` is an interface, like the ones you wrote in part 4: it names what every list can do, `add`, `get`, `size`, `remove`, `contains`. `ArrayList` is one class that implements it. A method that asks for an `ArrayList` refuses every other kind of list, so ask for the interface:

```java
static int jarsOf(List<String> stall) { ... }
```

Now any list can come in. Hand an `ArrayList`-only method another list and the compiler says the method `cannot be applied to given types`, with the reason `argument mismatch; List<String> cannot be converted to ArrayList<String>`. In your own variables, write `List<String> stalls = new ArrayList<>();`: the type says what you need, and only the right side says which kind.

## A list that never changes

`List.of` makes a small list in one line:

```java
List<String> sizes = List.of("small", "medium", "large");
```

That list can never change. It compiles if you call `add`, `remove` or `set` on it, and then stops the program:

```
Exception in thread "main" java.lang.UnsupportedOperationException
	at java.base/java.util.ImmutableCollections.uoe(ImmutableCollections.java:142)
	at java.base/java.util.ImmutableCollections$AbstractImmutableCollection.add(ImmutableCollections.java:147)
	at Stall.main(Stall.java:6)
```

So a method handed a `List` must never assume it may change it. When it needs to, it makes a copy first: `new ArrayList<>(sizes)` is a new list holding the same items, and it can grow.

A copy is not a second name. `List<String> mine = sizes;` makes no new list: both names point at one list, and a change through one shows through the other.

## Finding things: contains and indexOf

`contains(x)` asks each item whether it `equals` `x`, as you saw in part 4. `indexOf(x)` does the same and gives back the position of the first equal item, or -1 when there is none. Both compare with `equals`, so a name typed in at the desk is found even though it is another `String` object; a loop of your own with `==` would not find it.

`==` is a trap for numbers in a list too. A list of whole numbers holds `Integer` objects, and `==` on two of them asks whether they are the very same object. Java keeps one shared object for each number from -128 to 127, so small numbers seem to work; 1042 and 1042 made separately are two objects, and `==` says false. Compare them with `equals`.

## remove takes a position or a value

A list has two `remove` methods: `remove(int)` takes off the item at a position, and `remove(Object)` takes off the first item equal to the one handed over. On a list of `Integer`, a plain `int` picks the first:

```java
List<Integer> jars = new ArrayList<>(List.of(12, 3, 40));
jars.remove(3);
```

That does not take off the 3. It asks for position 3, which this list does not have: `java.lang.IndexOutOfBoundsException: Index 3 out of bounds for length 3`. With a small number it is worse: `jars.remove(1)` quietly takes off the 3, the item at position 1. To take off the number, hand over an `Integer`: `jars.remove(Integer.valueOf(3))`.

## Changing a list while you walk it

Take an item off inside a for-each loop over the same list, and Java stops the program with a `ConcurrentModificationException`, as part 2 showed. Sometimes the loop just ends early instead, which is worse. Walking positions forward skips the item after each one you take off.

The for-each loop walks the list with an iterator, an object that knows where it is in the list. You can use one yourself, and an iterator can take off the item it just gave you, safely:

```java
Iterator<Integer> it = jars.iterator();
while (it.hasNext()) {
    int weight = it.next();
    if (weight < 5) {
        it.remove();
    }
}
```

`hasNext()` asks whether anything is left, `next()` gives the next item, and `remove()` takes that item off and keeps the iterator's place right. Each `remove()` needs a `next()` before it.

## Your work in this issue

Open `BoardingList.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each class under its own `// Task` comment. The starter imports all of `java.util` with its first line, `import java.util.*;`, so `List`, `ArrayList` and `Iterator` are ready. Check hands your methods lists of its own, some made with `List.of`, and reads the caller's list afterwards. Run the file with `java BoardingList.java`.
