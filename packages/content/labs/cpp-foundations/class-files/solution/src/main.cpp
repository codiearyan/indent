// The workshop's program. Build and run it with:
//   g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop && ./workshop
//
// In this issue the class Repair moves out of this file: the class itself, with only the first
// line of each of its functions, into src/repair.h, and the bodies of its functions into
// src/repair.cpp. Task 1 is in repair.h, Task 2 in repair.cpp and Task 3 here.

#include <iostream>
#include <string>

#include "repair.h"

// Task 3: Write the bench line
// Write a function called benchLine that takes a repair as a reference to a const Repair and
// gives back its line for the bench as a std::string: the ticket, a space, the item, ", " and the
// minutes, then " min". Like this:
//   3101 mantel clock, 75 min
std::string benchLine(const Repair& repair) {
    return std::to_string(repair.getTicket()) + " " + repair.getItem() + ", " +
           std::to_string(repair.getMinutes()) + " min";
}

int main() {
    std::cout << "Tolliver Clockworks\n";

    Repair clock(3101, "mantel clock");
    clock.addMinutes(75);
    std::cout << benchLine(clock) << "\n";

    return 0;
}
