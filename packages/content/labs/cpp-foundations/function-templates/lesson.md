# One function for every type

## What you will be able to do

Thirty-five issues in, you have written the same function more than once: once for whole numbers, once for prices, once for texts, each a copy of the last with one word changed. This part of the repo is about writing such things once. It starts with the simplest case, a function whose type is left open. By the end of this issue you will be able to:

- write a function template, with a name for the type that changes
- say what the compiler makes from it, and when
- call it with the type worked out by the compiler, or said in angle brackets
- read the long error a template gives, and find your own line in it

## The request from Ambrose

> **Ambrose:** I have `largestTicket` and `largestBill`, and they are the same function. Last week I fixed a mistake in one and forgot the other. Now Dorrit wants the largest of her deposits too. I am not writing it a third time.

His functions are in `src/quotes.cpp`, above Task 1. Read them side by side: the only difference is `int` against `double`.

## A recipe with a gap for the type

A bicycle shop has the same trouble with a function that picks the smaller of two values:

```cpp
template <typename T>
T smallerOf(const T& a, const T& b) {
    if (b < a) {
        return b;
    }
    return a;
}
```

The first line says that what follows is a template, and that `T` stands for a type, any type. In the function itself, `T` is used wherever the type was. You may see `class` instead of `typename` in the angle brackets; for this they mean the same.

A template is not a function yet. It is a recipe the compiler uses to write functions. When the program calls `smallerOf(18, 7)`, the compiler sees two `int`s, takes `T` to be `int`, and writes `smallerOf` for `int` from the recipe, as if you had typed it out. When another line calls `smallerOf(2.5, 9.75)`, it writes a second one for `double`. This happens while the program is built, once for each type it is called with. A type nobody calls it with costs nothing.

That is also why the template must be written above the lines that call it: to write the function for a type, the compiler needs the whole recipe at that point.

## Worked out or said

Usually the compiler works `T` out from the values you hand it. It is strict about it. In `smallerOf(18, 2.5)` it gets `int` from the first value and `double` from the second, and a template with one `T` cannot be both. It never picks one for you, and it stops with something like:

```
error: no matching function for call to 'smallerOf'
note: candidate template ignored: deduced conflicting types for parameter 'T' ('int' vs. 'double')
```

GCC says `('int' and 'double')` instead of `vs.`, and writes the call out with its types. There are two ways out. Hand it values of one type, `smallerOf(static_cast<double>(18), 2.5)`, or say which type `T` is, in angle brackets after the name: `smallerOf<double>(18, 2.5)`. Then nothing is worked out: `T` is `double`, and `18` becomes `18.0` on the way in, exactly as it would for a plain function that takes a `double`.

Saying the type also works where there is nothing to work it out from, such as a list written in braces, handed to a template that takes a `std::vector<T>`: `averageOf<double>({2, 7.5, 3})`.

## When a type lacks what the template uses

The recipe never says what a type must offer. It is in the lines: `smallerOf` copies values and compares them with `<`, so it works for every type that can be copied and compared with `<`, and for no other. Call it with a struct of your own that has no `<`, and the compiler writes the function for that struct, reaches `b < a`, and stops.

The error is long, and it names three places. Read it for these:

```
src/bikes.cpp:4:11: error: invalid operands to binary expression ('const Wheel' and 'const Wheel')
src/bikes.cpp:21:5: note: in instantiation of function template specialization 'smallerOf<Wheel>' requested here
```

The first line is inside the template, on your line, and names the types. GCC writes `no match for 'operator<'` and then `(operand types are ...)`. The next line says where the template was called, and with which type: `smallerOf<Wheel>`. GCC puts it first, as `In instantiation of ...` and `required from here`. Either way, there are two questions. Was the template called with a type it should not be? Or does a line of the template ask more of a type than it needs to? Here, a template that only uses `<` asks the least, and works for the most types.

Newer C++ can write what a type must offer on the template line itself; with C++17, the lines are the list.

## Your work in this issue

Write the three tasks in `src/quotes.cpp` in order. Task 3 calls your Task 2 template with an `int` and two `double`s, so expect the error above the first time you build it. Build and run with `g++ -std=c++17 -Wall src/quotes.cpp -o quotes && ./quotes`. Check calls your templates with types of its own, one of which offers nothing but copies and `<`.
