# Functions kept as values

## What you will be able to do

Last issue handed a lambda to an algorithm, which used it at once and let it go. Sometimes a function has to be kept: in a variable, in a list, in a table by name, to be called later, maybe much later. This issue is about keeping functions, and it ends the part with the rules that tie it together. By the end of it you will be able to:

- keep any function of one shape in a `std::function`, and ask it whether it holds one
- take a function as a parameter, and choose between a template and `std::function`
- give a function back from a function, safely
- keep functions in a `std::map` by name, and run one by its name

## The request from Ambrose

> **Ambrose:** Every job at the counter is a list of steps: clean it, oil it, regulate it. Each step adds its own time to the repair. I want the steps written down once, in one table, and the counter to run them by name. And when we add a step next year, nothing else should change.

His rules are in `src/rules.cpp`, with the `Repair` class at the top.

## A box for a function

A lambda's type has no name, so it cannot be a member of a map or the type of a parameter written out. `std::function`, from `<functional>`, gives the shape a name instead:

```cpp
std::function<double(double)> discount = [](double price) { return price * 0.9; };
std::cout << discount(40) << "\n";   // 36
```

The angle brackets give the shape: what it gives back, then the types of its parameters in round brackets. Anything callable with that shape fits: a lambda, a lambda with captures, a plain function. Assign another one, and the same variable now holds that.

A `std::function` can also hold nothing. It starts empty when made without a value, and calling it then throws `std::bad_function_call`. Uncaught, it ends the program as in part 7, with something like `terminate called after throwing an instance of 'std::bad_function_call'`, or on a Mac `libc++abi: terminating due to uncaught exception of type std::__1::bad_function_call`. Asked as a condition, it says whether it holds something: `if (discount) { ... }`.

## Taking a function, giving one back

A function that takes another one has two ways to write it:

```cpp
template <typename Rule>
int countWhere(const std::vector<int>& prices, Rule rule);                         // a template
int countWhere(const std::vector<int>& prices, const std::function<bool(int)>& rule);   // a box
```

The plain rule: a function that only calls what it is handed, while it runs, takes it as a template parameter, as the algorithms do. One that keeps it, in a member, a list or a table, needs `std::function`, because something kept needs a type with a name. A `std::function` is worth passing as a `const` reference, as any larger value is.

Giving a function back works the same way in both directions:

```cpp
std::function<double(double)> percentOff(int percent) {
    return [percent](double price) { return price * (100 - percent) / 100; };
}
```

The rule from last issue holds without exception: what is given back is called after `percentOff` has returned, so it keeps copies of what it needs. `[&percent]` would refer to a parameter that is already gone, and, unlike a plain lambda given back with `auto`, a `std::function` hides it so well that clang may not warn about it either.

## A table of functions

A `std::map` holds values of one type, and `std::function` is a type:

```cpp
std::map<std::string, std::function<double(double)>> offers = {
    {"staff", percentOff(20)},
    {"loyal", percentOff(5)},
};
```

Looking a name up has the traps of part 3, and one more. `offers[name]` on a name that is not there adds it, with an empty function, which then throws when called; on a `const` map the compiler refuses `[]` outright. `.at(name)` throws `std::out_of_range` for a missing name. `find`, compared with `end()`, asks without changing anything. And a name can be in the table with an empty function, so ask the function too.

## The part's repair rules

Five issues, one idea: write a thing once, and let it work with what it is given. When it does not, the compiler's message is long, and these are what to look for in it:

| You see something like | Look at |
| --- | --- |
| `invalid operands` or `no match for 'operator<'`, inside a template | what that line asks of a type, and the type it was called with |
| `deduced conflicting types` | values of two types for one `T`: say the type, or make them one |
| `requires template arguments` | a class template used without its type in angle brackets |
| `cannot be implicitly captured`, `is not captured` | a variable missing from a lambda's square brackets |
| a value that changes by itself, or nonsense, later | a capture by reference that outlived what it refers to |
| `std::bad_function_call` | an empty `std::function` that was called |

## Your work in this issue

Write the four tasks in `src/rules.cpp`, and try each in `main`. Build and run with `g++ -std=c++17 -Wall src/rules.cpp -o rules && ./rules`. Check builds each task with a `Repair` of its own that counts every repair, and hands your code rules of its own that count how often they run.
