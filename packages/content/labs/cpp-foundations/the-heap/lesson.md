# The heap by hand: new and delete

## What you will be able to do

Every value so far ended at the closing brace of its block, or lived inside a vector that ended with its owner. A repair that waits a week for a part does not fit that: the code that takes it in finishes at once, and the repair has to stay. C++ has a second place for values, the heap, where a value lives until you end it yourself. By the end of this issue you will be able to:

- make a value on the heap with `new`, and end it with `delete`
- say why a value would need to outlive the function that made it
- name the three classic faults: never deleted, deleted twice, used after it was deleted
- say what a class that owns something made with `new` has to take care of

## The request from Kasimir

> **Kasimir:** Clocks waiting for a part sit on the shelf for days. The program that takes them in finishes straight away, and the repair has to stay on the shelf after it. And the laptop gets slower every day of the week: something takes memory and never gives it back.

`Repair` is given whole at the top of `src/waiting.cpp`. Its destructor prints a line, so you can see in the terminal when each repair ends.

## new makes a value that stays

```cpp
Lamp* order(int watts) {
    return new Lamp(watts);
}
```

`new Lamp(watts)` makes a lamp on the heap and gives back its address. The lamp does not end at the function's `}`: it stays until a line runs `delete` on its address. The function hands that address back, and from then on the caller holds the only way to reach the lamp, and the job of ending it.

```cpp
Lamp* lamp = order(60);
lamp->switchOn();
delete lamp;
```

`delete lamp` runs the lamp's destructor and gives its memory back. The pointer variable itself still holds the old address afterwards: it does not know the lamp is gone.

## The three classic faults

Everything made with `new` must be ended by exactly one `delete`, at the right time. There are three ways to get it wrong.

**Never deleted.** The last pointer to a lamp goes away, and the lamp stays in memory with no way to reach it. Nothing goes wrong at once; the program just holds more memory every time it happens. That is Kasimir's slow laptop. A `delete` that sits after an early `return` is skipped on that path, and leaks the same way.

**Deleted twice.** Two `delete`s on the same address, through one pointer or through two pointers that hold it. The second has no promised result. Often the system notices and stops the program: on Linux with a message such as `free(): double free detected`, on a Mac often with nothing but a short line from the terminal, something like `trace trap`. It may also seem to work and fail somewhere else later.

**Used after it was deleted.** A line reads or changes the lamp through a pointer after the `delete`. It may print the old value, nonsense, or stop the program, and it can differ on every run. So read what you need into a variable of your own before you delete.

One more: `delete` is only for what `new` made. A variable of your own, or a value inside a vector, ends by itself; deleting it has no promised result. `delete` on something that is not a pointer at all is refused, with something like `cannot delete expression of type 'Lamp'`.

Because none of these mistakes promises a result, you cannot test for them by running the program and looking. Check builds each task with a `Repair` of its own that counts every repair made and ended, every delete, and every use of a repair that already ended, so these faults fail the same way on every run. Your own build uses the class in your file and counts nothing.

## A list of pointers

A `std::vector<Lamp*>` holds addresses, not lamps. Ending the vector does not end the lamps, and taking a pointer out of it with `erase` does not end its lamp either. Deleting a lamp does not take its pointer out of the vector. When a lamp leaves the list for good, both have to happen: delete the lamp through the pointer, then take the pointer out.

## A class that owns something made with new

A class could keep a pointer from `new` as a member and delete it in its destructor. Then copying an object is a problem: the copy holds the same address, and both destructors delete it. Such a class has to say what a copy and an assignment mean, or forbid them; C++ calls this the rule of three. You will not write those functions here. The next issue gives a member that deletes by itself and cannot be copied by accident, and with it the question goes away.

## Your work in this issue

Write the three functions in `src/waiting.cpp`, and in `main` take repairs in, close one, take one off, and delete what is left. Count the destructor's lines against your `new`s. Build and run with `g++ -std=c++17 -Wall src/waiting.cpp -o waiting && ./waiting`.
