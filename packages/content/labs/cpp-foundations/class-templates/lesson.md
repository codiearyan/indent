# A class for any type

## What you will be able to do

Last issue left the type of a function open. A class can be written the same way, and much of the standard library is: `std::vector<int>` and `std::vector<Repair>` are two classes made from one template. This issue writes one of your own. By the end of it you will be able to:

- write a class template, with its members and its member functions
- write a member function's body below the class, as a template of its own
- say why the whole of a class template lives in its header
- use it with a type of your own, and tell two classes made from it apart

## The request from Kasimir

> **Kasimir:** Small parts live in caddies on the bench: screws in one, jewels in another, and the shelf above holds the repairs waiting their turn. Each caddy has room for so many and no more. I wrote a class for the screw caddy, and now I need the same class for jewels and for repairs.

The caddy goes in `src/caddy.h`, so every file of the bench can use it. `src/main.cpp` fills the shelf with repairs.

## A class with its type left open

A bicycle shop keeps baskets of spare parts. One basket class, for any part:

```cpp
template <typename T>
class Basket {
private:
    std::vector<T> parts;

public:
    void put(const T& part) { parts.push_back(part); }
    int size() const { return static_cast<int>(parts.size()); }
};
```

The template line goes above the class, and inside it `T` is a type like any other: a member's type, a parameter's, what a function gives back. Members are private or public, constructors take what they take and `const` means what it meant in part 5. Nothing about classes changes.

Unlike a function template, a class template is always used with its type said: `Basket<int> bolts;`, `Basket<std::string> labels;`. `Basket` alone is not a class, and a line that uses it as one, such as `int countOf(const Basket& b)`, stops with something like `use of class template 'Basket' requires template arguments`. GCC says `invalid use of template-name 'Basket' without an argument list`.

The two classes made from one template are strangers. A `Basket<int>` is not a `Basket<double>`, and a function that takes one refuses the other, however alike they look.

## A member written below the class

A body can also go below the class, as in part 5. For a template, that body is a template of its own, so it needs its own template line, and the class it belongs to is `Basket<T>`:

```cpp
template <typename T>
const T& Basket<T>::first() const {
    return parts[0];
}
```

Leave the template line off and the compiler stops at the first `T`, with something like `unknown type name 'T'` or `use of undeclared identifier 'T'`, or from GCC `'T' does not name a type` or `'T' was not declared in this scope`. Write `Basket::first` without `<T>` and it says, again, that the template requires its arguments.

## Why the whole template lives in the header

In part 5, the class went in a header and the bodies of its functions in a `.cpp` file, compiled once. A template cannot be split that way, and the reason is the one from last issue: the compiler writes `Basket<int>` from the recipe in each file that uses it, and to write `first` for `int` it needs the body of `first`, right there.

Say the bicycle shop puts the body of `first` in `stock.cpp`, and `till.cpp` includes `basket.h` and calls `first` on a `Basket<int>`. While it builds `till.cpp`, the compiler sees only the declaration, so it trusts that some other file has written `Basket<int>::first`. None has: `stock.cpp` holds a recipe, not a function. The linker then stops with something like `Undefined symbols` on a Mac or `undefined reference to` on Linux, naming `Basket<int>::first() const`. It may even work in `stock.cpp` itself, which sees the body, and fail everywhere else.

So the whole template goes in the header, bodies included, inside the class or below it. The include guard keeps a file from meeting it twice.

## Your own types in it

A class template takes your own types as readily as `int`: a `Basket<Bike>` holds bikes. It asks of the type only what its lines use. `Basket` copies parts into a vector, so it works for any type that can be copied. Give it a line that compares two parts with `==`, or a vector made with a size, which needs parts made from nothing, and it no longer works for every type: the error names the type and points at that line.

## Your work in this issue

Tasks 1 and 2 are in `src/caddy.h`, Task 3 in `src/main.cpp`. Build and run with `g++ -std=c++17 -Wall src/main.cpp -o bench && ./bench`: there is no other `.cpp` file to build, because everything about the caddy is in its header. Check builds the header into a program of its own, with a type of its own that offers nothing but copies.
