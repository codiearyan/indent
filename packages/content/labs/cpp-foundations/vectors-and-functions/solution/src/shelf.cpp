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
bool onShelf(const std::vector<std::string>& shelf, const std::string& name) {
    for (const auto& customer : shelf) {
        if (customer == name) {
            return true;
        }
    }
    return false;
}

// Task 2: Put the new arrivals on the shelf
// Write a function called shelveAll that takes the shelf as a reference to a
// std::vector<std::string> and the names that arrived as a reference to a const
// std::vector<std::string>, and gives nothing back. It adds every name that arrived to the end
// of the caller's shelf, in the order they arrived. The names that arrived stay as they were.
void shelveAll(std::vector<std::string>& shelf, const std::vector<std::string>& arrived) {
    for (const auto& name : arrived) {
        shelf.push_back(name);
    }
}

// Task 3: List the names that start with a letter
// Write a function called startingWith that takes the shelf as a reference to a const
// std::vector<std::string> and a letter as a char. It gives back a new std::vector<std::string>
// with the names on the shelf whose first character is that letter, in shelf order, and leaves
// the shelf as it was. With the shelf below and 'O', it gives back {"Otto Brisk", "Odile Wren"}:
//   {"Otto Brisk", "Mabel Quist", "Odile Wren"}
std::vector<std::string> startingWith(const std::vector<std::string>& shelf, char letter) {
    std::vector<std::string> found;
    for (const auto& name : shelf) {
        if (!name.empty() && name[0] == letter) {
            found.push_back(name);
        }
    }
    return found;
}

// Task 4: Read the ticket numbers Dorrit types
// Write a function called readTickets that takes nothing. It reads whole numbers from std::cin,
// one after another, until Dorrit types 0, and gives back a std::vector<int> with every number
// she typed before the 0, in order. The 0 only means she is done; it is not a ticket.
std::vector<int> readTickets() {
    std::vector<int> tickets;
    int ticket = 0;
    while (std::cin >> ticket && ticket != 0) {
        tickets.push_back(ticket);
    }
    return tickets;
}

int main() {
    std::cout << "Pickup shelf\n";

    std::vector<std::string> shelf = {"Otto Brisk", "Mabel Quist", "Odile Wren"};

    // Try each function here once you have written it, with shelf, and print what you get.
    // Check calls your functions with shelves of its own, and types numbers of its own.
    if (onShelf(shelf, "Mabel Quist")) {
        std::cout << "Mabel Quist is on the shelf\n";
    }
    shelveAll(shelf, {"Pell Ashby", "Otto Brisk"});
    std::cout << shelf.size() << " on the shelf\n";
    for (const auto& name : startingWith(shelf, 'O')) {
        std::cout << name << "\n";
    }
    std::cout << "Tickets, then 0: ";
    std::vector<int> tickets = readTickets();
    std::cout << tickets.size() << " tickets read\n";

    return 0;
}
