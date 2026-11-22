// Your first C++ program. Build it and run it in the terminal with:
//   g++ -std=c++17 -Wall src/welcome.cpp -o welcome && ./welcome
//
// Your tasks, each under its own // Task comment inside main:
//   1. Print the workshop's name
//   2. Print the opening hours
//   3. Switch off the old notice
//   4. Leave a note for Kasimir

#include <iostream>

int main() {
    std::cout << "Good morning from the workshop laptop\n";

    // Task 1: Print the workshop's name
    // Print this line, exactly as it is written here: Welcome to Tolliver Clockworks

    // Task 2: Print the opening hours
    // Print these two lines, one after the other, in this order, each on a line of its own:
    //   Open Tuesday to Saturday
    //   Closed for lunch from 1 to 2

    // Task 3: Switch off the old notice
    // The line below prints a notice the workshop no longer runs. Turn that line into a comment,
    // so it stays in the file but does not run.
    std::cout << "Free cleaning with every repair\n";

    // Task 4: Leave a note for Kasimir
    // Write a comment of your own, anywhere in this file, with a few words for Kasimir.

    return 0;
}
