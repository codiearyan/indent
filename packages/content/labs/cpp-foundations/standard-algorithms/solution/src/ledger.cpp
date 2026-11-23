// Ambrose's month: the bills of every repair this month, and the tickets they belonged to.
// Build and run it with:
//   g++ -std=c++17 -Wall src/ledger.cpp -o ledger && ./ledger
//
// Your tasks, each a function written under its own // Task comment, above main. Each one
// uses a tool of the standard library, named in the task:
//   1. Add up the month
//   2. Find the largest bill
//   3. Ask whether a ticket came back
//   4. Count how often a ticket came in
//   5. List the bills, largest first

#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>

// Task 1: Add up the month
// Write a function called monthTotal that takes the bills as a reference to a const
// std::vector<double> and gives back all of them added up, as a double, worked out with
// std::accumulate. No bills add up to 0.
double monthTotal(const std::vector<double>& bills) {
    return std::accumulate(bills.begin(), bills.end(), 0.0);
}

// Task 2: Find the largest bill
// Write a function called largestBill that takes the bills as a reference to a const
// std::vector<double> and gives back the largest of them, as a double, found with
// std::max_element, or 0 when there are no bills.
double largestBill(const std::vector<double>& bills) {
    if (bills.empty()) {
        return 0;
    }
    return *std::max_element(bills.begin(), bills.end());
}

// Task 3: Ask whether a ticket came back
// Write a function called cameIn that takes the month's tickets as a reference to a const
// std::vector<int> and a ticket as an int. It gives back true when the ticket is in the list
// and false when it is not, found with std::find.
bool cameIn(const std::vector<int>& tickets, int ticket) {
    return std::find(tickets.begin(), tickets.end(), ticket) != tickets.end();
}

// Task 4: Count how often a ticket came in
// Write a function called timesIn that takes the month's tickets as a reference to a const
// std::vector<int> and a ticket as an int, and gives back how many times the ticket is in the
// list, as an int, counted with std::count.
int timesIn(const std::vector<int>& tickets, int ticket) {
    return std::count(tickets.begin(), tickets.end(), ticket);
}

// Task 5: List the bills, largest first
// Write a function called largestFirst that takes the bills as a reference to a const
// std::vector<double> and gives back a new std::vector<double> with the same bills, from the
// largest to the smallest, put in order with std::sort and std::reverse. The caller's bills
// stay in the order they were.
std::vector<double> largestFirst(const std::vector<double>& bills) {
    std::vector<double> sorted = bills;
    std::sort(sorted.begin(), sorted.end());
    std::reverse(sorted.begin(), sorted.end());
    return sorted;
}

int main() {
    std::cout << "The month's ledger\n";

    std::vector<double> bills = {72, 18.5, 140.25, 36};
    std::vector<int> tickets = {3051, 3060, 3051, 3072};

    // Try each function here once you have written it, with bills and tickets. Check calls your
    // functions with lists of its own.
    std::cout << "Total: " << monthTotal(bills) << "\n";
    std::cout << "Largest: " << largestBill(bills) << "\n";
    if (cameIn(tickets, 3051)) {
        std::cout << "3051 came in " << timesIn(tickets, 3051) << " times\n";
    }
    for (double bill : largestFirst(bills)) {
        std::cout << bill << "\n";
    }

    return 0;
}
