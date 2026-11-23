// Kasimir's parts drawer. Build and run it with:
//   g++ -std=c++17 -Wall src/drawer.cpp -o drawer && ./drawer
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Take parts out of the drawer
//   2. Split the minutes into hours
//   3. Write the drawer's label
//   4. Add a note to the bench log

#include <iostream>
#include <string>

// Task 1: Take parts out of the drawer
// Write a function called useParts that takes the number of parts in the drawer as a reference
// to an int, and the number Kasimir uses as an int. It takes the parts used from the caller's
// own count and gives nothing back. When the drawer has fewer parts than he uses, the count
// becomes 0. With 12 in the drawer and 3 used, the caller's count is 9 afterwards.
void useParts(int& inDrawer, int used) {
    if (used > inDrawer) {
        inDrawer = 0;
    } else {
        inDrawer -= used;
    }
}

// Task 2: Split the minutes into hours
// Write a function called splitMinutes that takes the total minutes as an int called total,
// and two references to an int, hours and minutes, and gives nothing back. It puts the whole
// hours in the caller's hours and the minutes left over in the caller's minutes: 135 minutes is
// 2 hours and 15 minutes.
void splitMinutes(int total, int& hours, int& minutes) {
    hours = total / 60;
    minutes = total % 60;
}

// Task 3: Write the drawer's label
// Write a function called drawerLabel that takes the part's name as a reference to a const
// std::string and the count as an int, and gives back the label as a std::string: the name,
// " x " and the count, and prints nothing. Like this:
//   mainspring x 12
std::string drawerLabel(const std::string& part, int count) {
    return part + " x " + std::to_string(count);
}

// Task 4: Add a note to the bench log
// Write a function called addNote that takes the bench log as a reference to a std::string and
// a new note as a reference to a const std::string, and gives nothing back. It adds the note to
// the end of the caller's log, with "; " between it and what was there. An empty log becomes
// just the note:
//   cleaned; oiled
void addNote(std::string& log, const std::string& note) {
    if (log.size() == 0) {
        log = note;
    } else {
        log += "; " + note;
    }
}

int main() {
    std::cout << "Parts drawer\n";

    // Try each function here once you have written it: make a variable, pass it in, and print
    // it afterwards to see whether it changed. Check calls your functions with values of its own.
    int springs = 12;
    useParts(springs, 3);
    std::cout << drawerLabel("mainspring", springs) << "\n";

    int hours = 0;
    int minutes = 0;
    splitMinutes(135, hours, minutes);
    std::cout << hours << " h " << minutes << " min\n";

    std::string log = "cleaned";
    addNote(log, "oiled");
    std::cout << log << "\n";

    return 0;
}
