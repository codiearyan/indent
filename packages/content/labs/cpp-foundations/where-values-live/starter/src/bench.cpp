// Kasimir's bench: the repairs he is working on, and the functions that hand them over. Build
// and run it with:
//   g++ -std=c++17 -Wall src/bench.cpp -o bench && ./bench
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Open a repair and hand it over
//   2. Hand over the next repair where it sits
//   3. Add a check-up for every long repair

#include <iostream>
#include <string>
#include <vector>

// A repair on the bench, given whole. Every task uses it as it is.
class Repair {
private:
    int ticket;
    std::string item;
    int minutes = 0;

public:
    Repair(int number, const std::string& name) : ticket(number), item(name) {}

    int getTicket() const { return ticket; }
    const std::string& getItem() const { return item; }
    int getMinutes() const { return minutes; }
    void addMinutes(int extra) { minutes += extra; }
};

// Task 1: Open a repair and hand it over
// Write a function called openRepair that takes a ticket as an int, an item as a reference to a
// const std::string and a number of minutes as an int. It makes a Repair with that ticket and
// item, logs the minutes on it, and gives the repair back as a Repair.

// Task 2: Hand over the next repair where it sits
// Write a function called nextUp that takes the bench as a reference to a std::vector<Repair>,
// which is never empty. It gives back a reference to the repair with the fewest minutes, as a
// Repair&, so the caller can log time on that very repair. When two have the fewest, it is the
// one nearer the front.

// Task 3: Add a check-up for every long repair
// Write a function called addCheckUps that takes the bench as a reference to a
// std::vector<Repair> and gives nothing back. For every repair on the bench with more than 480
// minutes, it puts a new repair at the end of the bench: its ticket is the long repair's ticket
// plus 1000, its item is the same, and it has no minutes. The check-ups go on in the order of the
// repairs they are for, and are not looked at themselves.

int main() {
    std::cout << "Kasimir's bench\n";

    std::vector<Repair> bench = {Repair(3101, "mantel clock"), Repair(3104, "pocket watch"), Repair(3110, "carriage clock")};
    bench[0].addMinutes(510);
    bench[1].addMinutes(35);
    bench[2].addMinutes(90);

    // Try each function here once you have written it, with bench, and print what you get.
    // Check calls your functions with repairs and benches of its own.
    std::cout << bench.size() << " repairs on the bench\n";

    return 0;
}
