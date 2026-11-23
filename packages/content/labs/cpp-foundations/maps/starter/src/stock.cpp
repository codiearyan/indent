// Kasimir's parts stock: how many of each part are in the drawers, by the part's name.
// Build and run it with:
//   g++ -std=c++17 -Wall src/stock.cpp -o stock && ./stock
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Restock a part
//   2. Look up a part without adding it
//   3. Print the stock in order
//   4. Count the parts used today

#include <iostream>
#include <map>
#include <string>
#include <vector>

// Task 1: Restock a part
// Write a function called restock that takes the stock as a reference to a
// std::map<std::string, int>, a part as a reference to a const std::string and a count as an
// int, and gives nothing back. It adds the count to that part in the caller's stock. A part
// that is not in the stock yet goes in with that count.

// Task 2: Look up a part without adding it
// Write a function called countOf that takes the stock as a reference to a const
// std::map<std::string, int> and a part as a reference to a const std::string. It gives back
// how many of that part are in the stock, as an int, or 0 when the part is not in it. Looking
// a part up leaves the stock as it was: no part is added.

// Task 3: Print the stock in order
// Write a function called printStock that takes the stock as a reference to a const
// std::map<std::string, int> and gives nothing back. It prints one line per part, in the
// map's own order, with the part's name, a colon, a space and the count. An empty stock prints
// the one line "Drawers empty". Like this:
//   balance wheel: 2
//   crown: 3

// Task 4: Count the parts used today
// Write a function called tally that takes the parts used today as a reference to a const
// std::vector<std::string>, one name for each part used, and gives back a
// std::map<std::string, int> with each part's name and how many times it was used. A part
// that was not used is not in the map.

int main() {
    std::cout << "Parts stock\n";

    std::map<std::string, int> stock = {{"mainspring", 12}, {"crown", 3}, {"balance wheel", 2}};
    std::vector<std::string> used = {"crown", "mainspring", "crown"};

    // Try each function here once you have written it, with stock and used. Check calls your
    // functions with stocks and lists of its own.

    return 0;
}
