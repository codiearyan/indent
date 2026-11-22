// Kasimir's bench sheet. Build and run it with:
//   g++ -std=c++17 -Wall src/workbench.cpp -o workbench && ./workbench
//
// Kasimir wrote this from a book, and the compiler refuses one line under each task. Read what
// the compiler says, find the mistake it points at, and fix it. The lines say what Kasimir meant,
// so change only what is wrong.
//
// Your tasks, each under its own // Task comment inside main:
//   1. Fix the springs on the shelf
//   2. Fix the hands to fit
//   3. Fix the crystal size
//   4. Fix the oil line

#include <iomanip>
#include <iostream>
#include <string>

int main() {
    // Today's bench. Check tries other values here, so build on these names, not on the values.
    int springsInStock = 18;
    int springsDelivered = 30;
    int handsPerClock = 2;
    int clocksOnBench = 5;
    double crystalMm = 30.8;
    double oilPerService = 0.35;

    std::cout << "Bench sheet\n";

    // Task 1: Fix the springs on the shelf
    // This should print the springs in stock plus the ones just delivered.
    int springsOnShelf = springsInStock + springsDelivered;
    std::cout << "Springs on the shelf: " << springsOnShelf << "\n";

    // Task 2: Fix the hands to fit
    // This should print how many hands Kasimir fits today: the hands per clock, times the clocks.
    int handsNeeded = handsPerClock * clocksOnBench;
    std::cout << "Hands to fit: " << handsNeeded << "\n";

    // Task 3: Fix the crystal size
    // This should print the width of the glass crystal in millimetres, decimals included.
    double crystalSize = crystalMm;
    std::cout << "Crystal: " << crystalSize << " mm\n";

    // Task 4: Fix the oil line
    // This should print the oil one service takes, with exactly two decimals.
    std::cout << "Oil: " << std::fixed << std::setprecision(2) << oilPerService << " ml\n";

    return 0;
}
