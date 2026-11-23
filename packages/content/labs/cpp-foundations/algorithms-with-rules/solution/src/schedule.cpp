// Kasimir's schedule: the repairs on the bench, put in order, searched, counted, priced and
// cleared. Build and run it with:
//   g++ -std=c++17 -Wall src/schedule.cpp -o schedule && ./schedule
//
// Your tasks, each under its own // Task comment, above main. Each one hands an algorithm of the
// standard library a rule of yours:
//   1. Put the bench in order
//   2. Find a repair by its item
//   3. Count the long repairs
//   4. Price every repair
//   5. Take repairs off the bench by a rule

#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

// A repair as part 4 wrote it, given whole.
struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
};

// Task 1: Put the bench in order
// Make a variable called benchFirst that holds a lambda. It takes two repairs, each as a reference
// to a const Repair, and gives back true when the first goes before the second on the bench, as a
// bool. The longer repair goes first; of two with the same minutes, the one with the smaller
// ticket goes first. Then write a function called benchOrder that takes the repairs as a reference
// to a std::vector<Repair>, gives nothing back, and puts them in that order with std::sort and
// benchFirst.
auto benchFirst = [](const Repair& a, const Repair& b) {
    if (a.minutes != b.minutes) {
        return a.minutes > b.minutes;
    }
    return a.ticket < b.ticket;
};

void benchOrder(std::vector<Repair>& repairs) {
    std::sort(repairs.begin(), repairs.end(), benchFirst);
}

// Task 2: Find a repair by its item
// Write a function called ticketFor that takes the repairs as a reference to a const
// std::vector<Repair> and an item as a reference to a const std::string. It gives back the ticket
// of the first repair of that item, as an int, found with std::find_if and a lambda, or 0 when no
// repair has that item.
int ticketFor(const std::vector<Repair>& repairs, const std::string& item) {
    auto found = std::find_if(repairs.begin(), repairs.end(), [&item](const Repair& r) { return r.item == item; });
    if (found == repairs.end()) {
        return 0;
    }
    return found->ticket;
}

// Task 3: Count the long repairs
// Write a function called countLonger that takes the repairs as a reference to a const
// std::vector<Repair> and a limit in minutes as an int. It gives back how many repairs take more
// minutes than the limit, as an int, counted with std::count_if and a lambda.
int countLonger(const std::vector<Repair>& repairs, int limit) {
    return std::count_if(repairs.begin(), repairs.end(), [limit](const Repair& r) { return r.minutes > limit; });
}

// Task 4: Price every repair
// Write a function called pricesAt that takes the repairs as a reference to a const
// std::vector<Repair> and an hourly rate as a double. It gives back a new std::vector<double> with
// the price of each repair, in the same order: its minutes in hours times the rate, worked out with
// std::transform and a lambda.
std::vector<double> pricesAt(const std::vector<Repair>& repairs, double rate) {
    std::vector<double> prices(repairs.size());
    std::transform(repairs.begin(), repairs.end(), prices.begin(), [rate](const Repair& r) { return r.minutes / 60.0 * rate; });
    return prices;
}

// Task 5: Take repairs off the bench by a rule
// Write a function template called dropWhere, with one type Rule, that takes the repairs as a
// reference to a std::vector<Repair> and a rule, of type Rule, and gives nothing back. The rule is
// a function that takes a repair and gives back true for a repair that comes off the bench.
// dropWhere takes every such repair off, keeps the others in their order, and asks the rule about
// each repair once. It does this with std::remove_if and erase.
template <typename Rule>
void dropWhere(std::vector<Repair>& repairs, Rule rule) {
    auto kept = std::remove_if(repairs.begin(), repairs.end(), rule);
    repairs.erase(kept, repairs.end());
}

int main() {
    std::cout << "Kasimir's schedule\n";

    std::vector<Repair> bench = {
        {3104, "pocket watch", 45},
        {3110, "mantel clock", 90},
        {3101, "carriage clock", 0},
        {3107, "pocket watch", 20},
    };

    // Try each task here once you have written it, with bench. Check calls your functions with
    // repairs and rules of its own.
    benchOrder(bench);
    std::cout << "First pocket watch: " << ticketFor(bench, "pocket watch") << "\n";
    std::cout << "Over 30 minutes: " << countLonger(bench, 30) << "\n";
    for (double price : pricesAt(bench, 40)) {
        std::cout << "Price: " << price << "\n";
    }
    dropWhere(bench, [](const Repair& r) { return r.minutes == 0; });
    for (const Repair& repair : bench) {
        std::cout << repair.ticket << " " << repair.item << ", " << repair.minutes << " min\n";
    }

    return 0;
}
