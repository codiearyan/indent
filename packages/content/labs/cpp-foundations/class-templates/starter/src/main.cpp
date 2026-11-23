// main.cpp: Kasimir's bench, where the program starts. Build and run it with:
//   g++ -std=c++17 -Wall src/main.cpp -o bench && ./bench
//
// Your tasks:
//   1. Write the class template (in caddy.h)
//   2. Reach an item by its place, below the class (in caddy.h)
//   3. Fill the shelf caddy with repairs (in this file)

#include <iostream>
#include <string>
#include <vector>

#include "caddy.h"

// A repair as part 4 wrote it, given whole.
struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
};

// Task 3: Fill the shelf caddy with repairs
// Write a function called fillCaddy that takes the repairs as a reference to a const
// std::vector<Repair> and a limit as an int. It makes a caddy of repairs with that limit, adds the
// repairs to it in order with add, and gives the caddy back. Repairs that do not fit are left out.

int main() {
    std::cout << "Kasimir's bench\n";

    std::vector<Repair> waiting = {{3101, "mantel clock", 75}, {3104, "pocket watch", 20}, {3110, "carriage clock", 45}};
    std::vector<int> screws = {12, 8, 15};

    // Try each task here once you have written it: a caddy of screw sizes, then the shelf caddy of
    // waiting repairs with a limit of 2. Check makes caddies of its own, with types of its own.
    std::cout << waiting.size() << " repairs and " << screws.size() << " screws\n";

    return 0;
}
