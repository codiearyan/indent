// Ambrose's bill, worked out by functions. Build and run it with:
//   g++ -std=c++17 -Wall src/bill.cpp -o bill && ./bill
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Price the labour
//   2. Print a line of the bill
//   3. Add up a repair
//   4. Round the minutes up to a quarter hour

#include <iostream>
#include <string>

// Task 1: Price the labour
// Ambrose charges 48 an hour, counted by the minute. Write a function called labourCost that
// takes the minutes worked as an int and gives back what they cost as a double. 90 minutes
// cost 72. It gives the cost back and prints nothing.

// Task 2: Print a line of the bill
// Write a function called printBillLine that takes what the line is for as a std::string and
// the amount as a double, prints them as one line and gives nothing back:
//   Mainspring: 18.5

// Task 3: Add up a repair
// Write a function called repairTotal that takes the minutes worked as an int and the cost of
// the parts as a double, and gives back the whole price as a double: the labour plus the
// parts. Work out the labour by calling labourCost. It gives the price back and prints
// nothing.

// Task 4: Round the minutes up to a quarter hour
// Ambrose bills whole quarter hours. Write a function called minutesToBill that takes the
// minutes worked as an int and gives back, as an int, the minutes rounded up to the next
// quarter hour: 50 gives 60, 60 stays 60, and 61 gives 75. It prints nothing.

int main() {
    std::cout << "Bill for ticket 2187\n";

    // Try each function here once you have written it: call it with the clock's numbers
    // and print what it gives back. Check calls your functions with numbers of its own.

    return 0;
}
