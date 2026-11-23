# Read what went wrong

## What you will be able to do

Thirty issues in, your programs are long enough to go wrong in ways a first program never did: a page of errors for one mistake, a run that stops halfway, an answer that is quietly off. This part of the repo is about what to do then. It starts with reading. By the end of this issue you will be able to:

- read a long compiler error from its first line, and know when to stop reading
- tell a crash from a wrong answer from a program that never ends
- follow a wrong value back through the functions it came from, to the one that made it
- mend that function, and leave the others as they were

## The request from Kasimir

> **Kasimir:** My bench program has gone wrong three ways at once. The build prints more than a hundred lines at me. When it did build, last week, the spring order never finished and I had to shut the laptop. And Dorrit says my bills leave out the labour. I don't want it rewritten. Find the three mistakes and mend only those.

His program is `src/bench.cpp`. Each task is one of the three things going wrong.

## A long error, read from the top

Here is a garden centre's program, where someone tried to print a whole list of plants at once:

```cpp
std::vector<Plant> shelf = {{"fern", 4}, {"basil", 12}};
std::cout << shelf << "\n";
```

The compiler answers with a hundred lines or more. The first one says something like:

```
src/garden.cpp:9:15: error: invalid operands to binary expression ('ostream' and 'std::vector<Plant>')
```

GCC words it as `no match for 'operator<<'` and names the same two types. Either way, that line has everything you need: the file and line, and the two things on each side of `<<`. `std::cout` can print a number, a character or a text, but nobody ever told it what a whole vector of plants should look like.

Then come the other hundred lines. Each one starts with `note:` and is the compiler trying every kind of value `<<` knows how to print, and saying why it does not fit: not a `char`, not an `int`, not a `double`, and so on. They are not more mistakes. They are one mistake, explained at great length. Read the first error, fix it, build again, and the whole page goes with it.

Sometimes the first error points into the standard library's own files, with long paths and code you never wrote. Then look for the line in it that names your file: it is marked `requested here` or `required from here`, and that is the line of yours that asked for it.

## Three ways a run goes wrong

Once a program builds, it can still go wrong in three ways that look nothing alike in the terminal.

A **crash** stops the program in the middle. The last line is not yours: the shell says something like `segmentation fault` or `abort`, the words differ between systems, and nothing after that point runs. Look at what the program did just before it stopped.

A **wrong answer** looks like success. The program runs to the end, prints every line, and one number is wrong. Nothing tells you; only knowing what the answer should be does. These are the hardest to notice and the most common.

A program that **never ends** prints nothing more, and the prompt never comes back. It is not slow: it is a loop whose condition never becomes false. Press Ctrl+C to stop it. Then look at the loop that was running, and work through it by hand with the values from the last line it printed: what changes each time round, and can it ever reach the value that ends the loop?

## Where it shows is not where it is

A wrong number shows up wherever it is printed, but it was made somewhere else, often several calls away. In the garden centre, a price list might print `shelfValue`, which adds up `plantValue` for each plant, which multiplies a count by `priceOf`. When the printed total is wrong, any of the three could be at fault.

So walk down. Print what each function gives back for one example, with a name in front of every value, so you can read them later:

```cpp
std::cout << "priceOf(fern) = " << priceOf("fern") << "\n";
std::cout << "plantValue = " << plantValue(shelf[0]) << "\n";
```

Work out by hand what each should give, from what it is meant to do. The mistake is in the first function that gets right values in and gives a wrong value out. Mend it there. Mending the function where the number shows only hides it, and the next caller of the broken one gets it wrong again.

Then take your prints out. They were for looking, not for keeping.

## Your work in this issue

Open `src/bench.cpp`. Build it with `g++ -std=c++17 -Wall src/bench.cpp -o bench` and read the first error. Once it builds, run it with `./bench`, read the bill it prints, and stop it with Ctrl+C when it hangs. Each task tells you which function or functions to look at. Change only the one that is wrong.
