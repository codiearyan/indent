// Kasimir's bench: the repairs he is working on, each one a Repair, and the functions that read
// them, change them and find them. Build and run it with:
//   g++ -std=c++17 -Wall src/bench.cpp -o bench && ./bench
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Label a repair on the bench
//   2. Log time on a repair
//   3. Add lost time to the open repairs
//   4. Find a repair by its ticket

#include <iostream>
#include <string>
#include <vector>

struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
    bool done = false;
};

// Task 1: Label a repair on the bench
// Write a function called benchLabel that takes a repair as a reference to a const Repair and
// gives back its label as a std::string: the ticket, a space, the item, ", " and the minutes with
// " min". When the repair is done, ", done" goes on the end. Like this:
//   3101 mantel clock, 45 min, done

// Task 2: Log time on a repair
// Write a function called logTime that takes a repair as a reference to a Repair and a number of
// minutes as an int, and gives nothing back. It adds the minutes to the caller's repair.

// Task 3: Add lost time to the open repairs
// Write a function called addToOpen that takes the repairs as a reference to a
// std::vector<Repair> and a number of minutes as an int, and gives nothing back. It adds the
// minutes to every repair in the caller's vector that is not done, and leaves the done ones as
// they were.

// Task 4: Find a repair by its ticket
// Write a function called findTicket that takes the repairs as a reference to a const
// std::vector<Repair> and a ticket as an int. It gives back the repair with that ticket, or, when
// none has it, a new Repair with nothing filled in.

int main() {
    std::cout << "Kasimir's bench\n";

    std::vector<Repair> bench = {
        {3101, "mantel clock", 45, true},
        {3104, "pocket watch", 20, false},
        {3110, "carriage clock", 0, false},
    };

    // Try each function here once you have written it, with bench, and print what you get.
    // Check calls your functions with repairs of its own.
    std::cout << bench.size() << " repairs on the bench\n";

    return 0;
}
