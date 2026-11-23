// Ambrose's repair rules: functions kept in variables, handed to other functions, given back, and
// kept in a table by name. Build and run it with:
//   g++ -std=c++17 -Wall src/rules.cpp -o rules && ./rules
//
// Your tasks, each under its own // Task comment, above main:
//   1. Log the minutes a rule asks for
//   2. Make a rule that adds time
//   3. Write the table of repair rules
//   4. Run a rule by its name

#include <functional>
#include <iostream>
#include <map>
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

// Task 1: Log the minutes a rule asks for
// Write a function called logEach that takes the bench as a reference to a std::vector<Repair> and
// a rule as a reference to a const std::function<int(const Repair&)>. For each repair, in order,
// it asks the rule once how many minutes to add, adds them to the repair with addMinutes, and it
// gives back all the minutes it added, as an int. When the rule is empty, it adds nothing, gives
// back 0 and never calls it.
int logEach(std::vector<Repair>& bench, const std::function<int(const Repair&)>& rule) {
    if (!rule) {
        return 0;
    }
    int total = 0;
    for (Repair& repair : bench) {
        int extra = rule(repair);
        repair.addMinutes(extra);
        total += extra;
    }
    return total;
}

// Task 2: Make a rule that adds time
// Write a function called addTime that takes minutes as an int and gives back a
// std::function<void(Repair&)>: a rule that adds those minutes to whatever repair it is called
// with. The rule is called long after addTime has returned, as often as anyone likes.
std::function<void(Repair&)> addTime(int minutes) {
    return [minutes](Repair& repair) { repair.addMinutes(minutes); };
}

// Task 3: Write the table of repair rules
// Write a function called repairRules that takes nothing and gives back a
// std::map<std::string, std::function<void(Repair&)>> with exactly three rules: "clean" adds 30
// minutes to a repair, "oil" adds 15 and "regulate" adds 45.
std::map<std::string, std::function<void(Repair&)>> repairRules() {
    return {
        {"clean", addTime(30)},
        {"oil", addTime(15)},
        {"regulate", addTime(45)},
    };
}

// Task 4: Run a rule by its name
// Write a function called runRule that takes the rules as a reference to a const
// std::map<std::string, std::function<void(Repair&)>>, a name as a reference to a const
// std::string and a repair as a reference to a Repair. When the table has a rule of that name that
// is not empty, it runs that rule on the repair, once, and gives back true. Otherwise it changes
// nothing and gives back false.
bool runRule(const std::map<std::string, std::function<void(Repair&)>>& rules, const std::string& name, Repair& repair) {
    auto found = rules.find(name);
    if (found == rules.end() || !found->second) {
        return false;
    }
    found->second(repair);
    return true;
}

int main() {
    std::cout << "Ambrose's repair rules\n";

    std::vector<Repair> bench;
    bench.push_back(Repair(3101, "mantel clock"));
    bench.push_back(Repair(3104, "pocket watch"));

    // Try each task here once you have written it: log 10 minutes on every repair of bench, make a
    // rule that adds 20, and run "oil" on the first repair by its name. Check calls your code with
    // repairs and rules of its own.
    std::cout << bench.size() << " repairs on the bench\n";
    int added = logEach(bench, [](const Repair&) { return 10; });
    std::cout << "Logged " << added << " minutes\n";
    std::function<void(Repair&)> twenty = addTime(20);
    twenty(bench[0]);
    std::map<std::string, std::function<void(Repair&)>> rules = repairRules();
    if (runRule(rules, "oil", bench[0])) {
        std::cout << "Oiled " << bench[0].getTicket() << ": " << bench[0].getMinutes() << " minutes\n";
    }
    if (!runRule(rules, "polish", bench[1])) {
        std::cout << "No rule called polish\n";
    }

    return 0;
}
