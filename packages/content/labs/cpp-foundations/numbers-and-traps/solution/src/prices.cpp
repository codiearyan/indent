// The repair bill. Build and run it with:
//   g++ -std=c++17 -Wall src/prices.cpp -o prices && ./prices
//
// Your tasks, each under its own // Task comment inside main:
//   1. Price the labour
//   2. Bag the screws
//   3. Find the average job
//   4. Count the beats of the guarantee
//   5. Print the parts price

#include <iomanip>
#include <iostream>

int main() {
    // Today's figures, from Ambrose's slips. Check tries other values here, so build on these
    // names, not on the values themselves.
    double hourlyRate = 38.5;
    int hoursWorked = 3;
    int screwsInBox = 14;
    int screwsPerBag = 4;
    int minutesTotal = 250;
    int jobsDone = 4;
    int beatsPerSecond = 8;
    int guaranteeYears = 10;
    double partsCost = 12.4;

    std::cout << "Repair bill\n";

    // Task 1: Price the labour
    // Make a double called labour: the hourly rate times the hours worked. Print it, like this:
    //   Labour: 115.5
    double labour = hourlyRate * hoursWorked;
    std::cout << "Labour: " << labour << "\n";

    // Task 2: Bag the screws
    // Kasimir puts screwsPerBag screws in each bag. Make an int called fullBags, the number of
    // full bags the box makes, and an int called leftOver, the screws left over. Print them:
    //   Full bags: 3, left over: 2
    int fullBags = screwsInBox / screwsPerBag;
    int leftOver = screwsInBox % screwsPerBag;
    std::cout << "Full bags: " << fullBags << ", left over: " << leftOver << "\n";

    // Task 3: Find the average job
    // Make a double called averageMinutes: the minutes of all jobs divided by the jobs done,
    // decimals included. Print it, like this:
    //   Average: 62.5 minutes
    double averageMinutes = static_cast<double>(minutesTotal) / jobsDone;
    std::cout << "Average: " << averageMinutes << " minutes\n";

    // Task 4: Count the beats of the guarantee
    // A watch beats beatsPerSecond times a second, and the guarantee lasts guaranteeYears years
    // of 365 days. Make a long long called guaranteeBeats: how many times it beats in that time.
    // Print it, like this:
    //   Beats: 2522880000
    long long guaranteeBeats = static_cast<long long>(beatsPerSecond) * 60 * 60 * 24 * 365 * guaranteeYears;
    std::cout << "Beats: " << guaranteeBeats << "\n";

    // Task 5: Print the parts price
    // Print partsCost with exactly two digits after the point, like this:
    //   Parts: 12.40
    std::cout << "Parts: " << std::fixed << std::setprecision(2) << partsCost << "\n";

    return 0;
}
