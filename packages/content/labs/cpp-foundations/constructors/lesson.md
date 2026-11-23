# Constructors: a repair that starts right

## What you will be able to do

The last issue's repair kept its rules once it existed, but it came into the world empty: no ticket, no item, and a program could forget to fill them in. A class can say exactly how an object is made, so that it is right from its first moment. That job belongs to a constructor. By the end of this issue you will be able to:

- write a constructor that gives every member a value, with a member initialiser list
- say why the list follows the order of the members, and read the warning when it does not
- write a constructor that takes nothing, and say when a program needs one
- mark a constructor with one parameter `explicit`, and say what that stops

## The request from Dorrit

> **Dorrit:** Kasimir found a repair on the bench with no ticket and a few billion minutes on it. Somebody made it and never filled it in. When I take a clock in, it should get its ticket and its item right then, in one go. And the rack needs empty repairs for the free hooks, and the post brings clocks with only a ticket.

All three tasks are in `src/intake.cpp`, inside the class the starter gives.

## A constructor

A **constructor** is a member function with the class's name and no return type, not even `void`. It runs once, when an object is made, and its job is to give every member its first value:

```cpp
class Locker {
private:
    const int number;
    std::string label;
    int days;

public:
    Locker(int n, const std::string& text) : number(n), label(text), days(0) {}
};

Locker blue(14, "gym kit");
```

`Locker blue(14, "gym kit");` makes a locker and runs the constructor with 14 and "gym kit". Write a return type in front and the compiler stops, with "constructor cannot have a return type" from clang or "return type specification for constructor invalid" from GCC.

## The member initialiser list

The part after the colon is the **member initialiser list**: each member, then its first value in round brackets. It gives the members their values as they are made, before the constructor's body runs.

For `number` there is no other way. It is `const`, so it gets a value once and keeps it. Try `number = n;` in the body instead, and the compiler refuses: clang says something like "cannot assign to non-static data member 'number' with const-qualified type", GCC "assignment of read-only member 'Locker::number'". A `const` member has a price, too: one locker can no longer be given another's values with `=`, since that would change its number.

The members always get their values in the order the class declares them, whatever order the list is written in. Write the list in another order and both compilers warn under `-Wall`, with a message that says a member "will be initialized after" another. Heed it: when one member's value is worked out from another's, the wrong order reads a member that has no value yet. Write the list in the members' order.

A member that no constructor gives a value, like `days` left out of the list, holds whatever was in that memory before: a number from nowhere, different from run to run. That is how a repair ends up with a few billion minutes.

## A constructor that takes nothing

Once a class has a constructor of its own, the compiler stops making the one that takes nothing. So `Locker spare;` fails, with something like "no matching constructor for initialization of 'Locker'" from clang or "no matching function for call to 'Locker::Locker()'" from GCC. You need one whenever objects are made without values: a plain `Locker spare;`, or `std::vector<Locker> row(10);`, which fills its ten places with new lockers. For the vector, the error appears inside the library's own files, with a line of yours marked "requested here" or "required from here".

```cpp
Locker() : number(0), label("empty"), days(0) {}
```

## One parameter, and explicit

A constructor with one parameter does a second job you may not want. With `Locker(int n)`, the line `Locker spare = 3;` turns the number 3 into a locker by itself, and so does passing 3 to any function that takes a `Locker`. Mark it `explicit`, and it only runs when the code asks by name, as in `Locker spare(3);`. Then `Locker spare = 3;` is refused, with "no viable conversion from 'int' to 'Locker'" from clang or "conversion from 'int' to non-scalar type 'Locker' requested" from GCC.

When an object ends, a **destructor** runs, written `~Locker()`. These classes have nothing for it to do, so you do not write one; it matters once a class looks after memory, much later.

## Your work in this issue

Open `src/intake.cpp`. Task 1 writes the members, their getters and the first constructor. For Tasks 2 and 3, Check builds the class with members, getters and that constructor of its own, written as Task 1 asks, so each constructor is judged on its own. Check makes repairs on memory that still holds old values, so a member your constructor forgets shows up. Build and run with `g++ -std=c++17 -Wall src/intake.cpp -o intake && ./intake`.
