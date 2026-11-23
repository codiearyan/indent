// main.cpp: where the program starts. Build all three .cpp files into one program and run it:
//   g++ -std=c++17 -Wall src/main.cpp src/price.cpp src/counter.cpp -o counter && ./counter

#include <iostream>
#include <vector>

#include "repair.h"

// Task 3: Add up the day
// Write a function called dayTotal that takes the day's repairs as a reference to a const
// std::vector<Repair> and gives back what they come to together, as a double, with the price of
// each one worked out by repairPrice from price.cpp.

int main() {
    std::cout << "Ready today\n";

    std::vector<Repair> today = {
        {3101, "mantel clock", 75, 18.5},
        {3104, "pocket watch", 30, 6.25},
    };

    // Try each function here once it is written, with today, and print what you get. Check calls
    // your functions with repairs of its own.
    std::cout << today.size() << " repairs\n";

    return 0;
}
