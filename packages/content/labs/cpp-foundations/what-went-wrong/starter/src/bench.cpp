// Kasimir's bench program. Build and run it with:
//   g++ -std=c++17 -Wall src/bench.cpp -o bench && ./bench
//
// Three things go wrong in it, one under each task: the build stops with a page of errors, the
// parts count never finishes, and the bills come out wrong. Find where each mistake really is and
// mend only the function that is wrong. The others are right as they are.
//
// Your tasks, each a function (or a few) under its own // Task comment, above main:
//   1. Make the bench list build
//   2. Stop the parts count from running forever
//   3. Find why the bills are wrong

#include <iostream>
#include <string>
#include <vector>

struct Repair {
    int ticket;
    std::string item;
    int minutes;
};

// Task 1: Make the bench list build
// The compiler refuses printBench with a long message. printBench prints "On the bench:" and then
// one line for each repair, in the bench's order, like:
//   4417 carriage clock, 50 minutes
// Read the message from its first line, find what it is about, and mend printBench.
void printBench(const std::vector<Repair>& bench) {
    std::cout << "On the bench:\n";
    std::cout << bench << "\n";
}

// Task 2: Stop the parts count from running forever
// weeksToWait gives back how many weekly deliveries it takes until at least partsNeeded parts have
// arrived, with perWeek parts in each delivery. perWeek is always above 0. For some orders the
// program never finishes. Find why and mend weeksToWait.
int weeksToWait(int partsNeeded, int perWeek) {
    int weeks = 0;
    int arrived = 0;
    while (arrived != partsNeeded) {
        arrived = arrived + perWeek;
        weeks = weeks + 1;
    }
    return weeks;
}

// Task 3: Find why the bills are wrong
// Dorrit says the bill for ticket 4417 shows no labour at all, though Kasimir worked on it for 50
// minutes. The wrong total shows in billLine, but the mistake may be in a function it calls, or one
// further down. Each function says above it what it gives back: find the one that does not do what
// it says, and mend it there. Leave the others as they are. Prints you add to look inside are fine:
// Check reads only what each function gives back. Money is in cents.

// The parts' prices added up.
int partsCost(const std::vector<int>& partPrices) {
    int total = 0;
    for (int price : partPrices) {
        total = total + price;
    }
    return total;
}

// The labour: the minutes worked times the rate for an hour, divided by 60, rounded down.
int labourCost(int minutes, int ratePerHour) {
    return minutes / 60 * ratePerHour;
}

// The whole bill: the parts plus the labour.
int billTotal(const std::vector<int>& partPrices, int minutes, int ratePerHour) {
    return partsCost(partPrices) + labourCost(minutes, ratePerHour);
}

// The bill as one line of text: Ticket, the ticket, a colon, the whole bill and "cents".
std::string billLine(int ticket, const std::vector<int>& partPrices, int minutes, int ratePerHour) {
    return "Ticket " + std::to_string(ticket) + ": " + std::to_string(billTotal(partPrices, minutes, ratePerHour)) + " cents";
}

int main() {
    std::vector<Repair> bench = {{4417, "carriage clock", 50}, {5020, "pocket watch", 35}};
    std::cout << "Kasimir's bench\n";
    printBench(bench);

    std::vector<int> partPrices = {1200, 350};
    std::cout << billLine(4417, partPrices, 50, 3000) << "\n";

    std::cout << "Weeks to wait for 10 springs, 4 a week: " << weeksToWait(10, 4) << "\n";
    return 0;
}
