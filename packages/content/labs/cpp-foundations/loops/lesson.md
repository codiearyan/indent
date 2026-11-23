# Loops that repeat

## What you will be able to do

Kasimir starts every morning with a round of the shop: wind each clock, count what struck in the night, fit springs from the box until it is empty. The same few steps, again and again, a different number of times each day. A program does that with a loop. By the end of this issue you will be able to:

- repeat lines while a condition stays true, with `while`
- count from one number to another with `for`
- add up a running total
- leave a loop early with `break`
- stop a program whose loop never ends, and find why

## The request from Kasimir

> **Kasimir:** Every morning I write the same list by hand. Wind clock 1, wind clock 2, all the way up. Then the strikes, then the serial numbers, then the springs. It's the same steps every day, only the numbers change. Can the laptop do the round?

All four tasks are in `src/rounds.cpp`.

## while

A `while` loop runs the lines in its `{ }` again and again, as long as its condition is true. It asks the question before each time round:

```cpp
int cupsLeft = 3;
while (cupsLeft > 0) {
    std::cout << "Pour a cup\n";
    cupsLeft = cupsLeft - 1;
}
```

This pours three cups. After the third, `cupsLeft` is 0, the condition is false, and the program goes on after the `}`. If the condition is false from the start, the lines never run at all.

Something inside the loop has to move the condition toward false. Here it is `cupsLeft = cupsLeft - 1`, which can also be written `cupsLeft -= 1` or `cupsLeft--`. `+=`, `*=` and `/=` work the same way: `pots /= 2` halves `pots`.

## for

Counting is so common that it has its own loop. A `for` loop puts the three parts of counting in its round brackets, separated by semicolons: where the counter starts, the condition to go on, and what changes after each time round:

```cpp
for (int pot = 1; pot <= 4; pot++) {
    std::cout << "Fill pot " << pot << "\n";
}
```

This prints Fill pot 1 to Fill pot 4. `pot++` adds 1 to `pot`. Look hard at the start and the condition, because that is where loops go wrong by one: starting at 0, or writing `<` where the last number should be included, gives one line too many or one too few.

## A running total

To add things up in a loop, make the total before the loop, starting at 0, and add to it inside:

```cpp
int litres = 0;
for (int day = 1; day <= 7; day++) {
    litres += 2;
}
std::cout << litres << "\n";   // 14
```

Where the total is made matters. Made inside the loop, it starts again at 0 each time round, and it is gone after the loop's `}`, so a line after the loop that uses it gets the error about an undeclared name you met in the last issue. A total made without a value holds whatever was left in memory, and the compiler may warn about it.

## break

`break` leaves a loop at once, and the program goes on after its `}`. It is how a loop stops early, when what it was looking for is found or what it was using runs out:

```cpp
for (int cup = 1; cup <= 10; cup++) {
    if (milkLeft < 1) {
        std::cout << "Out of milk at cup " << cup << "\n";
        break;
    }
    milkLeft -= 1;
}
```

## A loop that never ends

If nothing inside a loop moves its condition toward false, the loop never ends. The program sits there, or prints the same line without end. In the terminal, press **Ctrl+C**: it stops the running program and gives you the prompt back. Then look at the loop's condition, and at what inside the loop changes it. Does it change at all? Does it move the right way?

A semicolon right after the round brackets does the same harm as in an `if`: `while (cupsLeft > 0);` is a loop with nothing in it, so nothing ever changes and it never ends. `for (...);` repeats nothing and then runs its `{ }` once.

Check runs each task with a time limit. When a loop never ends, Check stops it and says so, and nothing is left running.

## Your work in this issue

Open `src/rounds.cpp`. This morning's numbers are at the top of `main`, and Check tries other mornings, so build every task on the names. Build and run with `g++ -std=c++17 -Wall src/rounds.cpp -o rounds && ./rounds` after each task. If it never finishes, press Ctrl+C. Task 3 asks for a `while` loop and uses `/` and `%` from the issue on numbers: for a whole number, `% 10` is its last digit and `/ 10` takes that digit off.
