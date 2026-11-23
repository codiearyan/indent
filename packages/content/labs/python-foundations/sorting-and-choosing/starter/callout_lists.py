# Rhona's callout lists. Run this file with: python3 callout_lists.py
#
# Task 1: Longest first
# Task 2: By hill, then by date
# Task 3: The rope shelf
# Task 4: The quickest and the longest
# Task 5: Ready to close the year

# This winter's callouts so far, in the order they were written down. Dates are written year first, so
# that text order is date order. A team of "" means nobody wrote the team down.
callouts = [
    {"date": "2026-01-11", "hill": "Lowther Crag", "hours": 3, "team": "Bravo"},
    {"date": "2026-01-19", "hill": "Scarth Fell", "hours": 3, "team": "Charlie"},
    {"date": "2026-02-02", "hill": "Cairn Dubh", "hours": 11, "team": ""},
    {"date": "2026-01-04", "hill": "Scarth Fell", "hours": 7, "team": "Alpha"},
    {"date": "2026-02-08", "hill": "Lowther Crag", "hours": 5, "team": "Alpha"},
]

# Dougie's ropes, each tagged with R and its number.
ropes = ["R12", "R3", "R101", "R7"]

# Task 1: Longest first
# Write a function called longest_first that takes a list of callouts and gives back a new list
# of them, the most hours first. Callouts with the same hours stay in the order they had. The
# list it is given stays as it was.

# Task 2: By hill, then by date
# Write a function called by_hill that takes a list of callouts and gives back a new list of them
# with the hills in A to Z order, and the callouts on one hill oldest first. The list it is given
# stays as it was.

# Task 3: The rope shelf
# Write a function called shelve that takes a list of rope tags and sorts that same list by the
# number after the R, smallest first. It does not need to give anything back.

# Task 4: The quickest and the longest
# Write a function called quickest_and_longest that takes a list of callouts, at least one, and
# gives back a tuple of two callouts: the one with the fewest hours and the one with the most.
# Of two with the same hours, it gives the one that comes first in the list.

# Task 5: Ready to close the year
# Write a function called ready_to_close that takes a list of callouts and a number of hours,
# and gives back True when every callout has its team written down and none took more than that
# number of hours, and False otherwise.


# Try your functions in the lines below. They run when you run this file, and Check does not run
# them: it calls your functions with lists of its own.
if __name__ == "__main__":
    for callout in callouts:
        print(callout["date"], callout["hill"], callout["hours"], callout["team"])
    print(sorted(ropes))
