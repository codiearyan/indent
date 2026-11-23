# Structs and functions

## What you will be able to do

A struct keeps the values of one thing together. The next step is to hand that thing to functions: one that reads it, one that changes it, one that changes every one in a list, one that finds the right one and hands it back. The choices are the ones you made for vectors, now for a type you wrote. By the end of this issue you will be able to:

- take a struct by `const` reference, and say why not by copy
- change the caller's struct through a reference
- change every struct in a vector with a loop that reaches each one
- find the struct that matches, and give it back

## The request from Kasimir

> **Kasimir:** My bench has a handful of repairs on it, each with its ticket, its minutes so far, and whether it is done. I want a label for each, a way to log time, and the bench clock ran slow all morning, so the open ones are each missing the same few minutes. And when Dorrit calls out a ticket, I want that repair, not a hunt.

`Repair` is written for you at the top of `src/bench.cpp`. All four tasks are functions below it.

## Reading: a const reference

```cpp
std::string cupLabel(const Cup& cup) {
    return cup.tea + " x" + std::to_string(cup.sugars);
}
```

Taken as a copy instead, `Cup cup`, the function gets a cup of its own, every member copied on every call, texts included. The `&` reads the caller's own cup, and `const` promises not to change it. Break the promise, with `cup.sugars = 3`, and the compiler refuses the line with words like "const-qualified", "read-only" or "assignment of member ... in read-only object". A `const` reference also accepts a struct made on the spot, which a plain reference does not.

## Changing: a reference

```cpp
void addSugar(Cup& cup, int spoons) {
    cup.sugars += spoons;
}
```

Without `const`, the reference is the caller's cup itself, and the change stays after the call. Without the `&`, the function changes a copy that is thrown away when it ends. That mistake builds without a word and only shows in what the caller has afterwards, which is what Check looks at.

## Changing every one in a vector

A vector can hold structs like any other value: `std::vector<Cup> tray`. To change each one, the loop variable must be a reference:

```cpp
for (auto& cup : tray) {
    if (!cup.milk) {
        cup.sugars += 1;
    }
}
```

`auto& cup` is each cup where it stands in the tray. Written `auto cup` or `Cup cup`, the loop gets a copy of each one, changes the copy, and drops it at the end of the round: the tray is the same as before. Written `const auto& cup`, the loop can read but not change, and the compiler refuses the `+=`. So: `const auto&` to read, `auto&` to change.

## Finding one and giving it back

A function can give back a whole struct, the way it gives back an `int`. To find one in a vector:

```cpp
Cup firstWithMilk(const std::vector<Cup>& tray) {
    for (const auto& cup : tray) {
        if (cup.milk) {
            return cup;
        }
    }
    return Cup{};
}
```

The `return` inside the loop hands back a cup as soon as one matches, and the function ends there. The answer "none" is only known once every cup has been looked at, so its `return` comes after the loop. Put it in an `else` inside the loop and the function gives up at the first cup that does not match. `Cup{}` is a new cup with every member at its starting value: a plain way to say "nothing found".

## Your work in this issue

Open `src/bench.cpp` and read `Repair` first. Each task says how its function takes the repair or the vector. Check passes repairs of its own and looks at them again after the call: one that must not change is found out when it does, and one that must change is judged by what the caller has afterwards. Build and run with `g++ -std=c++17 -Wall src/bench.cpp -o bench && ./bench`.
