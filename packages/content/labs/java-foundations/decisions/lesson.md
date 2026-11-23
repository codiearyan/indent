# True or false, and decisions

## What you will be able to do

The tickets print right, and Bridie has one more job before the clipboard can retire: the departures board. Whether the Linnet sails, whether it is full, what the board says and what each passenger pays all depend on the numbers, and today Bridie works them out in her head while the queue waits. A program decides with values that are true or false, and with `if`. By the end of this issue you will be able to:

- compare numbers and keep the answer in a `boolean`
- join conditions with and, or and not
- choose between several branches with `if`, `else if` and `else`
- put the branches in the order that gives the right answer, and read the compiler when a decision is not complete

## The request from Bridie

> **Bridie:** Every crossing I look at the wind, the fog and the passengers, then chalk the board: boarding, full or cancelled. Twice last week I chalked boarding while Ossian had already called it off. And the fares: little ones go free, children pay half, and I get it wrong when it is busy.

All four tasks are in `Departures.java`.

## Comparisons give true or false

A comparison between two numbers is a value of its own, a `boolean`:

```java
int degrees = 24;
boolean warm = degrees > 20;      // true
```

The comparisons are `<` and `>`, `<=` for "less than or equal" and `>=` for "greater than or equal", `==` for "equal" and `!=` for "not equal". Watch the edges: `degrees > 20` is false when `degrees` is 20, and `degrees >= 20` is true.

`=` and `==` are different things. `=` stores a value; `==` asks a question. Mix them up inside an `if` and the compiler refuses it:

```
Garden.java:5: error: incompatible types: int cannot be converted to boolean
        if (degrees = 30) {
                    ^
```

It means the `if` wanted a true or false, and got the number 30 from storing it.

## And, or, not

Conditions join with three operators:

- `a && b` is true only when both are true
- `a || b` is true when either is true, or both
- `!a` is the opposite of `a`

```java
boolean raining = false;
boolean waterToday = degrees > 20 && !raining;
```

Read it aloud: warm and not raining. Saying a condition aloud is the quickest way to find an `&&` that should be `||`.

## Choosing with if

`if` runs a block only when its condition is true. `else` runs when it is false:

```java
if (raining) {
    System.out.println("No watering");
} else {
    System.out.println("Water the beds");
}
```

For more than two choices, chain them with `else if`:

```java
String advice;
if (raining) {
    advice = "No watering";
} else if (degrees > 25) {
    advice = "Water twice";
} else {
    advice = "Water once";
}
```

Java checks the conditions from the top and takes the first one that is true. Every branch after it is skipped, even if its condition is true too. So order matters: on a hot rainy day this says "No watering", because rain is checked first. Swap the first two and the same day says "Water twice". Put the check that must win first.

## Making a variable for a decision

Notice where `advice` is made: above the `if`, with no value, and each branch gives it one. If any path leaves it without a value, for example with the `else` left off, the compiler refuses the line that uses it: `variable advice might not have been initialized`. It is telling you there is a case your decision forgot.

Why not make it inside the branches, as `String advice = "Water twice";`? A variable made inside braces exists only inside those braces. After the closing `}` it is gone, and using it gets `cannot find symbol`. A variable you need after the decision is made before it.

You can also give the variable a starting value and change it only in some cases, with separate `if`s. That works too; the order of the `if`s still decides which change is left at the end.

## Your work in this issue

Open `Departures.java`. Near the top of `main` is the next crossing from the clipboard: passengers, seats, wind, fog, the single fare and a passenger's age. Check runs your lines with other values in their place, including the edges, like a wind of exactly 30. Task 3 builds on Tasks 1 and 2, so do the tasks in order. Print what you make, and change the values at the top for a moment to see each branch run.
