// Dorrit's intake at the counter: the program asks, she types. Build and run it with:
//   g++ -std=c++17 -Wall src/intake.cpp -o intake && ./intake
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Ask for a number
//   2. Ask for a line of text
//   3. Ask for the clocks and the item
//   4. Ask again until it is a number
//
// A program waiting for typing can be stopped in the terminal with Ctrl+C.

#include <iostream>
#include <string>

// Task 1: Ask for a number
// Write a function called askNumber that takes a question as a reference to a const
// std::string. It prints the question as it is, reads a whole number from std::cin and gives
// it back as an int.
int askNumber(const std::string& question) {
    std::cout << question;
    int number = 0;
    std::cin >> number;
    return number;
}

// Task 2: Ask for a line of text
// Write a function called askLine that takes a question as a reference to a const std::string.
// It prints the question as it is, reads a whole line from std::cin, spaces included, and gives
// it back as a std::string. Typing "Edwina Sallow" gives back "Edwina Sallow".
std::string askLine(const std::string& question) {
    std::cout << question;
    std::string line;
    std::getline(std::cin, line);
    return line;
}

// Task 3: Ask for the clocks and the item
// Write a function called askRepair that takes two references, an int called clocks and a
// std::string called item, and gives nothing back. It prints "Clocks: ", reads a whole number
// into the caller's clocks, then prints "Item: " and reads a whole line into the caller's item.
// Dorrit types the number, presses Enter, then types the item:
//   Clocks: 2
//   Item: carriage clock
void askRepair(int& clocks, std::string& item) {
    std::cout << "Clocks: ";
    std::cin >> clocks;
    std::cout << "Item: ";
    std::getline(std::cin >> std::ws, item);
}

// Task 4: Ask again until it is a number
// Write a function called askQuantity that takes a question as a reference to a const
// std::string. It prints the question and reads a whole number, like askNumber. When what was
// typed on that line is not a number, it prints the line below and asks again, until it gets a
// number, and gives that number back as an int:
//   That is not a number.
int askQuantity(const std::string& question) {
    int number = 0;
    while (true) {
        std::cout << question;
        if (std::cin >> number) {
            return number;
        }
        std::cin.clear();
        std::string rest;
        std::getline(std::cin, rest);
        std::cout << "That is not a number.\n";
    }
}

int main() {
    std::cout << "Counter intake\n";

    // Call your functions here once you have written them, then run the program and type the
    // answers. Check types answers of its own.
    int ticket = askNumber("Ticket number: ");
    int clocks = 0;
    std::string item;
    askRepair(clocks, item);
    std::string customer = askLine("Customer: ");
    int days = askQuantity("Days promised: ");
    std::cout << "Ticket " << ticket << ": " << clocks << " x " << item << " for " << customer
              << ", ready in " << days << " days\n";

    return 0;
}
