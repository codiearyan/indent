// Ambrose's billing desk: a finished repair leaves Kasimir's bench and lands on Ambrose's desk to
// be billed, and is in exactly one place at a time. Build and run it with:
//   g++ -std=c++17 -Wall src/desk.cpp -o desk && ./desk
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Open a repair with one owner
//   2. Put a repair on the desk
//   3. Look at a repair without taking it
//   4. Take a repair from the bench for billing

#include <iostream>
#include <memory>
#include <string>
#include <vector>

// A repair on the bench, given whole. Every task uses it as it is. Its destructor prints a line,
// so you can see in the terminal when each repair ends.
class Repair {
private:
    int ticket;
    std::string item;
    int minutes = 0;

public:
    Repair(int number, const std::string& name) : ticket(number), item(name) {}
    ~Repair() { std::cout << "Repair " << ticket << " ends\n"; }

    int getTicket() const { return ticket; }
    const std::string& getItem() const { return item; }
    int getMinutes() const { return minutes; }
    void addMinutes(int extra) { minutes += extra; }
};

// Task 1: Open a repair with one owner
// Write a function called openRepair that takes a ticket as an int and an item as a reference to
// a const std::string. It makes a Repair with that ticket and item, owned by a
// std::unique_ptr<Repair>, and gives back that std::unique_ptr<Repair>.

std::unique_ptr<Repair> openRepair(int ticket, const std::string& item) {
    return std::make_unique<Repair>(ticket, item);
}

// Task 2: Put a repair on the desk
// Write a function called addToDesk that takes the desk as a reference to a
// std::vector<std::unique_ptr<Repair>> and a repair as a std::unique_ptr<Repair>, taken by value,
// and gives back an int. It puts the repair at the end of the desk, unless the unique_ptr is
// empty, and gives back how many repairs the desk then holds.

int addToDesk(std::vector<std::unique_ptr<Repair>>& desk, std::unique_ptr<Repair> repair) {
    if (repair != nullptr) {
        desk.push_back(std::move(repair));
    }
    return static_cast<int>(desk.size());
}

// Task 3: Look at a repair without taking it
// Write a function called findOnDesk that takes the desk as a reference to a const
// std::vector<std::unique_ptr<Repair>> and a ticket as an int. It gives back a plain pointer to
// the repair with that ticket, as a Repair*, or nullptr when no repair on the desk has it. The
// desk keeps owning every repair.

Repair* findOnDesk(const std::vector<std::unique_ptr<Repair>>& desk, int ticket) {
    for (const std::unique_ptr<Repair>& repair : desk) {
        if (repair->getTicket() == ticket) {
            return repair.get();
        }
    }
    return nullptr;
}

// Task 4: Take a repair from the bench for billing
// Write a function called takeForBilling that takes the bench as a reference to a
// std::vector<std::unique_ptr<Repair>> and a ticket as an int, and gives back a
// std::unique_ptr<Repair>. It hands over the repair with that ticket, takes its place off the
// bench, and keeps the others in their order. When no repair on the bench has that ticket, it
// changes nothing and gives back an empty std::unique_ptr<Repair>.

std::unique_ptr<Repair> takeForBilling(std::vector<std::unique_ptr<Repair>>& bench, int ticket) {
    for (std::size_t i = 0; i < bench.size(); i++) {
        if (bench[i]->getTicket() == ticket) {
            std::unique_ptr<Repair> taken = std::move(bench[i]);
            bench.erase(bench.begin() + i);
            return taken;
        }
    }
    return nullptr;
}

int main() {
    std::cout << "Ambrose's desk\n";

    std::vector<std::unique_ptr<Repair>> bench;
    bench.push_back(openRepair(3101, "mantel clock"));
    bench.push_back(openRepair(3104, "pocket watch"));
    bench[1]->addMinutes(35);

    std::vector<std::unique_ptr<Repair>> desk;
    std::unique_ptr<Repair> done = takeForBilling(bench, 3104);
    std::cout << addToDesk(desk, std::move(done)) << " on the desk, " << bench.size() << " on the bench\n";

    Repair* billing = findOnDesk(desk, 3104);
    if (billing != nullptr) {
        std::cout << "Billing " << billing->getItem() << ", " << billing->getMinutes() << " min\n";
    }

    return 0;
}
