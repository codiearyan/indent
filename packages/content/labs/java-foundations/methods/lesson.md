# Methods: rules you can reuse

## What you will be able to do

The timetable runs on loops now. Bridie's next worry is the fares. The rule for a child's fare sits in three programs already, written out each time, and when the council changes it someone will miss one. A method gives a piece of work a name, so it is written once and used wherever it is needed. From this issue on, most of what you write is methods. By the end of it you will be able to:

- write a method that takes values and gives one back with `return`
- write a `void` method that does something and gives nothing back
- call one method from another
- say why changing a parameter never changes the caller's variable, and read the errors methods bring

## The request from Bridie

> **Bridie:** I want the fare rules in one place: what a child pays, what a whole party pays, and the line the ticket printer wants. And Ossian wrote a piece that is meant to count the seats after people board, but the count never goes down.

All four tasks are in `FareRules.java`.

## A method is a named piece of work

You have used methods since your first program: `println`, `length`, `substring`. Now you write your own. A method sits inside the class, next to `main`, never inside it:

```java
static int doubled(int jars) {
    return jars * 2;
}
```

The first line says everything about how to use it. `static`, for now, on every method. `int` is the type it gives back. `doubled` is its name. In the round brackets are its parameters: each a type and a name, like a variable that gets its value from whoever calls the method. Between the braces is the work, and `return` ends the method and gives a value back.

Calling it runs the work with the values you pass, called arguments:

```java
int shelf = doubled(6);              // 12
System.out.println(doubled(shelf));  // 24
```

The arguments must fit the parameters: how many, their types and their order. Call `doubled()` with nothing, or `doubled("six")`, and the compiler refuses it, with `method doubled in class Larder cannot be applied to given types` or `incompatible types`.

## void: doing without giving back

Some methods do a job and have nothing to give back, like printing a label. Their type is `void`:

```java
static void printLabel(String fruit, int year) {
    System.out.println(fruit + " jam, " + year);
}
```

Printing and giving back are different things, and mixing them up is the most common method mistake. `println` shows a value on the screen, for a person; the program cannot use it. `return` hands the value to the code that called, which can keep it, add to it, or pass it on. If a method is meant to give back a number, printing it is not enough. And `int x = printLabel("Plum", 2026);` is refused: `void cannot be converted to int`.

A method with a type other than `void` must reach a `return` on every way through it. If one way has none, for example an `if` without an `else` and nothing after it, the compiler says `missing return statement`.

## One method calling another

A method can call any other method of the class, just as `main` does. A method for a whole shelf can use `doubled` for each row instead of writing the rule again. Then a change to the rule happens in one place. That is the point of methods: one name for one piece of work, used wherever it is needed.

## Why static, for now

`main` is `static`, which means it belongs to the class itself and runs without anything else being made first. A method `main` calls directly has to be `static` too. Leave it off and the compiler says `non-static method doubled(int) cannot be referenced from a static context`. Methods without `static` belong to objects, which are a later part of this repo. Until then, every method you write starts with `static`.

## An argument is a copy

When you call a method, each parameter gets a copy of the argument's value. The method can change its copy, and the caller's variable stays as it was:

```java
static void eatOne(int jars) {
    jars = jars - 1;          // changes only the copy
}

int pantry = 5;
eatOne(pantry);
System.out.println(pantry);   // still 5
```

To get a new value out, give it back with `return`, and have the caller keep it: `pantry = eatOne(pantry);`, with `eatOne` returning an `int`.

## Your work in this issue

Open `FareRules.java`. `main` comes first and it is yours: use it to try your methods, and take the `//` off its lines as you write each one. Each task goes under its own `// Task` comment below `main`. Check calls your methods from code of its own, with values of its own, and reads what each one gives back and what it prints, separately. Task 3 builds on Task 1, so do them in order.
