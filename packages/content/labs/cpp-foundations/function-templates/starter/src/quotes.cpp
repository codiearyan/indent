// Ambrose's quotes: the largest bill, the largest ticket, and prices kept between a floor and a
// ceiling. Build and run it with:
//   g++ -std=c++17 -Wall src/quotes.cpp -o quotes && ./quotes
//
// Your tasks, each written under its own // Task comment, above main:
//   1. Fold two functions into one template
//   2. Keep a value between two others, for any type
//   3. Keep the quotes between the floor and the ceiling

#include <iostream>
#include <string>
#include <vector>

// Ambrose's two functions as they are today. They are the same function twice, with a different
// type each time. Task 1 folds them into one; delete these two once your template works.
int largestTicket(const std::vector<int>& tickets) {
    int largest = tickets[0];
    for (int ticket : tickets) {
        if (largest < ticket) {
            largest = ticket;
        }
    }
    return largest;
}

double largestBill(const std::vector<double>& bills) {
    double largest = bills[0];
    for (double bill : bills) {
        if (largest < bill) {
            largest = bill;
        }
    }
    return largest;
}

// Task 1: Fold two functions into one template
// Write a function template called largestOf, with one type T, that takes a reference to a const
// std::vector<T> and gives back the largest of its items, as a T. The vector always holds at least
// one item. A type T needs to offer only two things for largestOf to work: it can be copied, and
// two of its values can be compared with <.

// Task 2: Keep a value between two others, for any type
// Write a function template called clampTo, with one type T, that takes three references to a
// const T: a value, a low end and a high end. It gives back low when the value is below low, high
// when the value is above high, and the value itself otherwise, as a T. As in Task 1, a type T
// needs to offer only copies and <.

// Task 3: Keep the quotes between the floor and the ceiling
// Write a function called fairPrices that takes the quotes as a reference to a const
// std::vector<int>, the floor as a double and the ceiling as a double. It gives back a new
// std::vector<double> with one price for each quote, in the same order: the quote kept between the
// floor and the ceiling by clampTo, worked out as a double, so the pence of the floor and the
// ceiling are kept.

int main() {
    std::cout << "Ambrose's quotes\n";

    std::vector<int> tickets = {3051, 3072, 3060};
    std::vector<double> bills = {72, 18.5, 140.25};
    std::vector<int> quotes = {8, 95, 310, 40};
    double floor = 12.5;
    double ceiling = 249.99;

    std::cout << "Largest ticket: " << largestTicket(tickets) << "\n";
    std::cout << "Largest bill: " << largestBill(bills) << "\n";

    // Try each function here once you have written it, with tickets, bills, quotes, floor and
    // ceiling. Check calls your functions with values and types of its own.
    std::cout << quotes.size() << " quotes between " << floor << " and " << ceiling << "\n";

    return 0;
}
