# Rhona's season report. Run this file with: python3 season_report.py
#
# Task 1: Hints on a total
# Task 2: Hints that tell the truth
# Task 3: A leader, or None
# Task 4: A rule handed in
# Task 5: The season's longest callouts

import csv
from dataclasses import dataclass
from typing import Callable, Optional


@dataclass
class Callout:
    date: str
    hill: str
    hours: int


# The leader of each team on the hill this season.
leaders = {"Alpha": "Ailsa", "Bravo": "Dougie", "Charlie": "Rhona"}

# Task 1: Hints on a total
# Write a function called total_hours that takes a list of whole numbers and gives back their
# total. Give it hints that say its parameter is a list of whole numbers and that it gives back
# a whole number.
def total_hours(hours: list[int]) -> int:
    return sum(hours)

# Task 2: Hints that tell the truth
# Dougie wrote hours_between, and its hints are wrong: it takes two whole numbers, hours of the
# day, and gives back a whole number. Correct its hints, and leave what it does as it is.
def hours_between(start: int, end: int) -> int:
    return end - start


# Task 3: A leader, or None
# Write a function called leader_of that takes a call sign and a dictionary of leaders, and gives
# back that team's leader, or None when the dictionary has no such call sign. Give it hints: the
# call sign is text, the dictionary goes from text to text, and it gives back text or None.
def leader_of(call_sign: str, leaders: dict[str, str]) -> Optional[str]:
    return leaders.get(call_sign)

# Task 4: A rule handed in
# Write a function called pick that takes a list of callouts and a rule, a function that takes one
# Callout and gives back True or False, and gives back a new list of the callouts the rule gives
# True for, in order. Give it hints: a list of Callout, a function from one Callout to True or
# False, and a list of Callout.
def pick(callouts: list[Callout], rule: Callable[[Callout], bool]) -> list[Callout]:
    return [callout for callout in callouts if rule(callout)]

# Task 5: The season's longest callouts
# Write a function called longest_callouts that takes the path of a CSV file with one callout on
# each line, date,hill,hours, and a number, and gives back a list of at most that many Callout
# objects, the most hours first, and of two with the same hours the older first. Give it hints:
# the path is text, the number is a whole number, and it gives back a list of Callout.
def longest_callouts(path: str, count: int) -> list[Callout]:
    with open(path, encoding="utf-8", newline="") as f:
        callouts = [Callout(date, hill, int(hours)) for date, hill, hours in csv.reader(f)]
    callouts.sort(key=lambda callout: (-callout.hours, callout.date))
    return callouts[:count]


# Try your functions in the lines below. They run when you run this file, and Check does not run
# them: it calls your functions with values and files of its own, and reads your hints.
if __name__ == "__main__":
    print(hours_between(7, 19))
    print(hours_between.__annotations__)
    print(total_hours([7, 3, 11]))
    print(leader_of("Bravo", leaders), leader_of("Delta", leaders))
    season = longest_callouts("season.csv", 10)
    print(pick(season, lambda callout: callout.hill == "Cairn Dubh"))
    for callout in longest_callouts("season.csv", 3):
        print(callout)
