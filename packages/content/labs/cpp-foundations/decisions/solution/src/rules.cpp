// Ambrose's rules for the counter. Build and run it with:
//   g++ -std=c++17 -Wall src/rules.cpp -o rules && ./rules
//
// Your tasks, each under its own // Task comment inside main:
//   1. Say whether the clock is overdue
//   2. Work out what the customer pays
//   3. Pick the shelf
//   4. Say where the bench is

#include <iostream>

int main() {
    // Today's clock, from Dorrit's slip. Check tries other values here, so build on these
    // names, not on the values themselves.
    int daysInShop = 9;
    int promisedDays = 7;
    int monthsSinceRepair = 5;
    bool sameFault = true;
    double quote = 45.5;
    int daysUntilNeeded = 4;
    bool forEvent = false;
    int bench = 0;

    std::cout << "Counter rules\n";

    // Task 1: Say whether the clock is overdue
    // Make a bool called isOverdue: true when the clock has been in the shop more days than
    // promised. Then print one of these two lines, depending on isOverdue:
    //   Status: overdue
    //   Status: on time
    bool isOverdue = daysInShop > promisedDays;
    if (isOverdue) {
        std::cout << "Status: overdue\n";
    } else {
        std::cout << "Status: on time\n";
    }

    // Task 2: Work out what the customer pays
    // A repair is free when the clock was repaired here 12 months ago or less and the same fault
    // came back. Make a double called toPay: 0 when the repair is free, the quote otherwise.
    // Print it, like this:
    //   To pay: 45.5
    double toPay = quote;
    if (monthsSinceRepair <= 12 && sameFault) {
        toPay = 0;
    }
    std::cout << "To pay: " << toPay << "\n";

    // Task 3: Pick the shelf
    // Make a bool called isRush: true when the customer needs the clock back in 2 days or fewer,
    // or when it is for an event. Then print one of these two lines:
    //   Shelf: rush
    //   Shelf: normal
    bool isRush = daysUntilNeeded <= 2 || forEvent;
    if (isRush) {
        std::cout << "Shelf: rush\n";
    } else {
        std::cout << "Shelf: normal\n";
    }

    // Task 4: Say where the bench is
    // The benches are numbered 1 to 6, and 0 means Kasimir has not given one yet. Print one line:
    //   Bench: not given yet        when bench is 0
    //   Bench: 3                    when bench is 1 to 6 (with its own number)
    //   Bench: no such bench        for any other number
    if (bench == 0) {
        std::cout << "Bench: not given yet\n";
    } else if (bench >= 1 && bench <= 6) {
        std::cout << "Bench: " << bench << "\n";
    } else {
        std::cout << "Bench: no such bench\n";
    }

    return 0;
}
