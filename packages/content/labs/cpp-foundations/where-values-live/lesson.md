# Where values live, and for how long

## What you will be able to do

Every value in your programs so far lived somewhere, for some time, and you never had to ask where. A variable appeared on the line that made it and was gone at the closing brace of its block. That is about to matter: the next issues hand repairs around by their place in memory, and a place is only good while its value is still there. By the end of this issue you will be able to:

- say when a local variable ends, and what happens to it
- hand a value back from a function as a copy the caller keeps
- hand back a reference only to something that outlives the call
- say how long a value inside a vector stays where it is

## The request from Kasimir

> **Kasimir:** The bench screen showed ticket 3104 with nonsense minutes this morning, and when I ran it again it showed something else again. Someone wrote a function that hands back a repair it made for itself, and by the time the screen reads it, it is gone. I want a function that opens a repair and hands it over properly, one that hands me the next repair to work on so I can log time on it where it sits, and one that adds a check-up for every long job.

`Repair` is given whole at the top of `src/bench.cpp`. All three tasks are functions below it.

## A local ends at its closing brace

```cpp
Lamp lightFor(int hours) {
    Lamp lamp(40);
    lamp.burn(hours);
    return lamp;
}
```

`lamp` is a local variable: it is made when the function reaches that line, and it ends at the function's closing `}`. A parameter is a local too, and so is the variable of a loop, which ends at the end of each round.

Giving back a `Lamp` is safe: the caller gets a lamp of its own, whole, that lives as long as the caller keeps it. The compiler may build it straight in the caller's place instead of copying, but either way it is the caller's.

## A reference to a local is a trap

Now write `Lamp& lightFor(int hours)` with the same body. The function hands back a reference, a way to reach `lamp`, and then `lamp` ends. The caller holds a way to a lamp that is gone. Reading through it has no promised result: it may seem to work, print nonsense, or stop the program, and it can change from one run to the next and from one computer to another. That is what happened on Kasimir's screen.

Both compilers notice the plain case and warn, with `-Wall` or even without it. Clang says something like:

```
warning: reference to stack memory associated with local variable 'lamp' returned
```

and GCC says `reference to local variable 'lamp' returned`. "Stack" is the name for the memory where locals live. Treat that warning as an error. The same trap holds for a pointer to a local, which comes in the next issue.

A reference is safe when what it leads to outlives the call. A repair in the caller's own vector does: the vector belongs to the caller, so a reference to one of its repairs is still good when the function has returned. That is how a function lets its caller change one repair where it sits. Keep a position to find it, not a copy: a copy made inside the function is a new local, and a reference to it ends with the function.

## A vector moves its values when it grows

A vector keeps its values side by side in one block of memory, with some room to spare. When a `push_back` finds no room left, the vector takes a bigger block, copies every value across, and ends the old ones. Every reference to a value in the old block now leads to something that is gone.

```cpp
std::vector<Lamp> shelf = {Lamp(40), Lamp(60)};
Lamp& first = shelf[0];
shelf.push_back(Lamp(25));
first.burn(2);
```

The last line uses `first` after the shelf may have moved: no promised result. A loop over the vector, `for (Lamp& lamp : shelf)`, holds such a reference too, so a `push_back` inside that loop pulls the floor out from under it. `capacity()` tells how much room a vector has; a vector made from a list in braces has none to spare.

A position is still good after the vector moves: `shelf[i]` finds the value wherever it now lives. So when a loop adds to the vector it walks, loop over positions, up to the size the vector had when the loop began.

## How Check knows

Check never judges your code by what a mistake like this happens to print. It builds each task with a `Repair` of its own that keeps a count, outside the repair itself, of every repair made and ended, and notices any use of one that has already ended. Changes you make to the class in your file are left out.

## Your work in this issue

Open `src/bench.cpp`, read `Repair`, then write the three functions in order. Try each in `main` with the bench there. Build and run with `g++ -std=c++17 -Wall src/bench.cpp -o bench && ./bench`, and read every warning before you run.
