# Throwing an exception: refusing what cannot be

## What you will be able to do

So far exceptions have come from Java: a position an array does not have, a word that is not a number. Your own methods can throw them too. Last week the fare machine was handed an age of -4, charged a child's fare without a word, and the takings were wrong by evening. A method that is handed something impossible should say so at once, loudly, before it does any harm. By the end of this issue you will be able to:

- refuse a bad value with `throw new IllegalArgumentException(...)` and a message a person can act on
- refuse before anything has changed
- choose between giving back an answer and throwing
- tell a checked exception from an unchecked one, and say what `throws` on a method means

## The request from Bridie

> **Bridie:** The machine took an age of minus four and printed a child ticket. Then someone booked 0 seats on the Linnet, and it counted as a booking. And when Ossian calls a crossing off for a gale, the notice board still says boarding. I want the desk to refuse what cannot be, and tell me why.

All three tasks are in `BookingDesk.java`.

## throw

At the market, a stall prices jars at 400 pence each. Selling 0 jars, or -2, means some code has gone wrong, so the method refuses:

```java
static int price(int jars) {
    if (jars < 1) {
        throw new IllegalArgumentException("Cannot sell " + jars + " jars");
    }
    return jars * 400;
}
```

`new IllegalArgumentException(...)` makes an exception, an object like any other; `throw` hands it to the caller and ends the method there, like a `return`. Making one without `throw` does nothing at all. A line straight after a `throw` can never run, and Java says so: `error: unreachable statement`. `price(-2)` stops the program with:

```
Exception in thread "main" java.lang.IllegalArgumentException: Cannot sell -2 jars
	at Price.price(Price.java:8)
	at Price.main(Price.java:3)
```

The message names the value that was wrong. Whoever reads it at night knows what to look for. "Invalid input" would leave them guessing.

## Refuse first

A method that changes something must check before it changes anything. If a stall takes the jars off its shelf and then finds the number was -2, the shelf is wrong even though the sale was refused, and the caller cannot know. So the checks come first, the `throw` before the first line that changes a field. Then a refused call leaves everything exactly as it was.

## Give back an answer, or throw?

Not everything unwelcome is a mistake. A customer asks for six jars and the stall has four: that is an ordinary day, and the caller should get an answer it can act on, such as `false`, and offer four. An order for -2 jars is not a day at the market; it is a bug in whatever code asked. The rule of thumb: when the caller can expect it and deal with it, give back an answer. When it can only come from a mistake, throw. Giving back `null` or -1 for a mistake is worse than either: the caller has to remember to look, and usually does not.

## Checked and unchecked

`IllegalArgumentException`, `NullPointerException` and `NumberFormatException` all extend `RuntimeException`. They are unchecked: Java lets any method throw them, and lets any caller ignore them, because they mean a bug to mend, not a case to plan for.

Some things are neither bugs nor normal answers: the market is rained off. A caller must plan for that. Such an exception extends `Exception`, but not `RuntimeException`, and is checked:

```java
class RainedOffException extends Exception {
    RainedOffException(String message) {
        super(message);
    }
}
```

The compiler insists that a checked exception is either caught or named. A method that throws one without saying so is refused:

```
Market2.java:4: error: unreported exception RainedOffException; must be caught or declared to be thrown
            throw new RainedOffException("Market closed for rain");
            ^
```

The fix is on the method's first line: `static String open(boolean rain) throws RainedOffException`. Now every caller must either catch `RainedOffException` or say `throws` itself, so nobody can forget the rain. `throws Exception` would also compile, but it tells the caller nothing about what to plan for; name the exact exception.

It works the other way too. A `catch` for a checked exception that nothing in its `try` can throw is refused: `error: exception RainedOffException is never thrown in body of corresponding try statement`. The compiler knows, from each method's `throws`, what a `try` can throw.

## Your work in this issue

Open `BookingDesk.java`. `CancelledException`, above the tasks, is given: a checked exception for a crossing called off by the weather. Write each class under its own `// Task` comment, and take the `//` off the lines in `main` to try them with `java BookingDesk.java`. The last line of `main` is refused on purpose, so its exception ends the run.
