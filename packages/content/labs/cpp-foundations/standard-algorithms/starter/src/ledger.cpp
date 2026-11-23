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

#include <iostream>
#include <vector>

// Task 1: Add up the month
// Write a function called monthTotal that takes the bills as a reference to a const
// std::vector<double> and gives back all of them added up, as a double, worked out with
// std::accumulate. No bills add up to 0.

// Task 2: Find the largest bill
// Write a function called largestBill that takes the bills as a reference to a const
// std::vector<double> and gives back the largest of them, as a double, found with
// std::max_element, or 0 when there are no bills.

// Task 3: Ask whether a ticket came back
// Write a function called cameIn that takes the month's tickets as a reference to a const
// std::vector<int> and a ticket as an int. It gives back true when the ticket is in the list
// and false when it is not, found with std::find.

// Task 4: Count how often a ticket came in
// Write a function called timesIn that takes the month's tickets as a reference to a const
// std::vector<int> and a ticket as an int, and gives back how many times the ticket is in the
// list, as an int, counted with std::count.

// Task 5: List the bills, largest first
// Write a function called largestFirst that takes the bills as a reference to a const
// std::vector<double> and gives back a new std::vector<double> with the same bills, from the
// largest to the smallest, put in order with std::sort and std::reverse. The caller's bills
// stay in the order they were.

int main() {
    std::cout << "The month's ledger\n";

    std::vector<double> bills = {72, 18.5, 140.25, 36};
    std::vector<int> tickets = {3051, 3060, 3051, 3072};

    // Try each function here once you have written it, with bills and tickets. Check calls your
    // functions with lists of its own.

    return 0;
}
