// Dorrit's look-up: when a customer rings about a ticket, she finds the very repair on Kasimir's
// bench, logs the call on it, and sees which job has taken longest. Build and run it with:
//   g++ -std=c++17 -Wall src/lookup.cpp -o lookup && ./lookup
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Find a repair by its ticket
//   2. Log a call through what was found
//   3. Point at the longest repair

#include <iostream>
#include <string>
#include <vector>

// A repair on the bench, given whole. Every task uses it as it is.
class Repair {
private:
    int ticket;
    std::string item;
    int minutes = 0;

public:
    Repair(int number, const std::string& name) : ticket(number), item(name) {}

    int getTicket() const { return ticket; }
    const std::string& getItem() const { return item; }
    int getMinutes() const { return minutes; }
    void addMinutes(int extra) { minutes += extra; }
};

// Task 1: Find a repair by its ticket
// Write a function called findRepair that takes the bench as a reference to a
// std::vector<Repair> and a ticket as an int. It gives back a pointer to the repair on the
// caller's bench with that ticket, as a Repair*, or nullptr when no repair has it.

Repair* findRepair(std::vector<Repair>& bench, int ticket) {
    for (Repair& repair : bench) {
        if (repair.getTicket() == ticket) {
            return &repair;
        }
    }
    return nullptr;
}

// Task 2: Log a call through what was found
// Write a function called logCall that takes a pointer to a repair as a Repair* and a number of
// minutes as an int, and gives back a bool. When the pointer points at a repair, it adds the
// minutes to that repair and gives back true. When it is nullptr, it changes nothing and gives
// back false.

bool logCall(Repair* repair, int minutes) {
    if (repair == nullptr) {
        return false;
    }
    repair->addMinutes(minutes);
    return true;
}

// Task 3: Point at the longest repair
// Write a function called longestOf that takes the bench as a reference to a const
// std::vector<Repair>. It gives back a pointer to the repair with the most minutes, as a
// const Repair*, or nullptr when the bench is empty. When two have the most, it is the one
// nearer the front.

const Repair* longestOf(const std::vector<Repair>& bench) {
    const Repair* longest = nullptr;
    for (const Repair& repair : bench) {
        if (longest == nullptr || repair.getMinutes() > longest->getMinutes()) {
            longest = &repair;
        }
    }
    return longest;
}

int main() {
    std::cout << "Dorrit's look-up\n";

    std::vector<Repair> bench = {Repair(3101, "mantel clock"), Repair(3104, "pocket watch"), Repair(3110, "carriage clock")};
    bench[0].addMinutes(45);
    bench[1].addMinutes(20);
    bench[2].addMinutes(90);

    Repair* found = findRepair(bench, 3104);
    if (logCall(found, 5)) {
        std::cout << "Call logged on " << found->getItem() << ", now " << found->getMinutes() << " min\n";
    }
    if (!logCall(findRepair(bench, 9999), 5)) {
        std::cout << "Ticket 9999 is not on the bench\n";
    }

    const Repair* longest = longestOf(bench);
    if (longest != nullptr) {
        std::cout << "Longest: " << longest->getTicket() << ", " << longest->getMinutes() << " min\n";
    }

    return 0;
}
