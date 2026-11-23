# Built-in shapes: Predicate, Function and method references

## What you will be able to do

In the last issue you wrote `RoomCheck`, an interface of your own for one lambda. Most of the time you do not need one: Java already has interfaces for the shapes a rule usually takes, ready in `java.util.function`. With them, a method can take a rule from its caller, or make one and give it back. By the end of this issue you will be able to:

- use `Predicate`, `Function`, `Consumer` and `Supplier`, and call each one
- write a method that takes a function, and one that gives a function back
- join two functions with `and` and `andThen`
- write a lambda that only calls one method as a method reference, in its four kinds

## The request from Ossian

> **Ossian:** I keep writing the same loop. Once for the children, once for the Gannet's passengers, once for the bikes. Bridie wants to hand the program a rule and get the tickets back. And the harbour adds a fee to every fare now, which means every price in every program.

All three tasks are in `TicketRules.java`.

## Four shapes

Almost every rule takes something and says yes or no, takes something and gives something else back, takes something and does a job, or takes nothing and makes something. Those are the four shapes:

| Interface | Its one method | Example |
| --- | --- | --- |
| `Predicate<T>` | `boolean test(T t)` | `Predicate<Jar> heavy = j -> j.grams() > 400;` |
| `Function<T, R>` | `R apply(T t)` | `Function<Jar, String> label = j -> j.flavour() + " jam";` |
| `Consumer<T>` | `void accept(T t)` | `Consumer<String> say = s -> System.out.println(s);` |
| `Supplier<T>` | `T get()` | `Supplier<Jar> sample = () -> new Jar("quince", 200);` |

The method is how you ask: `heavy.test(plum)`, `label.apply(plum)`, `say.accept("open")`, `sample.get()`. Each shape has its own name for it, and the wrong one does not compile: `heavy.apply(plum)` gives `cannot find symbol`, with `symbol: method apply(Jar)` and `location: variable heavy of type Predicate<Jar>`.

## A method that takes a function

A method that takes a `Predicate` leaves the question open, and its caller fills it in:

```java
static int count(List<Jar> jars, Predicate<Jar> wanted) {
    int n = 0;
    for (Jar j : jars) {
        if (wanted.test(j)) {
            n++;
        }
    }
    return n;
}
```

Now `count(jars, heavy)` counts the heavy jars, and `count(jars, j -> j.flavour().startsWith("p"))` the ones whose flavour starts with p. One loop, any rule. The method decides when and how often the rule is asked: here once for each jar, in order. Asking it twice about one jar does the work twice, and a rule that counts would count twice.

## Giving a function back, and joining two

A method can make a function and give it back, as `roomFor` did:

```java
static Predicate<Jar> heavierThan(int grams) {
    return j -> j.grams() > grams;
}
```

The shapes also have default methods that make a new function out of two. `heavy.and(other)` says yes only when both say yes, `heavy.or(other)` when either does, and `heavy.negate()` turns the answer round. Like `&&`, `and` asks the second rule only when the first said yes; like `||`, `or` stops at the first yes. `label.andThen(s -> s.length())` runs `label`, then hands what it gave to the second function: `Function<Jar, Integer> letters = label.andThen(s -> s.length());`.

Each of these gives back a new function and changes nothing. Calling `heavy.and(other)` on a line by itself does nothing at all: keep what it gives back, or give it back.

## Method references

A lambda that only calls one method can be written shorter, by naming the method with `::`. There are four kinds:

| Kind | Method reference | The lambda it stands for |
| --- | --- | --- |
| A static method | `Math::abs` | `n -> Math.abs(n)` |
| A method of one object you have | `System.out::println` | `s -> System.out.println(s)` |
| A method of whatever object it is handed | `Jar::flavour` | `j -> j.flavour()` |
| A constructor | `StringBuilder::new` | `() -> new StringBuilder()` |

Java matches the reference to the shape it is put in: `Function<Jar, String> flavour = Jar::flavour;` calls `flavour()` on the jar it is handed. The second kind keeps the object it was made with: `System.out::println` always prints to `System.out`.

A name that does not exist gives `invalid method reference`, then `cannot find symbol`. `this::` means the current object, so it does not work in a static method, which has none: `non-static variable this cannot be referenced from a static context`. An interface such as `List` cannot be made with `::new`, as it cannot with `new`.

## Your work in this issue

Open `TicketRules.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Ticket` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Check hands your methods rules and fares of its own that remember whom they were asked about, so it can see a function that is never asked, asked twice or asked about the wrong ticket. It calls the functions you give back with its own values. Run the file with `java TicketRules.java`.
