# States with enum class

## What you will be able to do

A repair is always in one of a few states: waiting, on the bench, ready, collected. Kept as a number, 2 means whatever someone last decided it meant. Kept as text, "Ready" and "ready" are two different states, and a typo is a new one. C++ has a type for exactly this: a short list of named values, and nothing else. By the end of this issue you will be able to:

- write an `enum class` and use its values
- compare a value with another, and read what the compiler says when you compare it with a number
- choose with a `switch` that names every value, and hear from the compiler when one is missing
- turn a value into words for a person

## The request from Dorrit

> **Dorrit:** People ring all day to ask where their clock is. The slip says 2, and nobody can tell me whether 2 is on the bench or ready. I want the states to have names, I want to know whether a clock can be collected, and I want the words I read out to be the same every time.

All four tasks are in `src/status.cpp`.

## A list of named values

```cpp
enum class Size { Small, Medium, Large };
```

`Size` is a type with exactly three values, and it ends with a semicolon after its `}`, like a struct. A value is always written with its type's name in front: `Size::Medium`. Written alone, `Medium` is a name the compiler does not know: clang says "use of undeclared identifier 'Medium'", GCC says "'Medium' was not declared in this scope".

```cpp
Size cup = Size::Medium;
if (cup == Size::Large) { ... }
```

Values are compared with `==` and `!=`. An `enum class` value is not a number, so `cup == 2` is refused: clang says "invalid operands to binary expression ('Size' and 'int')", GCC says "no match for 'operator=='" with "operand types are 'Size' and 'int'". That refusal is the point. You never have to remember what 2 meant. For the same reason, `std::cout << cup` is refused too, with a long message that starts with "invalid operands to binary expression" in clang and "no match for 'operator<<'" in GCC: a value of an `enum class` is not printed by itself. Turn it into words first, with a `switch` like the one below.

There is an older form without `class`, a plain `enum`. Its values turn into numbers by themselves and are written without the type's name, so `cup == 2` builds without a word. Prefer `enum class`.

## Choosing with switch

When each value needs its own answer, a `switch` names them one by one:

```cpp
std::string sizeName(Size size) {
    switch (size) {
        case Size::Small:
            return "small";
        case Size::Medium:
            return "medium";
        case Size::Large:
            return "large";
    }
    return "";
}
```

`switch` jumps to the `case` whose value matches, and runs from there. Here each case ends in a `return`, which leaves the function. A case that ends without `return` or `break` runs on into the case below it, so `Small` would get the next case's answer too. When a case does not return, end it with `break;`, which jumps to the line after the `switch`.

## When a value is missing

Leave out `case Size::Large:` and both compilers warn, under `-Wall`:

```
warning: enumeration value 'Large' not handled in switch
```

That warning is why a `switch` on an `enum class` names every value and has no `default:`. A `default` catches every value without a case of its own, so the compiler stops warning, and a value added to the type a month later quietly gets the default's answer. Without one, the compiler tells you every place that needs a new case.

What about the `return "";` after the switch? Every value has a case, so it never runs. Clang knows that. GCC does not, because a `Size` could in theory hold some other number, and without that last line it warns "control reaches end of non-void function". End the function with a `return` after the switch and both compilers are quiet.

A function can give a value of an enum class back, too: `return Size::Large;`. Two cases can share one answer by standing one under the other with nothing between them.

## Your work in this issue

Open `src/status.cpp`. Task 1 writes `Status`. From Task 2 on, Check builds each task with a `Status` of its own, written as Task 1 asks, so a slip in Task 1 does not hold the others back. Check calls each function with every state. Build and run with `g++ -std=c++17 -Wall src/status.cpp -o status && ./status`.
