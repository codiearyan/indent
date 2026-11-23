# Follow a traceback through calls. Run this file with: python3 hill_report.py
#
# Task 1: Hours on one hill
# Task 2: The weight of a pack
# Task 3: Where the teams were
#
# Each task is a few functions that call one another, and the last line of each task stops
# with an error. Each task has one mistake, in one function, and it is not always the function
# where Python stops. Change only the function where the mistake is. Check calls the functions
# with values of its own.
import json

# The callout log: a hill, a semicolon and the hours spent there.
callouts = ["Scarth Fell; 3", "Garve Edge; 5", "Scarth Fell; 4", "Lowther Crag; 2"]

# What each kind of kit weighs, in kilograms.
weights = {"rope": 4.5, "stretcher": 9.0, "first aid kit": 2.5, "radio": 0.75}

# Task 1: Hours on one hill
# hill_hours should give back the hours spent on one hill, added up: 7 for Scarth Fell.
def add_hours(total, hours):
    return total + hours


def total_hours(hours_list):
    total = 0
    for hours in hours_list:
        total = add_hours(total, hours)
    return total


def hill_hours(entries, hill):
    hours_list = []
    for entry in entries:
        name, hours = entry.split(";")
        if name.strip() == hill:
            hours_list.append(hours.strip())
    return total_hours(hours_list)


print("Hours on Scarth Fell:", hill_hours(callouts, "Scarth Fell"))

# Task 2: The weight of a pack
# A packing list names kinds of kit with commas between them, and spaces around some of the
# commas. pack_weight should give back what the kit on the list weighs, added up: 16.0 here.
def weight_of(weights, kind):
    return weights[kind]


def weights_of(weights, kinds):
    found = []
    for kind in kinds:
        found.append(weight_of(weights, kind))
    return found


def pack_weight(weights, packing_list):
    kinds = packing_list.split(",")
    return sum(weights_of(weights, kinds))


print("The hill pack weighs:", pack_weight(weights, "rope, stretcher, first aid kit"))

# Task 3: Where the teams were
# positions.json holds the grid reference where each team was last heard. team_positions
# should give back what the file holds, as a dictionary.
def parse_positions(text):
    return json.loads(text)


def team_positions(path):
    with open(path, encoding="utf-8") as positions:
        text = positions.read()
    return parse_positions(path)


print("Last heard:", team_positions("positions.json"))
