// Dorrit's pickup shelf: the names of the customers whose clocks are mended and waiting to be
// collected, in the order they went on the shelf. Build and run it with:
//   g++ -std=c++17 -Wall src/shelf.cpp -o shelf && ./shelf
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Look for a name on the shelf
//   2. Put the new arrivals on the shelf
//   3. List the names that start with a letter
//   4. Read the ticket numbers Dorrit types

#include <iostream>
#include <string>
#include <vector>

// Task 1: Look for a name on the shelf
// Write a function called onShelf that takes the shelf as a reference to a const
// std::vector<std::string> and a name as a reference to a const std::string. It gives back
// true when that name is on the shelf, written exactly the same, and false when it is not.

// Task 2: Put the new arrivals on the shelf
// Write a function called shelveAll that takes the shelf as a reference to a
// std::vector<std::string> and the names that arrived as a reference to a const
// std::vector<std::string>, and gives nothing back. It adds every name that arrived to the end
// of the caller's shelf, in the order they arrived. The names that arrived stay as they were.

// Task 3: List the names that start with a letter
// Write a function called startingWith that takes the shelf as a reference to a const
// std::vector<std::string> and a letter as a char. It gives back a new std::vector<std::string>
// with the names on the shelf whose first character is that letter, in shelf order, and leaves
// the shelf as it was. With the shelf below and 'O', it gives back {"Otto Brisk", "Odile Wren"}:
//   {"Otto Brisk", "Mabel Quist", "Odile Wren"}

// Task 4: Read the ticket numbers Dorrit types
// Write a function called readTickets that takes nothing. It reads whole numbers from std::cin,
// one after another, until Dorrit types 0, and gives back a std::vector<int> with every number
// she typed before the 0, in order. The 0 only means she is done; it is not a ticket.

int main() {
    std::cout << "Pickup shelf\n";

    std::vector<std::string> shelf = {"Otto Brisk", "Mabel Quist", "Odile Wren"};

    // Try each function here once you have written it, with shelf, and print what you get.
    // Check calls your functions with shelves of its own, and types numbers of its own.

    return 0;
}
