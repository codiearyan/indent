# Small functions written where they are used

## What you will be able to do

Some functions are a single line, used in a single place, and giving each a name of its own at the top of the file costs more than the line itself. C++ lets you write such a function right where it is used. It also lets that small function take values from around it and keep them for later, which is where the care lies. By the end of this issue you will be able to:

- write a lambda with its parameters and its result, and keep it in a variable with `auto`
- capture a variable by value or by reference, and say which a task asks for
- see when a lambda outlives what it refers to, and what happens then
- read the errors a capture gives

## The request from Dorrit

> **Dorrit:** When a customer asks what a repair will cost, I give a quote, and a quote is a promise: if Kasimir finds more to do afterwards, the quote I gave stays what it was. The timer on the bench is the opposite. It has to add to the repair itself, and show what is on the repair right now.

Her counter is `src/timer.cpp`, with the `Repair` class given at the top.

## A function with no name

A bus company works out how late a bus is. As a lambda:

```cpp
auto lateBy = [](int due, int arrived) { return arrived - due; };
std::cout << lateBy(14, 19) << "\n";   // 5
```

The square brackets start a lambda. The round brackets hold its parameters, as for any function, and the braces its body. The result type is worked out from what the `return` gives back: here an `int` minus an `int`, so an `int`. To say it yourself, write it after an arrow: `[](int due, int arrived) -> int { ... }`. A lambda whose body has no `return` gives back nothing, `void`.

Every lambda has a type of its own, made by the compiler, which has no name you could write. That is why it is kept with `auto`, and why a function that gives one back writes `auto` in front of its name: the compiler works the type out from the `return`.

## Taking values from around it

A lambda can only use its own parameters, and nothing else from the function around it, until its square brackets name it. That list is its capture list:

```cpp
int grace = 3;
auto isLate = [grace](int minutesLate) { return minutesLate > grace; };
```

Without `grace` in the brackets, the compiler stops with `variable 'grace' cannot be implicitly captured in a lambda with no capture-default specified`, or, from GCC, `'grace' is not captured`. Both name the variable.

There are two ways to capture, and they behave very differently:

- **By value**, `[grace]`: the lambda keeps a copy, made at the moment the lambda is made. Change `grace` afterwards and the lambda never sees it. The copy belongs to the lambda, which may read it and not change it.
- **By reference**, `[&grace]`: the lambda keeps a way back to `grace` itself. Every call reads `grace` as it is then, and a change made through it changes `grace`.

`[=]` and `[&]` capture, by value or by reference, every variable the lambda uses. They save typing, and hide which variables are taken; naming them keeps it plain.

Which one a task asks for comes from what must happen to the variable. A value that must stay as it was, such as a price promised, is captured by value. A variable that must change, or whose changes must be seen, is captured by reference.

## When the lambda outlives what it refers to

A lambda can be kept, returned and called long after the line that made it. A capture by value comes along inside it, so it is always there. A capture by reference is only a way back, and it leads nowhere once that variable ends:

```cpp
auto makeAlarm(int minutes) {
    return [&minutes]() { return minutes > 10; };   // minutes ends at the }
}
```

`minutes` is a parameter of `makeAlarm`, gone when it returns, and every call of the alarm reads a variable that is not there. Like the dangling pointers of part 6, this has no promised result: the program may seem to work, print nonsense or stop. Clang warns `address of stack memory associated with parameter 'minutes' returned`; GCC usually says nothing. The rule is short: a lambda that outlives the function that made it captures by value, or refers only to what lives longer than it, such as the caller's own variable.

## Your work in this issue

Write the three tasks in `src/timer.cpp`. Build and run with `g++ -std=c++17 -Wall src/timer.cpp -o timer && ./timer`, and try a quote and a timer on the same repair in `main`. Check builds each task with a `Repair` of its own that counts every use of a repair that has ended, and calls your lambdas after the functions that made them have returned. Your own build counts nothing, so a run that seems to work proves nothing.
