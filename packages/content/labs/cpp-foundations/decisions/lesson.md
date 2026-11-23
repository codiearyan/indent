# Decisions with if and else

## What you will be able to do

Every program so far ran each line once, from the top down, whatever the slip said. The workshop does not work like that. Ambrose has rules: a clock kept longer than promised is overdue, a fault that comes back soon is repaired for free, a clock for a wedding jumps the queue. A program that follows rules has to choose. By the end of this issue you will be able to:

- ask a question with a comparison and keep the answer in a `bool`
- run lines only when something is true, with `if`, `else` and `else if`
- join two questions with `&&` and `||`
- spot the three mistakes that make a decision go the wrong way

## The request from Ambrose

> **Ambrose:** I have rules, and they live in my head. When I'm off sick, Dorrit guesses. Overdue or not, free or not, which shelf. Put my rules in the laptop, so it says the same thing I would.

All four tasks are in `src/rules.cpp`.

## True or false

A comparison asks a question about two values, and its answer is `true` or `false`:

```cpp
int cupsLeft = 3;
bool runningLow = cupsLeft < 5;    // true
bool empty = cupsLeft == 0;        // false
```

There are six: `<` less than, `>` greater than, `<=` less than or equal, `>=` greater than or equal, `==` equal, and `!=` not equal. The answer is a value like any other, so it can be kept in a `bool`, which you met in the second issue. Printed, a `bool` shows `1` for true and `0` for false.

Mind the edges. `cupsLeft < 5` is false when exactly 5 are left; `cupsLeft <= 5` is true. A rule that says "5 or fewer" needs the second.

## Choosing with if and else

`if` runs the lines in its `{ }` only when its condition is true. `else` runs its lines when it is not:

```cpp
if (runningLow) {
    std::cout << "Order more cups\n";
} else {
    std::cout << "Cups are fine\n";
}
```

Exactly one of the two lines prints. For more than two outcomes, `else if` adds another question. They are tried from the top, and only the first one that is true runs:

```cpp
if (cupsLeft == 0) {
    std::cout << "Sold out\n";
} else if (cupsLeft < 5) {
    std::cout << "Last few\n";
} else {
    std::cout << "Plenty\n";
}
```

A variable made inside `{ }` lives only until its `}`. If a line after the `}` uses it, the compiler says the name is undeclared, or not declared in this scope, even though you can see it a few lines up. When a value is chosen by an `if` and used after it, make the variable before the `if`, with a first value, and give it its other value inside.

## And, or

`&&` joins two conditions into one that is true only when both are. `||` makes one that is true when at least one is:

```cpp
bool canBrew = kettleOn && cupsLeft > 0;
bool closeEarly = isSunday || cupsLeft == 0;
```

Read them aloud: "kettle on and cups left", "Sunday or sold out". `!` turns true into false and back: `!kettleOn` is true when the kettle is off.

## Three ways a decision goes wrong

**One equals sign.** `==` compares. A single `=` gives a variable a new value, and in a condition it does that quietly: `if (cupsLeft = 0)` sets `cupsLeft` to 0 and never runs its lines. With `-Wall`, both compilers warn about an assignment used as a condition and suggest parentheses. Do not add them. The fix is `==`.

**A semicolon after the round brackets.** `if (runningLow);` is a whole `if` that does nothing when it is true. The `{ }` below it is no longer part of it, so its lines always run. When an `else` follows, the compiler refuses the `else`, because it no longer has an `if` in front of it.

**No braces.** Without `{ }`, only the one statement right after `if` belongs to it:

```cpp
if (runningLow)
    std::cout << "Order more cups\n";
    std::cout << "Call the supplier\n";   // runs every time
```

The indentation says otherwise, but the compiler does not read indentation. Both compilers warn that the indentation is misleading. Always writing the braces avoids the question. And every `{` needs its own `}`: a missing one confuses the compiler for the rest of the file, so its error, which says something like `expected '}'`, can point far below the mistake.

## Your work in this issue

Open `src/rules.cpp`. Today's slip is at the top of `main`, and Check tries other slips, so build every task on the names. Build and run with `g++ -std=c++17 -Wall src/rules.cpp -o rules && ./rules`. The first build warns that some variables are unused; those warnings go away as your tasks use them. Read every other warning before you run. To try each way through a rule, change a value on the slip, build and run again, then put it back.
