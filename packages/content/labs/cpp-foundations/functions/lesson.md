# Functions

## What you will be able to do

Ambrose's bill has the same sums in it again and again: the labour for this job, the labour for that one, a line for each part. Written out each time, one of them is always slightly different, and that is the one that is wrong. A function is a piece of program with a name, written once and used wherever it is needed. By the end of this issue you will be able to:

- write a function that takes values and gives one back
- write a function that does something and gives nothing back, with `void`
- call one function from another
- say why a function cannot change the caller's variable, yet
- read the errors and warnings that come with functions

## The request from Ambrose

> **Ambrose:** My rate is 48 an hour, and it's written in six places on the bill. Last year I changed it in five. Work it out in one place, and let every line of the bill ask that place.

All four tasks are in `src/bill.cpp`, each a function above `main`.

## Writing a function

A function has a first line and a body:

```cpp
double teaCost(int cups) {
    return cups * 2.5;
}
```

Read the first line from the left. `double` is the type of what the function gives back. `teaCost` is its name. In the round brackets are its **parameters**, each with a type and a name; here one `int` called `cups`. The body in `{ }` does the work, and `return` gives a value back and ends the function there.

Using it is called **calling** it. Write its name with a value in the round brackets, and the call stands for the value it gives back:

```cpp
double bill = teaCost(4);              // 10
std::cout << teaCost(2) + 1 << "\n";   // 6
```

The value in a call is an **argument**. When the function runs, its parameter `cups` starts as that value. More parameters are separated by commas, `double tip(double bill, int percent)`, and a call gives the arguments in the same order.

## Giving back and printing are different

`return` hands a value back to the code that called the function. `std::cout` shows text on the screen. A function that prints its answer gives nothing back, so the caller cannot add it up or pass it on. A function whose job is to work something out gives it back, and the caller decides whether to print it.

A function that only does something and gives nothing back has `void` where the type would be, and needs no `return`:

```cpp
void printOrder(std::string tea, int cups) {
    std::cout << cups << " x " << tea << "\n";
}
```

## One function calling another

A function can call any function the compiler has already met, just as `main` does. That is the point of them: `orderTotal` can call `teaCost` instead of repeating its sum, so the price lives in one place.

The compiler reads the file from the top down. If `main` calls `teaCost` and `teaCost` is written below `main`, the compiler has not met it yet at that line, and says the name is undeclared, or not declared in this scope. Write each function above the first function that calls it. Or put just its first line with a semicolon, a **declaration**, near the top, and the whole function anywhere below:

```cpp
double teaCost(int cups);   // the body comes later in the file
```

## An argument is copied

A parameter is a copy of the argument. The function can change its own copy freely, and the caller's variable stays as it was:

```cpp
void addSugar(int cups) {
    cups = cups + 1;   // changes the copy only
}
```

After `addSugar(order)`, `order` is what it was. That is often exactly right. When a function has to change the caller's own variable, it needs a reference, which is the next issue.

## What the compiler says about functions

- **A function that can end without a value.** If a function that gives back a `double` can reach its `}` without a `return`, the compiler warns about a non-void function that does not return a value, or that control reaches its end. Take it seriously: the caller gets whatever was left in memory.
- **The wrong number of arguments.** Calling `teaCost(4, 2)` when it takes one value is an error, something like "no matching function for call to" or "too many arguments to function". Count the arguments against the parameters.
- **void with a value.** `return 5;` in a `void` function is an error.

## Your work in this issue

Open `src/bill.cpp`. Write each function above `main`, under its `// Task` comment. Check calls your functions from code of its own, with its own values, and looks separately at what each one gives back and what it prints. To try a function yourself, call it from `main` and print what it gives back, then build and run with `g++ -std=c++17 -Wall src/bill.cpp -o bill && ./bill`.
