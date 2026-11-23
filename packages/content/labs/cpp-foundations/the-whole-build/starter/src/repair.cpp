// repair.cpp: reading a repair from a line, with the tools of this part. Given whole.
#include "repair.h"

#include <optional>
#include <sstream>
#include <vector>

std::string trim(const std::string& text) {
    const std::string blanks = " \t\r";
    std::size_t first = text.find_first_not_of(blanks);
    if (first == std::string::npos) {
        return "";
    }
    std::size_t last = text.find_last_not_of(blanks);
    return text.substr(first, last - first + 1);
}

std::vector<std::string> splitAt(const std::string& line, char separator) {
    std::vector<std::string> fields;
    std::istringstream in(line);
    std::string field;
    while (std::getline(in, field, separator)) {
        fields.push_back(field);
    }
    if (line.empty() || line.back() == separator) {
        fields.push_back("");
    }
    return fields;
}

std::optional<int> toWhole(const std::string& text) {
    std::istringstream in(text);
    int number = 0;
    char extra = 0;
    if (!(in >> number) || in >> extra) {
        return std::nullopt;
    }
    return number;
}

std::optional<double> toAmount(const std::string& text) {
    std::istringstream in(text);
    double amount = 0;
    char extra = 0;
    if (!(in >> amount) || in >> extra) {
        return std::nullopt;
    }
    return amount;
}

bool parseRepair(const std::string& line, Repair& repair) {
    std::vector<std::string> fields = splitAt(line, ',');
    if (fields.size() != 4) {
        return false;
    }
    std::optional<int> ticket = toWhole(trim(fields[0]));
    std::string item = trim(fields[1]);
    std::optional<int> minutes = toWhole(trim(fields[2]));
    std::optional<double> parts = toAmount(trim(fields[3]));
    if (!ticket || item.empty() || !minutes || !parts) {
        return false;
    }
    repair.ticket = *ticket;
    repair.item = item;
    repair.minutes = *minutes;
    repair.parts = *parts;
    return true;
}
