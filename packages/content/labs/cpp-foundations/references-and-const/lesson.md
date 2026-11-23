# References and const

## What you will be able to do

In the last issue every argument was copied into its function, and that kept things safe: a function could not change what it was given. Sometimes changing it is the whole job. When Kasimir takes three springs out of the drawer, the drawer's count has to go down, not a copy of it. By the end of this issue you will be able to:

- let a function change the caller's own variable, with a reference
- give back more than one result through references
- promise with `const` that a function only reads what it is given
- choose between a copy, a reference and a `const` reference

## The request from Kasimir

> **Kasimir:** I wrote a function that takes springs out of the drawer. I call it, the count goes down inside it, and then the drawer still says twelve. I checked it three times. Where do the springs go?

All four tasks are in `src/drawer.cpp`, each a function above `main`.

## The copy problem

Here is the kind of function Kasimir wrote, about tea:

```cpp
void pour(int cups) {
    cups = cups - 1;
}

int cupsLeft = 10;
pour(cupsLeft);
std::cout << cupsLeft << "\n";   // still 10
```

`cups` is a copy of `cupsLeft`. The function takes one off its copy, and the copy is thrown away when the function ends. Nothing is wrong with the arithmetic; it happened to the wrong variable.

## A reference is another name

Put `&` after a parameter's type, and the parameter is no longer a copy. It is a **reference**: another name for the caller's own variable.

```cpp
void pour(int& cups) {
    cups = cups - 1;
}

int cupsLeft = 10;
pour(cupsLeft);
std::cout << cupsLeft << "\n";   // 9
```

Inside the function, `cups` and the caller's `cupsLeft` are the same variable under two names, so whatever happens to one happens to the other. The call looks exactly the same; only the first line of the function changed.

A reference parameter can also carry a result back. A function can give back only one value with `return`, but it can fill in as many reference parameters as it has:

```cpp
void splitBill(int pence, int& pounds, int& left) {
    pounds = pence / 100;
    left = pence % 100;
}
```

## const: only reading

Sometimes a function only reads what it is given, but the value is big. A `std::string` can hold a whole page, and copying it on every call is work for nothing. A reference avoids the copy, but it would also let the function change the caller's text by mistake. `const` closes that door:

```cpp
int countCups(const std::string& order) {
    // order can be read here, never changed
}
```

`const std::string&` reads as "a reference to a text that this function will not change". If a line in the function tries to change `order`, the compiler refuses it. For a number the error says something like the value is const or read-only; for a text it can be an error about `=` or `+=` with notes below it that mention `const`. That is the promise doing its job.

There is a second gain. A reference that is not `const` must be given a variable, because changing a value that has no name makes no sense. So `pour(10)` is refused, and so is passing a sum or a quoted text to a `std::string&`. The compiler says something like "no matching function for call to", with a note below it, or "cannot bind non-const lvalue reference". An **lvalue** is a value with a name, like a variable. A `const` reference accepts anything: a variable, a quoted text, a value worked out on the spot, or a variable that is itself `const`.

## Which one to use

- A small value the function only reads, like an `int`, a `double` or a `char`: a copy, as before.
- Something the function has to change for the caller: a reference, `int&`.
- A big value the function only reads, like a `std::string`: a `const` reference, `const std::string&`.

Putting `const` on a parameter the function has to change is a mistake the compiler catches. Leaving it off a parameter that is only read is a mistake it does not catch, so it is worth the habit.

## Your work in this issue

Open `src/drawer.cpp`. Each task says how its function takes each value. Check calls your functions with variables of its own and reads them after the call, so a function that changes a copy is found out. To try one yourself, make a variable in `main`, pass it in, and print it afterwards. Build and run with `g++ -std=c++17 -Wall src/drawer.cpp -o drawer && ./drawer`.
