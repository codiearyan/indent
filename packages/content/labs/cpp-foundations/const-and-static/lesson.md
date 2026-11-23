# Const and static members

## What you will be able to do

Dorrit's counter screen shows repairs, and it has no business changing them. Since the references issue you have passed what a function only reads as a `const` reference. A class has to say which of its functions only read, or a `const` repair cannot use any of them. And some things belong to no single repair: the last ticket number given out, the limit of a day at the bench. By the end of this issue you will be able to:

- mark a member function `const`, and call it through a `const` reference
- choose between a getter that gives back a copy and one that gives back a `const` reference
- read the errors when `const` is missing, or when a `const` function tries to change something
- write `static` members: a count shared by every object, a constant of the class, and a function of the whole class

## The request from Dorrit

> **Dorrit:** My screen only shows repairs, so it takes them as `const`, and now it cannot even read their tickets. Also, I type the ticket numbers myself, and two clocks went home with the same one. The program should hand them out. And Kasimir says no repair gets more than 480 minutes in a day.

All three tasks are in `src/screen.cpp`, inside the class the starter gives.

## A member function that only reads

```cpp
class Kettle {
private:
    int degrees = 20;

public:
    int getDegrees() const {
        return degrees;
    }
    void heat() {
        degrees = 100;
    }
};
```

`const` after the round brackets promises that `getDegrees` changes nothing in the kettle. Only such functions can be called on a kettle that must not change, such as one passed as `const Kettle&`:

```cpp
void show(const Kettle& kettle) {
    std::cout << kettle.getDegrees() << "\n";
}
```

Leave `const` off `getDegrees`, and `show` no longer builds. Clang says something like "'this' argument to member function 'getDegrees' has type 'const Kettle', but function is not marked const", GCC "passing 'const Kettle' as 'this' argument discards qualifiers". Both mean: this function did not promise to leave the object alone.

The promise is checked. Mark `heat` as `const`, and its line `degrees = 100;` is refused: clang says "cannot assign to non-static data member within const member function 'heat'", GCC "assignment of member 'Kettle::degrees' in read-only object". So mark every function that only reads, and none that changes.

## A copy, or a const reference

A getter that gives back `int` hands out a copy, and for a number that costs nothing. A text can be long, and copying it on every call is work for nothing. A getter can give back a `const std::string&` instead: the caller reads the member where it is, and cannot change it. What a getter must never hand out is a plain `std::string&`, which lets the caller change the member behind every rule of the class. Inside a `const` function every member is `const`, so the compiler refuses that, with "drops 'const' qualifier" from clang or "discards qualifiers" from GCC.

## Static members belong to the class

A normal member exists once in each object. A **static** member exists once for the whole class, shared by every object:

```cpp
class Kettle {
private:
    static int made;
public:
    static const int maxLitres = 2;
    Kettle() { made = made + 1; }
    static int count() { return made; }
};

int Kettle::made = 0;
```

`made` counts every kettle ever made, so it cannot live in any one of them. A static member that is not `const` is declared in the class and defined once below it, with its type, the class's name and `::`. Forget that line and every file still compiles, but the linker stops: "Undefined symbols" on a Mac, "undefined reference to `Kettle::made'" on Linux. You may also write `inline static int made = 0;` inside the class, which C++17 allows instead of the line below it.

`maxLitres` is a constant of the class: `static const` and a whole number, so it gets its value right where it is declared. Anyone reads it with the class's name: `Kettle::maxLitres`.

`count` is a static member function. It runs without any kettle, as `Kettle::count()`, so it can only use static members; a line that reads `degrees` in it gets "invalid use of member" from either compiler.

## Your work in this issue

Open `src/screen.cpp`. Task 1 writes the members and the getters, Task 2 the day's limit and `addMinutes`, Task 3 the ticket count and the constructor that uses it, with the definition of `issued` below the class's `};`. Check builds each task with the other tasks' parts written by itself, as they ask. Build and run with `g++ -std=c++17 -Wall src/screen.cpp -o screen && ./screen`.
