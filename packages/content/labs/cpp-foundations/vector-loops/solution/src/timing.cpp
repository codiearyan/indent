// Kasimir's timing bench: each clock runs on the bench for a day, and he writes down how many
// seconds it gained. A clock that gained 4 seconds has a drift of 4; one that lost 3 has -3.
// Build and run it with:
//   g++ -std=c++17 -Wall src/timing.cpp -o timing && ./timing
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Add up the drift of the day
//   2. Find the clock that runs fastest
//   3. Print the clocks, numbered
//   4. Correct every drift

#include <iostream>
#include <string>
#include <vector>

// Task 1: Add up the drift of the day
// Write a function called totalDrift that takes the drifts as a reference to a const
// std::vector<int> and gives back all of them added up, as an int. An empty list adds up to 0.
int totalDrift(const std::vector<int>& drifts) {
    int total = 0;
    for (int drift : drifts) {
        total += drift;
    }
    return total;
}

// Task 2: Find the clock that runs fastest
// Write a function called fastestDrift that takes the drifts as a reference to a const
// std::vector<int> and gives back the largest of them, as an int, or 0 when the list is empty.
// Some days every clock loses time, and then every drift is below 0.
int fastestDrift(const std::vector<int>& drifts) {
    if (drifts.empty()) {
        return 0;
    }
    int fastest = drifts[0];
    for (int drift : drifts) {
        if (drift > fastest) {
            fastest = drift;
        }
    }
    return fastest;
}

// Task 3: Print the clocks, numbered
// Write a function called printNumbered that takes the names of the clocks as a reference to a
// const std::vector<std::string> and gives nothing back. It prints one line per clock, in
// order, numbered from 1, and nothing at all for an empty list:
//   1. carriage clock
//   2. mantel clock
void printNumbered(const std::vector<std::string>& clocks) {
    for (std::size_t i = 0; i < clocks.size(); i++) {
        std::cout << i + 1 << ". " << clocks[i] << "\n";
    }
}

// Task 4: Correct every drift
// After Kasimir regulates the clocks, each one gains a few seconds less. Write a function
// called correctAll that takes the drifts as a reference to a std::vector<int> and the
// correction as an int, and gives nothing back. It takes the correction off every drift in
// the caller's list: with the drifts {4, -3} and a correction of 2, they become {2, -5}.
void correctAll(std::vector<int>& drifts, int correction) {
    for (int& drift : drifts) {
        drift -= correction;
    }
}

int main() {
    std::cout << "Timing bench\n";

    std::vector<int> drifts = {4, -3, 11, 0, -7};
    std::vector<std::string> clocks = {"carriage clock", "mantel clock", "pocket watch"};

    // Try each function here once you have written it, with drifts and clocks. Check calls your
    // functions with lists of its own.
    std::cout << "Total: " << totalDrift(drifts) << "\n";
    std::cout << "Fastest: " << fastestDrift(drifts) << "\n";
    printNumbered(clocks);
    correctAll(drifts, 2);
    std::cout << "First after correcting: " << drifts[0] << "\n";

    return 0;
}
