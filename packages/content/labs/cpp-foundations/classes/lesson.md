# From a struct to a class

## What you will be able to do

A struct keeps a repair's values together, and any line of the program can change any of them. That was fine while every value was allowed. Now the bench has rules, and a struct cannot keep a rule: it holds whatever it is given. A class can. It keeps its values to itself and lets the rest of the program change them only through functions of its own, which check the rule first. By the end of this issue you will be able to:

- write a class, with members under `private:` and functions under `public:`
- write member functions that read and change the class's own values
- keep a rule inside a function, which says with `true` or `false` whether it did the work
- read the compiler's error when a line reaches a private member

## The request from Kasimir

> **Kasimir:** Somebody's time card says the cuckoo clock has had minus 40 minutes at the bench. Another says 900 minutes in one go, which is more than a whole day. The card took both without a word. I want a card that refuses them.

All three tasks are in `src/timecard.cpp`, inside the class the starter gives.

## A class keeps its values to itself

Here is a water tank, written as a class:

```cpp
class Tank {
private:
    int litres = 0;

public:
    int getLitres() {
        return litres;
    }
};
```

`private:` and `public:` are labels. Each one covers every line below it, until the next label. A **private** member can only be reached by the class's own functions. A **public** one can be reached from anywhere. Like a struct, a class ends with a semicolon after its closing brace; leave it off and the compiler says something like "expected ';' after class".

`class` and `struct` are almost the same thing in C++. The one difference is where they start: a struct's members are public until a label says otherwise, a class's are private. So a class with no labels at all hides everything, its functions included.

Try to reach a private member from outside, and the compiler refuses:

```cpp
Tank garden;
garden.litres = -50;
```

Clang says "'litres' is a private member of 'Tank'". GCC says "'int Tank::litres' is private within this context". Both name the member, so you know which line tried to reach it.

## Member functions

`getLitres` is a **member function**: a function written inside the class. It is called on one tank, with a dot, like a member: `garden.getLitres()`. Inside it, `litres` means the litres of the tank it was called on. Two tanks each have their own `litres`, and the same function reads whichever one it was called on.

A member function that changes a member is written the same way:

```cpp
bool fill(int amount) {
    if (amount < 1 || litres + amount > 200) {
        return false;
    }
    litres += amount;
    return true;
}
```

## Why the rule lives in a function

A tank holds 200 litres. If `litres` were public, every line that changes it would have to remember that, and the one line that forgets lets the tank hold 250. With `litres` private, there is exactly one way in: `fill`. The rule is written once, in the place that cannot be skipped.

`fill` also says what happened. It gives back `true` when it filled the tank and `false` when it refused, and in that case it changes nothing. The code that called it decides what to do next: print a warning, try a smaller amount. A function that keeps a rule never half does the work.

## A name that hides a member

```cpp
void setLabel(const std::string& label) {
    label = label;
}
```

Inside this function, `label` is the parameter, not the member: the nearest name wins. The line tries to give the parameter its own value, and since the parameter is `const`, the compiler refuses. With a parameter that is not `const`, it builds, perhaps with a warning, and does nothing at all, and the member never changes. Give the parameter a name of its own, like `text`. Every member function also has `this`, a way to name the object it was called on, so `this->label` always means the member; you will meet it again.

Classes can also be built from other classes, and C++ has more tools for that, such as `virtual` functions. They come later. Here a class is values kept private and the functions that guard them.

## Your work in this issue

Open `src/timecard.cpp`. Each task is written inside `class Repair`, under its own `// Task` comment, with the labels it asks for. Check builds each task on its own, with the lines of the others taken out, so an unfinished task never holds another back. For Task 3, Check uses `minutes`, `getMinutes` and `addMinutes` of its own, written as Task 2 asks. Build and run with `g++ -std=c++17 -Wall src/timecard.cpp -o timecard && ./timecard`.
