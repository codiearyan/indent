// The waiting shelf: repairs that wait days for a part, long after the code that took them in
// has finished. Build and run it with:
//   g++ -std=c++17 -Wall src/waiting.cpp -o waiting && ./waiting
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Take in a repair that has to wait
//   2. Close a repair and give back its minutes
//   3. Take a repair off the shelf

#include <iostream>
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

// Task 1: Take in a repair that has to wait
// Write a function called takeIn that takes a ticket as an int and an item as a reference to a
// const std::string. It makes a new Repair with that ticket and item with new, so that it lives
// on after the function ends, and gives back the pointer new gave, as a Repair*.

Repair* takeIn(int ticket, const std::string& item) {
    return new Repair(ticket, item);
}

// Task 2: Close a repair and give back its minutes
// Write a function called closeRepair that takes a pointer to a repair made with new, as a
// Repair*, and gives back an int. It gives back the repair's minutes and deletes the repair, so
// nothing is left of it. When the pointer is nullptr, it deletes nothing and gives back 0.

int closeRepair(Repair* repair) {
    if (repair == nullptr) {
        return 0;
    }
    int minutes = repair->getMinutes();
    delete repair;
    return minutes;
}

// Task 3: Take a repair off the shelf
// Write a function called takeOff that takes the shelf as a reference to a std::vector<Repair*>,
// whose pointers each point at a repair made with new, and a ticket as an int, and gives back a
// bool. It deletes the repair with that ticket, takes its pointer off the shelf, keeps the other
// pointers in their order, and gives back true. When no repair on the shelf has that ticket, it
// changes nothing and gives back false.

bool takeOff(std::vector<Repair*>& shelf, int ticket) {
    for (std::size_t i = 0; i < shelf.size(); i++) {
        if (shelf[i]->getTicket() == ticket) {
            delete shelf[i];
            shelf.erase(shelf.begin() + i);
            return true;
        }
    }
    return false;
}

int main() {
    std::cout << "The waiting shelf\n";

    std::vector<Repair*> shelf;
    shelf.push_back(takeIn(3101, "mantel clock"));
    shelf.push_back(takeIn(3104, "pocket watch"));
    shelf.push_back(takeIn(3110, "carriage clock"));
    shelf[1]->addMinutes(35);

    int minutes = closeRepair(shelf[1]);
    std::cout << "Closed 3104 after " << minutes << " min\n";
    shelf.erase(shelf.begin() + 1);

    if (takeOff(shelf, 3101)) {
        std::cout << "3101 is off the shelf, " << shelf.size() << " left\n";
    }
    for (Repair* repair : shelf) {
        delete repair;
    }
    shelf.clear();

    return 0;
}
