// Dorrit's weekly report: the minutes of every repair of the week, and the longest of them. Build
// and run it with:
//   g++ -std=c++17 -Wall src/report.cpp -o report && ./report
//
// Your tasks, each under its own // Task comment, above main:
//   1. Find the smallest week that breaks the report
//   2. Find the longest repair, and say what must be true
//   3. Write an exception that carries the wrong value
//   4. Refuse minutes that cannot be right

#include <cassert>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

// The longest repair of a week, in minutes, given whole: the report has used it for months. It
// gives back 0 for an empty week. This week it gives the wrong answer, and it gives no error.
// Do not change it: Task 1 is about the weeks it gets wrong.
int longestOf(const std::vector<int>& minutes) {
    if (minutes.empty()) {
        return 0;
    }
    int longest = minutes[0];
    for (std::size_t i = 1; i + 1 < minutes.size(); i++) {
        if (minutes[i] > longest) {
            longest = minutes[i];
        }
    }
    return longest;
}

// Task 1: Find the smallest week that breaks the report
// Write a function called smallestFailing that takes nothing and gives back a std::vector<int>: a
// week of minutes for which longestOf, as it is above, gives a wrong answer, and which has as few
// values as a week that breaks it can have. Cut this week's list in main down until it is that
// small and still wrong.
std::vector<int> smallestFailing() {
    return {15, 240};
}

// Task 2: Find the longest repair, and say what must be true
// Write a function called longestRepair that takes the minutes as a reference to a const
// std::vector<int> and gives back an int: the longest of them. Every caller makes sure the list
// is not empty first, so its first line is an assert that says so. It prints nothing on standard
// output: prints you add to look inside go to std::cerr.
int longestRepair(const std::vector<int>& minutes) {
    assert(!minutes.empty());
    int longest = minutes[0];
    for (int m : minutes) {
        if (m > longest) {
            longest = m;
        }
    }
    return longest;
}

// Task 3: Write an exception that carries the wrong value
// Write a class called BadMinutes, built on std::invalid_argument. Its constructor takes the
// minutes that were wrong, as an int, and gives std::invalid_argument a message that names them.
// Its member function getMinutes, marked const, gives back those minutes as an int.
class BadMinutes : public std::invalid_argument {
private:
    int minutes;

public:
    explicit BadMinutes(int wrong)
        : std::invalid_argument("minutes must be 0 to 600, and " + std::to_string(wrong) + " is not"), minutes(wrong) {}

    int getMinutes() const { return minutes; }
};

// Task 4: Refuse minutes that cannot be right
// Write a function called logMinutes that takes the week as a reference to a std::vector<int> and
// the minutes of one repair as an int, and gives nothing back. It puts the minutes at the end of
// the week. Minutes below 0 or above 600 are a typing mistake at the counter: then it throws a
// BadMinutes that carries them, and leaves the week as it was.
void logMinutes(std::vector<int>& week, int minutes) {
    if (minutes < 0 || minutes > 600) {
        throw BadMinutes(minutes);
    }
    week.push_back(minutes);
}

int main() {
    std::vector<int> week = {95, 40, 210, 15, 60, 120, 240};
    std::cout << "Longest repair this week: " << longestOf(week) << " minutes\n";

    // Try each task here once you have written it. Check calls your functions with values of its
    // own.
    std::cout << "Longest, written again: " << longestRepair(week) << " minutes\n";
    std::cout << "The smallest week that breaks it: " << smallestFailing().size() << " values\n";
    try {
        logMinutes(week, 7250);
    } catch (const BadMinutes& wrong) {
        std::cout << "Not logged: " << wrong.what() << " (" << wrong.getMinutes() << ")\n";
    }

    return 0;
}
