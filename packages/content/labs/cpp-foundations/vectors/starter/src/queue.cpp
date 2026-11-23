// Kasimir's bench queue: the repair tickets waiting at his bench, in the order they came in.
// Build and run it with:
//   g++ -std=c++17 -Wall src/queue.cpp -o queue && ./queue
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Say how many are waiting
//   2. Find the last ticket in the queue
//   3. Add a ticket to the queue
//   4. Change a ticket by its place

#include <iostream>
#include <string>
#include <vector>

// Task 1: Say how many are waiting
// Write a function called queueLine that takes the queue as a reference to a const
// std::vector<int> and gives back a std::string: "Nothing waiting" when the queue is empty,
// and otherwise the number of tickets and " waiting", like this:
//   3 waiting

// Task 2: Find the last ticket in the queue
// Write a function called lastTicket that takes the queue as a reference to a const
// std::vector<int> and gives back the last ticket in it as an int, or 0 when the queue is empty.

// Task 3: Add a ticket to the queue
// Write a function called addTicket that takes the queue as a reference to a std::vector<int>
// and a ticket as an int. It adds the ticket to the end of the caller's queue and gives back
// how many tickets are in the queue now, as an int.

// Task 4: Change a ticket by its place
// Dorrit counts places from 1: place 1 is the first ticket. Write a function called
// replaceTicket that takes the queue as a reference to a std::vector<int>, a place as an int
// and a new ticket as an int. When the queue has that place, it puts the new ticket there in
// the caller's queue and gives back true. When it has no such place, it leaves the queue as it
// was and gives back false.

int main() {
    std::cout << "Bench queue\n";

    std::vector<int> queue = {2041, 2047, 2052};

    // Try each function here once you have written it, with queue, and print what it gives back.
    // Check calls your functions with queues of its own.

    return 0;
}
