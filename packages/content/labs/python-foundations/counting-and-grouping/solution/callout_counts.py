# Callout counts. Run this file with: python3 callout_counts.py
#
# Task 1: Callouts per hill
# Task 2: The busiest hills
# Task 3: Dates by hill
# Task 4: How many on one hill

# This year's callouts so far, in the order they came in: the date and the hill of each.
# Check calls your functions with logs of its own.
year = [
    ("04/01/2026", "Scarth Fell"),
    ("11/01/2026", "Lowther Crag"),
    ("19/01/2026", "Scarth Fell"),
    ("02/02/2026", "Cairn Dubh"),
    ("08/02/2026", "Lowther Crag"),
    ("15/02/2026", "Scarth Fell"),
    ("01/03/2026", "Garve Edge"),
    ("14/03/2026", "Lowther Crag"),
]

hills = []
for date, hill in year:
    hills.append(hill)

print(len(year), "callouts so far this year")

# Task 1: Callouts per hill
# Write the line that imports Counter from collections. Then write a function called
# hill_counts that takes a list of hills, one for each callout, and gives back a Counter of
# how many callouts each hill had. Print what it gives back for hills.
from collections import Counter


def hill_counts(hills):
    return Counter(hills)


print(hill_counts(hills))

# Task 2: The busiest hills
# Write a function called busiest that takes a list of hills and a number n, and gives back a
# list of the n hills with the most callouts, each as a tuple (hill, count), the most first,
# and hills with the same count in the order they first came in the list. Print what it gives
# back for hills and 2.
def busiest(hills, n):
    return Counter(hills).most_common(n)


print(busiest(hills, 2))

# Task 3: Dates by hill
# Write the line that imports defaultdict from collections. Then write a function called
# dates_by_hill that takes a log, a list of (date, hill) tuples, and gives back a dictionary of
# each hill and a list of the dates of its callouts, in the order of the log. Print what it
# gives back for year.
from collections import defaultdict


def dates_by_hill(log):
    dates = defaultdict(list)
    for date, hill in log:
        dates[hill].append(date)
    return dates


print(dates_by_hill(year))

# Task 4: How many on one hill
# Write a function called callouts_on that takes what dates_by_hill gives back and a hill, and
# gives back how many callouts that hill had: 0 for a hill that had none. Leave the dictionary
# it is given as it was. Print what it gives back for dates_by_hill(year) and "Black Knowe".
def callouts_on(dates, hill):
    if hill in dates:
        return len(dates[hill])
    return 0


print(callouts_on(dates_by_hill(year), "Black Knowe"))
