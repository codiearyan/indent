// The paper tag tied to each clock. Build and run it with:
//   g++ -std=c++17 -Wall src/tags.cpp -o tags && ./tags
//
// Your tasks, each under its own // Task comment inside main:
//   1. Write the name on the tag
//   2. Measure the tag
//   3. Make the shelf code
//   4. Shorten the item

#include <iostream>
#include <string>

int main() {
    // Today's clock, from Dorrit's slip. Check tries other values here, so build on these
    // names, not on the values themselves.
    std::string firstName = "Edwina";
    std::string lastName = "Sallow";
    std::string item = "carriage clock";
    int ticketNumber = 2187;

    std::cout << "Clock tag\n";

    // Task 1: Write the name on the tag
    // Make a std::string called tagName: the last name, a comma and a space, then the first name.
    // Print it, like this:
    //   Name: Sallow, Edwina

    // Task 2: Measure the tag
    // The tag needs a border of 2 characters on each side of the item. Make an int called
    // tagWidth: the number of characters in item, plus 4. Print it, like this:
    //   Width: 18

    // Task 3: Make the shelf code
    // Make a std::string called shelfCode: the first letter of the last name, followed by the
    // ticket number. Print it, like this:
    //   Code: S2187

    // Task 4: Shorten the item
    // The small tag has room for 8 characters. Make a std::string called shortItem: the first 8
    // characters of item, or all of it when it is shorter. Print it, like this:
    //   Item: carriage

    return 0;
}
