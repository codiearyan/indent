// Dorrit's waiting list and Kasimir's bench: a repair that waits for a part is on both at once,
// and ends only when neither holds it any more. Build and run it with:
//   g++ -std=c++17 -Wall src/lists.cpp -o lists && ./lists
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Put one repair on both lists
//   2. Let go of a repair
//   3. Count who holds a repair

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

// Task 1: Put one repair on both lists
// Write a function called putOnBoth that takes the bench and the waiting list, each as a
// reference to a std::vector<std::shared_ptr<Repair>>, a ticket as an int and an item as a
// reference to a const std::string, and gives nothing back. It makes one Repair with that ticket
// and item, owned by a std::shared_ptr<Repair>, and puts that one repair at the end of both
// lists.

// Task 2: Let go of a repair
// Write a function called letGo that takes a list as a reference to a
// std::vector<std::shared_ptr<Repair>> and a ticket as an int, and gives back a bool. It takes
// the repair with that ticket off the list, keeps the others in their order, and gives back true.
// When no repair on the list has that ticket, it changes nothing and gives back false. The
// repair itself ends only when nothing else holds it.

// Task 3: Count who holds a repair
// Write a function called ownersOf that takes a list as a reference to a const
// std::vector<std::shared_ptr<Repair>> and a ticket as an int, and gives back a long: how many
// shared_ptrs own the repair with that ticket, as the shared_ptr counts them. When no repair on
// the list has that ticket, it gives back 0.

int main() {
    std::cout << "Bench and waiting list\n";

    // Try each function here once you have written it: put repairs on both lists, count their
    // owners, let go of them one list at a time, and watch when the destructor's line appears.
    // Check calls your functions with lists of its own.

    return 0;
}
