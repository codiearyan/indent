// Dorrit's repair slips: everything about one repair kept together as one value, instead of a
// handful of loose variables. Build and run it with:
//   g++ -std=c++17 -Wall src/slip.cpp -o slip && ./slip
//
// Your tasks, each written under its own // Task comment, above main:
//   1. Write the repair's struct
//   2. Fill in a new repair
//   3. Write the slip's line
//   4. Keep the customer with the repair

#include <iostream>
#include <string>

// Task 1: Write the repair's struct
// Write a struct called Repair with four members: ticket, an int that starts at 0; owner, a
// std::string; item, a std::string; and minutes, an int that starts at 0.
struct Repair {
    int ticket = 0;
    std::string owner;
    std::string item;
    int minutes = 0;
};

// Task 2: Fill in a new repair
// Write a function called takeIn that takes the ticket as an int, and the owner and the item each
// as a reference to a const std::string. It gives back a new Repair with those three members
// filled in and its minutes at 0.
Repair takeIn(int ticket, const std::string& owner, const std::string& item) {
    Repair repair;
    repair.ticket = ticket;
    repair.owner = owner;
    repair.item = item;
    return repair;
}

// Task 3: Write the slip's line
// Write a function called slipLine that takes a repair as a reference to a const Repair and gives
// back its line for the slip as a std::string: the ticket, a space, the item, " for ", the owner,
// ", " and the minutes, then " min". Like this:
//   3101 mantel clock for Liesl Farrow, 45 min
std::string slipLine(const Repair& repair) {
    return std::to_string(repair.ticket) + " " + repair.item + " for " + repair.owner + ", " +
           std::to_string(repair.minutes) + " min";
}

// Task 4: Keep the customer with the repair
// Write a struct called Customer with two std::string members, name and phone. Below it, write a
// struct called Pickup with two members: repair, a Repair, and customer, a Customer. Then write a
// function called callLine that takes a pickup as a reference to a const Pickup and gives back,
// as a std::string, the line Dorrit reads when she rings: "Ring ", the customer's name, " on ",
// the customer's phone, " about ticket " and the repair's ticket. Like this:
//   Ring Liesl Farrow on 01632 960118 about ticket 3101
struct Customer {
    std::string name;
    std::string phone;
};

struct Pickup {
    Repair repair;
    Customer customer;
};

std::string callLine(const Pickup& pickup) {
    return "Ring " + pickup.customer.name + " on " + pickup.customer.phone + " about ticket " +
           std::to_string(pickup.repair.ticket);
}

int main() {
    std::cout << "Repair slips\n";

    // Try each part here once you have written it: make a Repair, give its members values and
    // print them. Check makes repairs of its own, with values of its own.
    Repair clock = takeIn(3101, "Liesl Farrow", "mantel clock");
    clock.minutes = 45;
    std::cout << slipLine(clock) << "\n";

    Pickup pickup;
    pickup.repair = clock;
    pickup.customer.name = "Liesl Farrow";
    pickup.customer.phone = "01632 960118";
    std::cout << callLine(pickup) << "\n";

    return 0;
}
