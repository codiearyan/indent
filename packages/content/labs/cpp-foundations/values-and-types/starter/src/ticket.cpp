// The repair ticket. Build and run it with:
//   g++ -std=c++17 -Wall src/ticket.cpp -o ticket && ./ticket
//
// Your tasks, each under its own // Task comment inside main:
//   1. Print the ticket line
//   2. Note where the clock waits
//   3. Add the key to the quote
//   4. Give daysLeft a value

#include <iostream>
#include <string>

int main() {
    // Today's ticket, from Dorrit's slip. Check tries other values here, so build on these
    // names, not on the values themselves.
    int ticketNumber = 2187;
    std::string customer = "Edwina Sallow";
    std::string item = "carriage clock";
    double quote = 64.5;
    double keyPrice = 18.25;
    int promisedDays = 6;

    std::cout << "Repair ticket\n";

    // Task 1: Print the ticket line
    // Print the ticket number, the item and the customer on one line, built from the variables
    // above, like this:
    //   Ticket 2187: carriage clock for Edwina Sallow

    // Task 2: Note where the clock waits
    // Make an int called bench that holds 4 and a char called shelf that holds the letter B.
    // Then print them from those two variables, like this:
    //   Bench 4, shelf B

    // Task 3: Add the key to the quote
    // Edwina lost the winding key too. Give quote a new value: what it holds now plus keyPrice.
    // Do not make a new variable. Then print it, like this:
    //   Quote: 82.75

    // Task 4: Give daysLeft a value
    // The line below makes daysLeft without a value, so the program prints whatever was left in
    // memory. Give it the value of promisedDays.
    int daysLeft;
    std::cout << "Ready in " << daysLeft << " days\n";

    return 0;
}
