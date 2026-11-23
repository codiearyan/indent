// Ambrose's billing desk: charges go on a bill, parts are priced from the price book, and every
// charge goes to the till on the counter. Build and run it with:
//   g++ -std=c++17 -Wall src/billing.cpp -o billing && ./billing
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Refuse a charge that makes no sense
//   2. Price the parts, and list the ones not in the book
//   3. Tell the counter what happened to a charge

#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

// The price book, given whole: the price in cents of each part the workshop keeps. It throws
// std::invalid_argument when it is given an empty part name, and .at() throws std::out_of_range
// for a part that is not in the book. Every task uses it as it is.
int priceOf(const std::string& part) {
    std::map<std::string, int> book = {{"mainspring", 1200}, {"crystal", 350}, {"balance staff", 900}, {"hand set", 480}};
    if (part.empty()) {
        throw std::invalid_argument("priceOf was given an empty part name");
    }
    return book.at(part);
}

// The till on the counter, given whole. On this laptop it only prints. At the counter it throws
// std::runtime_error when the till is switched off.
void sendToTill(int cents) {
    std::cout << "Till: " << cents << " cents\n";
}

// Task 1: Refuse a charge that makes no sense
// Write a function called addCharge that takes the bill as a reference to a std::vector<int> and a
// charge in cents as an int, and gives nothing back. It puts the charge at the end of the bill.
// When the charge is 0 or less, it throws a std::invalid_argument whose what() names the charge it
// was given, and leaves the bill as it was.

// Task 2: Price the parts, and list the ones not in the book
// Write a function called quoteParts that takes the parts as a reference to a const
// std::vector<std::string> and a list of missing parts as a reference to a std::vector<std::string>,
// and gives back an int: the prices of the parts added up, from priceOf. When priceOf throws
// std::out_of_range for a part, that part is not in the book: quoteParts puts its name at the end
// of missing and goes on with the next part. Any other exception is not one it can handle: it lets
// it go on to its caller.

// Task 3: Tell the counter what happened to a charge
// Write a function called chargeLine that takes the bill as a reference to a std::vector<int> and a
// charge in cents as an int, and gives back a std::string. It adds the charge with addCharge, then
// sends it to the till with sendToTill, and gives back a line like "Added 250 cents". When addCharge
// refuses the charge with std::invalid_argument, it gives back "Not added: " followed by that
// exception's what(), and sends nothing to the till. Any other exception, from addCharge or from
// the till, goes on to its caller: that is for Ambrose, not for the person at the counter.

int main() {
    std::vector<int> bill;
    std::cout << "Ambrose's desk\n";

    // Try each function here once you have written it: a charge of 250, one of -40, the parts
    // {"mainspring", "crystal", "gear 12"}, and a line for each charge. Check calls your functions
    // with values of its own, and with a price book and a till of its own.

    return 0;
}
