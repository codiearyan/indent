# Grouping values with a struct

## What you will be able to do

So far every value had its own variable. A repair is a ticket, an owner, an item and the minutes at the bench, and in code that has meant four loose variables that only belong together because their names say so. Pass them to a function and you pass four; keep a list of repairs and you keep four lists. C++ lets you make a type of your own that holds them as one. By the end of this issue you will be able to:

- write a struct, with members of the types you choose
- make one, and read and change its members with a dot
- give members a starting value, and say why one without it is a trap
- put a struct inside another struct

## The request from Dorrit

> **Dorrit:** Every repair I take in is four things on a slip, and on the laptop it is four variables that drift apart. Last week a ticket number ended up with someone else's clock. I want one thing per repair. And when I ring someone, I need their name and number with the repair, not on a sticky note.

All four tasks are in `src/slip.cpp`.

## A type of your own

A **struct** names a group of values and the type of each:

```cpp
struct Cup {
    std::string tea;
    int sugars = 0;
    bool milk = false;
};
```

`Cup` is now a type, like `int`. Each line inside is a **member**: a type and a name, as for a variable. The whole thing ends with a semicolon after the closing brace. Leave it off and the compiler reads the struct and the line below it as one, and stops with something like "expected ';' after struct". The error may point at the line under the `}`, so look one line up.

A struct is written above the first line that uses it, usually near the top of the file, outside any function.

## Making one and using its members

```cpp
Cup order;
order.tea = "assam";
order.sugars = 2;
std::cout << order.tea << " with " << order.sugars << "\n";
```

`Cup order;` makes one cup, with all its members inside it. A dot reaches a member: `order.sugars` reads it, and `order.sugars = 2` changes it. Each cup has members of its own, so changing one cup leaves every other cup as it was.

A struct can also be filled in one line, with its values in braces in the order the members are written: `Cup order = {"assam", 2, true};`. That is short, but the order has to match exactly. Setting members by name says which is which.

Ask for a member that is not there, or spell one differently, and the compiler names it. Clang says "no member named 'sugar' in 'Cup'", GCC says "'struct Cup' has no member named 'sugar'". Both give you the name it could not find and the struct it looked in.

## Where a member starts

Look again at `int sugars = 0;`. The `= 0` is the member's starting value: every new cup starts with no sugar. Without it, `Cup order;` leaves `sugars` holding whatever was in that memory before, a different number from run to run, and nothing warns you. A text member starts empty by itself, but a number or a `bool` does not. Give every number and `bool` member a starting value where the struct writes it, and a new one is always in a known state.

## A struct inside a struct

A member can be a struct itself:

```cpp
struct Table {
    int number = 0;
    Cup cup;
};

Table window;
window.number = 4;
window.cup.tea = "oolong";
```

Two dots reach inside: `window.cup.tea` is the tea of the cup at that table. `Cup` has to be written above `Table`, because the compiler reads from the top down and must know a type before a member can use it.

A function takes and gives back a struct like any other value. A function that only reads one takes it as a `const` reference, as you did with texts: `void printCup(const Cup& cup)`. The next issue is about that hand-over.

C++ also lets a struct have functions of its own, and members that only those functions can touch. That is a different tool, for after this repo. Here a struct is just values kept together.

## Your work in this issue

Open `src/slip.cpp`. Task 1 writes `Repair`. From Task 2 on, Check builds each task with a `Repair` of its own, written as Task 1 asks, so a slip in Task 1 does not hold the others back. Check makes repairs with values of its own, so the story's slip cannot be typed in as the answer. Build and run with `g++ -std=c++17 -Wall src/slip.cpp -o slip && ./slip`.
